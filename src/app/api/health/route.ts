import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * Health check API
 *
 * GET /api/health
 *
 * Used to monitor service and database connection status
 */
export async function GET() {
  try {
    // Test database connection with a simple query
    await prisma.$queryRaw`SELECT 1`;

    return NextResponse.json({
      status: "healthy",
      timestamp: new Date().toISOString(),
      database: {
        provider: "postgresql",
        connected: true,
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
