#!/bin/bash

# Test script for local Whisper processing setup
# This script helps verify that the local Docker setup is working correctly

set -e

echo "🚀 Testing ClassReflect Local Whisper Setup"
echo "=============================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if docker-compose is available
if ! command -v docker-compose &> /dev/null; then
    echo -e "${RED}❌ docker-compose is not installed${NC}"
    exit 1
fi

# Check if .env file exists
if [ ! -f .env ]; then
    echo -e "${YELLOW}⚠️  No .env file found. Creating from .env.local...${NC}"
    cp .env.local .env
    echo -e "${GREEN}✅ Created .env file${NC}"
fi

# Create audio files directory if it doesn't exist
if [ ! -d audio_files ]; then
    mkdir -p audio_files
    echo -e "${GREEN}✅ Created audio_files directory${NC}"
fi

# Check if there are any test audio files
if [ -z "$(ls -A audio_files 2>/dev/null)" ]; then
    echo -e "${YELLOW}⚠️  No test audio files found in audio_files/${NC}"
    echo "   You can download test files or put your own audio files there"
    echo "   Supported formats: wav, mp3, m4a, flac"
fi

echo ""
echo "🔧 Building and starting services..."
echo "===================================="

# Start services
docker-compose --profile local-db up -d --build

echo ""
echo "⏱️  Waiting for services to start..."
sleep 10

echo ""
echo "🧪 Running Tests"
echo "================"

# Test 1: Check if containers are running
echo -n "1. Checking if containers are running... "
if docker ps | grep -q classreflect-whisper; then
    echo -e "${GREEN}✅ Whisper processor is running${NC}"
else
    echo -e "${RED}❌ Whisper processor is not running${NC}"
    docker-compose logs whisper-processor
    exit 1
fi

if docker ps | grep -q classreflect-mysql; then
    echo -e "   ${GREEN}✅ MySQL is running${NC}"
else
    echo -e "   ${RED}❌ MySQL is not running${NC}"
    docker-compose logs mysql
    exit 1
fi

# Test 2: Check database connection
echo -n "2. Testing database connection... "
if docker exec classreflect-whisper python -c "
import mysql.connector
import os
config = {
    'host': os.getenv('DB_HOST', 'mysql'),
    'user': os.getenv('DB_USER', 'root'),
    'password': os.getenv('DB_PASSWORD', 'root'),
    'database': os.getenv('DB_NAME', 'classreflect')
}
conn = mysql.connector.connect(**config)
cursor = conn.cursor()
cursor.execute('SELECT COUNT(*) FROM audio_jobs')
cursor.close()
conn.close()
" 2>/dev/null; then
    echo -e "${GREEN}✅ Database connection successful${NC}"
else
    echo -e "${RED}❌ Database connection failed${NC}"
    echo "   Check database logs:"
    docker-compose logs mysql | tail -10
    exit 1
fi

# Test 3: Check Whisper model loading
echo -n "3. Testing Whisper model loading... "
if docker exec classreflect-whisper python -c "
import whisper
model = whisper.load_model('base')
print('Model loaded successfully')
" 2>/dev/null | grep -q "Model loaded successfully"; then
    echo -e "${GREEN}✅ Whisper model loaded successfully${NC}"
else
    echo -e "${RED}❌ Whisper model loading failed${NC}"
    exit 1
fi

# Test 4: Test local job processing (if audio files exist)
if [ "$(ls -A audio_files 2>/dev/null)" ]; then
    FIRST_AUDIO_FILE=$(ls audio_files/ | head -n 1)
    echo -n "4. Testing audio processing with $FIRST_AUDIO_FILE... "
    
    if docker exec classreflect-whisper python processor.py test "test-job-$(date +%s)" "/opt/audio_files/$FIRST_AUDIO_FILE" 2>/dev/null | grep -q "completed successfully"; then
        echo -e "${GREEN}✅ Audio processing successful${NC}"
    else
        echo -e "${RED}❌ Audio processing failed${NC}"
        echo "   Check processor logs:"
        docker logs classreflect-whisper | tail -10
    fi
else
    echo -e "${YELLOW}4. Skipping audio processing test (no audio files found)${NC}"
fi

echo ""
echo "📊 Service Status"
echo "================="
docker-compose ps

echo ""
echo "📝 Useful Commands"
echo "=================="
echo "View logs:              docker logs -f classreflect-whisper"
echo "Process a file:         docker exec classreflect-whisper python processor.py test job-123 /opt/audio_files/yourfile.wav"
echo "Connect to MySQL:       docker exec -it classreflect-mysql mysql -u root -p classreflect"
echo "Stop services:          docker-compose down"
echo "Clean up everything:    docker-compose down -v --remove-orphans"

echo ""
echo "🎉 Local setup test completed!"
echo "==============================="
echo -e "${GREEN}Your local Whisper processing environment is ready!${NC}"
echo ""
echo "Next steps:"
echo "1. Put test audio files in the audio_files/ directory"
echo "2. Run: docker exec classreflect-whisper python processor.py test job-123 /opt/audio_files/test.wav"
echo "3. Check the transcripts table in MySQL for results"