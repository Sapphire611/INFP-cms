-- ============================================
-- AI Chat Feature Database Schema
-- ============================================

-- Conversations table (stores conversation metadata only)
-- Detailed messages are stored in localStorage on the client
CREATE TABLE IF NOT EXISTS conversations (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  title TEXT NOT NULL,
  model TEXT DEFAULT 'deepseek-chat',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Conversation summaries table (stores auto-generated summaries)
-- When conversations become too long, older messages are summarized
CREATE TABLE IF NOT EXISTS conversation_summaries (
  id TEXT PRIMARY KEY,
  conversation_id TEXT NOT NULL,
  summary_text TEXT NOT NULL,
  message_count_summary INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_conversations_user_id ON conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_conversations_created_at ON conversations(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_conversations_updated_at ON conversations(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_summaries_conversation_id ON conversation_summaries(conversation_id);
CREATE INDEX IF NOT EXISTS idx_summaries_created_at ON conversation_summaries(created_at DESC);

-- Enable Row Level Security
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_summaries ENABLE ROW LEVEL SECURITY;

-- RLS Policies for conversations
-- Service role can do everything (bypasses RLS for API routes)
CREATE POLICY "Service role can do everything on conversations"
  ON conversations
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Users can manage their own conversations
CREATE POLICY "Users can view own conversations"
  ON conversations
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid()::TEXT);

CREATE POLICY "Users can insert own conversations"
  ON conversations
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid()::TEXT);

CREATE POLICY "Users can update own conversations"
  ON conversations
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid()::TEXT)
  WITH CHECK (user_id = auth.uid()::TEXT);

CREATE POLICY "Users can delete own conversations"
  ON conversations
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid()::TEXT);

-- RLS Policies for conversation_summaries
-- Service role can do everything (bypasses RLS for API routes)
CREATE POLICY "Service role can do everything on summaries"
  ON conversation_summaries
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Users can read summaries from their own conversations
CREATE POLICY "Users can view own conversation summaries"
  ON conversation_summaries
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM conversations
      WHERE conversations.id = conversation_summaries.conversation_id
      AND conversations.user_id = auth.uid()::TEXT
    )
  );

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON conversations TO authenticated;
GRANT ALL ON conversation_summaries TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;
