-- Add MBTI field to wechat_users table
-- Run this in Supabase SQL Editor

ALTER TABLE wechat_users ADD COLUMN IF NOT EXISTS mbti VARCHAR(4);

-- Optional: add an index if you plan to filter by MBTI
CREATE INDEX IF NOT EXISTS idx_wechat_users_mbti ON wechat_users(mbti);
