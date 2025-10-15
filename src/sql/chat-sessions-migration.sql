-- Chat Sessions Migration
-- This adds chat session functionality to the existing schema

-- Create chat_sessions table
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

-- Add session_id to existing chat_history table
ALTER TABLE chat_history ADD COLUMN IF NOT EXISTS session_id UUID;

-- Add foreign key constraint
ALTER TABLE chat_history 
ADD CONSTRAINT fk_chat_history_session 
FOREIGN KEY (session_id) REFERENCES chat_sessions(id) ON DELETE CASCADE;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_chat_sessions_user_email ON chat_sessions(user_email);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_created_at ON chat_sessions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_updated_at ON chat_sessions(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_archived ON chat_sessions(is_archived);
CREATE INDEX IF NOT EXISTS idx_chat_history_session_id ON chat_history(session_id);

-- Enable RLS for chat_sessions (if using Supabase)
ALTER TABLE chat_sessions ENABLE ROW LEVEL SECURITY;

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_chat_session_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at when session is modified
CREATE TRIGGER trigger_update_chat_session_updated_at
  BEFORE UPDATE ON chat_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_chat_session_updated_at();

-- Create function to automatically update session's updated_at when chat_history is added
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

-- Create trigger to update session timestamp when new chat history is added
CREATE TRIGGER trigger_update_session_on_chat_history
  AFTER INSERT ON chat_history
  FOR EACH ROW
  EXECUTE FUNCTION update_session_on_chat_history();

-- Create view for session summaries
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

-- Sample data (optional - remove if not needed)
-- INSERT INTO chat_sessions (user_email, title, description) VALUES 
-- ('user@example.com', 'WordPress Help Session', 'Getting help with WordPress setup'),
-- ('user@example.com', 'Plugin Installation', 'Learning how to install plugins');
