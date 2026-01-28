# 微信用户系统功能指南

本文档说明微信用户系统的完整实现和使用方法。

## 📋 目录

1. [系统架构](#系统架构)
2. [微信用户管理功能](#微信用户管理功能)
3. [微信登录集成](#微信登录集成)
4. [API 文档](#api-文档)
5. [常见问题](#常见问题)

---

## 系统架构

### 用户类型说明

系统现在有两种独立的用户类型：

| 用户类型 | 模型 | 登录方式 | 权限 |
|---------|------|---------|------|
| **管理员/普通用户** | User (admin/user) | CMS登录 | CMS后台管理权限 |
| **微信用户** | WechatUser | 微信小程序登录 | 通过微信访问系统功能 |

### 关键特性

1. **微信用户独立管理**
   - WechatUser 模型独立于 User 模型
   - 微信用户不能登录 CMS 后台
   - 通过微信 openid 进行身份认证

2. **用户隔离**
   - CMS 登录只允许 admin 和 user 类型
   - 必须 `isActive: true` 才能登录
   - 微信用户通过独立的微信登录 API

---

## 微信用户管理功能

### 访问路径

CMS后台 → 侧边栏 → **微信用户** (`/dashboard/wechat-users`)

### 功能列表

#### 1. 微信用户列表
- 📋 显示所有微信用户信息
- 🔍 微信绑定状态（openid/unionid）
- ⚡ 账户启用/禁用状态
- 📅 最后登录时间

#### 2. 添加微信用户
点击"新增微信用户"按钮，填写：
- 姓名 *（必填）
- 联系电话
- 身份证号（可选）

#### 3. 编辑微信用户
- 更新基本信息
- 启用/禁用账户
- 查看微信绑定状态
- 查看微信昵称和头像

#### 4. 删除微信用户
- 可以删除未关联的微信用户
- 需先解除关联才能删除

---

## 微信登录集成

### API 端点

#### 1. 微信登录
```http
POST /api/auth/wechat-login
Content-Type: application/json

{
  "code": "微信登录code",
  "nickname": "用户昵称",
  "avatarUrl": "头像URL"
}
```

**响应：**
```json
{
  "ok": true,
  "token": "JWT_TOKEN",
  "wechatUser": {
    "id": "微信用户ID",
    "profile": {
      "name": "姓名",
      "phone": "电话"
    },
    "wechatInfo": {
      "nickname": "昵称",
      "avatarUrl": "头像URL"
    },
    "isActive": true
  }
}
```

#### 2. 绑定微信
```http
POST /api/auth/wechat-bind
Content-Type: application/json

{
  "wechatUserId": "微信用户ID",
  "code": "微信登录code",
  "nickname": "用户昵称",
  "avatarUrl": "头像URL"
}
```

#### 3. 解绑微信
```http
DELETE /api/auth/wechat-bind?wechatUserId=微信用户ID
```

### 微信小程序集成步骤

#### 第1步：配置环境变量

在 `.env` 文件中添加：
```env
WECHAT_APPID=你的小程序APPID
WECHAT_SECRET=你的小程序SECRET
JWT_SECRET=你的JWT密钥
```

#### 第2步：实现微信接口调用

在 `src/app/api/auth/wechat-login/route.ts` 中，取消注释微信API调用代码：

```typescript
const wxResponse = await fetch(
  `https://api.weixin.qq.com/sns/jscode2session?appid=${process.env.WECHAT_APPID}&secret=${process.env.WECHAT_SECRET}&js_code=${code}&grant_type=authorization_code`
);
const wxData = await wxResponse.json();
const { openid, session_key, unionid } = wxData;
```

#### 第3步：微信小程序登录流程

```javascript
// 小程序端代码示例
wx.login({
  success: res => {
    // 发送 code 到后端
    wx.request({
      url: 'https://your-domain.com/api/auth/wechat-login',
      method: 'POST',
      data: {
        code: res.code,
        nickname: userInfo.nickName,
        avatarUrl: userInfo.avatarUrl
      },
      success: result => {
        // 保存 token
        wx.setStorageSync('token', result.data.token);
        wx.setStorageSync('wechatUser', result.data.wechatUser);
      }
    });
  }
});
```

---

## API 文档

### 微信用户管理 API

#### 获取微信用户列表
```http
GET /api/wechat-users?page=1&limit=20&search=关键词&isActive=true
```

#### 创建微信用户
```http
POST /api/wechat-users
Content-Type: application/json

{
  "profile": {
    "name": "张三",
    "phone": "13800138000",
    "idNumber": "身份证号"
  }
}
```

#### 获取微信用户详情
```http
GET /api/wechat-users/:id
```

#### 更新微信用户
```http
PATCH /api/wechat-users/:id
Content-Type: application/json

{
  "profile": {
    "name": "新姓名",
    "phone": "新电话"
  },
  "isActive": true
}
```

#### 删除微信用户
```http
DELETE /api/wechat-users/:id
```

---

## 常见问题

### Q1: 微信用户能登录CMS吗？
**A:** 不能。微信用户只能通过微信小程序登录，无法访问CMS后台。

### Q2: 微信账户被禁用后会怎样？
**A:** 被禁用的微信用户无法通过微信小程序登录，会收到"账户已禁用"的错误提示。

### Q3: 微信解绑后会怎样？
**A:** 微信用户账户依然存在，但无法通过微信登录。需要重新绑定微信才能使用。

### Q4: 如何配置微信小程序？
**A:**
1. 在微信公众平台注册小程序
2. 获取 APPID 和 SECRET
3. 配置到 `.env` 文件
4. 取消注释 wechat-login API 中的微信接口调用代码
5. 配置服务器域名白名单

### Q5: 如何确保微信登录安全？
**A:**
1. 前端使用 https 协议
2. 在微信小程序后台配置服务器域名白名单
3. 后端验证 openid 的有效性
4. 使用 JWT Token 进行会话管理

---

## 技术支持

如有问题，请联系技术团队或提交 Issue。

## 更新日志

### v2.0.0 (2025-01-XX)
- ✨ 微信用户系统独立管理
- ✨ 微信登录集成
- ✨ 完整的微信用户管理功能
- 🐛 修复用户类型验证
