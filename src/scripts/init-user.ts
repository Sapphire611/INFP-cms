import mongoose from "mongoose";

import { connectDB } from "@/lib/mongoose";
import User from "@/models/user";

const userData = {
  email: "liuliyi611@gmail.com",
  password: "$2b$10$hRjTbGRl5NlKM26CFlgqcOMc6Drs/wOWcjBMX8gaMW41VIguJdqW6",
  name: "Sapphire611",
  role: "admin",
  createdAt: new Date(),
  updatedAt: new Date(),
};

async function initUser() {
  try {
    await connectDB();
    console.log("Connected to MongoDB successfully");

    // Check if user already exists
    const existingUser = await User.findOne({ email: userData.email });
    if (existingUser) {
      console.log("User already exists in database");
      return;
    }

    // Create new user
    const newUser = new User(userData);
    await newUser.save();
    console.log("Initial user created successfully");
  } catch (error) {
    console.error("Error initializing user:", error);
    process.exit(1);
  } finally {
    mongoose.disconnect();
    process.exit(0);
  }
}

initUser();
