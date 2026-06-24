-- 数据库迁移脚本：给 wechat_users 表添加邮箱登录支持
-- 执行日期：2026-06-24
-- 说明：允许微信用户使用邮箱+密码登录

-- 添加邮箱字段（唯一）
ALTER TABLE wechat_users 
ADD COLUMN IF NOT EXISTS email VARCHAR(255) UNIQUE,
ADD COLUMN IF NOT EXISTS password VARCHAR(255);

-- 创建邮箱索引
CREATE UNIQUE INDEX IF NOT EXISTS idx_wechat_users_email ON wechat_users(email) WHERE email IS NOT NULL;

-- 注释
COMMENT ON COLUMN wechat_users.email IS '用户邮箱，用于邮箱登录';
COMMENT ON COLUMN wechat_users.password IS '登录密码（bcrypt 加密）';

-- 验证
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'wechat_users' 
AND column_name IN ('email', 'password');
