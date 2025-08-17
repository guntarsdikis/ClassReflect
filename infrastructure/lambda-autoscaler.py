import json
import boto3
import logging
from datetime import datetime, timedelta

logger = logging.getLogger()
logger.setLevel(logging.INFO)

ec2 = boto3.client('ec2')
sqs = boto3.client('sqs')

# Configuration
QUEUE_URL = 'https://sqs.eu-west-2.amazonaws.com/573524060586/classreflect-processing-queue'
WHISPER_INSTANCE_ID = 'i-0db7635f05d00de47'  # Pre-configured Ubuntu instance
INSTANCE_TAG_NAME = 'ClassReflect-Whisper-OnDemand'


def lambda_handler(event, context):
    """
    Lambda function to monitor SQS queue and start/stop the Whisper EC2 instance
    Triggered by CloudWatch Events every minute
    """
    
    try:
        # Check SQS queue for messages
        response = sqs.receive_message(
            QueueUrl=QUEUE_URL,
            MaxNumberOfMessages=1,
            WaitTimeSeconds=1
        )
        
        messages = response.get('Messages', [])
        
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
        
        if not messages:
            logger.info("No messages in queue.")
            
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
        if instance_state in ['pending', 'running']:
            logger.info("Whisper processing instance already running")
            return {
                'statusCode': 200,
                'body': json.dumps('Processing instance already running')
            }
        
        # Start the stopped instance
        if instance_state == 'stopped':
            logger.info(f"Starting Whisper instance {WHISPER_INSTANCE_ID}")
            ec2.start_instances(InstanceIds=[WHISPER_INSTANCE_ID])
            return {
                'statusCode': 200,
                'body': json.dumps(f'Started Whisper instance {WHISPER_INSTANCE_ID}')
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