// Global state
let authToken = null;
let isModelReady = false;
let authMethod = 'apikey'; // 'apikey' or 'jwt'
let userInfo = '';

// API Base URL
const API_BASE = window.location.origin;

// DOM Elements
const loginScreen = document.getElementById('loginScreen');
const chatScreen = document.getElementById('chatScreen');
const authTabs = document.querySelectorAll('.auth-tab');
const authForms = document.querySelectorAll('.auth-form');
const apikeyForm = document.getElementById('apikeyForm');
const usernameForm = document.getElementById('usernameForm');
const loginError = document.getElementById('loginError');
const loginStatus = document.getElementById('loginStatus');
const logoutBtn = document.getElementById('logoutBtn');
const chatMessages = document.getElementById('chatMessages');
const messageInput = document.getElementById('messageInput');
const sendBtn = document.getElementById('sendBtn');
const chatForm = document.getElementById('chatForm');
const modelStatus = document.getElementById('modelStatus');
const userInfoSpan = document.getElementById('userInfo');
const maxTokensInput = document.getElementById('maxTokens');
const temperatureInput = document.getElementById('temperature');
const temperatureValue = document.getElementById('temperatureValue');

// Utility Functions
function showError(message) {
    loginError.textContent = message;
    loginError.style.display = 'block';
    loginStatus.style.display = 'none';
}

function showStatus(message) {
    loginStatus.textContent = message;
    loginStatus.style.display = 'block';
    loginError.style.display = 'none';
}

function hideMessages() {
    loginError.style.display = 'none';
    loginStatus.style.display = 'none';
}

function switchScreen(screen) {
    if (screen === 'chat') {
        loginScreen.classList.add('hidden');
        chatScreen.classList.remove('hidden');
    } else {
        chatScreen.classList.add('hidden');
        loginScreen.classList.remove('hidden');
    }
}

function scrollToBottom() {
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

function addMessage(content, isUser = false, isLoading = false) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${isUser ? 'user-message' : 'bot-message'}`;
    
    if (isLoading) {
        messageDiv.innerHTML = `
            <div class="message-content message-loading">
                <div class="typing-indicator">
                    <div class="typing-dot"></div>
                    <div class="typing-dot"></div>
                    <div class="typing-dot"></div>
                </div>
                <span>AI is thinking...</span>
            </div>
        `;
    } else {
        messageDiv.innerHTML = `
            <div class="message-content">
                ${content.replace(/\n/g, '<br>')}
            </div>
        `;
    }
    
    chatMessages.appendChild(messageDiv);
    scrollToBottom();
    return messageDiv;
}

function removeMessage(messageElement) {
    if (messageElement && messageElement.parentNode) {
        messageElement.parentNode.removeChild(messageElement);
    }
}

// API Functions
async function makeRequest(endpoint, options = {}) {
    const headers = {
        'Content-Type': 'application/json',
        ...options.headers
    };
    
    if (authToken) {
        headers['Authorization'] = `Bearer ${authToken}`;
    }
    
    const response = await fetch(`${API_BASE}${endpoint}`, {
        ...options,
        headers
    });
    
    if (!response.ok) {
        const error = await response.json().catch(() => ({ detail: 'Unknown error' }));
        throw new Error(error.detail || `HTTP ${response.status}`);
    }
    
    return response.json();
}

async function checkModelStatus() {
    try {
        const health = await makeRequest('/health');
        if (health.model_loaded) {
            isModelReady = true;
            modelStatus.textContent = 'Model Ready';
            modelStatus.className = 'status-badge ready';
            messageInput.disabled = false;
            sendBtn.disabled = false;
            messageInput.placeholder = 'Type your message here...';
        } else {
            modelStatus.textContent = 'Model Loading...';
            modelStatus.className = 'status-badge loading';
            messageInput.disabled = true;
            sendBtn.disabled = true;
            messageInput.placeholder = 'Please wait for model to load...';
        }
    } catch (error) {
        console.error('Error checking model status:', error);
    }
}

async function loginWithApiKey(apiKey) {
    try {
        showStatus('Validating API key...');
        
        // Test the API key with a simple request
        const response = await fetch(`${API_BASE}/health`, {
            headers: {
                'Authorization': `Bearer ${apiKey}`
            }
        });
        
        if (response.ok) {
            authToken = apiKey;
            authMethod = 'apikey';
            userInfo = `API Key: ${apiKey.substring(0, 12)}...`;
            return true;
        } else {
            throw new Error('Invalid API key');
        }
    } catch (error) {
        throw new Error(`API key authentication failed: ${error.message}`);
    }
}

async function loginWithCredentials(username, password) {
    try {
        showStatus('Logging in...');
        
        const response = await fetch(`${API_BASE}/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username, password })
        });
        
        if (!response.ok) {
            const error = await response.json().catch(() => ({ detail: 'Login failed' }));
            throw new Error(error.detail);
        }
        
        const data = await response.json();
        authToken = data.access_token;
        authMethod = 'jwt';
        userInfo = `User: ${username}`;
        return true;
    } catch (error) {
        throw new Error(`Login failed: ${error.message}`);
    }
}

async function sendMessage(message, maxTokens, temperature) {
    try {
        const response = await makeRequest('/chat', {
            method: 'POST',
            body: JSON.stringify({
                message: message,
                max_tokens: parseInt(maxTokens),
                temperature: parseFloat(temperature)
            })
        });
        
        return response.response;
    } catch (error) {
        throw new Error(`Chat error: ${error.message}`);
    }
}

// Event Handlers
authTabs.forEach(tab => {
    tab.addEventListener('click', () => {
        const tabType = tab.dataset.tab;
        
        // Update active tab
        authTabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        
        // Update active form
        authForms.forEach(form => form.classList.remove('active'));
        document.getElementById(`${tabType}Form`).classList.add('active');
        
        hideMessages();
    });
});

apikeyForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const apiKey = document.getElementById('apiKey').value.trim();
    
    if (!apiKey) {
        showError('Please enter an API key');
        return;
    }
    
    try {
        await loginWithApiKey(apiKey);
        userInfoSpan.textContent = userInfo;
        switchScreen('chat');
        await checkModelStatus();
        
        // Start model status polling
        const statusInterval = setInterval(async () => {
            await checkModelStatus();
            if (isModelReady) {
                clearInterval(statusInterval);
            }
        }, 5000);
        
    } catch (error) {
        showError(error.message);
    }
});

usernameForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value.trim();
    
    if (!username || !password) {
        showError('Please enter both username and password');
        return;
    }
    
    try {
        await loginWithCredentials(username, password);
        userInfoSpan.textContent = userInfo;
        switchScreen('chat');
        await checkModelStatus();
        
        // Start model status polling
        const statusInterval = setInterval(async () => {
            await checkModelStatus();
            if (isModelReady) {
                clearInterval(statusInterval);
            }
        }, 5000);
        
    } catch (error) {
        showError(error.message);
    }
});

logoutBtn.addEventListener('click', () => {
    authToken = null;
    userInfo = '';
    isModelReady = false;
    chatMessages.innerHTML = `
        <div class="welcome-message">
            <div class="message bot-message">
                <div class="message-content">
                    <strong>Welcome to Qwen2.5 Chat!</strong><br>
                    I'm a 7 billion parameter AI assistant ready to help you with questions, creative writing, code, and more.
                    <br><br>
                    <em>Please wait for the model to finish loading before sending your first message...</em>
                </div>
            </div>
        </div>
    `;
    switchScreen('login');
    hideMessages();
});

chatForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const message = messageInput.value.trim();
    if (!message || !isModelReady) return;
    
    const maxTokens = maxTokensInput.value;
    const temperature = temperatureInput.value;
    
    // Add user message
    addMessage(message, true);
    messageInput.value = '';
    
    // Add loading message
    const loadingMessage = addMessage('', false, true);
    
    // Disable input while processing
    messageInput.disabled = true;
    sendBtn.disabled = true;
    
    try {
        const response = await sendMessage(message, maxTokens, temperature);
        removeMessage(loadingMessage);
        addMessage(response, false);
    } catch (error) {
        removeMessage(loadingMessage);
        addMessage(`❌ Error: ${error.message}`, false);
    } finally {
        // Re-enable input
        messageInput.disabled = false;
        sendBtn.disabled = false;
        messageInput.focus();
    }
});

// Auto-resize textarea
messageInput.addEventListener('input', function() {
    this.style.height = 'auto';
    this.style.height = Math.min(this.scrollHeight, 120) + 'px';
});

// Temperature slider update
temperatureInput.addEventListener('input', function() {
    temperatureValue.textContent = this.value;
});

// Enter key handling
messageInput.addEventListener('keydown', function(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        if (!this.disabled && isModelReady) {
            chatForm.dispatchEvent(new Event('submit'));
        }
    }
});

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    // Check if already authenticated (for page refresh)
    const savedToken = localStorage.getItem('authToken');
    const savedAuthMethod = localStorage.getItem('authMethod');
    const savedUserInfo = localStorage.getItem('userInfo');
    
    if (savedToken) {
        authToken = savedToken;
        authMethod = savedAuthMethod || 'apikey';
        userInfo = savedUserInfo || 'Unknown user';
        userInfoSpan.textContent = userInfo;
        switchScreen('chat');
        checkModelStatus();
        
        // Start model status polling
        const statusInterval = setInterval(async () => {
            await checkModelStatus();
            if (isModelReady) {
                clearInterval(statusInterval);
            }
        }, 5000);
    }
});

// Save auth state to localStorage
window.addEventListener('beforeunload', () => {
    if (authToken) {
        localStorage.setItem('authToken', authToken);
        localStorage.setItem('authMethod', authMethod);
        localStorage.setItem('userInfo', userInfo);
    } else {
        localStorage.removeItem('authToken');
        localStorage.removeItem('authMethod');
        localStorage.removeItem('userInfo');
    }
});