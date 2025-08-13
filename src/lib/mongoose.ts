import { NextRequest, NextResponse } from "next/server";

import mongoose from "mongoose";

const MONGODB_URI = process.env.DATABASE_URL;

if (!MONGODB_URI) {
  throw new Error("Please define the MONGODB_URI environment variable");
}

const globalForMongoose = globalThis as unknown as {
  mongoose: { conn: mongoose.Connection | null; promise: Promise<mongoose.Connection> | null };
};

async function connectDB() {
  // If connection exists and is ready, return it
  if (globalForMongoose.mongoose?.conn && globalForMongoose.mongoose.conn.readyState === 1) {
    return globalForMongoose.mongoose.conn;
  }

  // If connecting promise exists, wait for it
  if (globalForMongoose.mongoose?.promise) {
    console.log("Waiting for existing MongoDB connection promise");
    return globalForMongoose.mongoose.promise;
  }

  try {
    const opts = {
      serverSelectionTimeoutMS: 30000,
      bufferTimeoutMS: 30000,
    };

    console.log("Attempting to connect to MongoDB...");
    // Create connection promise and wait for it to be fully open
    const promise = mongoose.connect(MONGODB_URI!, opts).then((mongooseInstance) => {
      return new Promise<mongoose.Connection>((resolve, reject) => {
        const connection = mongooseInstance.connection;
        if (connection.readyState === 1) {
          resolve(connection);
        } else {
          console.log("Waiting for MongoDB connection to open...");
          connection.once("open", () => {
            console.log("MongoDB connection opened successfully");
            resolve(connection);
          });
          connection.once("error", (error) => {
            console.error("MongoDB connection error during open:", error);
            reject(error);
          });
        }
      });
    });

    globalForMongoose.mongoose = { conn: null, promise };
    const connection = await promise;
    globalForMongoose.mongoose.conn = connection;
    console.log("MongoDB connected successfully");
    return connection;
  } catch (error) {
    console.error("MongoDB connection error:", error);
    // Reset the promise on failure to allow retries
    globalForMongoose.mongoose = { conn: null, promise: null };
    throw error;
  }
}

// 自动连接数据库
connectDB().catch((error) => {
  console.error("Initial MongoDB connection failed:", error);
});

export default mongoose;

export { connectDB };

export function withDBConnect<T>(handler: (req: NextRequest, ...args: T[]) => Promise<NextResponse>) {
  return async (...args: T[]) => {
    await connectDB();
    return handler(...args);
  };
}
