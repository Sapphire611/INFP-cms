-- Create messages table for AI chat persistence
-- Replaces localStorage-based message storage with Supabase
CREATE TABLE IF NOT EXISTS messages (
  id TEXT PRIMARY KEY,
  conversation_id TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL DEFAULT '',
  tool_calls JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(conversation_id, created_at ASC);

-- RLS
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Policies: use service_role (admin client) for all operations
CREATE POLICY "Service role can do everything on messages" ON messages
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Grant
GRANT ALL ON messages TO service_role;
GRANT ALL ON messages TO authenticated;
