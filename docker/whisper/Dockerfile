FROM python:3.11-slim

# Install system dependencies
RUN apt-get update && apt-get install -y \
    ffmpeg \
    wget \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Create working directory
WORKDIR /opt/whisper

# Copy requirements and install Python packages
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy processor script
COPY local-processor.py processor.py

# Make script executable
RUN chmod +x processor.py

# Create non-root user
RUN useradd -m whisperuser && chown -R whisperuser:whisperuser /opt/whisper
USER whisperuser

# Run the processor
CMD ["python", "processor.py"]