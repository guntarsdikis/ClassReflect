#!/bin/bash

# ClassReflect VPC and Networking Setup
# This script creates the VPC infrastructure for ECS Fargate

set -e

echo "Setting up VPC and networking for ClassReflect..."

# Variables
REGION="eu-west-2"
VPC_CIDR="10.0.0.0/16"
PUBLIC_SUBNET_1_CIDR="10.0.1.0/24"
PUBLIC_SUBNET_2_CIDR="10.0.2.0/24"
PRIVATE_SUBNET_1_CIDR="10.0.10.0/24"
PRIVATE_SUBNET_2_CIDR="10.0.11.0/24"

# Create VPC
echo "Creating VPC..."
VPC_ID=$(aws ec2 create-vpc \
  --cidr-block $VPC_CIDR \
  --tag-specifications 'ResourceType=vpc,Tags=[{Key=Name,Value=classreflect-vpc}]' \
  --region $REGION \
  --query 'Vpc.VpcId' \
  --output text)

echo "VPC created: $VPC_ID"

# Enable DNS hostnames
aws ec2 modify-vpc-attribute \
  --vpc-id $VPC_ID \
  --enable-dns-hostnames \
  --region $REGION

# Create Internet Gateway
echo "Creating Internet Gateway..."
IGW_ID=$(aws ec2 create-internet-gateway \
  --tag-specifications 'ResourceType=internet-gateway,Tags=[{Key=Name,Value=classreflect-igw}]' \
  --region $REGION \
  --query 'InternetGateway.InternetGatewayId' \
  --output text)

# Attach IGW to VPC
aws ec2 attach-internet-gateway \
  --internet-gateway-id $IGW_ID \
  --vpc-id $VPC_ID \
  --region $REGION

echo "Internet Gateway created and attached: $IGW_ID"

# Get availability zones
AZ1=$(aws ec2 describe-availability-zones --region $REGION --query 'AvailabilityZones[0].ZoneName' --output text)
AZ2=$(aws ec2 describe-availability-zones --region $REGION --query 'AvailabilityZones[1].ZoneName' --output text)

# Create public subnets
echo "Creating public subnets..."
PUBLIC_SUBNET_1=$(aws ec2 create-subnet \
  --vpc-id $VPC_ID \
  --cidr-block $PUBLIC_SUBNET_1_CIDR \
  --availability-zone $AZ1 \
  --tag-specifications 'ResourceType=subnet,Tags=[{Key=Name,Value=classreflect-public-1}]' \
  --region $REGION \
  --query 'Subnet.SubnetId' \
  --output text)

PUBLIC_SUBNET_2=$(aws ec2 create-subnet \
  --vpc-id $VPC_ID \
  --cidr-block $PUBLIC_SUBNET_2_CIDR \
  --availability-zone $AZ2 \
  --tag-specifications 'ResourceType=subnet,Tags=[{Key=Name,Value=classreflect-public-2}]' \
  --region $REGION \
  --query 'Subnet.SubnetId' \
  --output text)

echo "Public subnets created: $PUBLIC_SUBNET_1, $PUBLIC_SUBNET_2"

# Create private subnets
echo "Creating private subnets..."
PRIVATE_SUBNET_1=$(aws ec2 create-subnet \
  --vpc-id $VPC_ID \
  --cidr-block $PRIVATE_SUBNET_1_CIDR \
  --availability-zone $AZ1 \
  --tag-specifications 'ResourceType=subnet,Tags=[{Key=Name,Value=classreflect-private-1}]' \
  --region $REGION \
  --query 'Subnet.SubnetId' \
  --output text)

PRIVATE_SUBNET_2=$(aws ec2 create-subnet \
  --vpc-id $VPC_ID \
  --cidr-block $PRIVATE_SUBNET_2_CIDR \
  --availability-zone $AZ2 \
  --tag-specifications 'ResourceType=subnet,Tags=[{Key=Name,Value=classreflect-private-2}]' \
  --region $REGION \
  --query 'Subnet.SubnetId' \
  --output text)

echo "Private subnets created: $PRIVATE_SUBNET_1, $PRIVATE_SUBNET_2"

# Create and configure route table for public subnets
echo "Creating route tables..."
PUBLIC_RT=$(aws ec2 create-route-table \
  --vpc-id $VPC_ID \
  --tag-specifications 'ResourceType=route-table,Tags=[{Key=Name,Value=classreflect-public-rt}]' \
  --region $REGION \
  --query 'RouteTable.RouteTableId' \
  --output text)

# Add route to Internet Gateway
aws ec2 create-route \
  --route-table-id $PUBLIC_RT \
  --destination-cidr-block 0.0.0.0/0 \
  --gateway-id $IGW_ID \
  --region $REGION

# Associate public subnets with route table
aws ec2 associate-route-table \
  --subnet-id $PUBLIC_SUBNET_1 \
  --route-table-id $PUBLIC_RT \
  --region $REGION

aws ec2 associate-route-table \
  --subnet-id $PUBLIC_SUBNET_2 \
  --route-table-id $PUBLIC_RT \
  --region $REGION

echo "Route tables configured"

# Create security group for ALB
echo "Creating security groups..."
ALB_SG=$(aws ec2 create-security-group \
  --group-name classreflect-alb-sg \
  --description "Security group for ClassReflect ALB" \
  --vpc-id $VPC_ID \
  --region $REGION \
  --query 'GroupId' \
  --output text)

# Allow HTTP and HTTPS traffic to ALB
aws ec2 authorize-security-group-ingress \
  --group-id $ALB_SG \
  --protocol tcp \
  --port 80 \
  --cidr 0.0.0.0/0 \
  --region $REGION

aws ec2 authorize-security-group-ingress \
  --group-id $ALB_SG \
  --protocol tcp \
  --port 443 \
  --cidr 0.0.0.0/0 \
  --region $REGION

# Create security group for ECS tasks
ECS_SG=$(aws ec2 create-security-group \
  --group-name classreflect-ecs-sg \
  --description "Security group for ClassReflect ECS tasks" \
  --vpc-id $VPC_ID \
  --region $REGION \
  --query 'GroupId' \
  --output text)

# Allow traffic from ALB to ECS tasks
aws ec2 authorize-security-group-ingress \
  --group-id $ECS_SG \
  --protocol tcp \
  --port 3000 \
  --source-group $ALB_SG \
  --region $REGION

echo "Security groups created: ALB=$ALB_SG, ECS=$ECS_SG"

# Output summary
echo ""
echo "========================================="
echo "VPC Infrastructure Created Successfully!"
echo "========================================="
echo "VPC ID: $VPC_ID"
echo "Internet Gateway: $IGW_ID"
echo "Public Subnets: $PUBLIC_SUBNET_1, $PUBLIC_SUBNET_2"
echo "Private Subnets: $PRIVATE_SUBNET_1, $PRIVATE_SUBNET_2"
echo "ALB Security Group: $ALB_SG"
echo "ECS Security Group: $ECS_SG"
echo ""
echo "Save these IDs for ECS service deployment!"