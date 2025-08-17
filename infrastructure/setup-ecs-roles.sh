#!/bin/bash

# Create IAM roles for ECS Task execution

set -e

echo "Creating IAM roles for ECS..."

# Create ECS Task Execution Role
echo "Creating ECS Task Execution Role..."
aws iam create-role \
  --role-name classreflect-ecs-execution-role \
  --assume-role-policy-document '{
    "Version": "2012-10-17",
    "Statement": [
      {
        "Effect": "Allow",
        "Principal": {
          "Service": "ecs-tasks.amazonaws.com"
        },
        "Action": "sts:AssumeRole"
      }
    ]
  }' 2>/dev/null || echo "Execution role already exists"

# Attach managed policy for ECS task execution
aws iam attach-role-policy \
  --role-name classreflect-ecs-execution-role \
  --policy-arn arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy

# Create ECS Task Role
echo "Creating ECS Task Role..."
aws iam create-role \
  --role-name classreflect-ecs-task-role \
  --assume-role-policy-document '{
    "Version": "2012-10-17",
    "Statement": [
      {
        "Effect": "Allow",
        "Principal": {
          "Service": "ecs-tasks.amazonaws.com"
        },
        "Action": "sts:AssumeRole"
      }
    ]
  }' 2>/dev/null || echo "Task role already exists"

# Create policy for S3 and SQS access
echo "Creating task policy..."
aws iam put-role-policy \
  --role-name classreflect-ecs-task-role \
  --policy-name classreflect-task-policy \
  --policy-document '{
    "Version": "2012-10-17",
    "Statement": [
      {
        "Effect": "Allow",
        "Action": [
          "s3:GetObject",
          "s3:PutObject",
          "s3:DeleteObject"
        ],
        "Resource": "arn:aws:s3:::classreflect-audio-files-573524060586/*"
      },
      {
        "Effect": "Allow",
        "Action": [
          "s3:ListBucket"
        ],
        "Resource": "arn:aws:s3:::classreflect-audio-files-573524060586"
      },
      {
        "Effect": "Allow",
        "Action": [
          "sqs:SendMessage",
          "sqs:ReceiveMessage",
          "sqs:DeleteMessage",
          "sqs:GetQueueAttributes"
        ],
        "Resource": "arn:aws:sqs:eu-west-2:573524060586:classreflect-processing-queue"
      }
    ]
  }'

# Get ARNs
EXECUTION_ROLE_ARN=$(aws iam get-role --role-name classreflect-ecs-execution-role --query 'Role.Arn' --output text)
TASK_ROLE_ARN=$(aws iam get-role --role-name classreflect-ecs-task-role --query 'Role.Arn' --output text)

echo ""
echo "IAM Roles created:"
echo "Execution Role ARN: $EXECUTION_ROLE_ARN"
echo "Task Role ARN: $TASK_ROLE_ARN"

# Create CloudWatch Log Group
echo "Creating CloudWatch Log Group..."
aws logs create-log-group --log-group-name /ecs/classreflect-api --region eu-west-2 2>/dev/null || echo "Log group already exists"

echo ""
echo "Setup complete!"