const { PrismaClient } = require("../src/generated/prisma");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

async function main() {
  // 创建测试用户
  const hashedPassword = await bcrypt.hash("password123", 12);

  const users = [
    {
      name: "Arham Khan",
      email: "hello@arhamkhnz.com",
      password: hashedPassword,
    },
    {
      name: "Ammar Khan",
      email: "hello@ammarkhnz.com",
      password: hashedPassword,
    },
    {
      name: "Test User",
      email: "test@example.com",
      password: hashedPassword,
    },
  ];

  for (const user of users) {
    try {
      await prisma.user.upsert({
        where: { email: user.email },
        update: {},
        create: user,
      });
      console.log(`User ${user.email} created/updated successfully`);
    } catch (error) {
      console.error(`Error creating user ${user.email}:`, error);
    }
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  }); 