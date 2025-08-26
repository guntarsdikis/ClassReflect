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
from botocore.exceptions import NoCredentialsError, ClientError

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class LocalWhisperProcessor:
    def __init__(self):
        # Check if running in AWS mode or local mode
        self.aws_mode = os.getenv('USE_AWS', 'true').lower() == 'true'
        self.local_mode = not self.aws_mode
        
        logger.info(f"Starting processor in {'AWS' if self.aws_mode else 'LOCAL'} mode")
        
        if self.aws_mode:
            try:
                self.s3_client = boto3.client('s3', region_name=os.getenv('AWS_REGION', 'eu-west-2'))
                self.sqs_client = boto3.client('sqs', region_name=os.getenv('AWS_REGION', 'eu-west-2'))
                self.secrets_client = boto3.client('secretsmanager', region_name=os.getenv('AWS_REGION', 'eu-west-2'))
                logger.info("AWS clients initialized successfully")
            except (NoCredentialsError, ClientError) as e:
                logger.error(f"AWS initialization failed: {e}")
                logger.info("Falling back to local mode")
                self.aws_mode = False
                self.local_mode = True
        
        # Load Whisper model (configurable model size)
        model_name = os.getenv('WHISPER_MODEL', 'base')
        logger.info(f"Loading Whisper {model_name} model...")
        self.model = whisper.load_model(model_name)
        logger.info("Whisper model loaded successfully")
        
        # Get database configuration
        self.db_config = self._get_db_config()
        
        # SQS Queue URL (configurable)
        self.queue_url = os.getenv(
            'SQS_QUEUE_URL', 
            'https://sqs.eu-west-2.amazonaws.com/573524060586/classreflect-processing-queue'
        )
        
        # Auto-stop tracking (configurable for local development)
        self.empty_polls = 0
        self.max_empty_polls = int(os.getenv('MAX_EMPTY_POLLS', '10'))  # More polls for local dev
        
        # Local file processing directory
        self.local_files_dir = os.getenv('LOCAL_FILES_DIR', '/tmp/audio_files')
        if self.local_mode:
            os.makedirs(self.local_files_dir, exist_ok=True)
    
    def _get_db_config(self):
        """Get database configuration from environment or AWS Secrets Manager"""
        try:
            if self.local_mode or os.getenv('USE_LOCAL_DB', 'false').lower() == 'true':
                # Use environment variables for local development
                logger.info("Using local database configuration")
                return {
                    'host': os.getenv('DB_HOST', 'localhost'),
                    'port': int(os.getenv('DB_PORT', '3306')),
                    'user': os.getenv('DB_USER', 'root'),
                    'password': os.getenv('DB_PASSWORD', 'root'),
                    'database': os.getenv('DB_NAME', 'classreflect')
                }
            else:
                # Use AWS Secrets Manager for production
                logger.info("Using AWS Secrets Manager for database credentials")
                secret_arn = os.getenv(
                    'DB_SECRET_ARN',
                    "arn:aws:secretsmanager:eu-west-2:573524060586:secret:classreflect/database/credentials-pBI0CD"
                )
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
            logger.error(f"Failed to get database configuration: {e}")
            raise
    
    def download_audio_file(self, s3_key, bucket=None):
        """Download audio file from S3 or use local file"""
        try:
            if self.local_mode:
                # For local mode, assume files are in local directory
                local_path = os.path.join(self.local_files_dir, os.path.basename(s3_key))
                if os.path.exists(local_path):
                    logger.info(f"Using local file: {local_path}")
                    return local_path
                else:
                    raise FileNotFoundError(f"Local file not found: {local_path}")
            else:
                # Download from S3
                bucket = bucket or os.getenv('S3_BUCKET', 'classreflect-audio-files-573524060586')
                temp_file = tempfile.NamedTemporaryFile(delete=False, suffix='.audio')
                self.s3_client.download_file(bucket, s3_key, temp_file.name)
                logger.info(f"Downloaded {s3_key} to {temp_file.name}")
                return temp_file.name
        except Exception as e:
            logger.error(f"Failed to get audio file {s3_key}: {e}")
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
        """Process a single SQS message"""
        job_id = None
        audio_file = None
        try:
            if isinstance(message, dict) and 'Body' in message:
                # SQS message format
                body = json.loads(message['Body'])
            else:
                # Direct message format for local testing
                body = message
                
            job_id = body['jobId']
            s3_key = body['s3Key']
            
            logger.info(f"Processing job {job_id}")
            
            self.update_job_status(job_id, 'processing')
            
            audio_file = self.download_audio_file(s3_key)
            
            transcript = self.transcribe_audio(audio_file)
            self.update_job_status(job_id, 'completed', transcript=transcript)
            logger.info(f"Job {job_id} completed successfully")
            logger.info(f"Transcript preview: {transcript[:200]}...")
                
        except Exception as e:
            logger.error(f"Job processing failed: {e}")
            if job_id:
                try:
                    self.update_job_status(job_id, 'failed', error_message=str(e))
                except:
                    logger.error(f"Failed to update job {job_id} to failed status")
            raise
        finally:
            # Clean up temporary files (but not local files in local mode)
            if audio_file and not self.local_mode and os.path.exists(audio_file):
                try:
                    os.unlink(audio_file)
                    logger.info(f"Cleaned up temporary file: {audio_file}")
                except:
                    logger.warning(f"Failed to clean up file: {audio_file}")
    
    def poll_queue(self):
        """Poll SQS queue for messages"""
        if not self.aws_mode:
            logger.warning("AWS mode disabled - cannot poll SQS queue")
            logger.info("For local testing, use process_local_job() method instead")
            return
            
        logger.info("Starting SQS polling...")
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
                        logger.info("No more jobs to process. Stopping processor.")
                        break
                    
            except KeyboardInterrupt:
                logger.info("Stopping queue polling (user interrupt)...")
                break
            except Exception as e:
                logger.error(f"Queue polling error: {e}")
                time.sleep(30)
    
    def process_local_job(self, job_id, audio_file_path):
        """Process a local job directly (for testing)"""
        logger.info(f"Processing local job {job_id} with file {audio_file_path}")
        
        message = {
            'jobId': job_id,
            's3Key': audio_file_path  # Will be treated as local file path
        }
        
        try:
            self.process_message(message)
            logger.info(f"Local job {job_id} completed successfully")
        except Exception as e:
            logger.error(f"Local job {job_id} failed: {e}")
            raise
    
    def test_connection(self):
        """Test database and AWS connections"""
        logger.info("Testing connections...")
        
        # Test database
        try:
            conn = mysql.connector.connect(**self.db_config)
            cursor = conn.cursor()
            cursor.execute("SELECT 1")
            cursor.close()
            conn.close()
            logger.info("✅ Database connection successful")
        except Exception as e:
            logger.error(f"❌ Database connection failed: {e}")
        
        # Test AWS (if enabled)
        if self.aws_mode:
            try:
                self.sqs_client.get_queue_attributes(
                    QueueUrl=self.queue_url,
                    AttributeNames=['ApproximateNumberOfMessages']
                )
                logger.info("✅ SQS connection successful")
            except Exception as e:
                logger.error(f"❌ SQS connection failed: {e}")
                
            try:
                bucket = os.getenv('S3_BUCKET', 'classreflect-audio-files-573524060586')
                self.s3_client.list_objects_v2(Bucket=bucket, MaxKeys=1)
                logger.info("✅ S3 connection successful")
            except Exception as e:
                logger.error(f"❌ S3 connection failed: {e}")

if __name__ == "__main__":
    try:
        logger.info("=== Starting Local Whisper Processor ===")
        processor = LocalWhisperProcessor()
        
        # Test connections first
        processor.test_connection()
        
        # Check if we should run in test mode
        if len(sys.argv) > 2 and sys.argv[1] == 'test':
            job_id = sys.argv[2]
            audio_file = sys.argv[3] if len(sys.argv) > 3 else '/tmp/audio_files/test.wav'
            processor.process_local_job(job_id, audio_file)
        else:
            processor.poll_queue()
            
    except Exception as e:
        logger.error(f"Fatal error: {e}")
        sys.exit(1)