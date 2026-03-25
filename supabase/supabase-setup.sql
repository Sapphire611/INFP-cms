-- Supabase Database Setup Script for INFP-CMS
-- Run this in Supabase SQL Editor to create the required tables

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table (migrated from Prisma)
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  username VARCHAR(20) UNIQUE NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  user_type TEXT NOT NULL CHECK (user_type IN ('admin', 'user')),
  profile_name TEXT,
  profile_phone TEXT,
  profile_avatar TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for users
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);

-- WeChat users table
CREATE TABLE IF NOT EXISTS wechat_users (
  id TEXT PRIMARY KEY,
  profile_name TEXT,
  profile_phone TEXT,
  profile_avatar TEXT,
  profile_id_number TEXT,
  openid VARCHAR(255) UNIQUE,
  unionid VARCHAR(255) UNIQUE,
  wechat_nickname TEXT,
  wechat_avatar_url TEXT,
  is_active BOOLEAN DEFAULT true,
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for wechat_users
CREATE INDEX IF NOT EXISTS idx_wechat_users_openid ON wechat_users(openid);
CREATE INDEX IF NOT EXISTS idx_wechat_users_unionid ON wechat_users(unionid);

-- Sessions table
CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  jwt TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for sessions
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_jwt ON sessions(jwt);

-- Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE wechat_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;

-- Create policies for users table
-- Service role can do everything
CREATE POLICY "Service role can do everything on users" ON users
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Authenticated users can read active users
CREATE POLICY "Authenticated users can read active users" ON users
  FOR SELECT
  TO authenticated
  USING (is_active = true);

-- Create policies for wechat_users table
CREATE POLICY "Service role can do everything on wechat_users" ON wechat_users
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Authenticated users can read active wechat users
CREATE POLICY "Authenticated users can read active wechat users" ON wechat_users
  FOR SELECT
  TO authenticated
  USING (is_active = true);

-- Create policies for sessions table
CREATE POLICY "Service role can do everything on sessions" ON sessions
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for automatic updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_wechat_users_updated_at BEFORE UPDATE ON wechat_users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sessions_updated_at BEFORE UPDATE ON sessions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Grant necessary permissions
GRANT ALL ON users TO service_role;
GRANT ALL ON wechat_users TO service_role;
GRANT ALL ON sessions TO service_role;