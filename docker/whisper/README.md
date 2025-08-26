# Local Whisper Processing with Docker

This Docker setup provides a local alternative to the AWS EC2 Whisper processing instance, allowing you to develop and test audio transcription locally.

## 🏗️ Architecture Comparison

| Component | EC2 Production | Local Docker |
|-----------|----------------|--------------|
| **OS** | Ubuntu 22.04 | Python 3.11 slim |
| **Auto-scaling** | Lambda + EC2 start/stop | Manual start/stop |
| **Database** | Aurora MySQL + Secrets Manager | Local MySQL or Aurora |
| **Storage** | S3 + SQS | Local files or S3 |
| **Cost** | ~$0.02/recording | $0 |

## 🚀 Quick Start

### 1. Setup Environment
```bash
cd docker/whisper

# For local development (recommended)
cp .env.local .env

# OR for AWS testing
cp .env.aws .env
# Edit .env with your AWS credentials
```

### 2. Create Audio Files Directory
```bash
mkdir -p audio_files
# Put test .wav, .mp3, .m4a files here
```

### 3. Start Services

**Local development with local MySQL:**
```bash
docker-compose --profile local-db up -d
```

**Local development with existing MySQL:**
```bash
docker-compose up -d whisper-processor
```

**AWS mode (connect to real AWS resources):**
```bash
# Edit .env with AWS credentials first
docker-compose up -d whisper-processor
```

## 📁 Directory Structure

```
docker/whisper/
├── Dockerfile                 # Python 3.11 + Whisper + dependencies
├── docker-compose.yml         # Service definitions
├── local-processor.py         # Enhanced processor with local support
├── requirements.txt           # Python dependencies
├── .env.local                 # Local development config
├── .env.aws                   # AWS connection config
├── audio_files/               # Local test audio files
└── init-db/                   # MySQL initialization scripts
```

## 🔧 Configuration Modes

### Local Development Mode (USE_AWS=false)
- Processes files from `./audio_files/` directory
- Connects to local MySQL database
- No AWS credentials needed
- Perfect for development and testing

### AWS Hybrid Mode (USE_AWS=true, USE_LOCAL_DB=true)
- Downloads files from S3
- Polls real SQS queue
- Uses local MySQL database
- Good for testing AWS integration

### Full AWS Mode (USE_AWS=true, USE_LOCAL_DB=false)
- Full AWS integration
- Downloads from S3, polls SQS
- Connects to Aurora MySQL
- Identical to EC2 behavior

## 🧪 Testing

### Test Local Processing
```bash
# Start the processor
docker-compose up -d whisper-processor

# Process a local file
docker exec classreflect-whisper python processor.py test job-123 /opt/audio_files/test.wav

# Check logs
docker logs -f classreflect-whisper
```

### Test AWS Integration
```bash
# Configure AWS credentials in .env
USE_AWS=true
USE_LOCAL_DB=true  # Use local DB for faster development

# Start processor
docker-compose up -d whisper-processor

# Check SQS polling
docker logs -f classreflect-whisper
```

## 🛠️ Development Workflow

### 1. Develop Locally
```bash
# Use local files and database
cp .env.local .env
docker-compose --profile local-db up -d

# Put test audio files in audio_files/
cp ~/test-recording.wav audio_files/

# Create a test job in database and process it
```

### 2. Test AWS Integration
```bash
# Switch to AWS mode
cp .env.aws .env
# Add AWS credentials to .env

# Test with real AWS resources
docker-compose up -d whisper-processor
```

### 3. Deploy to EC2
Once tested locally, your changes can be deployed to the EC2 instance using the existing Lambda auto-scaler system.

## 📊 Monitoring

### View Logs
```bash
# Real-time logs
docker logs -f classreflect-whisper

# Database logs (if using local MySQL)
docker logs -f classreflect-mysql
```

### Check Container Status
```bash
docker ps
docker stats classreflect-whisper
```

### Test Database Connection
```bash
# Connect to local MySQL
docker exec -it classreflect-mysql mysql -u root -p classreflect

# Test processor database connection
docker exec classreflect-whisper python -c "
import mysql.connector
import os
config = {
    'host': os.getenv('DB_HOST', 'mysql'),
    'user': os.getenv('DB_USER', 'root'),
    'password': os.getenv('DB_PASSWORD', 'root'),
    'database': os.getenv('DB_NAME', 'classreflect')
}
conn = mysql.connector.connect(**config)
print('✅ Database connection successful')
conn.close()
"
```

## 🔄 Environment Variables

| Variable | Local Mode | AWS Mode | Description |
|----------|------------|----------|-------------|
| `USE_AWS` | false | true | Enable AWS services |
| `USE_LOCAL_DB` | true | false | Use local MySQL |
| `WHISPER_MODEL` | base | base | Whisper model size |
| `MAX_EMPTY_POLLS` | 10 | 3 | Polls before stopping |
| `DB_HOST` | host.docker.internal | - | Database host |
| `LOCAL_AUDIO_DIR` | ./audio_files | - | Local files directory |
| `AWS_*` | - | required | AWS credentials |

## 🐛 Troubleshooting

### Audio Processing Issues
```bash
# Check Whisper model loading
docker exec classreflect-whisper python -c "import whisper; print(whisper.available_models())"

# Test ffmpeg
docker exec classreflect-whisper ffmpeg -version
```

### Database Connection Issues
```bash
# Check if MySQL is running
docker ps | grep mysql

# Test connection from processor
docker exec classreflect-whisper python processor.py
```

### AWS Connection Issues
```bash
# Verify AWS credentials
docker exec classreflect-whisper python -c "import boto3; print(boto3.Session().get_credentials())"

# Test S3 access
docker exec classreflect-whisper aws s3 ls s3://classreflect-audio-files-573524060586/ --region eu-west-2
```

## 🚦 Performance

### Resource Usage
- **Memory**: 2-4GB (depending on Whisper model)
- **CPU**: Moderate during transcription
- **Disk**: Models cached in Docker volume

### Model Comparison
| Model | Size | Memory | Speed | Accuracy |
|-------|------|--------|--------|----------|
| tiny | 37 MB | ~1GB | Fastest | Good |
| base | 142 MB | ~1GB | Fast | Better |
| small | 244 MB | ~2GB | Medium | Better |
| medium | 769 MB | ~5GB | Slower | Great |

## 🔐 Security Notes

- Never commit `.env` files with real AWS credentials
- Use IAM roles with minimal permissions for AWS access
- Local MySQL is for development only - use proper security for production
- Audio files are processed in temporary storage and cleaned up automatically