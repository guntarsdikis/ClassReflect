#!/usr/bin/env python3.11

import whisper
import boto3
import json
import mysql.connector
import os
import sys
import logging
import time
from datetime import datetime
import tempfile
import requests

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class WhisperProcessor:
    def __init__(self):
        self.s3_client = boto3.client('s3', region_name='eu-west-2')
        self.sqs_client = boto3.client('sqs', region_name='eu-west-2')
        self.secrets_client = boto3.client('secretsmanager', region_name='eu-west-2')
        self.ec2_client = boto3.client('ec2', region_name='eu-west-2')
        
        # Load Whisper model (base model for faster testing)
        logger.info("Loading Whisper base model...")
        self.model = whisper.load_model("base")
        logger.info("Whisper model loaded successfully")
        
        # Get database credentials
        self.db_config = self._get_db_credentials()
        
        # SQS Queue URL
        self.queue_url = 'https://sqs.eu-west-2.amazonaws.com/573524060586/classreflect-processing-queue'
        
        # Auto-stop tracking
        self.empty_polls = 0
        self.max_empty_polls = 3  # Stop after 3 empty polls (3 minutes)
    
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
                    # Check if transcript already exists
                    check_query = "SELECT id FROM transcripts WHERE job_id = %s"
                    cursor.execute(check_query, (job_id,))
                    existing = cursor.fetchone()
                    
                    if not existing:
                        # Get teacher_id and school_id from the job
                        job_query = "SELECT teacher_id, school_id FROM audio_jobs WHERE id = %s"
                        cursor.execute(job_query, (job_id,))
                        job_data = cursor.fetchone()
                        
                        if job_data:
                            teacher_id, school_id = job_data
                            transcript_query = "INSERT INTO transcripts (job_id, teacher_id, school_id, transcript_text, word_count, confidence_score) VALUES (%s, %s, %s, %s, %s, %s)"
                            word_count = len(transcript.split())
                            cursor.execute(transcript_query, (job_id, teacher_id, school_id, transcript, word_count, 0.95))
                        logger.info(f"Inserted transcript for job {job_id}")
                    else:
                        logger.info(f"Transcript already exists for job {job_id}")
                        
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
        job_id = None
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
                logger.info(f"Transcript preview: {transcript[:200]}...")
                
            finally:
                os.unlink(audio_file)
                logger.info(f"Cleaned up temporary file")
                
        except Exception as e:
            logger.error(f"Job processing failed: {e}")
            if job_id:
                self.update_job_status(job_id, 'failed', error_message=str(e))
            raise
    
    def stop_instance(self):
        try:
            # Get instance ID using IMDSv2
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
            
            logger.info(f"Stopping instance {instance_id}")
            self.ec2_client.stop_instances(InstanceIds=[instance_id])
            
        except Exception as e:
            logger.error(f"Failed to stop instance: {e}")
    
    def poll_queue(self):
        logger.info("Starting SQS polling with auto-stop...")
        logger.info(f"Queue URL: {self.queue_url}")
        logger.info(f"Will stop after {self.max_empty_polls} empty polls")
        
        while True:
            try:
                response = self.sqs_client.receive_message(
                    QueueUrl=self.queue_url,
                    MaxNumberOfMessages=1,
                    WaitTimeSeconds=20,
                    VisibilityTimeout=600  # 10 minutes for processing
                )
                
                messages = response.get('Messages', [])
                
                if messages:
                    self.empty_polls = 0  # Reset counter
                    logger.info(f"Found {len(messages)} message(s) to process")
                    
                    for message in messages:
                        try:
                            self.process_message(message)
                            
                            # Delete message from queue
                            self.sqs_client.delete_message(
                                QueueUrl=self.queue_url,
                                ReceiptHandle=message['ReceiptHandle']
                            )
                            logger.info("Message deleted from queue")
                            
                        except Exception as e:
                            logger.error(f"Failed to process message: {e}")
                else:
                    self.empty_polls += 1
                    logger.info(f"No messages in queue ({self.empty_polls}/{self.max_empty_polls})")
                    
                    if self.empty_polls >= self.max_empty_polls:
                        logger.info("No more jobs to process. Stopping instance.")
                        self.stop_instance()
                        break
                    
            except KeyboardInterrupt:
                logger.info("Stopping queue polling (user interrupt)...")
                break
            except Exception as e:
                logger.error(f"Queue polling error: {e}")
                time.sleep(30)

if __name__ == "__main__":
    try:
        logger.info("=== Starting Whisper Processor ===")
        processor = WhisperProcessor()
        processor.poll_queue()
    except Exception as e:
        logger.error(f"Fatal error: {e}")
        sys.exit(1)