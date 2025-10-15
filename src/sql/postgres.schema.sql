CREATE EXTENSION IF NOT EXISTS vector;


CREATE TABLE IF NOT EXISTS documents (
id BIGSERIAL PRIMARY KEY,
doc_id UUID NOT NULL,
chunk_index INT NOT NULL,
content TEXT NOT NULL,
metadata JSONB DEFAULT '{}'::jsonb,
embedding vector(1536)
);


CREATE INDEX IF NOT EXISTS idx_documents_doc_id ON documents(doc_id);
CREATE INDEX IF NOT EXISTS idx_documents_embedding ON documents USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- Chat sessions table
CREATE TABLE IF NOT EXISTS chat_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_email VARCHAR(255) NOT NULL,
  title VARCHAR(500) NOT NULL DEFAULT 'New Chat',
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_archived BOOLEAN DEFAULT FALSE,
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Chat history table
CREATE TABLE IF NOT EXISTS chat_history (
  id BIGSERIAL PRIMARY KEY,
  user_email VARCHAR(255) NOT NULL,
  prompt TEXT NOT NULL,
  answer TEXT NOT NULL,
  doc_id UUID,
  sources JSONB DEFAULT '[]'::jsonb,
  images JSONB DEFAULT '[]'::jsonb,
  session_id UUID REFERENCES chat_sessions(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for chat sessions
CREATE INDEX IF NOT EXISTS idx_chat_sessions_user_email ON chat_sessions(user_email);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_created_at ON chat_sessions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_updated_at ON chat_sessions(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_archived ON chat_sessions(is_archived);

-- Indexes for chat history
CREATE INDEX IF NOT EXISTS idx_chat_history_user_email ON chat_history(user_email);
CREATE INDEX IF NOT EXISTS idx_chat_history_created_at ON chat_history(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_history_doc_id ON chat_history(doc_id);
CREATE INDEX IF NOT EXISTS idx_chat_history_session_id ON chat_history(session_id);

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_chat_session_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at when session is modified
CREATE TRIGGER trigger_update_chat_session_updated_at
  BEFORE UPDATE ON chat_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_chat_session_updated_at();

-- Function to automatically update session's updated_at when chat_history is added
CREATE OR REPLACE FUNCTION update_session_on_chat_history()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.session_id IS NOT NULL THEN
    UPDATE chat_sessions
    SET updated_at = NOW()
    WHERE id = NEW.session_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update session timestamp when new chat history is added
CREATE TRIGGER trigger_update_session_on_chat_history
  AFTER INSERT ON chat_history
  FOR EACH ROW
  EXECUTE FUNCTION update_session_on_chat_history();

-- View for session summaries
CREATE OR REPLACE VIEW chat_session_summaries AS
SELECT
  s.id,
  s.user_email,
  s.title,
  s.description,
  s.created_at,
  s.updated_at,
  s.is_archived,
  s.metadata,
  COUNT(ch.id) as message_count,
  MAX(ch.created_at) as last_message_at,
  MIN(ch.created_at) as first_message_at
FROM chat_sessions s
LEFT JOIN chat_history ch ON s.id = ch.session_id
GROUP BY s.id, s.user_email, s.title, s.description, s.created_at, s.updated_at, s.is_archived, s.metadata;