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
INSTANCE_TYPE = 't3.xlarge'
AMI_ID = 'ami-0b4c7755cdf0d9219'  # Amazon Linux 2
KEY_NAME = 'GDWD'
SECURITY_GROUP_ID = 'sg-0a5708ef2590fc46f'
SUBNET_ID = 'subnet-0bbbe0c95fccd075f'
IAM_INSTANCE_PROFILE = 'ClassReflectWhisperProfile'
INSTANCE_TAG_NAME = 'ClassReflect-Whisper-OnDemand'

# User data script for the instance
USER_DATA_SCRIPT = """#!/bin/bash

# Update system
sudo yum update -y

# Install Python 3.11 and pip
sudo yum install -y python3.11 python3.11-pip

# Install ffmpeg
sudo yum install -y ffmpeg

# Install AWS CLI v2
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
sudo yum install -y unzip
unzip awscliv2.zip
sudo ./aws/install

# Install Python packages optimized for CPU processing
sudo python3.11 -m pip install --upgrade pip
sudo python3.11 -m pip install openai-whisper torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cpu
sudo python3.11 -m pip install boto3 mysql-connector-python

# Optimize for t3.xlarge performance
echo 'export OMP_NUM_THREADS=4' >> /home/ec2-user/.bashrc
echo 'export MKL_NUM_THREADS=4' >> /home/ec2-user/.bashrc

# Create whisper processing directory
sudo mkdir -p /opt/whisper
sudo chown ec2-user:ec2-user /opt/whisper

# Create the whisper processor script with auto-termination
cat << 'EOL' > /opt/whisper/processor.py
#!/usr/bin/env python3

import whisper
import boto3
import json
import mysql.connector
import os
import sys
import logging
import time
from datetime import datetime
from urllib.parse import urlparse
import tempfile

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class WhisperProcessor:
    def __init__(self):
        self.s3_client = boto3.client('s3')
        self.sqs_client = boto3.client('sqs')
        self.secrets_client = boto3.client('secretsmanager')
        self.ec2_client = boto3.client('ec2')
        
        # Load Whisper model (large model for better accuracy on t3.xlarge)
        logger.info("Loading Whisper large model...")
        self.model = whisper.load_model("large")
        logger.info("Whisper large model loaded successfully")
        
        # Get database credentials
        self.db_config = self._get_db_credentials()
        
        # SQS Queue URL
        self.queue_url = os.environ.get('SQS_QUEUE_URL', 
            'https://sqs.eu-west-2.amazonaws.com/573524060586/classreflect-processing-queue')
        
        # Auto-termination tracking
        self.empty_polls = 0
        self.max_empty_polls = 3  # Terminate after 3 empty polls (3 minutes)
    
    def _get_db_credentials(self):
        try:
            secret_arn = "arn:aws:secretsmanager:eu-west-2:573524060586:secret:classreflect/database/credentials-pBI0CD"
            response = self.secrets_client.get_secret_value(SecretId=secret_arn)
            secret = json.loads(response['SecretString'])
            
            return {
                'host': secret['host'],
                'port': int(secret['port']),
                'user': secret['username'],
                'password': secret['password'],
                'database': secret['dbname']
            }
        except Exception as e:
            logger.error(f"Failed to get database credentials: {e}")
            raise
    
    def download_audio_file(self, s3_key, bucket='classreflect-audio-files-573524060586'):
        try:
            temp_file = tempfile.NamedTemporaryFile(delete=False, suffix='.audio')
            self.s3_client.download_file(bucket, s3_key, temp_file.name)
            logger.info(f"Downloaded {s3_key} to {temp_file.name}")
            return temp_file.name
        except Exception as e:
            logger.error(f"Failed to download {s3_key}: {e}")
            raise
    
    def transcribe_audio(self, audio_file_path):
        try:
            logger.info(f"Starting transcription of {audio_file_path}")
            result = self.model.transcribe(audio_file_path)
            logger.info("Transcription completed successfully")
            return result['text']
        except Exception as e:
            logger.error(f"Transcription failed: {e}")
            raise
    
    def update_job_status(self, job_id, status, error_message=None, transcript=None):
        try:
            conn = mysql.connector.connect(**self.db_config)
            cursor = conn.cursor()
            
            if status == 'processing':
                query = "UPDATE audio_jobs SET status = %s, processing_started_at = NOW() WHERE id = %s"
                cursor.execute(query, (status, job_id))
            elif status == 'completed':
                query = "UPDATE audio_jobs SET status = %s, processing_completed_at = NOW() WHERE id = %s"
                cursor.execute(query, (status, job_id))
                
                if transcript:
                    transcript_query = "INSERT INTO transcripts (job_id, content, word_count, confidence_score) VALUES (%s, %s, %s, %s)"
                    word_count = len(transcript.split())
                    cursor.execute(transcript_query, (job_id, transcript, word_count, 0.95))
            elif status == 'failed':
                query = "UPDATE audio_jobs SET status = %s, error_message = %s WHERE id = %s"
                cursor.execute(query, (status, error_message, job_id))
            
            conn.commit()
            cursor.close()
            conn.close()
            logger.info(f"Updated job {job_id} status to {status}")
            
        except Exception as e:
            logger.error(f"Failed to update job status: {e}")
            raise
    
    def process_message(self, message):
        try:
            body = json.loads(message['Body'])
            job_id = body['jobId']
            s3_key = body['s3Key']
            
            logger.info(f"Processing job {job_id}")
            
            self.update_job_status(job_id, 'processing')
            
            audio_file = self.download_audio_file(s3_key)
            
            try:
                transcript = self.transcribe_audio(audio_file)
                self.update_job_status(job_id, 'completed', transcript=transcript)
                logger.info(f"Job {job_id} completed successfully")
                
            finally:
                os.unlink(audio_file)
            
        except Exception as e:
            logger.error(f"Job processing failed: {e}")
            self.update_job_status(job_id, 'failed', error_message=str(e))
            raise
    
    def terminate_instance(self):
        try:
            # Get instance ID from metadata
            response = boto3.Session().region_name or 'eu-west-2'
            instance_id = boto3.Session().region_name
            
            # Use IMDSv2 to get instance ID
            import requests
            token_response = requests.put(
                'http://169.254.169.254/latest/api/token',
                headers={'X-aws-ec2-metadata-token-ttl-seconds': '21600'},
                timeout=2
            )
            token = token_response.text
            
            instance_response = requests.get(
                'http://169.254.169.254/latest/meta-data/instance-id',
                headers={'X-aws-ec2-metadata-token': token},
                timeout=2
            )
            instance_id = instance_response.text
            
            logger.info(f"Terminating instance {instance_id}")
            self.ec2_client.terminate_instances(InstanceIds=[instance_id])
            
        except Exception as e:
            logger.error(f"Failed to terminate instance: {e}")
    
    def poll_queue(self):
        logger.info("Starting SQS polling with auto-termination...")
        
        while True:
            try:
                response = self.sqs_client.receive_message(
                    QueueUrl=self.queue_url,
                    MaxNumberOfMessages=1,
                    WaitTimeSeconds=20,
                    VisibilityTimeoutSeconds=600  # 10 minutes for processing
                )
                
                messages = response.get('Messages', [])
                
                if messages:
                    self.empty_polls = 0  # Reset counter
                    for message in messages:
                        try:
                            self.process_message(message)
                            
                            self.sqs_client.delete_message(
                                QueueUrl=self.queue_url,
                                ReceiptHandle=message['ReceiptHandle']
                            )
                            
                        except Exception as e:
                            logger.error(f"Failed to process message: {e}")
                else:
                    self.empty_polls += 1
                    logger.info(f"No messages in queue ({self.empty_polls}/{self.max_empty_polls})")
                    
                    if self.empty_polls >= self.max_empty_polls:
                        logger.info("No more jobs to process. Terminating instance.")
                        self.terminate_instance()
                        break
                    
            except KeyboardInterrupt:
                logger.info("Stopping queue polling...")
                break
            except Exception as e:
                logger.error(f"Queue polling error: {e}")
                time.sleep(30)  # Wait before retrying

if __name__ == "__main__":
    processor = WhisperProcessor()
    processor.poll_queue()
EOL

# Make the script executable
chmod +x /opt/whisper/processor.py

# Start processing immediately
cd /opt/whisper
python3.11 processor.py > /var/log/whisper-processor.log 2>&1

# Instance will auto-terminate when done
"""

def lambda_handler(event, context):
    """
    Lambda function to monitor SQS queue and launch EC2 instances on-demand
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
        
        if not messages:
            logger.info("No messages in queue. No action needed.")
            return {
                'statusCode': 200,
                'body': json.dumps('No messages in queue')
            }
        
        # Check if there are already running instances
        running_instances = ec2.describe_instances(
            Filters=[
                {'Name': 'tag:Name', 'Values': [INSTANCE_TAG_NAME]},
                {'Name': 'instance-state-name', 'Values': ['pending', 'running']}
            ]
        )
        
        if running_instances['Reservations']:
            logger.info("Whisper processing instance already running")
            return {
                'statusCode': 200,
                'body': json.dumps('Processing instance already running')
            }
        
        # Launch new instance
        logger.info("Launching new Whisper processing instance")
        
        response = ec2.run_instances(
            ImageId=AMI_ID,
            MinCount=1,
            MaxCount=1,
            InstanceType=INSTANCE_TYPE,
            KeyName=KEY_NAME,
            SecurityGroupIds=[SECURITY_GROUP_ID],
            SubnetId=SUBNET_ID,
            IamInstanceProfile={'Name': IAM_INSTANCE_PROFILE},
            UserData=USER_DATA_SCRIPT,
            TagSpecifications=[
                {
                    'ResourceType': 'instance',
                    'Tags': [
                        {'Key': 'Name', 'Value': INSTANCE_TAG_NAME},
                        {'Key': 'Project', 'Value': 'ClassReflect'},
                        {'Key': 'AutoTerminate', 'Value': 'true'}
                    ]
                }
            ]
        )
        
        instance_id = response['Instances'][0]['InstanceId']
        logger.info(f"Launched instance {instance_id}")
        
        return {
            'statusCode': 200,
            'body': json.dumps(f'Launched instance {instance_id}')
        }
        
    except Exception as e:
        logger.error(f"Error in lambda handler: {str(e)}")
        return {
            'statusCode': 500,
            'body': json.dumps(f'Error: {str(e)}')
        }