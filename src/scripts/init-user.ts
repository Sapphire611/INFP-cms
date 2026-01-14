import mongoose from "mongoose";

import { connectDB } from "@/lib/mongoose";
import User from "@/models/user";

const userData = {
  username: "Admin",
  email: "admin@test.com",
  password: "$2b$12$88q8HQEqsv33mXvhGmWLt.fEQivLNg5innUvWlRUj.RYOqek.LFQ.",
  userType: "admin" as const,
  profile: {
    name: "admin",
    phone: "",
    avatar: "",
  },
  isActive: true,
};


async function initUser() {
  try {
    await connectDB();
    console.log("Connected to MongoDB successfully");

    // Check if user already exists
    const existingUser = await User.findOne({ email: userData.email });
    if (existingUser) {
      console.log("User already exists in database");
      console.log("User ID:", existingUser._id);
      return;
    }

    // Create new user with pre-encrypted password
    // 使用 insertMany 跳过 pre-save 钩子，避免密码二次加密
    const [newUser] = await User.insertMany([userData], {
      lean: false,
    });

    console.log("✅ Initial admin user created successfully");
    console.log("📧 Email:", newUser.email);
    console.log("👤 Username:", newUser.username);
    console.log("🆔 User ID:", newUser._id);
  } catch (error) {
    console.error("❌ Error initializing user:", error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log("\n🔌 Disconnected from MongoDB");
    process.exit(0);
  }
}

initUser();
