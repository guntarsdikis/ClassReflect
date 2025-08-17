#!/bin/bash

# Log all output
exec > >(tee -a /var/log/whisper-install.log)
exec 2>&1

echo "=== Starting Whisper Installation at $(date) ==="

# 1. Update system
echo "=== Updating system packages ==="
sudo yum update -y
echo "System update completed"

# 2. Install Python 3.11 and pip
echo "=== Installing Python 3.11 ==="
sudo yum install -y python3.11 python3.11-pip
python3.11 --version
echo "Python installation completed"

# 3. Install ffmpeg
echo "=== Installing ffmpeg ==="
sudo yum install -y ffmpeg
ffmpeg -version | head -n1
echo "FFmpeg installation completed"

# 4. Install Python packages
echo "=== Installing Python packages (this will take 5-10 minutes) ==="
sudo python3.11 -m pip install --upgrade pip
sudo python3.11 -m pip install openai-whisper boto3 mysql-connector-python requests
echo "Python packages installation completed"

# 5. Create whisper directory
echo "=== Creating whisper directory ==="
sudo mkdir -p /opt/whisper
sudo chown ec2-user:ec2-user /opt/whisper
ls -la /opt/whisper
echo "Directory created"

# 6. Test AWS connectivity
echo "=== Testing AWS connectivity ==="
aws s3 ls s3://classreflect-audio-files-573524060586/ --region eu-west-2 | head -5
aws sqs get-queue-attributes --queue-url https://sqs.eu-west-2.amazonaws.com/573524060586/classreflect-processing-queue --attribute-names ApproximateNumberOfMessages --region eu-west-2

echo "=== Installation completed at $(date) ==="
echo "=== Ready to create processor script ==="