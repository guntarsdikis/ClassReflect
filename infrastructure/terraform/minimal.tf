# Just create the ECR repository for Docker images
resource "aws_ecr_repository" "api" {
  name                 = "classreflect-api"
  image_tag_mutability = "MUTABLE"
  
  image_scanning_configuration {
    scan_on_push = true
  }
}

data "aws_caller_identity" "current" {}

output "ecr_repository_url" {
  value = aws_ecr_repository.api.repository_url
}