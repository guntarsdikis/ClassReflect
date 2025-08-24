#!/usr/bin/env python3
"""
Test client for the LLM API server
Usage: python test-llm-api.py <server_ip>
"""

import requests
import json
import sys

def test_api_key_auth(base_url, api_key):
    """Test API key authentication"""
    print("🔑 Testing API key authentication...")
    
    headers = {"Authorization": f"Bearer {api_key}"}
    data = {
        "message": "Hello! Can you tell me a short joke?",
        "max_tokens": 100,
        "temperature": 0.7
    }
    
    try:
        response = requests.post(f"{base_url}/chat", json=data, headers=headers)
        if response.status_code == 200:
            result = response.json()
            print(f"✅ API Key auth successful!")
            print(f"Response: {result['response']}")
            return True
        else:
            print(f"❌ API Key auth failed: {response.status_code} - {response.text}")
            return False
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

def test_username_password_auth(base_url, username, password):
    """Test username/password authentication"""
    print("👤 Testing username/password authentication...")
    
    # First, login to get JWT token
    login_data = {"username": username, "password": password}
    
    try:
        login_response = requests.post(f"{base_url}/auth/login", json=login_data)
        if login_response.status_code != 200:
            print(f"❌ Login failed: {login_response.status_code} - {login_response.text}")
            return False
        
        token = login_response.json()["access_token"]
        print("✅ Login successful, got JWT token")
        
        # Now use JWT token for chat
        headers = {"Authorization": f"Bearer {token}"}
        chat_data = {
            "message": "What is the capital of France?",
            "max_tokens": 50,
            "temperature": 0.5
        }
        
        chat_response = requests.post(f"{base_url}/chat", json=chat_data, headers=headers)
        if chat_response.status_code == 200:
            result = chat_response.json()
            print(f"✅ JWT auth successful!")
            print(f"Response: {result['response']}")
            return True
        else:
            print(f"❌ Chat with JWT failed: {chat_response.status_code} - {chat_response.text}")
            return False
            
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

def main():
    if len(sys.argv) != 2:
        print("Usage: python test-llm-api.py <server_ip>")
        print("Example: python test-llm-api.py 13.41.224.218")
        sys.exit(1)
    
    server_ip = sys.argv[1]
    base_url = f"http://{server_ip}:8000"
    
    print(f"🧪 Testing LLM API at {base_url}")
    print("=" * 50)
    
    # Test health endpoint
    try:
        health_response = requests.get(f"{base_url}/health")
        if health_response.status_code == 200:
            print("✅ Health check passed")
        else:
            print("❌ Health check failed")
    except:
        print("❌ Server not reachable")
        return
    
    # Get API info
    try:
        info_response = requests.get(f"{base_url}/api-info")
        if info_response.status_code == 200:
            print("📋 API Info retrieved")
        else:
            print("⚠️  Could not get API info")
    except:
        print("⚠️  Could not get API info")
    
    print("\n" + "=" * 50)
    
    # Test both authentication methods
    success_count = 0
    
    # Test API key
    if test_api_key_auth(base_url, "sk-demo123456789"):
        success_count += 1
    
    print("\n" + "-" * 30 + "\n")
    
    # Test username/password
    if test_username_password_auth(base_url, "demo", "demo123"):
        success_count += 1
    
    print("\n" + "=" * 50)
    print(f"✨ Tests completed: {success_count}/2 passed")
    
    if success_count == 2:
        print("🎉 All tests passed! Your LLM API is working correctly.")
        print("\n📚 How to use:")
        print(f"curl -X POST {base_url}/chat \\")
        print("  -H 'Authorization: Bearer sk-demo123456789' \\")
        print("  -H 'Content-Type: application/json' \\")
        print("  -d '{\"message\": \"Hello AI!\", \"max_tokens\": 100}'")
    else:
        print("⚠️  Some tests failed. Check the server logs.")

if __name__ == "__main__":
    main()