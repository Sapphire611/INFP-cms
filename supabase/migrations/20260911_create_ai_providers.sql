-- 模型平台配置（CMS「模型管理」）
-- 存放各平台（DeepSeek / 智谱 GLM）的接入凭证，/chat 使用 is_active 的那一个。
-- 密钥只通过 service_role 读取，前端拿到的是打码值。

CREATE TABLE IF NOT EXISTS ai_providers (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name VARCHAR(50) NOT NULL,
  provider VARCHAR(20) NOT NULL,
  base_url TEXT NOT NULL,
  api_key TEXT NOT NULL,
  api_secret TEXT,
  models TEXT[] NOT NULL DEFAULT '{}',
  default_model TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 全局最多一个平台处于启用状态（service 层先关后开，任何时候都不会同时命中两行）
CREATE UNIQUE INDEX IF NOT EXISTS idx_ai_providers_single_active
  ON ai_providers (is_active) WHERE is_active;

-- RLS：只有 service_role（admin client）能读写
ALTER TABLE ai_providers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role can do everything on ai_providers" ON ai_providers
  FOR ALL TO service_role USING (true) WITH CHECK (true);

GRANT ALL ON ai_providers TO service_role;

CREATE TRIGGER update_ai_providers_updated_at BEFORE UPDATE ON ai_providers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 权限点：模型管理（仅管理员可用的接口，这里同时给非 admin 角色留出授权口子）
INSERT INTO permissions (module, action, description) VALUES
  ('models', 'view', '查看模型平台'),
  ('models', 'create', '新增模型平台'),
  ('models', 'update', '修改模型平台'),
  ('models', 'delete', '删除模型平台')
ON CONFLICT (module, action) DO NOTHING;

-- EXISTS 兜底：万一这个库里没有 role_super_admin（比如 Super Admin 是另一个 id），
-- 少了它 role_permissions 会外键报错，把整条迁移一起回滚掉。
INSERT INTO role_permissions (role_id, permission_id)
SELECT 'role_super_admin', id FROM permissions
WHERE module = 'models'
  AND EXISTS (SELECT 1 FROM roles WHERE id = 'role_super_admin')
ON CONFLICT DO NOTHING;

-- 示例数据（按需填写 key 后启用）：
-- INSERT INTO ai_providers (name, provider, base_url, api_key, models, default_model)
-- VALUES ('DeepSeek 主力', 'deepseek', 'https://api.deepseek.com/v1', 'sk-xxx',
--         ARRAY['deepseek-v4-flash', 'deepseek-v4-pro'], 'deepseek-v4-flash'),
--        ('智谱 GLM', 'glm', 'https://open.bigmodel.cn/api/paas/v4', 'xxx.yyy',
--         ARRAY['glm-4.6', 'glm-4.5', 'glm-4-flash'], 'glm-4.6');
