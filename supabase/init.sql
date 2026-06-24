-- ============================================
-- INFP-CMS Database Initialization Script
-- ============================================
-- This script sets up all required tables, indexes, policies, and initial data
-- Run this in Supabase SQL Editor for a fresh installation
--
-- Contents:
-- 1. Core Tables (users, wechat_users, sessions)
-- 2. AI Chat Tables (conversations, conversation_summaries)
-- 3. RBAC Tables (roles, permissions, role_permissions, user_roles)
-- 4. Initial Data (default roles, permissions, admin user)
-- ============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- PART 1: Core Tables
-- ============================================

-- Users table
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
  email VARCHAR(255) UNIQUE,  -- 新增：邮箱登录
  password VARCHAR(255),           -- 新增：登录密码（bcrypt 加密）
  mbti VARCHAR(4),
  is_active BOOLEAN DEFAULT true,
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 邮箱唯一索引
CREATE UNIQUE INDEX IF NOT EXISTS idx_wechat_users_email ON wechat_users(email) WHERE email IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_wechat_users_openid ON wechat_users(openid);
CREATE INDEX IF NOT EXISTS idx_wechat_users_unionid ON wechat_users(unionid);
CREATE INDEX IF NOT EXISTS idx_wechat_users_mbti ON wechat_users(mbti);

-- Sessions table
CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  jwt TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_jwt ON sessions(jwt);

-- Enable Row Level Security for core tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE wechat_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;

-- Policies for users table
CREATE POLICY "Service role can do everything on users" ON users
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can read active users" ON users
  FOR SELECT TO authenticated USING (is_active = true);

-- Policies for wechat_users table
CREATE POLICY "Service role can do everything on wechat_users" ON wechat_users
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can read active wechat users" ON wechat_users
  FOR SELECT TO authenticated USING (is_active = true);

-- Policies for sessions table
CREATE POLICY "Service role can do everything on sessions" ON sessions
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for automatic updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_wechat_users_updated_at BEFORE UPDATE ON wechat_users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sessions_updated_at BEFORE UPDATE ON sessions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Grant permissions
GRANT ALL ON users TO service_role;
GRANT ALL ON wechat_users TO service_role;
GRANT ALL ON sessions TO service_role;

-- ============================================
-- PART 2: AI Chat Tables
-- ============================================

-- Conversations table (metadata only, messages in localStorage)
CREATE TABLE IF NOT EXISTS conversations (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  title TEXT NOT NULL,
  model TEXT DEFAULT 'deepseek-chat',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Conversation summaries table
CREATE TABLE IF NOT EXISTS conversation_summaries (
  id TEXT PRIMARY KEY,
  conversation_id TEXT NOT NULL,
  summary_text TEXT NOT NULL,
  message_count_summary INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
);

-- Indexes for chat tables
CREATE INDEX IF NOT EXISTS idx_conversations_user_id ON conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_conversations_created_at ON conversations(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_conversations_updated_at ON conversations(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_summaries_conversation_id ON conversation_summaries(conversation_id);
CREATE INDEX IF NOT EXISTS idx_summaries_created_at ON conversation_summaries(created_at DESC);

-- Enable RLS for chat tables
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_summaries ENABLE ROW LEVEL SECURITY;

-- Policies for conversations
CREATE POLICY "Service role can do everything on conversations" ON conversations
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Users can view own conversations" ON conversations
  FOR SELECT TO authenticated USING (user_id = auth.uid()::TEXT);

CREATE POLICY "Users can insert own conversations" ON conversations
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid()::TEXT);

CREATE POLICY "Users can update own conversations" ON conversations
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid()::TEXT)
  WITH CHECK (user_id = auth.uid()::TEXT);

CREATE POLICY "Users can delete own conversations" ON conversations
  FOR DELETE TO authenticated USING (user_id = auth.uid()::TEXT);

-- Policies for conversation_summaries
CREATE POLICY "Service role can do everything on summaries" ON conversation_summaries
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Users can view own conversation summaries" ON conversation_summaries
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM conversations
      WHERE conversations.id = conversation_summaries.conversation_id
      AND conversations.user_id = auth.uid()::TEXT
    )
  );

-- Grant permissions for chat tables
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON conversations TO authenticated;
GRANT ALL ON conversation_summaries TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- ============================================
-- PART 3: RBAC Tables
-- ============================================

-- Roles table
CREATE TABLE IF NOT EXISTS roles (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name VARCHAR(50) UNIQUE NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Permissions table
CREATE TABLE IF NOT EXISTS permissions (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  module VARCHAR(50) NOT NULL,
  action VARCHAR(20) NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_module_action UNIQUE(module, action)
);

-- Role-Permission junction table
CREATE TABLE IF NOT EXISTS role_permissions (
  role_id TEXT NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  permission_id TEXT NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (role_id, permission_id)
);

-- User-Role junction table
CREATE TABLE IF NOT EXISTS user_roles (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role_id TEXT NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, role_id)
);

-- Indexes for RBAC tables
CREATE INDEX IF NOT EXISTS idx_permissions_module ON permissions(module);
CREATE INDEX IF NOT EXISTS idx_role_permissions_role_id ON role_permissions(role_id);
CREATE INDEX IF NOT EXISTS idx_role_permissions_permission_id ON role_permissions(permission_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role_id ON user_roles(role_id);

-- Enable RLS for RBAC tables
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;

-- Policies for RBAC tables
CREATE POLICY "Service role can do everything on roles" ON roles
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Service role can do everything on permissions" ON permissions
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Service role can do everything on role_permissions" ON role_permissions
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Service role can do everything on user_roles" ON user_roles
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Triggers for RBAC tables
CREATE TRIGGER update_roles_updated_at BEFORE UPDATE ON roles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_permissions_updated_at BEFORE UPDATE ON permissions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- PART 4: Initial Data
-- ============================================

-- Insert default roles
INSERT INTO roles (id, name, description) VALUES
  ('role_super_admin', 'Super Admin', '超级管理员 - 拥有所有权限'),
  ('role_content_manager', 'Content Manager', '内容管理员 - 管理用户和微信用户'),
  ('role_viewer', 'Viewer', '查看者 - 只读权限')
ON CONFLICT (name) DO NOTHING;

-- Insert permissions
-- Dashboard module
INSERT INTO permissions (module, action, description) VALUES
  ('dashboard', 'view', '查看仪表盘')
ON CONFLICT (module, action) DO NOTHING;

-- Users module
INSERT INTO permissions (module, action, description) VALUES
  ('users', 'view', '查看用户列表'),
  ('users', 'create', '创建新用户'),
  ('users', 'update', '更新用户信息'),
  ('users', 'delete', '删除用户')
ON CONFLICT (module, action) DO NOTHING;

-- WeChat users module
INSERT INTO permissions (module, action, description) VALUES
  ('wechat_users', 'view', '查看微信用户列表'),
  ('wechat_users', 'create', '创建微信用户'),
  ('wechat_users', 'update', '更新微信用户信息'),
  ('wechat_users', 'delete', '删除微信用户')
ON CONFLICT (module, action) DO NOTHING;

-- Chat module (view-only)
INSERT INTO permissions (module, action, description) VALUES
  ('chat', 'view', '使用 AI 对话功能')
ON CONFLICT (module, action) DO NOTHING;

-- Three.js module (view-only)
INSERT INTO permissions (module, action, description) VALUES
  ('threejs', 'view', '使用 Three.js 演示')
ON CONFLICT (module, action) DO NOTHING;

-- Assign permissions to Super Admin role (all permissions)
INSERT INTO role_permissions (role_id, permission_id)
SELECT 'role_super_admin', id FROM permissions
ON CONFLICT DO NOTHING;

-- Assign permissions to Content Manager role (users + wechat_users + dashboard)
INSERT INTO role_permissions (role_id, permission_id)
SELECT 'role_content_manager', id FROM permissions
WHERE module IN ('dashboard', 'users', 'wechat_users')
ON CONFLICT DO NOTHING;

-- Assign permissions to Viewer role (view-only)
INSERT INTO role_permissions (role_id, permission_id)
SELECT 'role_viewer', id FROM permissions
WHERE action = 'view'
ON CONFLICT DO NOTHING;

-- Create helper views
CREATE OR REPLACE VIEW user_permissions_view AS
SELECT
  u.id as user_id,
  u.username,
  u.email,
  u.user_type,
  r.name as role_name,
  p.module,
  p.action
FROM users u
LEFT JOIN user_roles ur ON u.id = ur.user_id
LEFT JOIN roles r ON ur.role_id = r.id
LEFT JOIN role_permissions rp ON r.id = rp.role_id
LEFT JOIN permissions p ON rp.permission_id = p.id
ORDER BY u.username, r.name, p.module, p.action;

CREATE OR REPLACE VIEW role_permissions_view AS
SELECT
  r.name as role_name,
  r.description as role_description,
  p.module,
  p.action,
  p.description as permission_description
FROM roles r
LEFT JOIN role_permissions rp ON r.id = rp.role_id
LEFT JOIN permissions p ON rp.permission_id = p.id
ORDER BY r.name, p.module, p.action;

-- Insert default admin user (optional - uncomment to use)
-- Password: admin123 (bcrypt hash with strength 10)
-- INSERT INTO users (id, email, username, password, user_type, is_active, created_at, updated_at)
-- VALUES (
--   'user-admin-default',
--   'admin@example.com',
--   'admin',
--   '$2b$10$2QdGnRmyOgo.WiZAF95.COTcVsHEdPRkWNu5flAFVjpqd/jVgIyeC',
--   'admin',
--   true,
--   NOW(),
--   NOW()
-- )
-- ON CONFLICT DO NOTHING;

-- ============================================
-- NOTES
-- ============================================
-- 1. Admin users (user_type = 'admin') bypass all permission checks
-- 2. Regular users (user_type = 'user') are subject to RBAC
-- 3. WeChat users cannot login to CMS
-- 4. To assign a role: INSERT INTO user_roles (user_id, role_id) VALUES ('user_id', 'role_id')
-- 5. To check user permissions: SELECT * FROM user_permissions_view WHERE user_id = 'xxx'
-- 6. To check role permissions: SELECT * FROM role_permissions_view WHERE role_name = 'xxx'
-- 7. Chat and Three.js modules are view-only (no create/update/delete permissions)
