#!/usr/bin/env python3

"""
Simple local test for Whisper processing integration
This simulates the Whisper processing workflow without requiring Docker
"""

import json
import mysql.connector
import os
import sys
import logging
from datetime import datetime
import uuid

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class LocalWhisperTest:
    def __init__(self):
        # Database configuration for local testing
        self.db_config = {
            'host': 'localhost',
            'port': 3306,
            'user': 'root',
            'password': 'root',
            'database': 'classreflect'
        }
        
        logger.info("Local Whisper integration test initialized")
    
    def test_database_connection(self):
        """Test database connection"""
        try:
            conn = mysql.connector.connect(**self.db_config)
            cursor = conn.cursor()
            cursor.execute("SELECT COUNT(*) FROM users WHERE role = 'teacher'")
            teacher_count = cursor.fetchone()[0]
            cursor.close()
            conn.close()
            logger.info(f"✅ Database connection successful - Found {teacher_count} teachers")
            return True
        except Exception as e:
            logger.error(f"❌ Database connection failed: {e}")
            return False
    
    def create_test_job(self, teacher_email="teacher@test.local", audio_filename="test-audio.wav"):
        """Create a test audio processing job"""
        try:
            conn = mysql.connector.connect(**self.db_config)
            cursor = conn.cursor()
            
            # Get teacher info
            cursor.execute("SELECT id, school_id FROM users WHERE email = %s", (teacher_email,))
            teacher_data = cursor.fetchone()
            
            if not teacher_data:
                logger.error(f"❌ Teacher {teacher_email} not found")
                return None
                
            teacher_id, school_id = teacher_data
            job_id = str(uuid.uuid4())
            
            # Create audio job
            cursor.execute("""
                INSERT INTO audio_jobs (id, teacher_id, school_id, original_filename, s3_key, status)
                VALUES (%s, %s, %s, %s, %s, 'queued')
            """, (job_id, teacher_id, school_id, audio_filename, f"audio-files/test/{audio_filename}"))
            
            conn.commit()
            cursor.close()
            conn.close()
            
            logger.info(f"✅ Created test job: {job_id}")
            return job_id
            
        except Exception as e:
            logger.error(f"❌ Failed to create test job: {e}")
            return None
    
    def simulate_processing(self, job_id):
        """Simulate Whisper processing"""
        try:
            conn = mysql.connector.connect(**self.db_config)
            cursor = conn.cursor()
            
            # Update job to processing
            logger.info(f"🔄 Starting processing for job {job_id}")
            cursor.execute("""
                UPDATE audio_jobs 
                SET status = 'processing', processing_started_at = NOW() 
                WHERE id = %s
            """, (job_id,))
            
            # Simulate transcription result
            mock_transcript = "This is a simulated transcript from the Whisper processor. The teacher is explaining mathematical concepts to students. Students are asking questions and participating actively in the lesson."
            word_count = len(mock_transcript.split())
            
            # Update job to completed
            cursor.execute("""
                UPDATE audio_jobs 
                SET status = 'completed', processing_completed_at = NOW() 
                WHERE id = %s
            """, (job_id,))
            
            # Get job details for transcript
            cursor.execute("SELECT teacher_id, school_id FROM audio_jobs WHERE id = %s", (job_id,))
            teacher_id, school_id = cursor.fetchone()
            
            # Insert transcript
            cursor.execute("""
                INSERT INTO transcripts (job_id, teacher_id, school_id, transcript_text, word_count, confidence_score)
                VALUES (%s, %s, %s, %s, %s, %s)
            """, (job_id, teacher_id, school_id, mock_transcript, word_count, 0.95))
            
            conn.commit()
            cursor.close()
            conn.close()
            
            logger.info(f"✅ Processing completed for job {job_id}")
            logger.info(f"   📝 Transcript: {word_count} words")
            logger.info(f"   📊 Confidence: 95%")
            
            return True
            
        except Exception as e:
            logger.error(f"❌ Processing failed for job {job_id}: {e}")
            return False
    
    def verify_results(self, job_id):
        """Verify processing results"""
        try:
            conn = mysql.connector.connect(**self.db_config)
            cursor = conn.cursor()
            
            # Get job status
            cursor.execute("""
                SELECT aj.status, aj.processing_completed_at, t.transcript_text, t.word_count
                FROM audio_jobs aj
                LEFT JOIN transcripts t ON aj.id = t.job_id
                WHERE aj.id = %s
            """, (job_id,))
            
            result = cursor.fetchone()
            if not result:
                logger.error(f"❌ Job {job_id} not found")
                return False
            
            status, completed_at, transcript, word_count = result
            
            logger.info(f"📊 Job Results:")
            logger.info(f"   Status: {status}")
            logger.info(f"   Completed: {completed_at}")
            logger.info(f"   Transcript length: {word_count} words")
            logger.info(f"   Preview: {transcript[:100]}...")
            
            cursor.close()
            conn.close()
            
            return status == 'completed' and transcript is not None
            
        except Exception as e:
            logger.error(f"❌ Failed to verify results: {e}")
            return False
    
    def run_full_test(self):
        """Run complete integration test"""
        logger.info("🚀 Starting ClassReflect Whisper Integration Test")
        logger.info("=" * 50)
        
        # Test 1: Database connection
        if not self.test_database_connection():
            logger.error("❌ Database connection failed - aborting test")
            return False
        
        # Test 2: Create job
        job_id = self.create_test_job()
        if not job_id:
            logger.error("❌ Job creation failed - aborting test")
            return False
        
        # Test 3: Process job
        if not self.simulate_processing(job_id):
            logger.error("❌ Processing failed - aborting test")
            return False
        
        # Test 4: Verify results
        if not self.verify_results(job_id):
            logger.error("❌ Result verification failed - aborting test")
            return False
        
        logger.info("=" * 50)
        logger.info("🎉 All tests passed! Local Whisper integration working!")
        logger.info("")
        logger.info("✅ Components tested:")
        logger.info("   • Local database connection")
        logger.info("   • Job creation and management") 
        logger.info("   • Processing workflow")
        logger.info("   • Transcript storage")
        logger.info("")
        logger.info("🔄 Next steps:")
        logger.info("   • Install actual Whisper: pip install openai-whisper")
        logger.info("   • Replace mock transcript with real Whisper processing")
        logger.info("   • Test with real audio files")
        logger.info("   • Deploy Docker container for production")
        
        return True

if __name__ == "__main__":
    test = LocalWhisperTest()
    success = test.run_full_test()
    
    if success:
        print("\n🎯 Integration test completed successfully!")
        sys.exit(0)
    else:
        print("\n💥 Integration test failed!")
        sys.exit(1)