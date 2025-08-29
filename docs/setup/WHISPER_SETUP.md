# ClassReflect Whisper Processing Setup

**Last Updated**: August 17, 2025  
**Status**: ✅ FULLY OPERATIONAL WITH AUTO-SCALING

## Architecture Overview

The Whisper processing pipeline uses an on-demand EC2 instance that automatically starts when audio files need processing and stops when idle, minimizing costs while maintaining quick response times.

```
User Upload → S3 → SQS Queue → Lambda (checks every minute) → EC2 (start/stop)
                                                                 ↓
                                                          Whisper Processing
                                                                 ↓
                                                          Aurora MySQL
```

## Components

### 1. EC2 Instance (i-0db7635f05d00de47)
- **Type**: t2.medium (2 vCPU, 4GB RAM)
- **OS**: Ubuntu 22.04 LTS
- **Storage**: 15GB EBS
- **Region**: eu-west-2
- **SSH Key**: GDWD2-new.pem
- **Security Group**: sg-0a5708ef2590fc46f

### 2. Installed Software
- Python 3.11
- OpenAI Whisper (base model)
- ffmpeg
- boto3, mysql-connector-python, requests
- AWS Systems Manager (SSM) agent

### 3. Lambda Auto-Scaler (ClassReflectAutoScaler)
- **Trigger**: CloudWatch Events (every minute)
- **Function**: Checks SQS queue and starts/stops EC2 instance
- **Logic**:
  - If messages in queue → Start instance
  - If no messages and instance running → Stop instance

### 4. Processor Script (/opt/whisper/processor.py)
- **Location**: `/opt/whisper/processor.py`
- **Features**:
  - Polls SQS queue every 20 seconds
  - Downloads audio from S3
  - Transcribes with Whisper
  - Updates job status in database
  - Stores transcript with teacher/school IDs
  - Auto-stops instance after 3 empty polls

## Database Schema

### audio_jobs Table
```sql
- id: VARCHAR(36) - Job UUID
- teacher_id: INT
- school_id: INT  
- status: ENUM('pending','uploading','queued','processing','completed','failed')
- s3_key: VARCHAR(255)
- processing_started_at: DATETIME
- processing_completed_at: DATETIME
- error_message: TEXT
```

### transcripts Table
```sql
- id: INT AUTO_INCREMENT
- job_id: VARCHAR(36)
- teacher_id: INT
- school_id: INT
- transcript_text: LONGTEXT (the actual transcription)
- word_count: INT
- confidence_score: DECIMAL(3,2)
- created_at: TIMESTAMP
```

## Workflow

### 1. Job Creation
When a user uploads an audio file:
1. Backend uploads file to S3
2. Creates job entry in audio_jobs table
3. Sends message to SQS queue with jobId and s3Key

### 2. Auto-Scaling
Every minute:
1. Lambda function checks SQS queue
2. If messages exist and instance stopped → Start instance
3. If no messages and instance running → Stop instance

### 3. Processing
When instance is running:
1. Processor script polls SQS queue
2. Downloads audio file from S3
3. Transcribes using Whisper base model
4. Updates job status to 'completed'
5. Stores transcript in database
6. Deletes message from queue
7. After 3 empty polls → Stops instance

## Manual Operations

### Check Instance Status
```bash
aws ec2 describe-instances --instance-ids i-0db7635f05d00de47 \
  --query "Reservations[0].Instances[0].State.Name" \
  --output text --region eu-west-2
```

### Start Instance Manually
```bash
aws ec2 start-instances --instance-ids i-0db7635f05d00de47 --region eu-west-2
```

### Stop Instance Manually
```bash
aws ec2 stop-instances --instance-ids i-0db7635f05d00de47 --region eu-west-2
```

### Connect via SSM
```bash
aws ssm start-session --target i-0db7635f05d00de47 --region eu-west-2
```

### Run Processor Manually
```bash
aws ssm send-command \
  --instance-ids i-0db7635f05d00de47 \
  --document-name "AWS-RunShellScript" \
  --parameters 'commands=["cd /opt/whisper && python3.11 processor.py"]' \
  --region eu-west-2
```

### Check SQS Queue
```bash
aws sqs get-queue-attributes \
  --queue-url https://sqs.eu-west-2.amazonaws.com/573524060586/classreflect-processing-queue \
  --attribute-names ApproximateNumberOfMessages \
  --region eu-west-2
```

### Send Test Message
```bash
aws sqs send-message \
  --queue-url https://sqs.eu-west-2.amazonaws.com/573524060586/classreflect-processing-queue \
  --message-body '{"jobId":"test-job-id","s3Key":"audio-files/1/1/test.wav"}' \
  --region eu-west-2
```

## Troubleshooting

### Issue: Instance Not Starting
1. Check CloudWatch Events rule is enabled:
```bash
aws events describe-rule --name ClassReflectAutoScaler --region eu-west-2
```

2. Check Lambda function logs:
```bash
aws logs tail /aws/lambda/ClassReflectAutoScaler --follow --region eu-west-2
```

### Issue: Processor Not Running
1. Connect via SSM and check logs:
```bash
aws ssm start-session --target i-0db7635f05d00de47 --region eu-west-2
# Once connected:
cd /opt/whisper
python3.11 processor.py
```

2. Check for Python errors:
```bash
python3.11 -c "import whisper; import boto3; print('All imports OK')"
```

### Issue: Database Errors
1. Verify credentials in Secrets Manager:
```bash
aws secretsmanager get-secret-value \
  --secret-id classreflect/database/credentials \
  --region eu-west-2
```

2. Test database connection:
```bash
mysql -h gdwd.cluster-cjjl7f5jormj.eu-west-2.rds.amazonaws.com \
  -u gdwd -p'YOUR_PASSWORD_HERE' classreflect -e "SELECT COUNT(*) FROM audio_jobs;"
```

## Cost Optimization

### Current Setup
- **Instance Type**: t2.medium ($0.0464/hour)
- **Auto-Stop**: After 3 minutes of no jobs
- **Auto-Start**: Within 30 seconds of new jobs
- **Monthly Lambda**: ~1440 invocations (~$0.30)

### Cost Breakdown
- **Idle Cost**: $0 (instance stopped)
- **Processing Cost**: ~$0.02 per 45-minute audio
- **Storage**: $0.023/GB/month for EBS volume

### Further Optimization Options
1. Use Spot Instances (70% savings)
2. Switch to ARM-based instances (t4g.medium)
3. Batch process multiple files before stopping
4. Use smaller Whisper model for faster processing

## Security

### IAM Role (ClassReflectWhisperRole)
- S3: Read access to audio bucket
- SQS: Full access to processing queue
- Secrets Manager: Read database credentials
- EC2: Stop self

### Network Security
- Private subnet placement (optional)
- Security group restricts access
- SSM for secure remote access (no SSH required)
- No public IP needed

## Monitoring

### CloudWatch Metrics
- SQS: ApproximateNumberOfMessages
- EC2: StatusCheckFailed
- Lambda: Invocations, Errors, Duration

### Recommended Alarms
1. SQS messages > 10 for > 5 minutes
2. EC2 instance failed status checks
3. Lambda function errors > 1 per hour
4. Processing job failures > 5%

## Maintenance

### Update Processor Script
```bash
# Upload new version to S3
aws s3 cp processor.py s3://classreflect-audio-files-573524060586/scripts/processor.py --region eu-west-2

# Update on instance
aws ssm send-command \
  --instance-ids i-0db7635f05d00de47 \
  --document-name "AWS-RunShellScript" \
  --parameters 'commands=["aws s3 cp s3://classreflect-audio-files-573524060586/scripts/processor.py /opt/whisper/processor.py --region eu-west-2"]' \
  --region eu-west-2
```

### Update Lambda Function
```bash
cd infrastructure
zip lambda-autoscaler.zip lambda-autoscaler.py
aws lambda update-function-code \
  --function-name ClassReflectAutoScaler \
  --zip-file fileb://lambda-autoscaler.zip \
  --region eu-west-2
```

## Test Results

### Successfully Tested
✅ Audio file download from S3  
✅ Whisper transcription (elephant audio: 36 words)  
✅ Database connection and updates  
✅ Auto-start on queue messages  
✅ Auto-stop after idle period  
✅ Lambda function triggers  
✅ SSM remote access  

### Sample Transcription
**File**: 77f20a93-6969-447d-8b0a-89de3f442986.wav (3.5MB)  
**Result**: "Alright so here we are one of the elephants. The cool thing about these guys is that they have really, really, really long punks. And that's cool. And that's pretty much all there is to say."  
**Processing Time**: ~3 seconds  
**Word Count**: 36  

## Future Improvements

1. **Systemd Service**: Configure auto-start service on boot
2. **Batch Processing**: Process multiple files before stopping
3. **Model Selection**: Allow different Whisper models per job
4. **Progress Tracking**: Real-time transcription progress updates
5. **Error Recovery**: Automatic retry with exponential backoff
6. **Cost Alerts**: CloudWatch billing alarms for usage spikes