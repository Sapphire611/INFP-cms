-- RBAC Cleanup Script for INFP-CMS
-- This script removes the create/update/delete permissions for chat and threejs modules
-- Only the 'view' permission should remain for these modules

-- ============================================
-- 1. Remove role_permissions associations first
-- ============================================

-- Delete role_permissions entries for chat module (create, update, delete)
DELETE FROM role_permissions
WHERE permission_id IN (
  SELECT id FROM permissions
  WHERE module = 'chat' AND action IN ('create', 'update', 'delete')
);

-- Delete role_permissions entries for threejs module (create, update, delete)
DELETE FROM role_permissions
WHERE permission_id IN (
  SELECT id FROM permissions
  WHERE module = 'threejs' AND action IN ('create', 'update', 'delete')
);

-- ============================================
-- 2. Remove the permissions themselves
-- ============================================

-- Delete chat permissions (create, update, delete)
DELETE FROM permissions
WHERE module = 'chat' AND action IN ('create', 'update', 'delete');

-- Delete threejs permissions (create, update, delete)
DELETE FROM permissions
WHERE module = 'threejs' AND action IN ('create', 'update', 'delete');

-- ============================================
-- 3. Verify cleanup (optional - run these to check)
-- ============================================

-- Check remaining chat permissions (should only show 'view')
-- SELECT * FROM permissions WHERE module = 'chat';

-- Check remaining threejs permissions (should only show 'view')
-- SELECT * FROM permissions WHERE module = 'threejs';

-- Check all permissions by module
-- SELECT module, action, description FROM permissions ORDER BY module, action;
