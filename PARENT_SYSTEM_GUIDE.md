# 家长系统功能指南

本文档说明家长系统的完整实现和使用方法。

## 📋 目录

1. [系统架构](#系统架构)
2. [数据迁移](#数据迁移)
3. [家长管理功能](#家长管理功能)
4. [微信登录集成](#微信登录集成)
5. [API 文档](#api-文档)
6. [常见问题](#常见问题)

---

## 系统架构

### 用户类型说明

系统现在有三种独立的用户类型：

| 用户类型 | 模型 | 登录方式 | 权限 |
|---------|------|---------|------|
| **管理员** | User (admin) | CMS登录 | 完整系统管理权限 |
| **教师** | User (teacher) | CMS登录（需启用） | 管理分配的班级和学生 |
| **家长** | Parent | 微信小程序登录 | 只能查看自己子女信息 |

### 关键改动

1. **家长独立拆分**
   - 从 User 模型中分离出 Parent 模型
   - 家长不能登录 CMS 后台
   - 通过微信 openid 进行身份认证

2. **Child 模型更新**
   - `parents` 字段引用从 `User` 改为 `Parent`
   - 支持一个学生关联多个家长

3. **登录限制**
   - CMS登录只允许 admin 和 teacher
   - 必须 `isActive: true` 才能登录
   - 家长通过独立的微信登录API

---

## 数据迁移

如果你的数据库中已有 `userType: "parent"` 的用户数据，需要执行迁移。

### 执行迁移

```bash
npm run migrate:parents
```

### 迁移脚本功能

- ✅ 查找所有 parent 类型的 User 记录
- ✅ 创建对应的 Parent 记录
- ✅ 更新 Child 模型中的 parents 引用
- ✅ 保留原 User 记录（手动检查后删除）
- ✅ 跳过已迁移的记录

### 迁移后清理

迁移完成后，检查数据无误，可手动删除旧的 parent 用户：

```javascript
// MongoDB Shell
db.users.deleteMany({ userType: "parent" })
```

---

## 家长管理功能

### 访问路径

CMS后台 → 侧边栏 → **家长管理** (`/dashboard/parents`)

### 功能列表

#### 1. 家长列表
- 📋 显示所有家长信息
- 🔍 查看关联学生数
- 🔗 微信绑定状态
- ⚡ 账户启用/禁用状态
- 📅 最后登录时间

#### 2. 添加家长
点击"新增家长"按钮，填写：
- 姓名 *（必填）
- 联系电话
- 身份证号（可选）

#### 3. 编辑家长
- 更新基本信息
- 启用/禁用账户
- 查看关联学生
- 查看微信绑定状态

#### 4. 删除家长
- 只能删除未关联学生的家长
- 需先解除学生关联才能删除

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
  "parent": {
    "id": "家长ID",
    "name": "姓名",
    "phone": "电话",
    "avatar": "头像",
    "children": [],
    "isActive": true
  }
}
```

#### 2. 绑定微信
```http
POST /api/auth/wechat-bind
Content-Type: application/json

{
  "parentId": "家长ID",
  "code": "微信登录code",
  "nickname": "用户昵称",
  "avatarUrl": "头像URL"
}
```

#### 3. 解绑微信
```http
DELETE /api/auth/wechat-bind?parentId=家长ID
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
        wx.setStorageSync('parent', result.data.parent);
      }
    });
  }
});
```

---

## API 文档

### 家长管理 API

#### 获取家长列表
```http
GET /api/parents?page=1&limit=20&search=关键词&isActive=true
```

#### 创建家长
```http
POST /api/parents
Content-Type: application/json

{
  "profile": {
    "name": "张三",
    "phone": "13800138000",
    "idNumber": "身份证号"
  },
  "children": []
}
```

#### 获取家长详情
```http
GET /api/parents/:id
```

#### 更新家长
```http
PATCH /api/parents/:id
Content-Type: application/json

{
  "profile": {
    "name": "新姓名",
    "phone": "新电话"
  },
  "isActive": true,
  "children": ["学生ID1", "学生ID2"]
}
```

#### 删除家长
```http
DELETE /api/parents/:id
```

注意：只能删除未关联学生的家长。

---

## 常见问题

### Q1: 家长能登录CMS吗？
**A:** 不能。家长只能通过微信小程序登录，无法访问CMS后台。

### Q2: 如何将家长与学生关联？
**A:** 在学生管理页面，编辑学生信息时选择家长。或者在家长编辑页面添加关联学生。

### Q3: 家长账户被禁用后会怎样？
**A:** 被禁用的家长无法通过微信小程序登录，会收到"账户已禁用"的错误提示。

### Q4: 一个学生可以关联多个家长吗？
**A:** 可以。Child 模型的 parents 字段是数组，支持关联多个家长（如父亲、母亲、爷爷等）。

### Q5: 微信解绑后会怎样？
**A:** 家长账户依然存在，但无法通过微信登录。需要重新绑定微信才能使用。

### Q6: 如何配置微信小程序？
**A:**
1. 在微信公众平台注册小程序
2. 获取 APPID 和 SECRET
3. 配置到 `.env` 文件
4. 取消注释 wechat-login API 中的微信接口调用代码
5. 配置服务器域名白名单

### Q7: 数据迁移失败怎么办？
**A:**
1. 检查 MongoDB 连接
2. 确保有足够的权限
3. 查看迁移脚本输出的错误日志
4. 联系技术支持

---

## 技术支持

如有问题，请联系技术团队或提交 Issue。

## 更新日志

### v2.0.0 (2025-01-XX)
- ✨ 家长系统独立拆分
- ✨ 微信登录集成
- ✨ 完整的家长管理功能
- ✨ 数据迁移工具
- 🐛 修复用户类型验证
- 🐛 修复学生-家长关联
