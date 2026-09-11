/**
 * DELETE /api/chat/conversations/[id] - Delete a conversation
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/jwt";
import {
  getConversationById,
  deleteConversation as deleteConversationService,
  updateConversationTitle,
} from "@/services/conversationService";

// PATCH /api/chat/conversations/[id] - Update conversation title
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    const { id } = await params;

    const conversation = await getConversationById(id);
    if (!conversation) {
      return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
    }
    if (conversation.userId !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    if (!body.title || typeof body.title !== "string" || body.title.trim().length === 0) {
      return NextResponse.json({ error: "Title is required" }, { status: 400 });
    }

    const updated = await updateConversationTitle(id, body.title.trim());
    return NextResponse.json(updated);
  } catch (error: unknown) {
    console.error("Error in PATCH /api/chat/conversations/[id]:", error);
    const message =
      error instanceof Error ? error.message : "An unexpected error occurred";
    const status = message === "Unauthorized" ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

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
      console.warn(
        `[chat] DELETE conversation ${id} → 404 库里查不到这行 (requested by ${user.id})`
      );
      return NextResponse.json(
        { error: "Conversation not found" },
        { status: 404 }
      );
    }

    if (conversation.userId !== user.id) {
      console.warn(
        `[chat] DELETE conversation ${id} → 403 owner=${conversation.userId} requester=${user.id}`
      );
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Delete conversation
    await deleteConversationService(id);

    console.log(`[chat] DELETE conversation ${id} → 200 (owner ${user.id})`);

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error: unknown) {
    console.error("Error in DELETE /api/chat/conversations/[id]:", error);
    const message =
      error instanceof Error ? error.message : "An unexpected error occurred";
    const status = message === "Unauthorized" ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
