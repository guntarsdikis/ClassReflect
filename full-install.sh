#!/bin/bash

# Create log file
LOG_FILE="/var/log/whisper-install.log"
exec > >(tee -a $LOG_FILE)
exec 2>&1

echo "=== Starting Whisper Installation at $(date) ==="
echo "=== Instance ID: $(ec2-metadata --instance-id | cut -d ' ' -f 2) ==="

# Step 1: Install SSM Agent first
echo ""
echo "=== Step 1: Installing SSM Agent ==="
sudo yum install -y amazon-ssm-agent
sudo systemctl start amazon-ssm-agent
sudo systemctl enable amazon-ssm-agent
sudo systemctl status amazon-ssm-agent --no-pager
echo "SSM Agent installation completed"

# Step 2: Update system
echo ""
echo "=== Step 2: Updating system packages ==="
sudo yum update -y
echo "System update completed"

# Step 3: Install Python 3.11
echo ""
echo "=== Step 3: Installing Python 3.11 ==="
sudo yum install -y python3.11 python3.11-pip
python3.11 --version
pip3.11 --version
echo "Python 3.11 installation completed"

# Step 4: Install ffmpeg
echo ""
echo "=== Step 4: Installing ffmpeg ==="
sudo yum install -y ffmpeg
ffmpeg -version 2>&1 | head -n1
echo "FFmpeg installation completed"

# Step 5: Install Python packages
echo ""
echo "=== Step 5: Installing Python packages (this takes 5-10 minutes) ==="
sudo python3.11 -m pip install --upgrade pip
sudo python3.11 -m pip install openai-whisper boto3 mysql-connector-python requests
echo "Testing whisper import..."
python3.11 -c "import whisper; print('Whisper version:', whisper.__version__)"
echo "Python packages installation completed"

# Step 6: Create whisper directory
echo ""
echo "=== Step 6: Creating whisper directory ==="
sudo mkdir -p /opt/whisper
sudo chown ec2-user:ec2-user /opt/whisper
ls -la /opt/ | grep whisper
echo "Directory created"

# Step 7: Download processor script
echo ""
echo "=== Step 7: Downloading processor script from S3 ==="
aws s3 cp s3://classreflect-audio-files-573524060586/scripts/processor.py /opt/whisper/processor.py --region eu-west-2
chmod +x /opt/whisper/processor.py
ls -la /opt/whisper/
echo "Processor script downloaded"

# Step 8: Test AWS connectivity
echo ""
echo "=== Step 8: Testing AWS connectivity ==="
echo "Checking S3 access..."
aws s3 ls s3://classreflect-audio-files-573524060586/ --region eu-west-2 | head -3
echo ""
echo "Checking SQS access..."
aws sqs get-queue-attributes --queue-url https://sqs.eu-west-2.amazonaws.com/573524060586/classreflect-processing-queue --attribute-names ApproximateNumberOfMessages --region eu-west-2
echo "AWS connectivity test completed"

# Step 9: Quick test of processor (10 seconds)
echo ""
echo "=== Step 9: Testing processor script (10 second test) ==="
cd /opt/whisper
timeout 10 python3.11 processor.py 2>&1 || true
echo "Processor test completed"

# Step 10: Create systemd service
echo ""
echo "=== Step 10: Creating systemd service ==="
sudo tee /etc/systemd/system/whisper-processor.service > /dev/null << 'EOF'
[Unit]
Description=Whisper Audio Processing Service
After=network.target

[Service]
Type=simple
User=ec2-user
WorkingDirectory=/opt/whisper
ExecStart=/usr/bin/python3.11 /opt/whisper/processor.py
Restart=on-failure
RestartSec=10
StandardOutput=journal
StandardError=journal
Environment="PYTHONUNBUFFERED=1"

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable whisper-processor.service
echo "Systemd service created and enabled"

# Step 11: Start the service
echo ""
echo "=== Step 11: Starting whisper-processor service ==="
sudo systemctl start whisper-processor.service
sleep 5
sudo systemctl status whisper-processor.service --no-pager
echo ""
echo "Recent service logs:"
sudo journalctl -u whisper-processor.service -n 20 --no-pager

echo ""
echo "=== Installation completed at $(date) ==="
echo "=== Log file: $LOG_FILE ==="
echo ""
echo "To view live logs: sudo journalctl -u whisper-processor.service -f"
echo "To check status: sudo systemctl status whisper-processor.service"