# 📚 Complete API Documentation - Chatbot Server

## 🌐 Base URL
- **Development**: `http://localhost:3001`
- **Production**: Your deployed server URL

## 🔐 Authentication
Currently, the API uses email-based identification. Include `user_email` in request bodies for user-specific operations.

---

## 📋 Table of Contents
1. [Health Check](#health-check)
2. [Chat Endpoints](#chat-endpoints)
3. [Chat Sessions](#chat-sessions)
4. [Chat History](#chat-history)
5. [Document Management](#document-management)
6. [File Upload](#file-upload)
7. [WordPress Integration](#wordpress-integration)
8. [Error Handling](#error-handling)

---

## 🏥 Health Check

### `GET /health`
Check if the server is running.

**Response:**
```json
{
  "status": "OK",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "uptime": 3600.123
}
```

---

## 💬 Chat Endpoints

### `POST /chat`
Send a text message to the chatbot.

**Request Body:**
```json
{
  "prompt": "How do I create a WordPress post?",
  "user_email": "user@example.com",
  "session_id": "uuid-here",
  "k": 6,
  "doc_id": "uuid-here"
}
```

**Parameters:**
- `prompt` (string, required): The user's message
- `user_email` (string, optional): User's email for history tracking
- `session_id` (string, optional): Session ID to associate the message
- `k` (number, optional): Number of similar documents to retrieve (default: 6)
- `doc_id` (string, optional): Specific document ID to search within

**Response:**
```json
{
  "ok": true,
  "answer": "To create a WordPress post:\n1. Go to your admin dashboard\n2. Click Posts > Add New\n3. Enter your content\n4. Click Publish\n\n**WordPress Admin Link:**\n- <a href=\"http://localhost/wp-chatbot/wp-admin/post-new.php\" target=\"_blank\" rel=\"noopener noreferrer\">Create New Post</a>",
  "sources": [
    {
      "id": "doc-1",
      "content": "WordPress post creation guide...",
      "metadata": {
        "title": "WordPress Documentation",
        "url": "https://example.com/docs"
      },
      "similarity": 0.95
    }
  ],
  "images": [],
  "processing_time": 1.234
}
```

### `POST /chat/image`
Send images with optional text to the chatbot.

**Request:**
- **Content-Type**: `multipart/form-data`
- **Files**: Upload images using `images` field
- **Form Data**:
  - `prompt` (string, optional): Text message
  - `user_email` (string, optional): User's email
  - `session_id` (string, optional): Session ID
  - `k` (number, optional): Number of documents to retrieve
  - `doc_id` (string, optional): Specific document ID
  - `prompt_type` (string, optional): Type of prompt (default: "image_text")

**Example using curl:**
```bash
curl -X POST http://localhost:3001/chat/image \
  -F "images=@image1.jpg" \
  -F "images=@image2.png" \
  -F "prompt=What do you see in these images?" \
  -F "user_email=user@example.com" \
  -F "session_id=uuid-here"
```

**Response:**
```json
{
  "ok": true,
  "answer": "I can see two images showing WordPress dashboard screenshots...",
  "sources": [],
  "images": [
    {
      "id": "user_image_0",
      "url": "http://localhost:3001/uploads/image1.jpg",
      "kind": "user_upload",
      "image_index": 0
    }
  ],
  "processing_time": 2.456
}
```

---

## 🗂️ Chat Sessions

### `POST /chat-sessions`
Create a new chat session.

**Request Body:**
```json
{
  "user_email": "user@example.com",
  "title": "WordPress Help Session",
  "description": "Getting help with WordPress setup and configuration",
  "metadata": {
    "category": "wordpress",
    "priority": "high"
  }
}
```

**Parameters:**
- `user_email` (string, required): User's email address
- `title` (string, optional): Session title (default: "New Chat", max: 500 chars)
- `description` (string, optional): Session description
- `metadata` (object, optional): Custom metadata

**Response:**
```json
{
  "ok": true,
  "session": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "user_email": "user@example.com",
    "title": "WordPress Help Session",
    "description": "Getting help with WordPress setup and configuration",
    "created_at": "2024-01-15T10:30:00.000Z",
    "updated_at": "2024-01-15T10:30:00.000Z",
    "is_archived": false,
    "metadata": {
      "category": "wordpress",
      "priority": "high"
    }
  },
  "message": "Chat session created successfully"
}
```

### `GET /chat-sessions`
Get all chat sessions for a user.

**Query Parameters:**
- `user_email` (string, required): User's email address
- `limit` (number, optional): Number of sessions to return (1-100, default: 50)
- `offset` (number, optional): Number of sessions to skip (default: 0)
- `include_archived` (boolean, optional): Include archived sessions (default: false)

**Example:**
```
GET /chat-sessions?user_email=user@example.com&limit=20&offset=0&include_archived=false
```

**Response:**
```json
{
  "ok": true,
  "sessions": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "user_email": "user@example.com",
      "title": "WordPress Help Session",
      "description": "Getting help with WordPress setup",
      "created_at": "2024-01-15T10:30:00.000Z",
      "updated_at": "2024-01-15T11:00:00.000Z",
      "is_archived": false,
      "metadata": {},
      "message_count": 5,
      "last_message_at": "2024-01-15T11:00:00.000Z",
      "first_message_at": "2024-01-15T10:35:00.000Z"
    }
  ],
  "count": 1,
  "limit": 50,
  "offset": 0,
  "include_archived": false
}
```

### `GET /chat-sessions/:sessionId`
Get a specific chat session.

**Path Parameters:**
- `sessionId` (string, required): Session UUID

**Query Parameters:**
- `user_email` (string, required): User's email address

**Example:**
```
GET /chat-sessions/550e8400-e29b-41d4-a716-446655440000?user_email=user@example.com
```

**Response:**
```json
{
  "ok": true,
  "session": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "user_email": "user@example.com",
    "title": "WordPress Help Session",
    "description": "Getting help with WordPress setup",
    "created_at": "2024-01-15T10:30:00.000Z",
    "updated_at": "2024-01-15T11:00:00.000Z",
    "is_archived": false,
    "metadata": {}
  }
}
```

### `PUT /chat-sessions/:sessionId`
Update a chat session.

**Path Parameters:**
- `sessionId` (string, required): Session UUID

**Request Body:**
```json
{
  "user_email": "user@example.com",
  "title": "Updated WordPress Help Session",
  "description": "Updated description",
  "is_archived": false,
  "metadata": {
    "updated": true,
    "category": "wordpress"
  }
}
```

**Parameters:**
- `user_email` (string, required): User's email address
- `title` (string, optional): New session title (max: 500 chars)
- `description` (string, optional): New session description
- `is_archived` (boolean, optional): Archive status
- `metadata` (object, optional): New metadata (replaces existing)

**Response:**
```json
{
  "ok": true,
  "session": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "user_email": "user@example.com",
    "title": "Updated WordPress Help Session",
    "description": "Updated description",
    "created_at": "2024-01-15T10:30:00.000Z",
    "updated_at": "2024-01-15T12:00:00.000Z",
    "is_archived": false,
    "metadata": {
      "updated": true,
      "category": "wordpress"
    }
  },
  "message": "Chat session updated successfully"
}
```

### `PATCH /chat-sessions/:sessionId/title`
Update only the session title (lightweight endpoint for quick title updates).

**Path Parameters:**
- `sessionId` (string, required): Session UUID

**Request Body:**
```json
{
  "user_email": "user@example.com",
  "title": "New Session Title"
}
```

**Parameters:**
- `user_email` (string, required): User's email address
- `title` (string, required): New session title (max: 500 chars)

**Response:**
```json
{
  "ok": true,
  "session": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "user_email": "user@example.com",
    "title": "New Session Title",
    "description": "Getting help with WordPress setup",
    "created_at": "2024-01-15T10:30:00.000Z",
    "updated_at": "2024-01-15T12:30:00.000Z",
    "is_archived": false,
    "metadata": {}
  },
  "message": "Session title updated successfully"
}
```

### `DELETE /chat-sessions/:sessionId`
Delete a chat session and all its chat history.

**Path Parameters:**
- `sessionId` (string, required): Session UUID

**Query Parameters:**
- `user_email` (string, required): User's email address

**Example:**
```
DELETE /chat-sessions/550e8400-e29b-41d4-a716-446655440000?user_email=user@example.com
```

**Response:**
```json
{
  "ok": true,
  "message": "Chat session deleted successfully"
}
```

---

## 📜 Chat History

### `POST /chat-history`
Save chat history manually (usually called automatically by chat endpoints).

**Request Body:**
```json
{
  "user_email": "user@example.com",
  "prompt": "How do I install WordPress?",
  "answer": "To install WordPress, follow these steps...",
  "doc_id": "uuid-here",
  "session_id": "uuid-here",
  "sources": [
    {
      "id": "doc-1",
      "content": "WordPress installation guide...",
      "metadata": {},
      "similarity": 0.95
    }
  ],
  "images": []
}
```

**Response:**
```json
{
  "ok": true,
  "message": "Chat history saved successfully"
}
```

### `POST /chat-history/get`
Retrieve chat history for a user.

**Request Body:**
```json
{
  "user_email": "user@example.com",
  "session_id": "uuid-here",
  "limit": 50,
  "offset": 0
}
```

**Parameters:**
- `user_email` (string, required): User's email address
- `session_id` (string, optional): Filter by specific session
- `limit` (number, optional): Number of messages to return (default: 50)
- `offset` (number, optional): Number of messages to skip (default: 0)

**Response:**
```json
{
  "ok": true,
  "data": [
    {
      "id": 123,
      "user_email": "user@example.com",
      "prompt": "How do I install WordPress?",
      "answer": "To install WordPress, follow these steps...",
      "doc_id": "uuid-here",
      "session_id": "uuid-here",
      "sources": [],
      "images": [],
      "created_at": "2024-01-15T10:30:00.000Z"
    }
  ],
  "count": 1,
  "limit": 50,
  "offset": 0,
  "session_id": "uuid-here"
}
```

---

## 📄 Document Management

### `GET /documents`
Get all uploaded documents.

**Query Parameters:**
- `limit` (number, optional): Number of documents to return (default: 50)
- `offset` (number, optional): Number of documents to skip (default: 0)

**Response:**
```json
{
  "ok": true,
  "documents": [
    {
      "doc_id": "550e8400-e29b-41d4-a716-446655440000",
      "filename": "wordpress-guide.pdf",
      "upload_date": "2024-01-15T10:30:00.000Z",
      "chunk_count": 25,
      "total_size": 1024000
    }
  ],
  "total": 1,
  "limit": 50,
  "offset": 0
}
```

### `DELETE /documents/:docId`
Delete a document and all its chunks.

**Path Parameters:**
- `docId` (string, required): Document UUID

**Response:**
```json
{
  "ok": true,
  "message": "Document deleted successfully",
  "chunks_deleted": 25
}
```

---

## 📤 File Upload

### `POST /upload`
Upload documents for processing and embedding.

**Request:**
- **Content-Type**: `multipart/form-data`
- **File**: Upload file using `file` field

**Supported File Types:**
- PDF (.pdf)
- Text files (.txt)
- Word documents (.docx)
- Markdown (.md)

**Example using curl:**
```bash
curl -X POST http://localhost:3001/upload \
  -F "file=@document.pdf"
```

**Response:**
```json
{
  "ok": true,
  "message": "File uploaded and processed successfully",
  "doc_id": "550e8400-e29b-41d4-a716-446655440000",
  "filename": "document.pdf",
  "chunks": 15,
  "processing_time": 5.234
}
```

---

## 🔗 WordPress Integration

### `POST /wordpress/test`
Test WordPress link generation with sample text.

**Request Body:**
```json
{
  "text": "How do I create a new WordPress post and manage my plugins?"
}
```

**Response:**
```json
{
  "ok": true,
  "original_text": "How do I create a new WordPress post and manage my plugins?",
  "links_found": [
    {
      "keyword": "create post",
      "link_text": "Create New Post",
      "url": "http://localhost/wp-chatbot/wp-admin/post-new.php",
      "html": "<a href=\"http://localhost/wp-chatbot/wp-admin/post-new.php\" target=\"_blank\" rel=\"noopener noreferrer\">Create New Post</a>"
    }
  ],
  "domain": "http://localhost/wp-chatbot"
}
```

### `GET /wordpress/links`
Get all available WordPress admin links.

**Response:**
```json
{
  "ok": true,
  "links": [
    {
      "keywords": ["create post", "new post", "add post"],
      "link_text": "Create New Post",
      "path": "/wp-admin/post-new.php"
    },
    {
      "keywords": ["create page", "new page", "add page"],
      "link_text": "Create New Page", 
      "path": "/wp-admin/post-new.php?post_type=page"
    }
  ],
  "domain": "http://localhost/wp-chatbot",
  "total_links": 25
}
```

---

## ❌ Error Handling

### Error Response Format
All errors follow this format:

```json
{
  "ok": false,
  "error": "Error message describing what went wrong"
}
```

### HTTP Status Codes

| Status Code | Description |
|-------------|-------------|
| `200` | Success |
| `400` | Bad Request - Invalid parameters |
| `404` | Not Found - Resource doesn't exist |
| `413` | Payload Too Large - File too big |
| `422` | Unprocessable Entity - Invalid file type |
| `500` | Internal Server Error |

### Common Error Examples

**400 - Missing Required Parameter:**
```json
{
  "ok": false,
  "error": "user_email is required"
}
```

**400 - Invalid Email Format:**
```json
{
  "ok": false,
  "error": "Invalid email format"
}
```

**404 - Session Not Found:**
```json
{
  "ok": false,
  "error": "Chat session not found"
}
```

**413 - File Too Large:**
```json
{
  "ok": false,
  "error": "File too large. Maximum size is 10MB"
}
```

**422 - Invalid File Type:**
```json
{
  "ok": false,
  "error": "Unsupported file type. Supported types: pdf, txt, docx, md"
}
```

**500 - Server Error:**
```json
{
  "ok": false,
  "error": "Database connection failed"
}
```

---

## 🔧 Configuration

### Environment Variables
- `OPENAI_API_KEY`: OpenAI API key for chat and embeddings
- `DATABASE_PROVIDER`: "supabase" or "postgres"
- `SUPABASE_URL`: Supabase project URL
- `SUPABASE_ANON_KEY`: Supabase anonymous key
- `POSTGRES_CONNECTION_STRING`: PostgreSQL connection string
- `WORDPRESS_DOMAIN`: WordPress site domain for admin links
- `PORT`: Server port (default: 3001)

### Rate Limits
- Chat requests: No explicit limit (depends on OpenAI API limits)
- File uploads: 10MB maximum file size
- Session operations: No explicit limit

### CORS
The server supports CORS for cross-origin requests from web applications.

---

## 📝 Usage Examples

### JavaScript/Frontend Integration

```javascript
const API_BASE = 'http://localhost:3001';

// Create a chat session
async function createSession(userEmail, title) {
  const response = await fetch(`${API_BASE}/chat-sessions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      user_email: userEmail,
      title: title
    })
  });
  return response.json();
}

// Send a chat message
async function sendMessage(prompt, userEmail, sessionId) {
  const response = await fetch(`${API_BASE}/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      prompt: prompt,
      user_email: userEmail,
      session_id: sessionId
    })
  });
  return response.json();
}

// Get user sessions
async function getUserSessions(userEmail) {
  const response = await fetch(
    `${API_BASE}/chat-sessions?user_email=${encodeURIComponent(userEmail)}`
  );
  return response.json();
}

// Upload a document
async function uploadDocument(file) {
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch(`${API_BASE}/upload`, {
    method: 'POST',
    body: formData
  });
  return response.json();
}

// Get session chat history
async function getSessionHistory(userEmail, sessionId) {
  const response = await fetch(`${API_BASE}/chat-history/get`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      user_email: userEmail,
      session_id: sessionId
    })
  });
  return response.json();
}

// Update session
async function updateSession(sessionId, userEmail, updates) {
  const response = await fetch(`${API_BASE}/chat-sessions/${sessionId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      user_email: userEmail,
      ...updates
    })
  });
  return response.json();
}

// Update session title only (lightweight)
async function updateSessionTitle(sessionId, userEmail, title) {
  const response = await fetch(`${API_BASE}/chat-sessions/${sessionId}/title`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      user_email: userEmail,
      title: title
    })
  });
  return response.json();
}

// Delete session
async function deleteSession(sessionId, userEmail) {
  const response = await fetch(
    `${API_BASE}/chat-sessions/${sessionId}?user_email=${encodeURIComponent(userEmail)}`,
    { method: 'DELETE' }
  );
  return response.json();
}
```

### Python Integration

```python
import requests
import json

API_BASE = 'http://localhost:3001'

def create_session(user_email, title):
    response = requests.post(f'{API_BASE}/chat-sessions',
        json={
            'user_email': user_email,
            'title': title
        })
    return response.json()

def send_message(prompt, user_email, session_id=None):
    data = {
        'prompt': prompt,
        'user_email': user_email
    }
    if session_id:
        data['session_id'] = session_id

    response = requests.post(f'{API_BASE}/chat', json=data)
    return response.json()

def get_user_sessions(user_email, include_archived=False):
    params = {
        'user_email': user_email,
        'include_archived': include_archived
    }
    response = requests.get(f'{API_BASE}/chat-sessions', params=params)
    return response.json()

def upload_document(file_path):
    with open(file_path, 'rb') as f:
        files = {'file': f}
        response = requests.post(f'{API_BASE}/upload', files=files)
    return response.json()

def get_session_history(user_email, session_id, limit=50):
    data = {
        'user_email': user_email,
        'session_id': session_id,
        'limit': limit
    }
    response = requests.post(f'{API_BASE}/chat-history/get', json=data)
    return response.json()

def update_session(session_id, user_email, **updates):
    data = {'user_email': user_email, **updates}
    response = requests.put(f'{API_BASE}/chat-sessions/{session_id}', json=data)
    return response.json()

def update_session_title(session_id, user_email, title):
    data = {'user_email': user_email, 'title': title}
    response = requests.patch(f'{API_BASE}/chat-sessions/{session_id}/title', json=data)
    return response.json()

def delete_session(session_id, user_email):
    params = {'user_email': user_email}
    response = requests.delete(f'{API_BASE}/chat-sessions/{session_id}', params=params)
    return response.json()
```

### React Component Example

```jsx
import React, { useState, useEffect } from 'react';

const ChatApp = () => {
  const [sessions, setSessions] = useState([]);
  const [currentSession, setCurrentSession] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const userEmail = 'user@example.com';

  // Load user sessions on component mount
  useEffect(() => {
    loadSessions();
  }, []);

  const loadSessions = async () => {
    try {
      const response = await getUserSessions(userEmail);
      if (response.ok) {
        setSessions(response.sessions);
      }
    } catch (error) {
      console.error('Failed to load sessions:', error);
    }
  };

  const createNewSession = async () => {
    try {
      const response = await createSession(userEmail, 'New Chat Session');
      if (response.ok) {
        setCurrentSession(response.session);
        setMessages([]);
        await loadSessions(); // Refresh sessions list
      }
    } catch (error) {
      console.error('Failed to create session:', error);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !currentSession) return;

    try {
      const response = await sendMessage(newMessage, userEmail, currentSession.id);
      if (response.ok) {
        // Add message to local state
        setMessages(prev => [...prev, {
          prompt: newMessage,
          answer: response.answer,
          created_at: new Date().toISOString()
        }]);
        setNewMessage('');
      }
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  };

  const loadSessionHistory = async (sessionId) => {
    try {
      const response = await getSessionHistory(userEmail, sessionId);
      if (response.ok) {
        setMessages(response.data);
      }
    } catch (error) {
      console.error('Failed to load session history:', error);
    }
  };

  return (
    <div className="chat-app">
      <div className="sidebar">
        <button onClick={createNewSession}>New Chat</button>
        <div className="sessions-list">
          {sessions.map(session => (
            <div
              key={session.id}
              className={`session-item ${currentSession?.id === session.id ? 'active' : ''}`}
              onClick={() => {
                setCurrentSession(session);
                loadSessionHistory(session.id);
              }}
            >
              <h4>{session.title}</h4>
              <p>{session.message_count} messages</p>
            </div>
          ))}
        </div>
      </div>

      <div className="chat-area">
        {currentSession && (
          <>
            <div className="messages">
              {messages.map((msg, index) => (
                <div key={index} className="message">
                  <div className="user-message">{msg.prompt}</div>
                  <div className="bot-message" dangerouslySetInnerHTML={{__html: msg.answer}} />
                </div>
              ))}
            </div>

            <div className="input-area">
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                placeholder="Type your message..."
              />
              <button onClick={sendMessage}>Send</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default ChatApp;
```

---

## 🚀 Quick Start Guide

### 1. Setup Environment
```bash
# Clone the repository
git clone <your-repo-url>
cd chatbot-server

# Install dependencies
npm install

# Setup environment variables
cp .env.example .env
# Edit .env with your configuration
```

### 2. Database Setup
```bash
# For Supabase: Run the migration SQL in your Supabase dashboard
# For PostgreSQL: Run the migration
npm run prepare-db
```

### 3. Start the Server
```bash
npm start
```

### 4. Test the API
```bash
# Test health endpoint
curl http://localhost:3001/health

# Create a session
curl -X POST http://localhost:3001/chat-sessions \
  -H "Content-Type: application/json" \
  -d '{"user_email":"test@example.com","title":"Test Session"}'

# Send a message
curl -X POST http://localhost:3001/chat \
  -H "Content-Type: application/json" \
  -d '{"prompt":"Hello!","user_email":"test@example.com"}'
```

---

This comprehensive API documentation provides everything needed to integrate with the chatbot server, including session management, document processing, and WordPress integration features! 🚀
