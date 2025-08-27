#!/bin/bash

# ClassReflect Local Development Startup Script
# This script sets up the complete local development environment

set -e  # Exit on any error

echo "🚀 Starting ClassReflect Local Development Environment"
echo "==================================================="

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print status
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if running from correct directory
if [ ! -f "package.json" ] && [ ! -f "backend/package.json" ]; then
    print_error "Please run this script from the ClassReflect root directory"
    exit 1
fi

# Create local audio directory
print_status "Creating local audio storage directory..."
mkdir -p /tmp/classreflect-audio
print_success "Local audio directory created: /tmp/classreflect-audio"

# Check if Docker is running
print_status "Checking Docker..."
if ! docker info > /dev/null 2>&1; then
    print_error "Docker is not running. Please start Docker Desktop and try again."
    exit 1
fi
print_success "Docker is running"

# Check if MySQL is accessible
print_status "Checking MySQL connection..."
if mysql -u root -e "SELECT 1" > /dev/null 2>&1; then
    print_success "MySQL is accessible"
else
    print_warning "MySQL connection failed. Attempting to start MySQL with Docker..."
    
    # Try to start MySQL with Docker
    cd docker/whisper
    if command -v "docker" &> /dev/null && docker compose version &> /dev/null; then
        docker compose -f docker-compose.yml --profile local-db up -d mysql
    else
        docker-compose -f docker-compose.yml --profile local-db up -d mysql
    fi
    cd ../../
    
    # Wait for MySQL to be ready
    print_status "Waiting for MySQL to be ready..."
    sleep 10
    
    if mysql -h 127.0.0.1 -P 3306 -u root -proot -e "SELECT 1" > /dev/null 2>&1; then
        print_success "MySQL started with Docker"
    else
        print_error "Could not start MySQL. Please check your MySQL installation."
        exit 1
    fi
fi

# Check database exists
print_status "Checking ClassReflect database..."
if mysql -u root -e "USE classreflect;" > /dev/null 2>&1; then
    print_success "Database 'classreflect' exists"
else
    print_warning "Database 'classreflect' not found. Creating..."
    mysql -u root -e "CREATE DATABASE IF NOT EXISTS classreflect;"
    print_success "Database 'classreflect' created"
fi

# Start Whisper HTTP service
print_status "Starting Whisper HTTP service..."
cd docker/whisper

# Use docker compose (modern) or docker-compose (legacy)
if command -v "docker" &> /dev/null && docker compose version &> /dev/null; then
    docker compose -f docker-compose.http.yml up -d
elif command -v "docker-compose" &> /dev/null; then
    docker-compose -f docker-compose.http.yml up -d
else
    print_error "Neither 'docker compose' nor 'docker-compose' command found"
    exit 1
fi

cd ../../

# Wait for Whisper service to be ready
print_status "Waiting for Whisper service to be ready..."
WHISPER_READY=false
for i in {1..30}; do
    if curl -s http://localhost:8000/health > /dev/null 2>&1; then
        WHISPER_READY=true
        break
    fi
    sleep 2
    echo -n "."
done
echo ""

if [ "$WHISPER_READY" = true ]; then
    print_success "Whisper HTTP service is ready at http://localhost:8000"
else
    print_error "Whisper service failed to start. Check logs with:"
    echo "  docker compose -f docker/whisper/docker-compose.http.yml logs -f"
    echo "  # or: docker-compose -f docker/whisper/docker-compose.http.yml logs -f"
    exit 1
fi

# Install backend dependencies if needed
if [ ! -d "backend/node_modules" ]; then
    print_status "Installing backend dependencies..."
    cd backend
    npm install
    cd ..
    print_success "Backend dependencies installed"
fi

# Check if .env file exists in backend
if [ ! -f "backend/.env" ]; then
    print_warning "Backend .env file not found. Creating template..."
    cat > backend/.env << EOF
NODE_ENV=development
DATABASE_HOST=localhost
DATABASE_USER=root
DATABASE_PASSWORD=
DATABASE_NAME=classreflect

# Local audio storage
LOCAL_AUDIO_PATH=/tmp/classreflect-audio

# Whisper service
WHISPER_DOCKER_URL=http://localhost:8000

# Cognito configuration (update with your values)
COGNITO_USER_POOL_ID=eu-west-2_E3SFkCKPU
COGNITO_CLIENT_ID=your-client-id
COGNITO_CLIENT_SECRET=your-client-secret
AWS_REGION=eu-west-2
EOF
    print_warning "Please update backend/.env with your Cognito credentials"
fi

# Install frontend dependencies if needed
if [ -d "frontend" ] && [ ! -d "frontend/node_modules" ]; then
    print_status "Installing frontend dependencies..."
    cd frontend
    npm install
    cd ..
    print_success "Frontend dependencies installed"
fi

# Display environment status
print_status "Checking environment configuration..."
echo ""
echo "Environment Status:"
echo "  🌍 Environment: Local Development"
echo "  📁 Storage: Local filesystem (/tmp/classreflect-audio)"
echo "  🎙️ Processing: Docker Whisper (http://localhost:8000)"
echo "  🗄️ Database: Local MySQL (localhost:3306)"
echo "  🔧 Mode: Automatic environment detection"
echo ""

# Show next steps
print_success "Local development environment is ready!"
echo ""
echo "Next steps:"
echo "  1. Start the backend API:"
echo "     cd backend && npm run dev"
echo ""
echo "  2. Start the frontend (in another terminal):"
echo "     cd frontend && npm run dev"
echo ""
echo "  3. Test the system:"
echo "     node test-role-permissions.js"
echo ""
echo "  4. Monitor Whisper logs:"
echo "     docker compose -f docker/whisper/docker-compose.http.yml logs -f"
echo ""

# Optional: Start backend automatically
read -p "$(echo -e ${YELLOW}Start backend API now? [y/N]:${NC}) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    print_status "Starting backend API..."
    cd backend
    npm run dev
else
    print_status "Backend not started. Run 'cd backend && npm run dev' when ready."
fi

print_success "Setup complete!"