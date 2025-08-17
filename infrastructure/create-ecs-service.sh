#!/bin/bash

# Create ECS Fargate Service

set -e

echo "Creating ECS Fargate Service..."

# Load configuration
source /Users/guntarsdikis/websites/ClassReflect/infrastructure/alb-config.env

# Create ECS Service
aws ecs create-service \
  --cluster classreflect-cluster \
  --service-name classreflect-api-service \
  --task-definition classreflect-api:1 \
  --desired-count 1 \
  --launch-type FARGATE \
  --network-configuration "awsvpcConfiguration={subnets=[$PRIVATE_SUBNET_1,$PRIVATE_SUBNET_2],securityGroups=[$ECS_SG],assignPublicIp=ENABLED}" \
  --load-balancers targetGroupArn=$TARGET_GROUP_ARN,containerName=api,containerPort=3000 \
  --region eu-west-2 \
  --output json | jq '.service.serviceArn'

echo ""
echo "ECS Service created successfully!"
echo "The API will be available at:"
echo "  http://api.classreflect.gdwd.co.uk"
echo "  http://$ALB_DNS"
echo ""
echo "It may take 2-3 minutes for the service to become healthy."