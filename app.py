from flask import Flask, request, jsonify, session
from flask_cors import CORS
import secrets
from datetime import datetime
import uuid

app = Flask(__name__)
app.secret_key = secrets.token_hex(32)
CORS(app, supports_credentials=True)

# In-memory storage
sessions_store = {}  # {session_id: {messages: [], users: {}, creator: "", attributes: {}}}
users_store = {}  # {user_id: {email: "", name: "", sessions: []}}

@app.route('/api/register', methods=['POST'])
def register():
    """Register a new user"""
    data = request.json
    email = data.get('email')
    name = data.get('name')
    
    if not email or not name:
        return jsonify({'error': 'Email and name required'}), 400
    
    # Check if user exists
    for user_id, user in users_store.items():
        if user['email'] == email:
            return jsonify({'user_id': user_id, 'email': email, 'name': name}), 200
    
    user_id = str(uuid.uuid4())
    users_store[user_id] = {
        'email': email,
        'name': name,
        'sessions': []
    }
    
    return jsonify({'user_id': user_id, 'email': email, 'name': name}), 201

@app.route('/api/sessions/create', methods=['POST'])
def create_session():
    """Create a new chat session"""
    data = request.json
    creator_id = data.get('creator_id')
    session_name = data.get('session_name')
    
    if not creator_id or not session_name:
        return jsonify({'error': 'Creator ID and session name required'}), 400
    
    if creator_id not in users_store:
        return jsonify({'error': 'User not found'}), 404
    
    session_id = str(uuid.uuid4())
    sessions_store[session_id] = {
        'name': session_name,
        'messages': [],
        'users': {creator_id: users_store[creator_id]['name']},
        'creator': creator_id,
        'attributes': {creator_id: ['Admin', 'Creator']},
        'pending_requests': {},
        'created_at': datetime.now().isoformat()
    }
    
    users_store[creator_id]['sessions'].append(session_id)
    
    return jsonify({
        'session_id': session_id,
        'session_name': session_name,
        'creator': creator_id
    }), 201

@app.route('/api/sessions/join', methods=['POST'])
def join_session():
    """Request to join a session"""
    data = request.json
    session_id = data.get('session_id')
    user_id = data.get('user_id')
    
    if not session_id or not user_id:
        return jsonify({'error': 'Session ID and user ID required'}), 400
    
    if session_id not in sessions_store:
        return jsonify({'error': 'Session not found'}), 404
    
    if user_id not in users_store:
        return jsonify({'error': 'User not found'}), 404
    
    session = sessions_store[session_id]
    
    # If user is already in session
    if user_id in session['users']:
        return jsonify({'status': 'already_joined'}), 200
    
    # Add to pending requests
    session['pending_requests'][user_id] = {
        'name': users_store[user_id]['name'],
        'email': users_store[user_id]['email'],
        'requested_at': datetime.now().isoformat()
    }
    
    return jsonify({'status': 'pending_approval'}), 200

@app.route('/api/sessions/<session_id>/approve', methods=['POST'])
def approve_user(session_id):
    """Approve a user to join session (only creator can do this)"""
    data = request.json
    creator_id = data.get('creator_id')
    user_id = data.get('user_id')
    attributes = data.get('attributes', ['Member'])
    
    if session_id not in sessions_store:
        return jsonify({'error': 'Session not found'}), 404
    
    session = sessions_store[session_id]
    
    if session['creator'] != creator_id:
        return jsonify({'error': 'Only creator can approve users'}), 403
    
    if user_id not in session['pending_requests']:
        return jsonify({'error': 'No pending request from this user'}), 404
    
    # Approve user
    session['users'][user_id] = users_store[user_id]['name']
    session['attributes'][user_id] = attributes
    del session['pending_requests'][user_id]
    
    users_store[user_id]['sessions'].append(session_id)
    
    return jsonify({'status': 'approved', 'attributes': attributes}), 200

@app.route('/api/sessions/<session_id>/attributes', methods=['POST'])
def update_attributes(session_id):
    """Update user attributes (only creator can do this)"""
    data = request.json
    creator_id = data.get('creator_id')
    target_user_id = data.get('user_id')
    attributes = data.get('attributes')
    
    if session_id not in sessions_store:
        return jsonify({'error': 'Session not found'}), 404
    
    session = sessions_store[session_id]
    
    if session['creator'] != creator_id:
        return jsonify({'error': 'Only creator can update attributes'}), 403
    
    if target_user_id not in session['users']:
        return jsonify({'error': 'User not in session'}), 404
    
    session['attributes'][target_user_id] = attributes
    
    return jsonify({'status': 'updated', 'attributes': attributes}), 200

@app.route('/api/sessions/<session_id>/messages', methods=['POST'])
def send_message(session_id):
    """Send a message to a session"""
    data = request.json
    user_id = data.get('user_id')
    message = data.get('message')
    encrypted = data.get('encrypted', False)
    required_attributes = data.get('required_attributes', [])
    
    if session_id not in sessions_store:
        return jsonify({'error': 'Session not found'}), 404
    
    session = sessions_store[session_id]
    
    if user_id not in session['users']:
        return jsonify({'error': 'User not in session'}), 403
    
    message_obj = {
        'id': str(uuid.uuid4()),
        'user_id': user_id,
        'user_name': users_store[user_id]['name'],
        'message': message,
        'encrypted': encrypted,
        'required_attributes': required_attributes,
        'timestamp': datetime.now().isoformat()
    }
    
    session['messages'].append(message_obj)
    
    return jsonify(message_obj), 201

@app.route('/api/sessions/<session_id>/messages', methods=['GET'])
def get_messages(session_id):
    """Get all messages from a session"""
    user_id = request.args.get('user_id')
    
    if session_id not in sessions_store:
        return jsonify({'error': 'Session not found'}), 404
    
    session = sessions_store[session_id]
    
    if user_id not in session['users']:
        return jsonify({'error': 'User not in session'}), 403
    
    return jsonify({
        'messages': session['messages'],
        'user_attributes': session['attributes'].get(user_id, [])
    }), 200

@app.route('/api/sessions/<session_id>/info', methods=['GET'])
def get_session_info(session_id):
    """Get session information"""
    user_id = request.args.get('user_id')
    
    if session_id not in sessions_store:
        return jsonify({'error': 'Session not found'}), 404
    
    session = sessions_store[session_id]
    
    if user_id not in session['users']:
        return jsonify({'error': 'User not in session'}), 403
    
    return jsonify({
        'name': session['name'],
        'creator': session['creator'],
        'users': session['users'],
        'attributes': session['attributes'],
        'pending_requests': session['pending_requests'] if user_id == session['creator'] else {},
        'is_creator': user_id == session['creator']
    }), 200

@app.route('/api/users/<user_id>/sessions', methods=['GET'])
def get_user_sessions(user_id):
    """Get all sessions for a user"""
    if user_id not in users_store:
        return jsonify({'error': 'User not found'}), 404
    
    user_sessions = []
    for session_id in users_store[user_id]['sessions']:
        if session_id in sessions_store:
            session = sessions_store[session_id]
            user_sessions.append({
                'session_id': session_id,
                'name': session['name'],
                'is_creator': session['creator'] == user_id,
                'user_count': len(session['users']),
                'unread_count': 0  # Could implement read tracking
            })
    
    return jsonify({'sessions': user_sessions}), 200

@app.route('/api/sessions/list', methods=['GET'])
def list_public_sessions():
    """List all available sessions"""
    public_sessions = []
    for session_id, session in sessions_store.items():
        public_sessions.append({
            'session_id': session_id,
            'name': session['name'],
            'user_count': len(session['users']),
            'max_users': 6
        })
    
    return jsonify({'sessions': public_sessions}), 200

if __name__ == '__main__':
    # host='0.0.0.0' allows connections from other devices on the network
    # For production, set debug=False
    app.run(host='0.0.0.0', debug=True, port=5000)