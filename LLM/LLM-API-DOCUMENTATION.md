# LLM API Server Documentation

## Overview

A secure RESTful API server running Qwen2.5 7B language model on AWS EC2 with multiple authentication methods.

## Server Details

**Instance Information:**
- **Instance ID**: `i-017fb2e49c830d29b`
- **Instance Type**: `t3.xlarge` (4 vCPUs, 16GB RAM)
- **Region**: `eu-west-2` (London)
- **Public IP**: `35.178.11.53` ✅ PERMANENT (Elastic IP)
- **API URL**: `http://35.178.11.53:8000`

## Authentication Methods

### 1. API Key Authentication
Use predefined API keys in the Authorization header:

```bash
curl -X POST http://35.178.11.53:8000/chat \
  -H "Authorization: Bearer sk-demo123456789" \
  -H "Content-Type: application/json" \
  -d '{"message": "Hello!", "max_tokens": 100}'
```

**Available API Keys:**
- `sk-demo123456789`
- `sk-test987654321`
- `sk-prod555666777`

### 2. Username/Password Authentication
Login to get a JWT token, then use the token for API calls:

**Step 1: Login**
```bash
curl -X POST http://35.178.11.53:8000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "demo", "password": "demo123"}'
```

**Step 2: Use JWT Token**
```bash
curl -X POST http://35.178.11.53:8000/chat \
  -H "Authorization: Bearer YOUR_JWT_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d '{"message": "Hello!", "max_tokens": 100}'
```

**Available User Accounts:**
- **Demo User**: username=`demo`, password=`demo123`
- **Admin User**: username=`admin`, password=`admin123`

## API Endpoints

### Public Endpoints

#### GET /
Basic server information
```bash
curl http://35.178.11.53:8000/
```

#### GET /health
Server health check
```bash
curl http://35.178.11.53:8000/health
```

#### GET /api-info
Complete API documentation with examples
```bash
curl http://35.178.11.53:8000/api-info
```

#### GET /docs
Interactive API documentation (Swagger UI)
Visit: `http://35.178.11.53:8000/docs`

### Authentication Endpoints

#### POST /auth/login
Get JWT token with username/password

**Request:**
```json
{
  "username": "demo",
  "password": "demo123"
}
```

**Response:**
```json
{
  "access_token": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...",
  "token_type": "bearer",
  "expires_in": 86400
}
```

### Protected Endpoints (Require Authentication)

#### POST /chat
Main chat endpoint for interacting with the LLM

**Request:**
```json
{
  "message": "Explain quantum computing in simple terms",
  "max_tokens": 500,
  "temperature": 0.7
}
```

**Response:**
```json
{
  "response": "Quantum computing is a revolutionary approach to computation that harnesses...",
  "timestamp": "2025-08-24T07:45:30.123456",
  "model": "Qwen2.5-7B-Instruct"
}
```

**Parameters:**
- `message` (required): Your question or prompt for the AI
- `max_tokens` (optional): Maximum tokens to generate (default: 1000, max: 2048)
- `temperature` (optional): Creativity level 0-1 (default: 0.7)

## Security Features

1. **Application-Level Authentication**: Two authentication methods (API keys + JWT)
2. **CORS Support**: Allows cross-origin requests
3. **Rate Limiting**: Built into the server architecture
4. **Secure Token Storage**: JWT tokens with expiration
5. **Password Hashing**: Bcrypt hashing for stored passwords
6. **HTTPS Ready**: Can be easily configured with SSL certificates

## Usage Examples

### Python Example
```python
import requests
import json

# Method 1: Using API Key
headers = {"Authorization": "Bearer sk-demo123456789"}
data = {
    "message": "Write a haiku about programming",
    "max_tokens": 100,
    "temperature": 0.8
}

response = requests.post(
    "http://35.178.11.53:8000/chat", 
    json=data, 
    headers=headers
)
print(response.json())

# Method 2: Using Username/Password
login_response = requests.post(
    "http://35.178.11.53:8000/auth/login",
    json={"username": "demo", "password": "demo123"}
)
token = login_response.json()["access_token"]

headers = {"Authorization": f"Bearer {token}"}
chat_response = requests.post(
    "http://35.178.11.53:8000/chat",
    json={"message": "What is machine learning?"},
    headers=headers
)
print(chat_response.json())
```

### JavaScript Example
```javascript
// Using fetch API with API Key
const response = await fetch('http://35.178.11.53:8000/chat', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer sk-demo123456789',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    message: 'Explain artificial intelligence',
    max_tokens: 200,
    temperature: 0.6
  })
});

const data = await response.json();
console.log(data.response);
```

### curl Examples
```bash
# Health check
curl http://35.178.11.53:8000/health

# Chat with API key
curl -X POST http://35.178.11.53:8000/chat \
  -H "Authorization: Bearer sk-demo123456789" \
  -H "Content-Type: application/json" \
  -d '{"message": "Tell me a joke", "max_tokens": 100}'

# Login and chat with JWT
TOKEN=$(curl -X POST http://35.178.11.53:8000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "demo", "password": "demo123"}' | jq -r '.access_token')

curl -X POST http://35.178.11.53:8000/chat \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"message": "What is the weather like?", "max_tokens": 50}'
```

## Model Information

- **Model**: Qwen2.5-7B-Instruct
- **Parameters**: 7 billion parameters
- **Architecture**: Transformer-based causal language model
- **Capabilities**: Text generation, conversation, question answering, code generation
- **Languages**: Primarily English and Chinese, with support for other languages
- **Context Length**: Supports long context conversations

## Server Management

### Check Server Status
```bash
# SSH into the server (Amazon Linux, not Ubuntu)
ssh -i /Users/guntarsdikis/SMS-LSST.pem ec2-user@35.178.11.53

# Check if server is running
ps aux | grep python | grep main.py

# View server logs
cd ~/llm-api && cat server.log

# Check API health
curl http://localhost:8000/health
```

### Service Commands
```bash
# Stop server
pkill -f main.py

# Start server
cd ~/llm-api && nohup python3 main.py > server.log 2>&1 &

# Restart server
pkill -f main.py && cd ~/llm-api && nohup python3 main.py > server.log 2>&1 &

# Monitor logs in real-time
cd ~/llm-api && tail -f server.log
```

## Configuration

The server configuration is stored in `/home/ec2-user/llm-api/config.json`:

```json
{
  "api_keys": [
    "sk-demo123456789",
    "sk-test987654321", 
    "sk-prod555666777"
  ],
  "users": {
    "admin": "$2b$12$hashed_password",
    "demo": "$2b$12$hashed_password"
  },
  "model_name": "Qwen/Qwen2.5-7B-Instruct",
  "max_tokens": 2048,
  "temperature": 0.7
}
```

## Troubleshooting

### Common Issues

1. **Connection Refused**: Server may still be starting up (wait 5-10 minutes after launch)
2. **Model Loading**: First request may take longer as model downloads (20GB)
3. **Out of Memory**: Restart the service if memory issues occur

### Error Responses

**401 Unauthorized**
```json
{"detail": "Invalid API key"}
```

**500 Internal Server Error**
```json
{"detail": "Error generating response: [error details]"}
```

### Monitoring
- Check `/var/log/user-data.log` for setup logs
- Use `htop` to monitor CPU/memory usage
- Model loading takes ~5-10GB RAM

## Cost Information

**Estimated Monthly Costs:**
- **EC2 t3.xlarge**: ~$150/month (if running 24/7)
- **Storage (50GB EBS)**: ~$5/month
- **Data Transfer**: Variable based on usage

**Cost Optimization:**
- Stop instance when not in use
- Use scheduled start/stop
- Consider spot instances for development

## Security Considerations

1. **Change Default Passwords**: Update admin and demo passwords
2. **API Key Management**: Rotate API keys regularly
3. **Network Security**: Consider adding HTTPS with SSL/TLS
4. **Access Logging**: Monitor access patterns
5. **Firewall**: EC2 security group limits access to port 8000

## Support and Maintenance

**Regular Maintenance:**
- Update system packages monthly
- Monitor disk space and logs
- Rotate API keys quarterly
- Update Python dependencies as needed

**Backup:**
- Configuration files: `/home/ubuntu/llm-api/config.json`
- System logs: `/var/log/`
- User data: Custom conversation logs (if implemented)

## API Client Testing

Use the provided `test-llm-api.py` script:

```bash
python3 LLM/test-llm-api.py 35.178.11.53
```

This will automatically test both authentication methods and provide usage examples.

---

**Last Updated**: August 24, 2025  
**Server Status**: ✅ Running at http://35.178.11.53:8000  
**Documentation**: http://35.178.11.53:8000/docs