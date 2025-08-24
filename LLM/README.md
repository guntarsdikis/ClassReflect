# LLM API Server Setup

This folder contains all files and documentation for the Qwen2.5 7B LLM API server deployment on AWS EC2.

## Quick Start

**Server URL**: `http://35.178.11.53:8000` ✅ PERMANENT IP

**Test the API**:
```bash
curl -X POST http://35.178.11.53:8000/chat \
  -H "Authorization: Bearer sk-demo123456789" \
  -H "Content-Type: application/json" \
  -d '{"message": "Hello, how are you?", "max_tokens": 100}'
```

## Files in this Directory

### Setup Scripts
- **`user-data-script.sh`** - Automated setup script that runs when EC2 instance starts
- **`llm-server-setup.sh`** - Manual setup script (alternative to user-data)

### Testing and Validation
- **`test-llm-api.py`** - Python script to test both authentication methods
  ```bash
  python3 test-llm-api.py 35.178.11.53
  ```

### Documentation
- **`LLM-API-DOCUMENTATION.md`** - Complete API documentation with examples
- **`README.md`** - This file

## Authentication Options

### Option 1: API Key (Instant Access)
```bash
curl -H "Authorization: Bearer sk-demo123456789" \
  http://35.178.11.53:8000/chat \
  -d '{"message": "Your question here"}'
```

Available API Keys:
- `sk-demo123456789`
- `sk-test987654321` 
- `sk-prod555666777`

### Option 2: Username/Password (JWT Token)
```bash
# 1. Login
curl -X POST http://35.178.11.53:8000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "demo", "password": "demo123"}'

# 2. Use returned token
curl -X POST http://35.178.11.53:8000/chat \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{"message": "Your question here"}'
```

Available Accounts:
- Username: `demo`, Password: `demo123`
- Username: `admin`, Password: `admin123`

## AWS Resources Created

- **EC2 Instance**: `i-017fb2e49c830d29b` (t3.xlarge in eu-west-2)
- **Security Group**: `sg-044bf9ce3ddba770c` (llm-api-server)
- **Storage**: 50GB gp3 EBS volume

## Interactive Documentation

Visit `http://35.178.11.53:8000/docs` for interactive API documentation (Swagger UI).

## Model Details

- **Model**: Qwen2.5-7B-Instruct
- **Size**: ~20GB download
- **RAM Usage**: ~8GB when loaded
- **First Request**: May take 2-3 minutes (model loading)
- **Subsequent Requests**: ~1-5 seconds

## Quick Commands

```bash
# Check server health
curl http://35.178.11.53:8000/health

# Get API information  
curl http://35.178.11.53:8000/api-info

# Test with demo API key
curl -X POST http://35.178.11.53:8000/chat \
  -H "Authorization: Bearer sk-demo123456789" \
  -H "Content-Type: application/json" \
  -d '{"message": "Explain quantum computing briefly", "max_tokens": 200}'

# Run automated tests
python3 test-llm-api.py 35.178.11.53
```

For complete documentation, see `LLM-API-DOCUMENTATION.md`.