# PostgreSQL 数据库管理

## 初始化数据库

```bash
# 启动 PostgreSQL Docker 容器
docker run --name postgres -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=infp_cms -p 5432:5432 -d postgres:16

# 创建表结构
npx prisma db push

# 或使用 migrate（生产环境推荐）
npx prisma migrate dev --name init

# 创建初始管理员用户
npx tsx src/scripts/init-user.ts
```

## db push vs migrate 区别

| | db push | migrate |
|---|---|---|
| **使用场景** | 开发环境 | 生产环境 |
| **速度** | ⚡ 快 | 🐢 慢 |
| **迁移历史** | ❌ 不记录 | ✅ 生成迁移文件 |
| **可逆性** | ❌ 无法回滚 | ✅ 可以回滚 |
| **团队协作** | ❌ 难以同步 | ✅ 易于同步 |

### db push
```bash
npx prisma db push
```
- 直接同步 schema 到数据库
- **丢失数据风险**：会删除不匹配的列/表
- 适合快速原型开发

### migrate
```bash
npx prisma migrate dev --name 描述
```
- 生成迁移文件 `prisma/migrations/xxx_描述/migration.sql`
- 记录每次变更历史
- 团队成员运行 `migrate deploy` 同步
- 生产环境推荐

**建议**：
- 开发初期：`db push`
- 有数据后/团队协作：`migrate`
