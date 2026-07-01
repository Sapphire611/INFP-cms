/**
 * POST /api/chat - Send a message to DeepSeek (streaming with tool calls)
 *
 * Response: SSE stream (text/event-stream)
 * Events: { type: "text", content: string }
 *          { type: "tool-call", toolCallId, toolName, args }
 *          { type: "tool-result", toolCallId, toolName, result }
 *          { type: "done", finishReason }
 *          { type: "error", error }
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/jwt";
import { streamChatResponse } from "@/services/chatService";
import type { SendMessageRequest } from "@/types/chat";

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();

    const body: SendMessageRequest = await request.json();
    const { conversationId, message, agentId } = body;

    if (!conversationId || !message) {
      return NextResponse.json(
        { error: "conversationId, message, and agentId are required" },
        { status: 400 }
      );
    }

    if (typeof message !== "string" || message.trim().length === 0) {
      return NextResponse.json(
        { error: "Message must be a non-empty string" },
        { status: 400 }
      );
    }

    const conversationHistory = body.conversationHistory || [];

    const stream = await streamChatResponse(
      conversationId,
      user.id,
      message,
      agentId,
      conversationHistory
    );

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error: unknown) {
    console.error("Error in POST /api/chat:", error);
    const message =
      error instanceof Error ? error.message : "An unexpected error occurred";
    const status = message === "Unauthorized" ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
