/**
 * POST /api/chat - Send a message to DeepSeek
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/jwt";
import { sendMessage } from "@/services/chatService";
import type { SendMessageRequest } from "@/types/chat";

export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const user = await requireAuth();

    const body: SendMessageRequest = await request.json();
    const { conversationId, message } = body;

    // Validate request
    if (!conversationId || !message) {
      return NextResponse.json(
        { error: "conversationId and message are required" },
        { status: 400 }
      );
    }

    if (typeof message !== "string" || message.trim().length === 0) {
      return NextResponse.json(
        { error: "Message must be a non-empty string" },
        { status: 400 }
      );
    }

    // Get conversation history from request body (from localStorage)
    const conversationHistory = body.conversationHistory || [];

    // Send message to DeepSeek
    const response = await sendMessage(
      conversationId,
      message,
      conversationHistory
    );

    return NextResponse.json(response);
  } catch (error: unknown) {
    console.error("Error in POST /api/chat:", error);
    const message =
      error instanceof Error ? error.message : "An unexpected error occurred";
    const status = message === "Unauthorized" ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
