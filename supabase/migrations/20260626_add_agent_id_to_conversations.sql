-- Add agent_id column to conversations table
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS agent_id VARCHAR(50) DEFAULT 'default';

-- Update existing records to have default agent
UPDATE conversations SET agent_id = 'default' WHERE agent_id IS NULL;
