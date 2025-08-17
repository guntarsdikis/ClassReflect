# First, let's just create the ECR repository
resource "aws_ecr_repository" "api" {
  name                 = "classreflect-api"
  image_tag_mutability = "MUTABLE"
  
  image_scanning_configuration {
    scan_on_push = true
  }
}

# Create S3 bucket for audio files
resource "aws_s3_bucket" "audio" {
  bucket = "classreflect-audio-files-${data.aws_caller_identity.current.account_id}"
  
  tags = {
    Name = "classreflect-audio-files"
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

data "aws_caller_identity" "current" {}

output "ecr_repository_url" {
  value = aws_ecr_repository.api.repository_url
}

output "s3_bucket_name" {
  value = aws_s3_bucket.audio.id
}