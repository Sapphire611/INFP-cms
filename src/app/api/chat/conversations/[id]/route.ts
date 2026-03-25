/**
 * DELETE /api/chat/conversations/[id] - Delete a conversation
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/jwt";
import {
  getConversationById,
  deleteConversation as deleteConversationService,
} from "@/services/conversationService";

// DELETE /api/chat/conversations/[id] - Delete a conversation
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Verify authentication
    const user = await requireAuth();

    const { id } = await params;

    // Verify conversation ownership
    const conversation = await getConversationById(id);
    if (!conversation) {
      return NextResponse.json(
        { error: "Conversation not found" },
        { status: 404 }
      );
    }

    if (conversation.userId !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Delete conversation
    await deleteConversationService(id);

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error: unknown) {
    console.error("Error in DELETE /api/chat/conversations/[id]:", error);
    const message =
      error instanceof Error ? error.message : "An unexpected error occurred";
    const status = message === "Unauthorized" ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
