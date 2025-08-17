#!/usr/bin/env python3

import boto3
import json
import logging
import tempfile
import os

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class MessageProcessor:
    def __init__(self):
        self.s3_client = boto3.client('s3')
        self.sqs_client = boto3.client('sqs')
        self.queue_url = 'https://sqs.eu-west-2.amazonaws.com/573524060586/classreflect-processing-queue'
        
    def receive_and_process_message(self):
        try:
            # Get message from queue
            response = self.sqs_client.receive_message(
                QueueUrl=self.queue_url,
                MaxNumberOfMessages=1,
                WaitTimeSeconds=5
            )
            
            messages = response.get('Messages', [])
            if not messages:
                logger.info("No messages in queue")
                return
                
            message = messages[0]
            logger.info(f"Received message: {message['Body']}")
            
            # Parse message body
            try:
                body = json.loads(message['Body'])
                job_id = body['jobId']
                s3_key = body['s3Key']
                
                logger.info(f"Processing job {job_id} with S3 key: {s3_key}")
                
                # Try to check if S3 object exists
                try:
                    bucket = 'classreflect-audio-files-573524060586'
                    response = self.s3_client.head_object(Bucket=bucket, Key=s3_key)
                    logger.info(f"✅ S3 object exists: {s3_key}, Size: {response.get('ContentLength', 'Unknown')} bytes")
                    
                    # Try to download the file
                    temp_file = tempfile.NamedTemporaryFile(delete=False, suffix='.audio')
                    self.s3_client.download_file(bucket, s3_key, temp_file.name)
                    file_size = os.path.getsize(temp_file.name)
                    logger.info(f"✅ Successfully downloaded {s3_key} to {temp_file.name}, Size: {file_size} bytes")
                    
                    # Clean up
                    os.unlink(temp_file.name)
                    
                except Exception as e:
                    logger.error(f"❌ Failed to access S3 object {s3_key}: {e}")
                
                # Delete message from queue (so it doesn't get reprocessed)
                self.sqs_client.delete_message(
                    QueueUrl=self.queue_url,
                    ReceiptHandle=message['ReceiptHandle']
                )
                logger.info("✅ Message deleted from queue")
                
            except json.JSONDecodeError as e:
                logger.error(f"Failed to parse message body as JSON: {e}")
                
        except Exception as e:
            logger.error(f"Error processing message: {e}")

if __name__ == "__main__":
    processor = MessageProcessor()
    processor.receive_and_process_message()