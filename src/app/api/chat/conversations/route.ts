/**
 * GET /api/chat/conversations - Get user's conversations
 * POST /api/chat/conversations - Create a new conversation
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/jwt";
import {
  getConversationsByUserId,
  createConversation,
} from "@/services/conversationService";
import type { CreateConversationRequest } from "@/types/chat";

// Helper function to extract pagination parameters
function extractPaginationParams(url: URL) {
  const pageParam = url.searchParams.get("page");
  const limitParam = url.searchParams.get("limit");
  const page = pageParam ? parseInt(pageParam) : 1;
  const limit = limitParam ? parseInt(limitParam) : 20;
  return { page, limit };
}

// GET /api/chat/conversations - Get user's conversations
export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const user = await requireAuth();

    const url = new URL(request.url);
    const { page, limit } = extractPaginationParams(url);

    // Get user's conversations
    const result = await getConversationsByUserId(
      user.id,
      page,
      limit
    );

    return NextResponse.json({
      data: result.conversations,
      pagination: {
        total: result.pagination.total,
        page: result.pagination.page,
        limit: result.pagination.pageSize,
        totalPages: result.pagination.totalPages,
      },
    });
  } catch (error: unknown) {
    console.error("Error in GET /api/chat/conversations:", error);
    const message =
      error instanceof Error ? error.message : "An unexpected error occurred";
    const status = message === "Unauthorized" ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

// POST /api/chat/conversations - Create a new conversation
export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const user = await requireAuth();

    const body: CreateConversationRequest = await request.json();

    // Create conversation
    const conversation = await createConversation(
      user.id,
      body
    );

    return NextResponse.json(conversation, { status: 201 });
  } catch (error: unknown) {
    console.error("Error in POST /api/chat/conversations:", error);
    const message =
      error instanceof Error ? error.message : "An unexpected error occurred";
    const status = message === "Unauthorized" ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
