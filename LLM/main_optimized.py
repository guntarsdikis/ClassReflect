import os
import json
import gc
from datetime import datetime, timedelta
from typing import Optional
import uvicorn
from fastapi import FastAPI, HTTPException, Depends, status, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel
import torch
from transformers import AutoModelForCausalLM, AutoTokenizer
from jose import JWTError, jwt
import bcrypt

# Configuration
CONFIG_FILE = 'config.json'
JWT_SECRET = 'your-super-secret-jwt-key-change-this'
JWT_ALGORITHM = 'HS256'
JWT_EXPIRATION_HOURS = 24

# Load configuration
def load_config():
    if os.path.exists(CONFIG_FILE):
        with open(CONFIG_FILE, 'r') as f:
            return json.load(f)
    
    config = {
        'api_keys': ['sk-demo123456789', 'sk-test987654321', 'sk-prod555666777'],
        'users': {},
        'model_name': 'Qwen/Qwen2.5-7B-Instruct',
        'max_tokens': 2048,
        'temperature': 0.7
    }
    
    config['users']['admin'] = bcrypt.hashpw('admin123'.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
    config['users']['demo'] = bcrypt.hashpw('demo123'.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
    
    with open(CONFIG_FILE, 'w') as f:
        json.dump(config, f, indent=2)
    
    return config

# Models
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

# App setup
app = FastAPI(title='Qwen2.5 7B API', description='Secure LLM API with authentication')
security = HTTPBearer()
model = None
tokenizer = None
config = load_config()

app.add_middleware(
    CORSMiddleware,
    allow_origins=['*'],
    allow_credentials=True,
    allow_methods=['*'],
    allow_headers=['*'],
)

# Static files setup
if os.path.exists('frontend'):
    app.mount('/static', StaticFiles(directory='frontend'), name='static')

# Model loading with memory optimization
async def load_model():
    global model, tokenizer
    if model is None:
        print('Loading Qwen2.5 7B model with memory optimizations...')
        try:
            # Force garbage collection before loading
            gc.collect()
            torch.cuda.empty_cache() if torch.cuda.is_available() else None
            
            print('Loading tokenizer...')
            tokenizer = AutoTokenizer.from_pretrained(config['model_name'])
            
            print('Loading model with optimized settings...')
            model = AutoModelForCausalLM.from_pretrained(
                config['model_name'],
                torch_dtype=torch.float32,
                device_map='cpu',
                trust_remote_code=True,
                low_cpu_mem_usage=True,  # Enable memory optimization
                max_memory={0: "12GiB"}  # Limit memory usage
            )
            
            # Force garbage collection after loading
            gc.collect()
            
            print('Model loaded successfully!')
            print(f'Model parameters: {model.num_parameters():,}')
            
        except Exception as e:
            print(f'Error loading model: {e}')
            # Clean up on error
            if 'model' in locals():
                del model
            if 'tokenizer' in locals():
                del tokenizer
            gc.collect()
            raise

# Auth functions
def verify_api_key(credentials: HTTPAuthorizationCredentials = Depends(security)) -> bool:
    if credentials.credentials in config['api_keys']:
        return True
    raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail='Invalid API key')

def verify_jwt_token(credentials: HTTPAuthorizationCredentials = Depends(security)) -> str:
    try:
        payload = jwt.decode(credentials.credentials, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        username: str = payload.get('sub')
        if username is None:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail='Invalid token')
        return username
    except JWTError:
        try:
            verify_api_key(credentials)
            return 'api_user'
        except:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail='Invalid token or API key')

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return bcrypt.checkpw(plain_password.encode('utf-8'), hashed_password.encode('utf-8'))

def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(hours=JWT_EXPIRATION_HOURS)
    to_encode.update({'exp': expire})
    encoded_jwt = jwt.encode(to_encode, JWT_SECRET, algorithm=JWT_ALGORITHM)
    return encoded_jwt

# Routes - Chat Interface (serve frontend)
@app.get('/chat-ui')
async def chat_ui():
    """Serve the chat frontend interface"""
    if os.path.exists('frontend/index.html'):
        return FileResponse('frontend/index.html')
    else:
        raise HTTPException(status_code=404, detail='Chat interface not found')

@app.get('/')
async def root():
    return {
        'message': 'Qwen2.5 7B API Server', 
        'status': 'running', 
        'auth': 'required', 
        'documentation': '/docs',
        'chat_interface': '/chat-ui'
    }

@app.get('/health')
async def health():
    return {
        'status': 'healthy', 
        'model': 'Qwen2.5-7B-Instruct',
        'timestamp': datetime.utcnow().isoformat(),
        'model_loaded': model is not None,
        'server': 'Amazon Linux 2023'
    }

@app.post('/auth/login', response_model=LoginResponse)
async def login(request: LoginRequest):
    user_hash = config['users'].get(request.username)
    if not user_hash or not verify_password(request.password, user_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail='Invalid username or password')
    
    access_token = create_access_token(data={'sub': request.username})
    return LoginResponse(
        access_token=access_token,
        token_type='bearer',
        expires_in=JWT_EXPIRATION_HOURS * 3600
    )

@app.post('/chat', response_model=ChatResponse)
async def chat(request: ChatMessage, current_user: str = Depends(verify_jwt_token)):
    try:
        await load_model()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f'Model loading failed: {str(e)}')
    
    try:
        # Prepare the chat message
        messages = [{'role': 'user', 'content': request.message}]
        text = tokenizer.apply_chat_template(messages, tokenize=False, add_generation_prompt=True)
        
        # Tokenize input
        model_inputs = tokenizer([text], return_tensors='pt')
        
        # Generate response with memory management
        with torch.no_grad():
            generated_ids = model.generate(
                model_inputs.input_ids,
                max_new_tokens=min(request.max_tokens, config['max_tokens']),
                temperature=request.temperature,
                do_sample=True,
                pad_token_id=tokenizer.eos_token_id,
                use_cache=True,  # Enable KV cache for efficiency
                early_stopping=True  # Stop early when possible
            )
        
        # Extract and decode response
        generated_ids = [output_ids[len(input_ids):] for input_ids, output_ids in zip(model_inputs.input_ids, generated_ids)]
        response = tokenizer.batch_decode(generated_ids, skip_special_tokens=True)[0]
        
        # Clean up tensors to free memory
        del model_inputs, generated_ids
        gc.collect()
        
        return ChatResponse(
            response=response.strip(),
            timestamp=datetime.utcnow().isoformat(),
            model='Qwen2.5-7B-Instruct'
        )
        
    except Exception as e:
        gc.collect()  # Clean up on error
        raise HTTPException(status_code=500, detail=f'Error generating response: {str(e)}')

@app.get('/api-info')
async def api_info():
    return {
        'authentication': {
            'methods': ['API Key', 'Username/Password'],
            'api_key_header': 'Authorization: Bearer <your-api-key>',
            'login_endpoint': '/auth/login'
        },
        'endpoints': {
            'GET /chat-ui': 'Web chat interface',
            'POST /chat': 'Main chat endpoint (requires auth)',
            'POST /auth/login': 'Get JWT token', 
            'GET /health': 'Health check (public)',
            'GET /api-info': 'This endpoint (public)',
            'GET /docs': 'Interactive API documentation'
        },
        'default_credentials': {
            'demo_user': {'username': 'demo', 'password': 'demo123'},
            'admin_user': {'username': 'admin', 'password': 'admin123'},
            'api_keys': ['sk-demo123456789', 'sk-test987654321', 'sk-prod555666777']
        },
        'example_usage': {
            'web_interface': 'http://35.178.11.53:8000/chat-ui',
            'curl_with_api_key': 'curl -X POST http://35.178.11.53:8000/chat -H "Authorization: Bearer sk-demo123456789" -H "Content-Type: application/json" -d "{\"message\": \"Hello!\", \"max_tokens\": 100}"',
            'login_first': 'curl -X POST http://35.178.11.53:8000/auth/login -H "Content-Type: application/json" -d "{\"username\": \"demo\", \"password\": \"demo123\"}"'
        }
    }

if __name__ == '__main__':
    uvicorn.run(app, host='0.0.0.0', port=8000)