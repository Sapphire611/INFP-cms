import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

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
    const { error } = await supabaseAdmin
      .from('users')
      .select('id')
      .limit(1);

    if (error) throw error;

    return NextResponse.json({
      status: "healthy",
      timestamp: new Date().toISOString(),
      database: {
        provider: "supabase",
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
