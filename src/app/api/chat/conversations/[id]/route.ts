/**
 * DELETE /api/chat/conversations/[id] - Delete a conversation
 */

import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
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
    const token = await getToken({ req: request });
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // Verify conversation ownership
    const conversation = await getConversationById(id);
    if (!conversation) {
      return NextResponse.json(
        { error: "Conversation not found" },
        { status: 404 }
      );
    }

    if (conversation.userId !== token.sub) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Delete conversation
    await deleteConversationService(id);

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error: unknown) {
    console.error("Error in DELETE /api/chat/conversations/[id]:", error);
    const message =
      error instanceof Error ? error.message : "An unexpected error occurred";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
