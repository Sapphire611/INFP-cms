-- 微信用户表创建脚本
-- 在 Supabase Dashboard 的 SQL Editor 中运行此脚本

-- 创建 wechat_users 表
CREATE TABLE IF NOT EXISTS wechat_users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  openid TEXT UNIQUE NOT NULL,
  unionid TEXT,
  wechat_nickname TEXT,
  wechat_avatar_url TEXT,
  mbti TEXT DEFAULT '',
  profile_name TEXT,
  profile_phone TEXT,
  profile_avatar TEXT,
  profile_id_number TEXT,
  is_active BOOLEAN DEFAULT true,
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 创建索引以提高查询性能
CREATE INDEX IF NOT EXISTS idx_wechat_users_openid ON wechat_users(openid);
CREATE INDEX IF NOT EXISTS idx_wechat_users_unionid ON wechat_users(unionid);
CREATE INDEX IF NOT EXISTS idx_wechat_users_is_active ON wechat_users(is_active);

-- 创建更新时间自动更新的触发器
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_wechat_users_updated_at
    BEFORE UPDATE ON wechat_users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 启用 Row Level Security (RLS)
ALTER TABLE wechat_users ENABLE ROW LEVEL SECURITY;

-- 创建策略：允许匿名访问（用于微信登录）
-- 注意：在生产环境中，你可能需要更严格的权限控制
CREATE POLICY "允许匿名用户插入和读取的记录" ON wechat_users
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- 授权给匿名用户和服务角色
GRANT ALL ON wechat_users TO anon;
GRANT ALL ON wechat_users TO authenticated;
GRANT ALL ON wechat_users TO service_role;

-- 打印成功消息
DO $$
BEGIN
    RAISE NOTICE 'wechat_users 表创建成功！';
    RAISE NOTICE '已创建索引：openid, unionid, is_active';
    RAISE NOTICE '已启用 RLS 和基本权限策略';
END $$;
