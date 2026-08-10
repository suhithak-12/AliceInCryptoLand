// Configuration
// Dynamically determine the API base URL
const getApiBase = () => {
    // If you want to override for production, set this in localStorage:
    // localStorage.setItem('API_BASE', 'http://your-server-ip:5000/api')
    const override = localStorage.getItem('API_BASE');
    if (override) return override;
    
    // For development: use the current hostname but port 5000
    // This allows it to work across devices on the same network
    const hostname = window.location.hostname;
    return `http://${hostname}:5000/api`;
};

const API_BASE = getApiBase();
const REFRESH_INTERVAL = 10000; // 10 seconds

console.log('API Base URL:', API_BASE);

// State
let currentUser = null;
let currentSession = null;
let refreshTimer = null;
let availableAttributes = ['Admin', 'Manager', 'Developer', 'Member', 'Guest'];

// Attribute-Based Encryption (AES-GCM with attribute-derived key)
class ABECrypto {
    static async deriveKey(requiredAttributes) {
        const encoder = new TextEncoder();
        const data = encoder.encode(requiredAttributes.sort().join('|'));
        const hash = await crypto.subtle.digest('SHA-256', data);

        return crypto.subtle.importKey(
            'raw',
            hash,
            { name: 'AES-GCM' },
            false,
            ['encrypt', 'decrypt']
        );
    }

    static async encrypt(message, requiredAttributes) {
        const encoder = new TextEncoder();
        const iv = crypto.getRandomValues(new Uint8Array(12));
        const key = await this.deriveKey(requiredAttributes);

        const ciphertext = await crypto.subtle.encrypt(
            { name: 'AES-GCM', iv },
            key,
            encoder.encode(message)
        );

        return btoa(
            JSON.stringify({
                iv: Array.from(iv),
                ct: Array.from(new Uint8Array(ciphertext)),
                attrs: requiredAttributes
            })
        );
    }

    static async decrypt(encryptedMessage, userAttributes, requiredAttributes) {
        const allowed = requiredAttributes.every(a => userAttributes.includes(a));
        if (!allowed) return null;

        let payload;
        try {
            payload = JSON.parse(atob(encryptedMessage));
        } catch {
            return null;
        }

        const iv = new Uint8Array(payload.iv);
        const ciphertext = new Uint8Array(payload.ct);
        const key = await this.deriveKey(requiredAttributes);

        try {
            const plaintext = await crypto.subtle.decrypt(
                { name: 'AES-GCM', iv },
                key,
                ciphertext
            );
            return new TextDecoder().decode(plaintext);
        } catch {
            return null;
        }
    }
}

// API Functions
async function apiCall(endpoint, method = 'GET', data = null) {
    const options = {
        method,
        headers: {
            'Content-Type': 'application/json',
        },
    };
    
    if (data) {
        options.body = JSON.stringify(data);
    }
    
    const response = await fetch(`${API_BASE}${endpoint}`, options);
    return response.json();
}

// Authentication
async function login() {
    const email = document.getElementById('loginEmail').value.trim();
    const name = document.getElementById('loginName').value.trim();
    
    if (!email || !name) {
        alert('Please enter both email and name');
        return;
    }
    
    try {
        const result = await apiCall('/register', 'POST', { email, name });
        currentUser = result;
        
        document.getElementById('userInfoDisplay').textContent = `${name} (${email})`;
        hideModal('loginModal');
        
        await loadUserSessions();
        startAutoRefresh();
    } catch (error) {
        alert('Login failed: ' + error.message);
    }
}

// Session Management
async function loadUserSessions() {
    if (!currentUser) return;
    
    try {
        const result = await apiCall(`/users/${currentUser.user_id}/sessions`);
        const sessionsList = document.getElementById('sessionsList');
        sessionsList.innerHTML = '';
        
        if (result.sessions.length === 0) {
            sessionsList.innerHTML = '<div style="padding: 10px; color: #72767d; font-size: 12px;">No chats yet. Create or join one!</div>';
            return;
        }
        
        result.sessions.forEach(session => {
            const sessionDiv = document.createElement('div');
            sessionDiv.className = 'session-item';
            sessionDiv.onclick = () => loadSession(session.session_id);
            
            sessionDiv.innerHTML = `
                <div class="session-name">${session.name}</div>
                <div class="session-info">
                    ${session.user_count} members
                    ${session.is_creator ? ' • Creator' : ''}
                </div>
            `;
            
            sessionsList.appendChild(sessionDiv);
        });
    } catch (error) {
        console.error('Failed to load sessions:', error);
    }
}

function showCreateSession() {
    document.getElementById('createSessionModal').classList.add('active');
}

async function createSession() {
    const sessionName = document.getElementById('sessionName').value.trim();
    
    if (!sessionName) {
        alert('Please enter a chat name');
        return;
    }
    
    try {
        const result = await apiCall('/sessions/create', 'POST', {
            creator_id: currentUser.user_id,
            session_name: sessionName
        });
        
        hideModal('createSessionModal');
        document.getElementById('sessionName').value = '';
        
        await loadUserSessions();
        await loadSession(result.session_id);
    } catch (error) {
        alert('Failed to create chat: ' + error.message);
    }
}

async function showJoinSession() {
    try {
        const result = await apiCall('/sessions/list');
        const select = document.getElementById('availableSessions');
        select.innerHTML = '<option value="">Select a chat...</option>';
        
        result.sessions.forEach(session => {
            const option = document.createElement('option');
            option.value = session.session_id;
            option.textContent = `${session.name} (${session.user_count}/${session.max_users} members)`;
            select.appendChild(option);
        });
        
        document.getElementById('joinSessionModal').classList.add('active');
    } catch (error) {
        alert('Failed to load available chats: ' + error.message);
    }
}

async function joinSession() {
    const sessionId = document.getElementById('availableSessions').value;
    
    if (!sessionId) {
        alert('Please select a chat');
        return;
    }
    
    try {
        const result = await apiCall('/sessions/join', 'POST', {
            session_id: sessionId,
            user_id: currentUser.user_id
        });
        
        if (result.status === 'pending_approval') {
            alert('Join request sent! Waiting for approval from the chat creator.');
        } else if (result.status === 'already_joined') {
            alert('You are already in this chat!');
            await loadSession(sessionId);
        }
        
        hideModal('joinSessionModal');
        await loadUserSessions();
    } catch (error) {
        alert('Failed to join chat: ' + error.message);
    }
}

// Load Session
async function loadSession(sessionId) {
    currentSession = sessionId;
    
    try {
        const info = await apiCall(`/sessions/${sessionId}/info?user_id=${currentUser.user_id}`);
        
        document.getElementById('chatTitle').textContent = info.name;
        document.getElementById('welcomeScreen').classList.add('hidden');
        document.getElementById('chatArea').classList.remove('hidden');
        
        if (info.is_creator) {
            document.getElementById('manageUsersBtn').style.display = 'inline-block';
        } else {
            document.getElementById('manageUsersBtn').style.display = 'none';
        }
        
        document.querySelectorAll('.session-item').forEach(item => {
            item.classList.remove('active');
        });
        
        await loadMessages();
        updateAttributeChips(info.attributes);
    } catch (error) {
        alert('Failed to load chat: ' + error.message);
    }
}

// Load Messages
async function loadMessages() {
    if (!currentSession) return;
    
    try {
        const result = await apiCall(`/sessions/${currentSession}/messages?user_id=${currentUser.user_id}`);
        const container = document.getElementById('messagesContainer');
        container.innerHTML = '';
        
        for (const msg of result.messages) {
            const messageDiv = document.createElement('div');
            let content = msg.message;
            let isLocked = false;
            
            if (msg.encrypted) {
                const decrypted = await ABECrypto.decrypt(
                    msg.message,
                    result.user_attributes,
                    msg.required_attributes
                );
                
                if (decrypted) {
                    content = decrypted;
                    messageDiv.className = 'message message-encrypted';
                } else {
                    content = '🔒 This message is encrypted. You need the following attributes to view it: ' + msg.required_attributes.join(', ');
                    messageDiv.className = 'message message-locked';
                    isLocked = true;
                }
            } else {
                messageDiv.className = 'message';
            }
            
            const time = new Date(msg.timestamp).toLocaleTimeString([], { 
                hour: '2-digit', 
                minute: '2-digit' 
            });
            
            messageDiv.innerHTML = `
                <div class="message-header">
                    <span class="message-author">${msg.user_name}</span>
                    <span class="message-time">${time}</span>
                </div>
                <div class="message-content">${content}</div>
                ${msg.encrypted && !isLocked ? `<div class="encryption-info">🔐 Encrypted for: ${msg.required_attributes.join(', ')}</div>` : ''}
            `;
            
            container.appendChild(messageDiv);
        }
        
        container.scrollTop = container.scrollHeight;
    } catch (error) {
        console.error('Failed to load messages:', error);
    }
}

// Message Sending
function toggleEncryption() {
    const checked = document.getElementById('encryptToggle').checked;
    const selector = document.getElementById('attributeSelector');
    
    if (checked) {
        selector.classList.add('active');
    } else {
        selector.classList.remove('active');
    }
}

function updateAttributeChips(sessionAttributes) {
    const container = document.getElementById('attributeChips');
    container.innerHTML = '';
    
    const allAttributes = new Set();
    Object.values(sessionAttributes).forEach(attrs => {
        attrs.forEach(attr => allAttributes.add(attr));
    });
    
    allAttributes.forEach(attr => {
        const chip = document.createElement('div');
        chip.className = 'attribute-chip';
        chip.textContent = attr;
        chip.onclick = () => toggleAttributeChip(chip);
        container.appendChild(chip);
    });
}

function toggleAttributeChip(chip) {
    chip.classList.toggle('selected');
}

async function sendMessage() {
    const input = document.getElementById('messageInput');
    const message = input.value.trim();
    
    if (!message || !currentSession) return;
    
    const encrypted = document.getElementById('encryptToggle').checked;
    let messageToSend = message;
    let requiredAttributes = [];
    
    if (encrypted) {
        const selectedChips = document.querySelectorAll('.attribute-chip.selected');
        requiredAttributes = Array.from(selectedChips).map(chip => chip.textContent);
        
        if (requiredAttributes.length === 0) {
            alert('Please select at least one attribute for encryption');
            return;
        }
        
        messageToSend = await ABECrypto.encrypt(message, requiredAttributes);
    }
    
    try {
        await apiCall(`/sessions/${currentSession}/messages`, 'POST', {
            user_id: currentUser.user_id,
            message: messageToSend,
            encrypted: encrypted,
            required_attributes: requiredAttributes
        });
        
        input.value = '';
        document.getElementById('encryptToggle').checked = false;
        toggleEncryption();
        
        document.querySelectorAll('.attribute-chip.selected').forEach(chip => {
            chip.classList.remove('selected');
        });
        
        await loadMessages();
    } catch (error) {
        alert('Failed to send message: ' + error.message);
    }
}

// Enter key to send
document.addEventListener('DOMContentLoaded', () => {
    const input = document.getElementById('messageInput');
    if (input) {
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
            }
        });
    }
});

// User Management
async function showManageUsers() {
    try {
        const info = await apiCall(`/sessions/${currentSession}/info?user_id=${currentUser.user_id}`);
        
        const requestsList = document.getElementById('requestsList');
        requestsList.innerHTML = '';
        
        const pendingCount = Object.keys(info.pending_requests).length;
        if (pendingCount === 0) {
            requestsList.innerHTML = '<p style="color: #72767d; font-size: 12px;">No pending requests</p>';
        } else {
            Object.entries(info.pending_requests).forEach(([userId, request]) => {
                const requestDiv = document.createElement('div');
                requestDiv.className = 'request-item';
                requestDiv.innerHTML = `
                    <div>
                        <strong>${request.name}</strong><br>
                        <small style="color: #b9bbbe;">${request.email}</small>
                    </div>
                    <div class="request-actions">
                        <button class="btn btn-small" onclick="approveUser('${userId}')">Approve</button>
                    </div>
                `;
                requestsList.appendChild(requestDiv);
            });
        }
        
        const usersList = document.getElementById('currentUsersList');
        usersList.innerHTML = '';
        
        Object.entries(info.users).forEach(([userId, userName]) => {
            const userDiv = document.createElement('div');
            userDiv.className = 'request-item';
            
            const userAttributes = info.attributes[userId] || [];
            const isCreator = userId === info.creator;
            
            userDiv.innerHTML = `
                <div>
                    <strong>${userName}</strong> ${isCreator ? '(Creator)' : ''}<br>
                    <small style="color: #b9bbbe;">Attributes: ${userAttributes.join(', ')}</small>
                </div>
                ${!isCreator ? `<button class="btn btn-small btn-secondary" onclick="showEditAttributes('${userId}', '${userName}')">Edit</button>` : ''}
            `;
            usersList.appendChild(userDiv);
        });
        
        document.getElementById('manageUsersModal').classList.add('active');
    } catch (error) {
        alert('Failed to load user management: ' + error.message);
    }
}

async function approveUser(userId) {
    const attributes = prompt('Enter attributes for this user (comma-separated):\nAvailable: ' + availableAttributes.join(', '), 'Member');
    
    if (!attributes) return;
    
    const attrList = attributes.split(',').map(a => a.trim()).filter(a => a);
    
    try {
        await apiCall(`/sessions/${currentSession}/approve`, 'POST', {
            creator_id: currentUser.user_id,
            user_id: userId,
            attributes: attrList
        });
        
        alert('User approved!');
        await showManageUsers();
    } catch (error) {
        alert('Failed to approve user: ' + error.message);
    }
}

async function showEditAttributes(userId, userName) {
    const attributes = prompt(`Edit attributes for ${userName} (comma-separated):\nAvailable: ${availableAttributes.join(', ')}`);
    
    if (!attributes) return;
    
    const attrList = attributes.split(',').map(a => a.trim()).filter(a => a);
    
    try {
        await apiCall(`/sessions/${currentSession}/attributes`, 'POST', {
            creator_id: currentUser.user_id,
            user_id: userId,
            attributes: attrList
        });
        
        alert('Attributes updated!');
        await showManageUsers();
    } catch (error) {
        alert('Failed to update attributes: ' + error.message);
    }
}

async function showSessionInfo() {
    try {
        const info = await apiCall(`/sessions/${currentSession}/info?user_id=${currentUser.user_id}`);
        
        const content = document.getElementById('sessionInfoContent');
        content.innerHTML = `
            <div style="margin: 10px 0;">
                <strong>Chat Name:</strong> ${info.name}
            </div>
            <div style="margin: 10px 0;">
                <strong>Members:</strong> ${Object.keys(info.users).length}/6
            </div>
            <div style="margin: 10px 0;">
                <strong>Your Attributes:</strong> ${info.attributes[currentUser.user_id]?.join(', ') || 'None'}
            </div>
            <div style="margin: 10px 0;">
                <strong>Role:</strong> ${info.is_creator ? 'Creator (Trusted Authority)' : 'Member'}
            </div>
        `;
        
        document.getElementById('sessionInfoModal').classList.add('active');
    } catch (error) {
        alert('Failed to load session info: ' + error.message);
    }
}

// Auto Refresh
function startAutoRefresh() {
    if (refreshTimer) {
        clearInterval(refreshTimer);
    }
    
    refreshTimer = setInterval(() => {
        if (currentSession) {
            loadMessages();
        }
        loadUserSessions();
    }, REFRESH_INTERVAL);
}

// Utility Functions
function hideModal(modalId) {
    document.getElementById(modalId).classList.remove('active');
}

// Initialize
console.log('ABE Messenger loaded. Please log in to continue.');