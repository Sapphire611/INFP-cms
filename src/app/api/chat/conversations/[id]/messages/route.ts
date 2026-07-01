/**
 * GET /api/chat/conversations/[id]/messages - Get messages for a conversation
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/jwt";
import { getConversationById } from "@/services/conversationService";
import { getMessagesByConversationId } from "@/services/messageService";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    const { id: conversationId } = await params;

    // Verify ownership
    const conversation = await getConversationById(conversationId);
    if (!conversation) {
      return NextResponse.json(
        { error: "Conversation not found" },
        { status: 404 }
      );
    }
    if (conversation.userId !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get("page") || "1");
    const limit = Math.min(parseInt(url.searchParams.get("limit") || "50"), 100);

    const result = await getMessagesByConversationId(conversationId, page, limit);

    return NextResponse.json({
      messages: result.messages,
      total: result.total,
      page,
      limit,
    });
  } catch (error: unknown) {
    console.error("Error in GET /api/chat/conversations/[id]/messages:", error);
    const message =
      error instanceof Error ? error.message : "An unexpected error occurred";
    const status = message === "Unauthorized" ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
