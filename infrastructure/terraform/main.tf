terraform {
  required_version = ">= 1.0"
  
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = var.aws_region
}

variable "aws_region" {
  description = "AWS region"
  default     = "eu-west-2"
}

variable "project_name" {
  description = "Project name"
  default     = "classreflect"
}

variable "domain_name" {
  description = "Domain name"
  default     = "gdwd.co.uk"
}