#!/bin/bash
# LLM Server Setup Script for Amazon Linux 2023
set -e

echo "🚀 Setting up LLM API Server on Amazon Linux 2023..."

# Update system
sudo dnf update -y

# Install required packages
sudo dnf install -y python3 python3-pip git htop curl

# Create app directory
mkdir -p /home/ec2-user/llm-api
cd /home/ec2-user/llm-api

# Create Python virtual environment
python3 -m venv venv
source venv/bin/activate

# Install Python dependencies
pip install --upgrade pip
pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cpu
pip install transformers accelerate fastapi uvicorn python-jose[cryptography] python-multipart bcrypt python-dotenv

echo "📦 Creating API server..."

# Create the API server script
cat > /home/ec2-user/llm-api/main.py << 'EOF'
import os
import json
import hashlib
from datetime import datetime, timedelta
from typing import Optional, List
import uvicorn
from fastapi import FastAPI, HTTPException, Depends, status, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import torch
from transformers import AutoModelForCausalLM, AutoTokenizer
from jose import JWTError, jwt
import bcrypt

# Configuration
CONFIG_FILE = "config.json"
JWT_SECRET = "your-super-secret-jwt-key-change-this-in-production"
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_HOURS = 24

# Load configuration
def load_config():
    if os.path.exists(CONFIG_FILE):
        with open(CONFIG_FILE, 'r') as f:
            return json.load(f)
    
    # Default configuration
    config = {
        "api_keys": [
            "sk-demo123456789",
            "sk-test987654321", 
            "sk-prod555666777"
        ],
        "users": {},
        "model_name": "Qwen/Qwen2.5-7B-Instruct",
        "max_tokens": 2048,
        "temperature": 0.7
    }
    
    # Hash default passwords
    config["users"]["admin"] = bcrypt.hashpw("admin123".encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
    config["users"]["demo"] = bcrypt.hashpw("demo123".encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
    
    with open(CONFIG_FILE, 'w') as f:
        json.dump(config, f, indent=2)
    
    return config

# Pydantic models
class ChatMessage(BaseModel):
    message: str
    max_tokens: Optional[int] = 1000
    temperature: Optional[float] = 0.7

class LoginRequest(BaseModel):
    username: str
    password: str

class ChatResponse(BaseModel):
    response: str
    timestamp: str
    model: str

class LoginResponse(BaseModel):
    access_token: str
    token_type: str
    expires_in: int

# Global variables
app = FastAPI(title="Qwen2.5 7B API", description="Secure LLM API with authentication")
security = HTTPBearer()
model = None
tokenizer = None
config = load_config()

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Load model (lazy loading)
async def load_model():
    global model, tokenizer
    if model is None:
        print("Loading Qwen2.5 7B model...")
        try:
            tokenizer = AutoTokenizer.from_pretrained(config["model_name"])
            model = AutoModelForCausalLM.from_pretrained(
                config["model_name"],
                torch_dtype=torch.float16 if torch.cuda.is_available() else torch.float32,
                device_map="auto" if torch.cuda.is_available() else "cpu",
                trust_remote_code=True
            )
            print("Model loaded successfully!")
        except Exception as e:
            print(f"Error loading model: {e}")
            raise

# Authentication functions
def verify_api_key(credentials: HTTPAuthorizationCredentials = Depends(security)) -> bool:
    if credentials.credentials in config["api_keys"]:
        return True
    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid API key"
    )

def verify_jwt_token(credentials: HTTPAuthorizationCredentials = Depends(security)) -> str:
    try:
        payload = jwt.decode(credentials.credentials, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token"
            )
        return username
    except JWTError:
        # If JWT fails, try API key
        try:
            verify_api_key(credentials)
            return "api_user"
        except:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token or API key"
            )

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return bcrypt.checkpw(plain_password.encode('utf-8'), hashed_password.encode('utf-8'))

def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(hours=JWT_EXPIRATION_HOURS)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, JWT_SECRET, algorithm=JWT_ALGORITHM)
    return encoded_jwt

# API Routes
@app.get("/")
async def root():
    return {
        "message": "Qwen2.5 7B API Server", 
        "status": "running", 
        "auth": "required",
        "documentation": "/docs"
    }

@app.get("/health")
async def health():
    return {
        "status": "healthy", 
        "model": "Qwen2.5-7B-Instruct",
        "timestamp": datetime.utcnow().isoformat(),
        "model_loaded": model is not None,
        "server": "Amazon Linux 2023"
    }

@app.post("/auth/login", response_model=LoginResponse)
async def login(request: LoginRequest):
    user_hash = config["users"].get(request.username)
    if not user_hash or not verify_password(request.password, user_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password"
        )
    
    access_token = create_access_token(data={"sub": request.username})
    return LoginResponse(
        access_token=access_token,
        token_type="bearer",
        expires_in=JWT_EXPIRATION_HOURS * 3600
    )

@app.post("/chat", response_model=ChatResponse)
async def chat(
    request: ChatMessage,
    current_user: str = Depends(verify_jwt_token)
):
    await load_model()
    
    try:
        # Format the input for Qwen2.5
        messages = [{"role": "user", "content": request.message}]
        text = tokenizer.apply_chat_template(
            messages,
            tokenize=False,
            add_generation_prompt=True
        )
        
        # Tokenize and generate
        model_inputs = tokenizer([text], return_tensors="pt")
        if hasattr(model, 'device'):
            model_inputs = model_inputs.to(model.device)
        
        with torch.no_grad():
            generated_ids = model.generate(
                model_inputs.input_ids,
                max_new_tokens=min(request.max_tokens, config["max_tokens"]),
                temperature=request.temperature,
                do_sample=True,
                pad_token_id=tokenizer.eos_token_id
            )
        
        # Decode response
        generated_ids = [
            output_ids[len(input_ids):] for input_ids, output_ids in zip(model_inputs.input_ids, generated_ids)
        ]
        
        response = tokenizer.batch_decode(generated_ids, skip_special_tokens=True)[0]
        
        return ChatResponse(
            response=response.strip(),
            timestamp=datetime.utcnow().isoformat(),
            model="Qwen2.5-7B-Instruct"
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating response: {str(e)}")

@app.get("/api-info")
async def api_info():
    return {
        "authentication": {
            "methods": ["API Key", "Username/Password"],
            "api_key_header": "Authorization: Bearer <your-api-key>",
            "login_endpoint": "/auth/login"
        },
        "endpoints": {
            "POST /chat": "Main chat endpoint (requires auth)",
            "POST /auth/login": "Get JWT token", 
            "GET /health": "Health check (public)",
            "GET /api-info": "This endpoint (public)",
            "GET /docs": "Interactive API documentation"
        },
        "default_credentials": {
            "demo_user": {"username": "demo", "password": "demo123"},
            "admin_user": {"username": "admin", "password": "admin123"},
            "api_keys": ["sk-demo123456789", "sk-test987654321", "sk-prod555666777"]
        },
        "example_usage": {
            "curl_with_api_key": f"curl -X POST http://35.178.11.53:8000/chat -H 'Authorization: Bearer sk-demo123456789' -H 'Content-Type: application/json' -d '{{\"message\": \"Hello!\", \"max_tokens\": 100}}'",
            "login_first": f"curl -X POST http://35.178.11.53:8000/auth/login -H 'Content-Type: application/json' -d '{{\"username\": \"demo\", \"password\": \"demo123\"}}'"
        }
    }

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
EOF

# Create systemd service
sudo tee /etc/systemd/system/llm-api.service > /dev/null << EOF
[Unit]
Description=LLM API Server
After=network.target

[Service]
Type=simple
User=ec2-user
WorkingDirectory=/home/ec2-user/llm-api
Environment=PATH=/home/ec2-user/llm-api/venv/bin
ExecStart=/home/ec2-user/llm-api/venv/bin/python main.py
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

# Set permissions
sudo chown ec2-user:ec2-user -R /home/ec2-user/llm-api
chmod +x /home/ec2-user/llm-api/main.py

echo "🔧 Starting the service..."

# Enable and start service
sudo systemctl daemon-reload
sudo systemctl enable llm-api
sudo systemctl start llm-api

# Create a status check script
cat > /home/ec2-user/check-status.sh << 'EOF'
#!/bin/bash
echo "=== LLM API Server Status ==="
echo "Service status:"
sudo systemctl status llm-api --no-pager -l

echo -e "\nRecent logs:"
sudo journalctl -u llm-api --no-pager -n 20

echo -e "\nAPI Info:"
curl -s http://localhost:8000/health | python3 -m json.tool

echo -e "\nServer is accessible at:"
echo "http://35.178.11.53:8000"
EOF

chmod +x /home/ec2-user/check-status.sh

echo "✅ Setup complete!"
echo "🌐 API available at: http://35.178.11.53:8000"
echo ""
echo "📊 Default credentials:"
echo "Username: demo / Password: demo123"
echo "API Keys: sk-demo123456789, sk-test987654321, sk-prod555666777"
echo ""
echo "🔍 Check status: ./check-status.sh"
echo "📝 View logs: sudo journalctl -u llm-api -f"