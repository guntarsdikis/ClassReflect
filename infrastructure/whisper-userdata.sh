#!/bin/bash

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

# Install Python packages
sudo python3.11 -m pip install --upgrade pip
sudo python3.11 -m pip install openai-whisper torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cpu
sudo python3.11 -m pip install boto3 mysql-connector-python

# Create whisper processing directory
sudo mkdir -p /opt/whisper
sudo chown ec2-user:ec2-user /opt/whisper

# Create the whisper processor script
cat << 'EOL' > /opt/whisper/processor.py
#!/usr/bin/env python3

import whisper
import boto3
import json
import mysql.connector
import os
import sys
import logging
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
        
        # Load Whisper model
        logger.info("Loading Whisper model...")
        self.model = whisper.load_model("base")
        logger.info("Whisper model loaded successfully")
        
        # Get database credentials
        self.db_config = self._get_db_credentials()
        
        # SQS Queue URL
        self.queue_url = os.environ.get('SQS_QUEUE_URL', 
            'https://sqs.eu-west-2.amazonaws.com/573524060586/classreflect-processing-queue')
    
    def _get_db_credentials(self):
        """Get database credentials from AWS Secrets Manager"""
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
        """Download audio file from S3 to temporary location"""
        try:
            temp_file = tempfile.NamedTemporaryFile(delete=False, suffix='.audio')
            self.s3_client.download_file(bucket, s3_key, temp_file.name)
            logger.info(f"Downloaded {s3_key} to {temp_file.name}")
            return temp_file.name
        except Exception as e:
            logger.error(f"Failed to download {s3_key}: {e}")
            raise
    
    def transcribe_audio(self, audio_file_path):
        """Transcribe audio using Whisper"""
        try:
            logger.info(f"Starting transcription of {audio_file_path}")
            result = self.model.transcribe(audio_file_path)
            logger.info("Transcription completed successfully")
            return result['text']
        except Exception as e:
            logger.error(f"Transcription failed: {e}")
            raise
    
    def update_job_status(self, job_id, status, error_message=None, transcript=None):
        """Update job status in database"""
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
                    # Insert transcript
                    transcript_query = """
                        INSERT INTO transcripts (job_id, content, word_count, confidence_score) 
                        VALUES (%s, %s, %s, %s)
                    """
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
        """Process a single SQS message"""
        try:
            # Parse message body
            body = json.loads(message['Body'])
            job_id = body['jobId']
            s3_key = body['s3Key']
            
            logger.info(f"Processing job {job_id}")
            
            # Update status to processing
            self.update_job_status(job_id, 'processing')
            
            # Download audio file
            audio_file = self.download_audio_file(s3_key)
            
            try:
                # Transcribe audio
                transcript = self.transcribe_audio(audio_file)
                
                # Update job as completed with transcript
                self.update_job_status(job_id, 'completed', transcript=transcript)
                
                logger.info(f"Job {job_id} completed successfully")
                
            finally:
                # Clean up temporary file
                os.unlink(audio_file)
            
        except Exception as e:
            logger.error(f"Job processing failed: {e}")
            self.update_job_status(job_id, 'failed', error_message=str(e))
            raise
    
    def poll_queue(self):
        """Poll SQS queue for messages"""
        logger.info("Starting to poll SQS queue...")
        
        while True:
            try:
                response = self.sqs_client.receive_message(
                    QueueUrl=self.queue_url,
                    MaxNumberOfMessages=1,
                    WaitTimeSeconds=20,  # Long polling
                    VisibilityTimeoutSeconds=300  # 5 minutes
                )
                
                messages = response.get('Messages', [])
                
                if messages:
                    for message in messages:
                        try:
                            self.process_message(message)
                            
                            # Delete message after successful processing
                            self.sqs_client.delete_message(
                                QueueUrl=self.queue_url,
                                ReceiptHandle=message['ReceiptHandle']
                            )
                            
                        except Exception as e:
                            logger.error(f"Failed to process message: {e}")
                            # Message will become visible again after visibility timeout
                else:
                    logger.info("No messages in queue, continuing to poll...")
                    
            except KeyboardInterrupt:
                logger.info("Stopping queue polling...")
                break
            except Exception as e:
                logger.error(f"Queue polling error: {e}")
                # Continue polling despite errors

if __name__ == "__main__":
    processor = WhisperProcessor()
    processor.poll_queue()
EOL

# Make the script executable
chmod +x /opt/whisper/processor.py

# Create systemd service
sudo cat << 'EOL' > /etc/systemd/system/whisper-processor.service
[Unit]
Description=Whisper Audio Processing Service
After=network.target

[Service]
Type=simple
User=ec2-user
WorkingDirectory=/opt/whisper
ExecStart=/usr/bin/python3.11 /opt/whisper/processor.py
Restart=always
RestartSec=10
Environment=AWS_DEFAULT_REGION=eu-west-2

[Install]
WantedBy=multi-user.target
EOL

# Enable and start the service
sudo systemctl daemon-reload
sudo systemctl enable whisper-processor
sudo systemctl start whisper-processor

# Signal completion
echo "Whisper processing setup completed" > /var/log/whisper-setup.log