# Chat Sessions Feature

This document describes the new chat sessions functionality that allows users to organize their conversations into separate sessions and manage them effectively.

## Overview

The chat sessions feature provides:
- **Session Management**: Create, read, update, and delete chat sessions
- **Organized Conversations**: Group related chat messages into sessions
- **Session Metadata**: Store titles, descriptions, and custom metadata
- **Archive Functionality**: Archive old sessions without deleting them
- **Session History**: Retrieve chat history filtered by session

## Database Schema

### New Tables

#### `chat_sessions`
```sql
CREATE TABLE chat_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_email VARCHAR(255) NOT NULL,
  title VARCHAR(500) NOT NULL DEFAULT 'New Chat',
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_archived BOOLEAN DEFAULT FALSE,
  metadata JSONB DEFAULT '{}'::jsonb
);
```

#### Updated `chat_history`
```sql
ALTER TABLE chat_history ADD COLUMN session_id UUID REFERENCES chat_sessions(id) ON DELETE CASCADE;
```

### Views

#### `chat_session_summaries`
Provides session information with message counts and timestamps:
```sql
CREATE VIEW chat_session_summaries AS
SELECT 
  s.*,
  COUNT(ch.id) as message_count,
  MAX(ch.created_at) as last_message_at,
  MIN(ch.created_at) as first_message_at
FROM chat_sessions s
LEFT JOIN chat_history ch ON s.id = ch.session_id
GROUP BY s.id, ...;
```

## API Endpoints

### Chat Sessions

#### `POST /chat-sessions`
Create a new chat session.

**Request Body:**
```json
{
  "user_email": "user@example.com",
  "title": "WordPress Help Session",
  "description": "Getting help with WordPress setup",
  "metadata": {}
}
```

**Response:**
```json
{
  "ok": true,
  "session": {
    "id": "uuid-here",
    "user_email": "user@example.com",
    "title": "WordPress Help Session",
    "description": "Getting help with WordPress setup",
    "created_at": "2024-01-15T10:30:00Z",
    "updated_at": "2024-01-15T10:30:00Z",
    "is_archived": false,
    "metadata": {}
  },
  "message": "Chat session created successfully"
}
```

#### `GET /chat-sessions`
Get all chat sessions for a user.

**Query Parameters:**
- `user_email` (required): User's email address
- `limit` (optional): Number of sessions to return (1-100, default: 50)
- `offset` (optional): Number of sessions to skip (default: 0)
- `include_archived` (optional): Include archived sessions (default: false)

**Response:**
```json
{
  "ok": true,
  "sessions": [
    {
      "id": "uuid-here",
      "title": "WordPress Help Session",
      "message_count": 5,
      "last_message_at": "2024-01-15T11:00:00Z",
      "created_at": "2024-01-15T10:30:00Z",
      "is_archived": false
    }
  ],
  "count": 1,
  "limit": 50,
  "offset": 0
}
```

#### `GET /chat-sessions/:sessionId`
Get a specific chat session.

**Query Parameters:**
- `user_email` (required): User's email address

**Response:**
```json
{
  "ok": true,
  "session": {
    "id": "uuid-here",
    "user_email": "user@example.com",
    "title": "WordPress Help Session",
    "description": "Getting help with WordPress setup",
    "created_at": "2024-01-15T10:30:00Z",
    "updated_at": "2024-01-15T10:30:00Z",
    "is_archived": false,
    "metadata": {}
  }
}
```

#### `PUT /chat-sessions/:sessionId`
Update a chat session.

**Request Body:**
```json
{
  "user_email": "user@example.com",
  "title": "Updated Title",
  "description": "Updated description",
  "is_archived": false,
  "metadata": {"custom": "data"}
}
```

#### `DELETE /chat-sessions/:sessionId`
Delete a chat session and all its chat history.

**Query Parameters:**
- `user_email` (required): User's email address

### Updated Chat Endpoints

#### `POST /chat`
Now supports `session_id` parameter to associate messages with sessions.

**Request Body:**
```json
{
  "prompt": "How do I create a WordPress post?",
  "user_email": "user@example.com",
  "session_id": "uuid-here",
  "k": 6,
  "doc_id": null
}
```

#### `POST /chat-history/get`
Now supports filtering by `session_id`.

**Request Body:**
```json
{
  "user_email": "user@example.com",
  "session_id": "uuid-here",
  "limit": 50,
  "offset": 0
}
```

## Usage Examples

### Frontend Integration

```javascript
// Create a new chat session
const createSession = async (userEmail, title) => {
  const response = await fetch('/chat-sessions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      user_email: userEmail,
      title: title
    })
  });
  return response.json();
};

// Send a message to a session
const sendMessage = async (prompt, userEmail, sessionId) => {
  const response = await fetch('/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      prompt: prompt,
      user_email: userEmail,
      session_id: sessionId
    })
  });
  return response.json();
};

// Get user's sessions
const getUserSessions = async (userEmail) => {
  const response = await fetch(`/chat-sessions?user_email=${encodeURIComponent(userEmail)}`);
  return response.json();
};

// Get session chat history
const getSessionHistory = async (userEmail, sessionId) => {
  const response = await fetch('/chat-history/get', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      user_email: userEmail,
      session_id: sessionId
    })
  });
  return response.json();
};
```

## Database Migration

To add chat sessions to an existing database, run the migration SQL:

```bash
# For Supabase users
# Copy and run the SQL from src/sql/chat-sessions-migration.sql in your Supabase SQL editor

# For PostgreSQL users
npm run prepare-db
```

## Testing

Test the chat sessions functionality:

```bash
npm run test-chat-sessions
```

This will test:
1. Creating a new session
2. Sending messages to the session
3. Retrieving sessions
4. Getting session details
5. Retrieving session chat history
6. Updating session metadata
7. Archiving sessions

## Benefits

- **Better Organization**: Users can organize conversations by topic
- **Improved UX**: Easier to find and continue previous conversations
- **Scalability**: Better performance when dealing with large chat histories
- **Flexibility**: Custom metadata allows for future enhancements
- **Data Management**: Archive old sessions without losing data
