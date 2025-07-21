const { PrismaClient } = require("../src/generated/prisma");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

async function main() {
  console.log("开始初始化数据库...");

  // 创建测试用户
  const hashedPassword = await bcrypt.hash("password123", 12);

  const users = [
    {
      name: "Arham Khan",
      email: "hello@arhamkhnz.com",
      password: hashedPassword,
      role: "admin",
    },
    {
      name: "Ammar Khan",
      email: "hello@ammarkhnz.com",
      password: hashedPassword,
      role: "user",
    },
    {
      name: "Test User",
      email: "test@example.com",
      password: hashedPassword,
      role: "user",
    },
  ];

  console.log("创建测试用户...");
  for (const user of users) {
    try {
      await prisma.user.upsert({
        where: { email: user.email },
        update: {},
        create: user,
      });
      console.log(`✅ 用户 ${user.email} 创建/更新成功`);
    } catch (error) {
      console.error(`❌ 创建用户 ${user.email} 失败:`, error);
    }
  }

  console.log("\n数据库初始化完成！");
  console.log("\n测试账户:");
  console.log("1. 邮箱: test@example.com, 密码: password123");
  console.log("2. 邮箱: hello@arhamkhnz.com, 密码: password123");
  console.log("3. 邮箱: hello@ammarkhnz.com, 密码: password123");
  console.log("\n访问 http://localhost:3000/test-login 进行测试");
}

main()
  .catch((e) => {
    console.error("❌ 数据库初始化失败:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  }); 