#!/usr/bin/env python3.11

import whisper
import boto3
import tempfile
import os

# Initialize S3 client
s3_client = boto3.client('s3', region_name='eu-west-2')

# Download the audio file
s3_key = 'audio-files/1/1/77f20a93-6969-447d-8b0a-89de3f442986.wav'
bucket = 'classreflect-audio-files-573524060586'

print(f"Downloading {s3_key} from S3...")
temp_file = tempfile.NamedTemporaryFile(delete=False, suffix='.wav')
s3_client.download_file(bucket, s3_key, temp_file.name)
print(f"Downloaded to {temp_file.name}")

# Get file size
file_size = os.path.getsize(temp_file.name)
print(f"File size: {file_size} bytes")

# Load Whisper model
print("Loading Whisper base model...")
model = whisper.load_model("base")
print("Model loaded successfully")

# Transcribe
print("Starting transcription...")
result = model.transcribe(temp_file.name)
print("Transcription completed!")

# Show results
print("\n=== TRANSCRIPTION RESULT ===")
print(f"Text: {result['text']}")
print(f"Language: {result.get('language', 'unknown')}")
print(f"Word count: {len(result['text'].split())}")

# Clean up
os.unlink(temp_file.name)
print("\nTest completed successfully!")