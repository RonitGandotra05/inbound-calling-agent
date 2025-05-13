import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/auth";

export async function POST(req: NextRequest) {
  try {
    // Check if the user is authenticated and is an admin
    const session = await getServerSession(authOptions);

    if (!session || !session.isAdmin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const body = await req.json();
    const { assistantId, isDeleted } = body;

    if (!assistantId || isDeleted === undefined) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Update the assistant's deleted status
    const updatedAssistant = await prisma.vapiAssistant.update({
      where: { id: assistantId },
      data: { isDeleted },
    });

    return NextResponse.json({ 
      success: true, 
      message: isDeleted ? "Assistant marked as deleted" : "Assistant restored", 
      assistant: updatedAssistant 
    });
  } catch (error) {
    console.error("Error toggling assistant status:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
} 