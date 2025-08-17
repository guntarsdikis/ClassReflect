#!/usr/bin/env python3.11

import boto3
import json
import mysql.connector
import tempfile
import os

# Initialize clients
s3_client = boto3.client('s3', region_name='eu-west-2')
sqs_client = boto3.client('sqs', region_name='eu-west-2')
secrets_client = boto3.client('secretsmanager', region_name='eu-west-2')

# Get database credentials
secret_arn = "arn:aws:secretsmanager:eu-west-2:573524060586:secret:classreflect/database/credentials-pBI0CD"
response = secrets_client.get_secret_value(SecretId=secret_arn)
secret = json.loads(response['SecretString'])

db_config = {
    'host': secret['host'],
    'port': int(secret['port']),
    'user': secret['username'],
    'password': secret['password'],
    'database': secret['dbname']
}

# Process the specific job
job_id = '48679cc3-3a61-4a99-bce5-97c280de913b'
s3_key = f'audio-files/1/1/{job_id}.wav'

print(f"Processing job {job_id}")
print(f"S3 key: {s3_key}")

# Download file
temp_file = tempfile.NamedTemporaryFile(delete=False, suffix='.wav')
print(f"Downloading to {temp_file.name}")
s3_client.download_file('classreflect-audio-files-573524060586', s3_key, temp_file.name)

# Get file size
file_size = os.path.getsize(temp_file.name)
print(f"File size: {file_size} bytes")

# Transcribe with whisper
print("Loading Whisper model...")
import whisper
model = whisper.load_model("base")
print("Transcribing...")
result = model.transcribe(temp_file.name)
transcript = result['text']
print(f"Transcript: {transcript[:200]}...")
print(f"Word count: {len(transcript.split())}")

# Update database
conn = mysql.connector.connect(**db_config)
cursor = conn.cursor()

# Update job status
query = "UPDATE audio_jobs SET status = 'completed', processing_completed_at = NOW() WHERE id = %s"
cursor.execute(query, (job_id,))

# Get teacher and school IDs
cursor.execute("SELECT teacher_id, school_id FROM audio_jobs WHERE id = %s", (job_id,))
teacher_id, school_id = cursor.fetchone()

# Insert transcript
transcript_query = """
INSERT INTO transcripts (job_id, teacher_id, school_id, transcript_text, word_count, confidence_score) 
VALUES (%s, %s, %s, %s, %s, %s)
"""
word_count = len(transcript.split())
cursor.execute(transcript_query, (job_id, teacher_id, school_id, transcript, word_count, 0.95))

conn.commit()
cursor.close()
conn.close()

# Clean up
os.unlink(temp_file.name)

print(f"✅ Job {job_id} completed successfully!")
print(f"Transcript saved to database with {word_count} words")