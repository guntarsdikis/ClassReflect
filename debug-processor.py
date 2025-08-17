#!/usr/bin/env python3

import boto3
import json
import os
import logging
from datetime import datetime

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class DebugWhisperProcessor:
    def __init__(self):
        self.s3_client = boto3.client('s3')
        self.sqs_client = boto3.client('sqs')
        self.secrets_client = boto3.client('secretsmanager')
        
        # SQS Queue URL
        self.queue_url = 'https://sqs.eu-west-2.amazonaws.com/573524060586/classreflect-processing-queue'
        
        logger.info("Debug Whisper processor initialized")
    
    def test_aws_connectivity(self):
        try:
            # Test SQS connectivity
            logger.info("Testing SQS connectivity...")
            response = self.sqs_client.receive_message(
                QueueUrl=self.queue_url,
                MaxNumberOfMessages=1,
                WaitTimeSeconds=1
            )
            messages = response.get('Messages', [])
            logger.info(f"SQS test successful. Found {len(messages)} messages")
            
            # Test S3 connectivity
            logger.info("Testing S3 connectivity...")
            buckets = self.s3_client.list_buckets()
            logger.info(f"S3 test successful. Found {len(buckets['Buckets'])} buckets")
            
            # Test Secrets Manager connectivity
            logger.info("Testing Secrets Manager connectivity...")
            secret_arn = "arn:aws:secretsmanager:eu-west-2:573524060586:secret:classreflect/database/credentials-pBI0CD"
            response = self.secrets_client.get_secret_value(SecretId=secret_arn)
            secret = json.loads(response['SecretString'])
            logger.info("Secrets Manager test successful")
            logger.info(f"Database host: {secret.get('host', 'Unknown')}")
            
            return True
            
        except Exception as e:
            logger.error(f"AWS connectivity test failed: {e}")
            return False
    
    def test_database_connectivity(self):
        try:
            import mysql.connector
            
            # Get database credentials
            secret_arn = "arn:aws:secretsmanager:eu-west-2:573524060586:secret:classreflect/database/credentials-pBI0CD"
            response = self.secrets_client.get_secret_value(SecretId=secret_arn)
            secret = json.loads(response['SecretString'])
            
            db_config = {
                'host': secret['host'],
                'port': int(secret['port']),
                'user': secret['username'],
                'password': secret['password'],
                'database': secret['dbname']
            }
            
            logger.info(f"Testing database connection to {db_config['host']}...")
            conn = mysql.connector.connect(**db_config)
            cursor = conn.cursor()
            
            # Test query
            cursor.execute("SELECT COUNT(*) FROM audio_jobs")
            result = cursor.fetchone()
            logger.info(f"Database test successful. Found {result[0]} audio jobs")
            
            cursor.close()
            conn.close()
            
            return True
            
        except Exception as e:
            logger.error(f"Database connectivity test failed: {e}")
            return False

if __name__ == "__main__":
    processor = DebugWhisperProcessor()
    
    logger.info("=== Starting AWS Connectivity Tests ===")
    aws_ok = processor.test_aws_connectivity()
    
    logger.info("=== Starting Database Connectivity Tests ===")
    db_ok = processor.test_database_connectivity()
    
    if aws_ok and db_ok:
        logger.info("✅ All connectivity tests passed!")
    else:
        logger.error("❌ Some connectivity tests failed!")