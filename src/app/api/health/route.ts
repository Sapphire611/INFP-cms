import { NextResponse } from "next/server";

import mongoose from "@/lib/mongoose";

/**
 * 健康检查 API
 *
 * GET /api/health
 *
 * 用于监控服务和数据库连接状态
 */
export async function GET() {
  try {
    const dbState = mongoose.connection.readyState;
    const dbStateText = ["disconnected", "connected", "connecting", "disconnecting"][dbState];

    // 尝试执行一个简单的数据库操作来确认连接
    if (dbState === 1) {
      await mongoose.connection.db?.admin().ping();
    }

    return NextResponse.json({
      status: dbState === 1 ? "healthy" : "unhealthy",
      timestamp: new Date().toISOString(),
      database: {
        state: dbStateText,
        stateCode: dbState,
        host: mongoose.connection.host || "N/A",
        name: mongoose.connection.name || "N/A",
      },
      uptime: process.uptime(),
    });
  } catch (error) {
    console.error("Health check failed:", error);

    return NextResponse.json(
      {
        status: "unhealthy",
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 503 },
    );
  }
}
