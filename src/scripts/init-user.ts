import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const userData = {
  username: "Admin",
  email: "admin@test.com",
  password: "$2b$10$NVDt3IdEA0XJkzeBlQnEcOD2.tNKtd7sKyGrp8G3X33Nt/kMQeA5G", // 123456
  userType: "admin" as const,
  profileName: "admin",
  profilePhone: "",
  profileAvatar: "",
  isActive: true,
};

async function initUser() {
  try {
    console.log("Connected to PostgreSQL successfully");

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: userData.email },
    });

    if (existingUser) {
      console.log("User already exists in database");
      console.log("User ID:", existingUser.id);
      return;
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(userData.password, 10);

    // Create new user
    const newUser = await prisma.user.create({
      data: {
        username: userData.username,
        email: userData.email,
        password: hashedPassword,
        userType: userData.userType,
        profileName: userData.profileName,
        profilePhone: userData.profilePhone,
        profileAvatar: userData.profileAvatar,
        isActive: userData.isActive,
      },
    });

    console.log("✅ Initial admin user created successfully");
    console.log("📧 Email:", newUser.email);
    console.log("👤 Username:", newUser.username);
    console.log("🆔 User ID:", newUser.id);
  } catch (error) {
    console.error("❌ Error initializing user:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
    console.log("\n🔌 Disconnected from PostgreSQL");
    process.exit(0);
  }
}

initUser();
