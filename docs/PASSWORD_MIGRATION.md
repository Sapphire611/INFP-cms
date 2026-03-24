# 密码加密迁移文档

## 📋 概述

本文档记录了 INFP-CMS 项目从"明文传输密码"到"前端加密传输"的安全升级过程。

**迁移日期**: 2026-03-24
**迁移状态**: ✅ 已完成

## 🔄 迁移内容

### 旧方案（不安全）
```
前端: 明文密码 → 发送给后端
后端: bcrypt.hash(明文密码) → 存储
数据库: bcrypt hash
```

### 新方案（安全）
```
前端: SHA-256(密码 + 固定salt) → 发送给后端
后端: bcrypt.hash(SHA-256 hash) → 存储
数据库: bcrypt(SHA-256 hash)
```

## ✅ 已完成的修改

### 前端修改
1. ✅ 创建 `src/lib/crypto.ts` - SHA-256 加密工具
2. ✅ 修改 `src/components/login-form.tsx` - 登录前hash密码
3. ✅ 修改 `src/components/register-form.tsx` - 注册前hash密码

### 后端修改
1. ✅ 修改 `src/lib/auth.ts` - 支持新旧两种密码格式验证
2. ✅ 登录API自动检测并升级旧格式密码
3. ✅ 注册API接收已hash的密码

### 配置文件
1. ✅ 添加 `NEXT_PUBLIC_PASSWORD_SALT` 环境变量
2. ✅ 更新 `.env.example` 配置示例

### 工具脚本
1. ✅ 创建 `src/scripts/manage-user-passwords.ts` - 用户密码管理工具

## 🔐 安全性说明

### 为什么这样设计？

**双重加密的好处：**
1. **传输安全**: 网络中传输的是 SHA-256 hash，不是明文密码
2. **存储安全**: 数据库存储的是 bcrypt hash，即使数据库泄露也安全
3. **不可逆**: 即使获取到 SHA-256 hash，也无法反推原始密码
4. **防御重放**: 攻击者即使拦截到 hash，也无法用于其他网站

### 威胁模型

| 威胁 | 旧方案 | 新方案 |
|------|--------|--------|
| 网络嗅探 | ❌ 明文密码泄露 | ✅ 只泄露hash |
| 数据库泄露 | ⚠️ 需要破解bcrypt | ✅ 需要先破解SHA-256再破解bcrypt |
| 中间人攻击 | ❌ 直接获取密码 | ✅ 只获取hash |
| 彩虹表攻击 | ⚠️ 可能破解 | ✅ 双重加密，几乎不可能 |

## 📊 现有用户处理

### 自动迁移机制

**无需手动干预！** 系统设计了平滑的自动迁移机制：

1. **新用户注册**: 直接使用新格式（SHA-256 + bcrypt）
2. **现有用户登录**:
   - 首先尝试新格式验证
   - 如果失败，尝试旧格式验证
   - 如果旧格式验证成功，**自动升级**到新格式
   - 用户无感知，体验流畅

### 检测迁移进度

```bash
# 列出所有用户
npx ts-node src/scripts/manage-user-passwords.ts list
```

### 手动重置密码（如需要）

```bash
# 为特定用户重置密码
npx ts-node src/scripts/manage-user-passwords.ts reset <user-id> "NewPassword123!"

# 为所有用户重置密码（谨慎使用！）
npx ts-node src/scripts/manage-user-passwords.ts reset-all "TempPassword123!"
```

## 🚀 部署步骤

### 1. 更新环境变量

在 `.env` 文件中添加：

```env
# 密码加密Salt（生产环境请使用强随机字符串！）
NEXT_PUBLIC_PASSWORD_SALT="your-strong-random-salt-here"
```

**重要提示**：
- 🔥 生产环境必须使用强随机字符串
- 🔥 不要使用默认值 "infp-cms-fixed-salt-2024"
- 🔑 建议长度至少 32 个字符

### 2. 生成强随机 Salt

```bash
# Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"

# OpenSSL
openssl rand -base64 32
```

### 3. 部署代码

```bash
# 构建项目
npm run build

# 部署到Vercel
git push origin dev
```

### 4. 验证功能

1. **测试注册功能**: 创建新用户，验证能否正常注册和登录
2. **测试登录功能**: 使用现有账户登录，验证自动升级
3. **检查日志**: 观察是否有 "Auto-upgrading user password" 日志

## 📝 开发者指南

### 前端开发

```typescript
import { hashPasswordWithSHA256 } from '@/lib/crypto';

// 在发送密码前先hash
const hashedPassword = await hashPasswordWithSHA256(plainPassword);

// 发送给后端
fetch('/api/auth/login', {
  method: 'POST',
  body: JSON.stringify({ password: hashedPassword })
});
```

### 后端开发

```typescript
import { comparePassword } from '@/lib/auth';

// 验证密码（自动支持新旧两种格式）
const user = await validateCredentials(email, hashedPassword);
```

## ⚠️ 注意事项

### 前端兼容性
- ✅ 使用 Web Crypto API（所有现代浏览器支持）
- ❌ IE11 不支持（但项目已不兼容IE11）

### 安全建议
1. **Salt 管理**: 定期更换 salt（需要重新hash所有密码）
2. **强密码策略**: 建议前端增加密码强度检查
3. **速率限制**: 防止暴力破解攻击
4. **HTTPS**: 生产环境必须使用 HTTPS

### 已知限制
1. 如果用户忘记密码，需要重置（无法找回）
2. 数据库迁移后无法回退到旧方案
3. 需要前端支持 Web Crypto API

## 🧪 测试清单

### 功能测试
- [ ] 新用户注册成功
- [ ] 新用户登录成功
- [ ] 旧用户登录成功（自动升级）
- [ ] 旧用户再次登录成功（使用新格式）
- [ ] 错误密码登录失败
- [ ] "记住我"功能正常（30天）

### 安全测试
- [ ] 网络抓包看不到明文密码
- [ ] 数据库中的密码是双重hash
- [ ] 无法从hash反推密码

## 📞 技术支持

如有问题，请参考：
- [Web Crypto API 文档](https://developer.mozilla.org/en-US/docs/Web/API/Web_Crypto_API)
- [bcrypt 安全性说明](https://github.com/kelektiv/node.bcrypt.js#security-considerations)
- 项目 GitHub Issues

---

**迁移状态**: ✅ 完成
**最后更新**: 2026-03-24
**维护者**: INFP-CMS 开发团队
