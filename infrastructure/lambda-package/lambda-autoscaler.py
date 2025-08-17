import json
import boto3
import logging
from datetime import datetime, timedelta
import time
import pymysql

logger = logging.getLogger()
logger.setLevel(logging.INFO)

ec2 = boto3.client('ec2')
sqs = boto3.client('sqs')
ssm = boto3.client('ssm')
rds = boto3.client('rds')

# Configuration
QUEUE_URL = 'https://sqs.eu-west-2.amazonaws.com/573524060586/classreflect-processing-queue'
WHISPER_INSTANCE_ID = 'i-0db7635f05d00de47'  # Pre-configured Ubuntu instance
INSTANCE_TAG_NAME = 'ClassReflect-Whisper-OnDemand'

# Database configuration
DB_HOST = 'gdwd.cluster-cjjl7f5jormj.eu-west-2.rds.amazonaws.com'
DB_NAME = 'classreflect'
DB_USER = 'gdwd'
DB_PASSWORD = 'FullSMS2025DB'


def check_processing_jobs():
    """
    Check if there are any jobs in 'processing' status in the database
    """
    try:
        connection = pymysql.connect(
            host=DB_HOST,
            user=DB_USER,
            password=DB_PASSWORD,
            database=DB_NAME
        )
        
        with connection.cursor() as cursor:
            cursor.execute("SELECT COUNT(*) FROM audio_jobs WHERE status = 'processing'")
            result = cursor.fetchone()
            processing_count = result[0] if result else 0
            
            logger.info(f"Found {processing_count} jobs in processing status")
            return processing_count > 0
            
    except Exception as e:
        logger.error(f"Error checking database for processing jobs: {e}")
        # If we can't check the database, assume jobs might be processing
        return True
    finally:
        if 'connection' in locals():
            connection.close()


def lambda_handler(event, context):
    """
    Lambda function to monitor SQS queue and start/stop the Whisper EC2 instance
    Triggered by CloudWatch Events every minute
    """
    
    try:
        # Check SQS queue for messages (without consuming them)
        response = sqs.get_queue_attributes(
            QueueUrl=QUEUE_URL,
            AttributeNames=['ApproximateNumberOfMessages']
        )
        
        message_count = int(response['Attributes']['ApproximateNumberOfMessages'])
        has_messages = message_count > 0
        logger.info(f"Queue has {message_count} messages")
        
        # Get the current state of the Whisper instance
        instance_response = ec2.describe_instances(
            InstanceIds=[WHISPER_INSTANCE_ID]
        )
        
        if not instance_response['Reservations']:
            logger.error(f"Instance {WHISPER_INSTANCE_ID} not found")
            return {
                'statusCode': 404,
                'body': json.dumps('Whisper instance not found')
            }
        
        instance_state = instance_response['Reservations'][0]['Instances'][0]['State']['Name']
        logger.info(f"Whisper instance {WHISPER_INSTANCE_ID} is {instance_state}")
        
        if not has_messages:
            logger.info("No messages in queue.")
            
            # Check if there are any jobs still being processed
            has_processing_jobs = check_processing_jobs()
            
            if has_processing_jobs:
                logger.info("Jobs still processing, keeping instance running")
                return {
                    'statusCode': 200,
                    'body': json.dumps('Jobs still processing, keeping instance running')
                }
            
            # Stop the instance if it's running and no jobs
            if instance_state in ['running', 'pending']:
                logger.info(f"Stopping idle instance {WHISPER_INSTANCE_ID}")
                ec2.stop_instances(InstanceIds=[WHISPER_INSTANCE_ID])
                return {
                    'statusCode': 200,
                    'body': json.dumps(f'Stopped idle instance {WHISPER_INSTANCE_ID}')
                }
            else:
                return {
                    'statusCode': 200,
                    'body': json.dumps('No messages in queue, instance already stopped')
                }
        
        # Messages exist - ensure instance is running
        if has_messages:
            if instance_state in ['pending', 'running']:
                logger.info("Whisper processing instance already running")
                
                # Check if processor is actually running and start it if not
                if instance_state == 'running':
                    try:
                        logger.info("Checking if processor is running...")
                        check_response = ssm.send_command(
                            InstanceIds=[WHISPER_INSTANCE_ID],
                            DocumentName="AWS-RunShellScript",
                            Parameters={
                                'commands': ['pgrep -f processor.py || echo "NOT_RUNNING"']
                            }
                        )
                        
                        # If processor not running, start it
                        time.sleep(2)
                        logger.info("Starting processor to ensure it's running...")
                        ssm.send_command(
                            InstanceIds=[WHISPER_INSTANCE_ID],
                            DocumentName="AWS-RunShellScript",
                            Parameters={
                                'commands': [
                                    'if ! pgrep -f processor.py > /dev/null; then',
                                    '  cd /opt/whisper',
                                    '  aws s3 cp s3://classreflect-audio-files-573524060586/scripts/processor-fixed.py processor.py --region eu-west-2',
                                    '  nohup python3.11 processor.py > /tmp/processor.log 2>&1 &',
                                    '  echo "Processor started"',
                                    'else',
                                    '  echo "Processor already running"',
                                    'fi'
                                ]
                            }
                        )
                    except Exception as e:
                        logger.error(f"Failed to check/start processor: {e}")
                
                return {
                    'statusCode': 200,
                    'body': json.dumps('Processing instance already running')
                }
            elif instance_state == 'stopped':
                logger.info(f"Starting Whisper instance {WHISPER_INSTANCE_ID}")
                ec2.start_instances(InstanceIds=[WHISPER_INSTANCE_ID])
                
                # Wait for instance to be running
                logger.info("Waiting for instance to be running...")
                waiter = ec2.get_waiter('instance_running')
                waiter.wait(InstanceIds=[WHISPER_INSTANCE_ID])
                
                # Wait a bit more for SSM agent to be ready
                time.sleep(10)
                
                # Start the processor via SSM
                try:
                    logger.info("Starting processor via SSM...")
                    response = ssm.send_command(
                        InstanceIds=[WHISPER_INSTANCE_ID],
                        DocumentName="AWS-RunShellScript",
                        Parameters={
                            'commands': [
                                'cd /opt/whisper',
                                'pkill -f processor.py || true',
                                'aws s3 cp s3://classreflect-audio-files-573524060586/scripts/processor-fixed.py processor.py --region eu-west-2',
                                'nohup python3.11 processor.py > /tmp/processor.log 2>&1 &',
                                'echo "Processor started at $(date)"'
                            ]
                        }
                    )
                    logger.info(f"SSM command sent: {response['Command']['CommandId']}")
                except Exception as e:
                    logger.error(f"Failed to start processor via SSM: {e}")
                
                return {
                    'statusCode': 200,
                    'body': json.dumps(f'Started Whisper instance {WHISPER_INSTANCE_ID} and processor')
                }
        
        # Instance is in unexpected state (stopping, terminated, etc.)
        logger.warning(f"Instance in unexpected state: {instance_state}")
        return {
            'statusCode': 200,
            'body': json.dumps(f'Instance in state: {instance_state}, no action taken')
        }
        
    except Exception as e:
        logger.error(f"Error in lambda handler: {str(e)}")
        return {
            'statusCode': 500,
            'body': json.dumps(f'Error: {str(e)}')
        }