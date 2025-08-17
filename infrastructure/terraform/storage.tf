resource "aws_s3_bucket" "audio" {
  bucket = "${var.project_name}-audio-files"
  
  tags = {
    Name = "${var.project_name}-audio-files"
  }
}

resource "aws_s3_bucket_versioning" "audio" {
  bucket = aws_s3_bucket.audio.id
  
  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "audio" {
  bucket = aws_s3_bucket.audio.id
  
  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

resource "aws_s3_bucket_public_access_block" "audio" {
  bucket = aws_s3_bucket.audio.id
  
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_lifecycle_configuration" "audio" {
  bucket = aws_s3_bucket.audio.id
  
  rule {
    id     = "delete-old-audio-files"
    status = "Enabled"
    
    expiration {
      days = 30
    }
  }
}

resource "aws_sqs_queue" "processing" {
  name                       = "${var.project_name}-processing-queue"
  delay_seconds              = 0
  max_message_size           = 262144
  message_retention_seconds  = 86400
  receive_wait_time_seconds  = 10
  visibility_timeout_seconds = 600
  
  redrive_policy = jsonencode({
    deadLetterTargetArn = aws_sqs_queue.processing_dlq.arn
    maxReceiveCount     = 3
  })
  
  tags = {
    Name = "${var.project_name}-processing-queue"
  }
}

resource "aws_sqs_queue" "processing_dlq" {
  name                      = "${var.project_name}-processing-dlq"
  message_retention_seconds = 1209600
  
  tags = {
    Name = "${var.project_name}-processing-dlq"
  }
}

resource "aws_secretsmanager_secret" "db_password" {
  name = "${var.project_name}-db-password"
}

resource "aws_secretsmanager_secret" "jwt_secret" {
  name = "${var.project_name}-jwt-secret"
}

output "s3_bucket_name" {
  value = aws_s3_bucket.audio.id
}

output "sqs_queue_url" {
  value = aws_sqs_queue.processing.url
}