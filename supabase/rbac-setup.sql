-- RBAC (Role-Based Access Control) Setup for INFP-CMS
-- Run this in Supabase SQL Editor after running supabase-setup.sql

-- ============================================
-- 1. Create RBAC Tables
-- ============================================

-- Roles table
CREATE TABLE IF NOT EXISTS roles (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name VARCHAR(50) UNIQUE NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Permissions table (module + action combination)
CREATE TABLE IF NOT EXISTS permissions (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  module VARCHAR(50) NOT NULL,  -- dashboard, users, wechat_users, chat, threejs
  action VARCHAR(20) NOT NULL,  -- view, create, update, delete
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_module_action UNIQUE(module, action)
);

-- Role-Permission junction table (many-to-many)
CREATE TABLE IF NOT EXISTS role_permissions (
  role_id TEXT NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  permission_id TEXT NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (role_id, permission_id)
);

-- User-Role junction table (many-to-many)
CREATE TABLE IF NOT EXISTS user_roles (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role_id TEXT NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, role_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_permissions_module ON permissions(module);
CREATE INDEX IF NOT EXISTS idx_role_permissions_role_id ON role_permissions(role_id);
CREATE INDEX IF NOT EXISTS idx_role_permissions_permission_id ON role_permissions(permission_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role_id ON user_roles(role_id);

-- ============================================
-- 2. Enable Row Level Security
-- ============================================

ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;

-- Create policies for service role (API routes use service_role)
CREATE POLICY "Service role can do everything on roles" ON roles
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Service role can do everything on permissions" ON permissions
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Service role can do everything on role_permissions" ON role_permissions
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Service role can do everything on user_roles" ON user_roles
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ============================================
-- 3. Create Triggers for updated_at
-- ============================================

CREATE TRIGGER update_roles_updated_at BEFORE UPDATE ON roles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_permissions_updated_at BEFORE UPDATE ON permissions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 4. Seed Default Permissions
-- ============================================

-- Insert all module-action combinations
INSERT INTO permissions (module, action, description) VALUES
  -- Dashboard module
  ('dashboard', 'view', '查看数据概览'),

  -- Users module
  ('users', 'view', '查看用户列表'),
  ('users', 'create', '创建新用户'),
  ('users', 'update', '更新用户信息'),
  ('users', 'delete', '删除用户'),

  -- WeChat Users module
  ('wechat_users', 'view', '查看微信用户列表'),
  ('wechat_users', 'create', '创建微信用户'),
  ('wechat_users', 'update', '更新微信用户信息'),
  ('wechat_users', 'delete', '删除微信用户'),

  -- Chat module
  ('chat', 'view', '查看AI对话'),
  ('chat', 'create', '创建AI对话'),
  ('chat', 'update', '更新AI对话'),
  ('chat', 'delete', '删除AI对话'),

  -- Three.js Demo module
  ('threejs', 'view', '查看Three.js演示')
ON CONFLICT (module, action) DO NOTHING;

-- ============================================
-- 5. Seed Default Roles
-- ============================================

-- Super Admin: Full access to everything
INSERT INTO roles (id, name, description) VALUES
  ('role_super_admin', 'super_admin', '超级管理员 - 拥有所有权限')
ON CONFLICT (name) DO NOTHING;

-- Editor: Can view, create, and update (but not delete)
INSERT INTO roles (id, name, description) VALUES
  ('role_editor', 'editor', '编辑者 - 可以查看、创建和更新内容')
ON CONFLICT (name) DO NOTHING;

-- Viewer: Read-only access
INSERT INTO roles (id, name, description) VALUES
  ('role_viewer', 'viewer', '查看者 - 只能查看内容')
ON CONFLICT (name) DO NOTHING;

-- User Manager: Can manage users only
INSERT INTO roles (id, name, description) VALUES
  ('role_user_manager', 'user_manager', '用户管理员 - 只能管理用户')
ON CONFLICT (name) DO NOTHING;

-- ============================================
-- 6. Assign Permissions to Roles
-- ============================================

-- Super Admin gets ALL permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT 'role_super_admin', id FROM permissions
ON CONFLICT DO NOTHING;

-- Editor gets view, create, update (no delete)
INSERT INTO role_permissions (role_id, permission_id)
SELECT 'role_editor', id FROM permissions
WHERE action IN ('view', 'create', 'update')
ON CONFLICT DO NOTHING;

-- Viewer gets only view permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT 'role_viewer', id FROM permissions
WHERE action = 'view'
ON CONFLICT DO NOTHING;

-- User Manager gets all user-related permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT 'role_user_manager', id FROM permissions
WHERE module IN ('users', 'wechat_users')
ON CONFLICT DO NOTHING;

-- User Manager also gets dashboard view
INSERT INTO role_permissions (role_id, permission_id)
SELECT 'role_user_manager', id FROM permissions
WHERE module = 'dashboard' AND action = 'view'
ON CONFLICT DO NOTHING;

-- ============================================
-- 7. Grant Permissions
-- ============================================

GRANT ALL ON roles TO service_role;
GRANT ALL ON permissions TO service_role;
GRANT ALL ON role_permissions TO service_role;
GRANT ALL ON user_roles TO service_role;

-- ============================================
-- 8. Helper Views (Optional)
-- ============================================

-- View to see all user permissions (useful for debugging)
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

-- View to see role permissions
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

-- ============================================
-- 9. Example: Assign super_admin role to existing admin users
-- ============================================

-- Uncomment the following to automatically assign super_admin role to all admin users
-- INSERT INTO user_roles (user_id, role_id)
-- SELECT id, 'role_super_admin' FROM users WHERE user_type = 'admin'
-- ON CONFLICT DO NOTHING;

-- ============================================
-- NOTES:
-- ============================================
-- 1. Admin users (user_type = 'admin') bypass all permission checks in the application code
-- 2. Regular users (user_type = 'user') are subject to RBAC
-- 3. WeChat users (wechat_users table) cannot login to CMS
-- 4. To assign a role to a user: INSERT INTO user_roles (user_id, role_id) VALUES ('user_id', 'role_id')
-- 5. To check user permissions: SELECT * FROM user_permissions_view WHERE user_id = 'xxx'
-- 6. To check role permissions: SELECT * FROM role_permissions_view WHERE role_name = 'xxx'
