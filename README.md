# ABE Messenger - Setup and Running Instructions

## Overview
This is a secure messaging application that uses Attribute-Based Encryption (ABE) to control access to messages. Only users with matching attributes can decrypt and read encrypted messages.

## Project Structure
```
abe-messenger/
├── app.py              # Flask backend server
├── index.html          # Frontend HTML/CSS
├── app.js              # Frontend JavaScript with ABE logic
└── README.md           # This file
```

## Prerequisites

### Required Software
1. **Python 3.8+** - Download from [python.org](https://www.python.org/downloads/)
2. **pip** - Python package installer (included with Python)
3. **A modern web browser** - Chrome, Firefox, Safari, or Edge

### Required Python Packages
```bash
pip install flask flask-cors
```

## Installation Steps

### Step 1: Create Project Directory
```bash
mkdir abe-messenger
cd abe-messenger
```

### Step 2: Save the Files
Save the three files in your project directory:
- `app.py` - The Flask server
- `index.html` - The frontend interface
- `app.js` - The frontend JavaScript logic

### Step 3: Install Dependencies
```bash
pip install flask flask-cors
```

## Running the Application

### Step 1: Start the Flask Server
Open a terminal in your project directory and run:
```bash
python app.py
```

You should see output like:
```
 * Serving Flask app 'app'
 * Debug mode: on
 * Running on http://127.0.0.1:5000
```

**Keep this terminal window open** - this is your server running.

**Important:** If you get CORS errors, you may need to serve the HTML file through a simple HTTP server:
```bash
# Python 3
python -m http.server 8000

# Then open: http://localhost:8000
```

### Step 3: Test with Multiple Users
To simulate multiple users:
1. Open the application in different browser windows or use incognito/private browsing modes
2. Register different users with different email addresses
3. Create a chat room with one user
4. Join the chat with another user
5. Test the ABE encryption functionality

## How to Use the Application

### 1. Login/Register
- Enter your email and name
- Click "Login"
- The system will create an account or log you in if you already exist

### 2. Create a Chat Room
- Click "Create Chat" button in the sidebar
- Enter a chat name
- Click "Create"
- You are now the **Trusted Authority** for this chat

### 3. Join a Chat Room
- Click "Join Chat" button in the sidebar
- Select an available chat from the dropdown
- Click "Request to Join"
- Wait for the chat creator to approve you

### 4. Approve Users (as Creator)
- In your chat, click "Manage Users"
- View pending join requests
- Click "Approve" and assign attributes (e.g., "Manager, Developer")
- Users can now access the chat

### 5. Send Messages

**Unencrypted Messages:**
- Type your message
- Click "Send"
- Everyone in the chat can read it

**Encrypted Messages (ABE):**
- Type your message
- Check the "Encrypt with ABE" checkbox
- Select the required attributes by clicking on them (they turn green)
- Click "Send"
- Only users with ALL selected attributes can decrypt and read the message

### 6. Manage User Attributes (as Creator)
- Click "Manage Users"
- In the "Current Users" section, click "Edit" next to a user
- Enter new attributes (comma-separated)
- The user's access rights are updated immediately

## Key Features

### Attribute-Based Encryption
- Messages can be encrypted with specific attribute requirements
- Only users possessing ALL required attributes can decrypt messages
- Uses a simple Caesar cipher implementation (for demonstration)
- In production, replace with a proper ABE library

### Trusted Authority System
- Chat creators are Trusted Authorities
- They approve new users and assign attributes
- They can modify user attributes at any time

### Automatic Refresh
- Messages refresh every 60 seconds automatically
- Keeps all users synchronized

### Security Features
- Encrypted messages cannot be read without proper attributes
- Users see a locked message indicator if they lack access
- Prevents spoofing through attribute verification

## Testing Scenarios

### Scenario 1: Basic Encrypted Chat
1. Create a chat as User A
2. User B requests to join
3. User A approves User B with "Manager" attribute
4. User A sends a message encrypted for "Manager"
5. User B can read it
6. User A sends a message encrypted for "Admin"
7. User B sees it as locked (needs Admin attribute)

### Scenario 2: Multiple Attributes
1. Assign User B attributes: "Manager, Developer"
2. Send a message requiring "Manager, Developer"
3. User B can read it
4. Send a message requiring "Manager, Admin"
5. User B cannot read it (missing Admin)

### Scenario 3: Attribute Updates
1. Remove "Manager" from User B's attributes
2. User B can no longer decrypt messages requiring "Manager"
3. Previously sent encrypted messages become unreadable

## Troubleshooting

### Server Won't Start
**Error:** `Address already in use`
**Solution:** Change the port in `app.py`:
```python
app.run(debug=True, port=5001)  # Use different port
```
Then update `API_BASE` in `app.js` to match.

### CORS Errors
**Error:** `Access to fetch has been blocked by CORS policy`
**Solution:** Ensure `flask-cors` is installed and the server is running. Or serve HTML via HTTP server.

### Messages Not Refreshing
**Check:**
- Is the Flask server running?
- Open browser console (F12) - any errors?
- Check network requests in the browser dev tools

### Can't Decrypt Messages
**Check:**
- Do you have ALL required attributes?
- Click "Info" to see your current attributes
- Contact the chat creator to update your attributes

## Production Considerations

### Security Improvements Needed
1. **Real ABE Implementation:** Replace the Caesar cipher with a proper ABE library like [Charm-Crypto](https://github.com/JHUISI/charm)
2. **Authentication:** Implement OAuth2 with Google as planned
3. **Database:** Replace in-memory storage with PostgreSQL or MongoDB
4. **HTTPS:** Use TLS/SSL certificates for encrypted communication
5. **Key Management:** Implement proper key generation and distribution
6. **Session Management:** Add JWT tokens for secure authentication

### Scalability Improvements
1. **WebSockets:** Use Socket.IO for real-time messaging instead of polling
2. **Redis:** Add Redis for session storage and caching
3. **Load Balancing:** Deploy behind Nginx or similar
4. **Cloud Hosting:** Deploy to AWS, Google Cloud, or Heroku

### Additional Features to Implement
- File sharing with ABE encryption
- Message editing and deletion
- User profiles and avatars
- Read receipts
- Typing indicators
- Push notifications
- Message search
- Export chat history

## Support and Documentation

### Project Documentation
Refer to the project proposal document for:
- Detailed architecture
- Risk management strategy
- Project timeline
- Team roles and responsibilities

### Common Attributes Examples
- **Admin** - Full access, administrative privileges
- **Manager** - Management-level information
- **Developer** - Technical/development content
- **HR** - Human resources information
- **Member** - General membership
- **Guest** - Limited access

### API Endpoints
- `POST /api/register` - Register/login user
- `POST /api/sessions/create` - Create chat room
- `POST /api/sessions/join` - Request to join chat
- `POST /api/sessions/<id>/approve` - Approve user (creator only)
- `POST /api/sessions/<id>/attributes` - Update attributes (creator only)
- `POST /api/sessions/<id>/messages` - Send message
- `GET /api/sessions/<id>/messages` - Get messages
- `GET /api/sessions/<id>/info` - Get session info
- `GET /api/users/<id>/sessions` - Get user's sessions
- `GET /api/sessions/list` - List all sessions

## License
Educational project for CS/IT5041 - Cryptography course.

## Team
- Benjamin Mannal
- Suhitha Kantareddy
- Tristan Coull

---

**Note:** This is a prototype implementation for educational purposes. For production use, implement proper ABE libraries, secure authentication, and database persistence.
