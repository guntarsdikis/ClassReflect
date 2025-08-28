#!/bin/bash

# ClassReflect Application Load Balancer Setup
# Creates ALB for ECS Fargate backend API

set -e

echo "Setting up Application Load Balancer for ClassReflect API..."

# Variables from VPC setup
REGION="eu-west-2"
VPC_ID="vpc-0c29c119c36a19975"
PUBLIC_SUBNET_1="subnet-07bbe2b58ee439c84"
PUBLIC_SUBNET_2="subnet-0e0d76253bf51c798"
ALB_SG="sg-08ee6bd8d9ec5df10"

# Create Application Load Balancer
echo "Creating Application Load Balancer..."
ALB_ARN=$(aws elbv2 create-load-balancer \
  --name classreflect-api-alb \
  --subnets $PUBLIC_SUBNET_1 $PUBLIC_SUBNET_2 \
  --security-groups $ALB_SG \
  --region $REGION \
  --query 'LoadBalancers[0].LoadBalancerArn' \
  --output text)

echo "ALB created: $ALB_ARN"

# Get ALB DNS name
ALB_DNS=$(aws elbv2 describe-load-balancers \
  --load-balancer-arns $ALB_ARN \
  --region $REGION \
  --query 'LoadBalancers[0].DNSName' \
  --output text)

echo "ALB DNS: $ALB_DNS"

# Create target group for ECS tasks
echo "Creating target group..."
TG_ARN=$(aws elbv2 create-target-group \
  --name classreflect-api-tg \
  --protocol HTTP \
  --port 3000 \
  --vpc-id $VPC_ID \
  --target-type ip \
  --health-check-enabled \
  --health-check-path /health \
  --health-check-interval-seconds 30 \
  --health-check-timeout-seconds 5 \
  --healthy-threshold-count 2 \
  --unhealthy-threshold-count 3 \
  --region $REGION \
  --query 'TargetGroups[0].TargetGroupArn' \
  --output text)

echo "Target group created: $TG_ARN"

# Create listener for HTTP (port 80)
echo "Creating HTTP listener..."
LISTENER_ARN=$(aws elbv2 create-listener \
  --load-balancer-arn $ALB_ARN \
  --protocol HTTP \
  --port 80 \
  --default-actions Type=forward,TargetGroupArn=$TG_ARN \
  --region $REGION \
  --query 'Listeners[0].ListenerArn' \
  --output text)

echo "HTTP listener created: $LISTENER_ARN"

# Output summary
echo ""
echo "========================================="
echo "ALB Created Successfully!"
echo "========================================="
echo "ALB ARN: $ALB_ARN"
echo "ALB DNS: $ALB_DNS"
echo "Target Group ARN: $TG_ARN"
echo "Listener ARN: $LISTENER_ARN"
echo ""
echo "Next steps:"
echo "1. Create ECS task definition"
echo "2. Create ECS service with this target group"
echo "3. Configure DNS: api.classreflect.gdwd.co.uk → $ALB_DNS"
echo ""

# Save configuration for ECS deployment
cat > /Users/guntarsdikis/websites/ClassReflect/infrastructure/alb-config.env << EOF
ALB_ARN=$ALB_ARN
ALB_DNS=$ALB_DNS
TARGET_GROUP_ARN=$TG_ARN
LISTENER_ARN=$LISTENER_ARN
VPC_ID=$VPC_ID
PUBLIC_SUBNET_1=$PUBLIC_SUBNET_1
PUBLIC_SUBNET_2=$PUBLIC_SUBNET_2
PRIVATE_SUBNET_1=subnet-0d615a8c60dc298b9
PRIVATE_SUBNET_2=subnet-0bbbe0c95fccd075f
ALB_SG=$ALB_SG
ECS_SG=sg-0ac7d6fc98eae5f91
EOF

echo "Configuration saved to alb-config.env"