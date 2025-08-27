#!/usr/bin/env python3
"""
Local Whisper HTTP Service for ClassReflect
Provides HTTP API for audio transcription using OpenAI Whisper
"""

import os
import logging
import tempfile
import json
from datetime import datetime
from flask import Flask, request, jsonify
import whisper
import mysql.connector
from mysql.connector import Error as MySQLError

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)

class WhisperService:
    def __init__(self):
        # Load Whisper model
        model_name = os.getenv('WHISPER_MODEL', 'base')
        logger.info(f"Loading Whisper {model_name} model...")
        self.model = whisper.load_model(model_name)
        logger.info("Whisper model loaded successfully")
        
        # Database configuration
        self.db_config = {
            'host': os.getenv('DB_HOST', 'host.docker.internal'),
            'port': int(os.getenv('DB_PORT', '3306')),
            'user': os.getenv('DB_USER', 'root'),
            'password': os.getenv('DB_PASSWORD', ''),
            'database': os.getenv('DB_NAME', 'classreflect'),
            'autocommit': True
        }
        
        logger.info(f"Database config: {self.db_config['host']}:{self.db_config['port']}")

    def get_db_connection(self):
        """Get database connection"""
        try:
            connection = mysql.connector.connect(**self.db_config)
            return connection
        except MySQLError as e:
            logger.error(f"Database connection error: {e}")
            raise

    def transcribe_audio(self, file_path: str, language: str = None) -> dict:
        """Transcribe audio file using Whisper"""
        try:
            start_time = datetime.now()
            
            # Transcribe with Whisper
            logger.info(f"Transcribing audio file: {file_path}")
            result = self.model.transcribe(file_path, language=language)
            
            end_time = datetime.now()
            processing_time = (end_time - start_time).total_seconds()
            
            # Extract text and calculate metrics
            text = result['text'].strip()
            word_count = len(text.split()) if text else 0
            
            # Get confidence from segments if available
            confidence = 0.0
            if 'segments' in result:
                confidences = [seg.get('no_speech_prob', 0.0) for seg in result['segments']]
                if confidences:
                    confidence = 1.0 - (sum(confidences) / len(confidences))
            
            logger.info(f"Transcription completed in {processing_time:.2f}s: {word_count} words")
            
            return {
                'text': text,
                'word_count': word_count,
                'confidence': round(confidence, 3),
                'processing_time': round(processing_time, 2),
                'language': result.get('language', 'en'),
                'segments': result.get('segments', [])
            }
            
        except Exception as e:
            logger.error(f"Transcription error: {e}")
            raise

    def update_job_status(self, job_id: str, status: str, error_message: str = None):
        """Update job status in database"""
        try:
            connection = self.get_db_connection()
            cursor = connection.cursor()
            
            if status == 'processing':
                query = "UPDATE audio_jobs SET status = %s, processing_started_at = NOW() WHERE id = %s"
                cursor.execute(query, (status, job_id))
            elif status == 'completed':
                query = "UPDATE audio_jobs SET status = %s, processing_completed_at = NOW() WHERE id = %s"
                cursor.execute(query, (status, job_id))
            elif status == 'failed':
                query = "UPDATE audio_jobs SET status = %s, error_message = %s, processing_completed_at = NOW() WHERE id = %s"
                cursor.execute(query, (status, error_message, job_id))
            
            connection.commit()
            cursor.close()
            connection.close()
            
        except MySQLError as e:
            logger.error(f"Database update error: {e}")
            raise

    def store_transcript(self, job_id: str, transcript_data: dict):
        """Store transcript in database"""
        try:
            connection = self.get_db_connection()
            cursor = connection.cursor()
            
            # Get job details
            cursor.execute("SELECT teacher_id, school_id FROM audio_jobs WHERE id = %s", (job_id,))
            job_row = cursor.fetchone()
            
            if not job_row:
                raise ValueError(f"Job {job_id} not found")
            
            teacher_id, school_id = job_row
            
            # Insert transcript
            query = """
                INSERT INTO transcripts (
                    job_id, teacher_id, school_id, transcript_text,
                    word_count, confidence_score, processing_time_seconds,
                    language, created_at
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, NOW())
            """
            
            cursor.execute(query, (
                job_id,
                teacher_id,
                school_id,
                transcript_data['text'],
                transcript_data['word_count'],
                transcript_data['confidence'],
                transcript_data['processing_time'],
                transcript_data.get('language', 'en')
            ))
            
            connection.commit()
            cursor.close()
            connection.close()
            
            logger.info(f"Transcript stored for job {job_id}")
            
        except MySQLError as e:
            logger.error(f"Transcript storage error: {e}")
            raise

# Initialize service
whisper_service = WhisperService()

@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'service': 'whisper-local',
        'timestamp': datetime.now().isoformat()
    })

@app.route('/transcribe', methods=['POST'])
def transcribe():
    """Transcribe audio file"""
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({'error': 'No JSON data provided'}), 400
        
        job_id = data.get('job_id')
        file_path = data.get('file_path')
        language = data.get('language')
        
        if not job_id:
            return jsonify({'error': 'job_id is required'}), 400
        
        if not file_path:
            return jsonify({'error': 'file_path is required'}), 400
        
        logger.info(f"Processing transcription request for job {job_id}")
        
        # Update job status to processing
        whisper_service.update_job_status(job_id, 'processing')
        
        # Check if file exists
        if not os.path.exists(file_path):
            error_msg = f"Audio file not found: {file_path}"
            logger.error(error_msg)
            whisper_service.update_job_status(job_id, 'failed', error_msg)
            return jsonify({'error': error_msg}), 404
        
        # Transcribe audio
        transcript_data = whisper_service.transcribe_audio(file_path, language)
        
        # Store transcript in database
        whisper_service.store_transcript(job_id, transcript_data)
        
        # Update job status to completed
        whisper_service.update_job_status(job_id, 'completed')
        
        # Return transcript data
        return jsonify({
            'job_id': job_id,
            'status': 'completed',
            'transcript': transcript_data
        })
        
    except Exception as e:
        error_msg = f"Transcription failed: {str(e)}"
        logger.error(error_msg)
        
        if 'job_id' in locals():
            whisper_service.update_job_status(job_id, 'failed', error_msg)
        
        return jsonify({'error': error_msg}), 500

@app.route('/jobs/<job_id>/status', methods=['GET'])
def get_job_status(job_id):
    """Get job status"""
    try:
        connection = whisper_service.get_db_connection()
        cursor = connection.cursor(dictionary=True)
        
        cursor.execute("""
            SELECT status, error_message, processing_started_at, processing_completed_at
            FROM audio_jobs WHERE id = %s
        """, (job_id,))
        
        job = cursor.fetchone()
        cursor.close()
        connection.close()
        
        if not job:
            return jsonify({'error': 'Job not found'}), 404
        
        return jsonify({
            'job_id': job_id,
            'status': job['status'],
            'error_message': job['error_message'],
            'processing_started_at': job['processing_started_at'].isoformat() if job['processing_started_at'] else None,
            'processing_completed_at': job['processing_completed_at'].isoformat() if job['processing_completed_at'] else None
        })
        
    except Exception as e:
        logger.error(f"Status check error: {e}")
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8000, debug=False)