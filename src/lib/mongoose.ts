import { NextRequest, NextResponse } from "next/server";

import mongoose from "mongoose";

const MONGODB_URI = process.env.DATABASE_URL;

if (!MONGODB_URI) {
  throw new Error("Please define the MONGODB_URI environment variable");
}

const globalForMongoose = globalThis as unknown as {
  mongoose: { conn: mongoose.Connection | null; promise: Promise<mongoose.Connection> | null };
};

// 设置 Mongoose 连接事件监听，确保持久连接
function setupConnectionListeners(connection: mongoose.Connection) {
  connection.on("connected", () => {
    console.log("✅ MongoDB: Connection established");
  });

  connection.on("disconnected", () => {
    console.warn("⚠️  MongoDB: Connection lost. Will attempt to reconnect...");
  });

  connection.on("reconnected", () => {
    console.log("✅ MongoDB: Reconnected successfully");
  });

  connection.on("error", (error) => {
    console.error("❌ MongoDB: Connection error:", error);
  });

  // 优雅关闭
  process.on("SIGINT", async () => {
    await connection.close();
    console.log("MongoDB: Connection closed due to app termination");
    process.exit(0);
  });
}

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
    // 优化的连接配置 - 支持持久连接和自动重连
    const opts = {
      serverSelectionTimeoutMS: 30000, // 服务器选择超时
      socketTimeoutMS: 45000, // Socket 超时
      maxPoolSize: 10, // 连接池最大连接数
      minPoolSize: 2, // 连接池最小连接数
      maxIdleTimeMS: 10000, // 连接最大空闲时间
      retryWrites: true, // 自动重试写操作
      retryReads: true, // 自动重试读操作
    };

    console.log("🔄 Attempting to connect to MongoDB...");

    // Create connection promise and wait for it to be fully open
    const promise = mongoose.connect(MONGODB_URI!, opts).then((mongooseInstance) => {
      return new Promise<mongoose.Connection>((resolve, reject) => {
        const connection = mongooseInstance.connection;

        // 设置连接事件监听
        setupConnectionListeners(connection);

        if (connection.readyState === 1) {
          resolve(connection);
        } else {
          console.log("Waiting for MongoDB connection to open...");
          connection.once("open", () => {
            console.log("✅ MongoDB connection opened successfully");
            resolve(connection);
          });
          connection.once("error", (error) => {
            console.error("❌ MongoDB connection error during open:", error);
            reject(error);
          });
        }
      });
    });

    globalForMongoose.mongoose = { conn: null, promise };
    const connection = await promise;
    globalForMongoose.mongoose.conn = connection;

    return connection;
  } catch (error) {
    console.error("❌ MongoDB connection error:", error);
    // Reset the promise on failure to allow retries
    globalForMongoose.mongoose = { conn: null, promise: null };
    throw error;
  }
}

// 服务启动时立即建立并保持数据库连接
connectDB()
  .then(() => {
    console.log("🚀 MongoDB: Initial connection successful - connection will be maintained");
  })
  .catch((error) => {
    console.error("❌ MongoDB: Initial connection failed:", error);
    // 可以选择在这里添加重试逻辑或退出进程
  });

export default mongoose;

export { connectDB };

/**
 * @deprecated
 * withDBConnect HOC 已弃用，不再需要使用。
 * 数据库连接现在通过 src/middleware.ts 中的中间件自动管理。
 * 所有 /api 路由在处理请求前会自动连接数据库。
 *
 * 这个函数保留用于向后兼容和文档目的。
 */
export function withDBConnect<T extends unknown[]>(handler: (req: NextRequest, ...args: T) => Promise<NextResponse>) {
  return async (req: NextRequest, ...args: T) => {
    await connectDB();
    return handler(req, ...args);
  };
}
