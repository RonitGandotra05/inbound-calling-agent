import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { prisma } from "@/lib/prisma";
import { vapi } from "@/lib/vapi";

interface Session {
  userId?: string;
  assistantId?: string;
  user?: {
    name?: string | null;
    email?: string | null;
    image?: string | null;
  };
}

export async function GET(
  req: NextRequest,
  { params }: { params: { assistantId: string } }
) {
  try {
    const session = await getServerSession(authOptions) as Session | null;
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if the user is authorized to access this assistant
    const assistant = await prisma.vapiAssistant.findUnique({
      where: {
        id: params.assistantId,
        ownerId: session.userId as string,
      },
      include: {
        phoneNumber: true
      }
    });

    if (!assistant) {
      return NextResponse.json({ error: "Assistant not found" }, { status: 404 });
    }

    // Transform the response to include phoneNumber directly
    const transformedAssistant = {
      ...assistant,
      phoneNumber: assistant.phoneNumber?.phoneNumber || null
    };

    return NextResponse.json(transformedAssistant);
  } catch (error) {
    console.error("Error fetching assistant:", error);
    return NextResponse.json(
      { error: "Failed to fetch assistant" },
      { status: 500 }
    );
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { assistantId: string } }
) {
  try {
    const session = await getServerSession(authOptions) as Session | null;
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { systemPrompt } = await req.json();
    
    if (!systemPrompt) {
      return NextResponse.json({ error: "System prompt is required" }, { status: 400 });
    }

    // Check if the user is authorized to update this assistant
    const assistant = await prisma.vapiAssistant.findUnique({
      where: {
        id: params.assistantId,
        ownerId: session.userId as string,
      },
    });

    if (!assistant) {
      return NextResponse.json({ error: "Assistant not found" }, { status: 404 });
    }

    // Update the assistant in our database
    const updatedAssistant = await prisma.vapiAssistant.update({
      where: {
        id: params.assistantId,
      },
      data: {
        systemPrompt,
      },
      include: {
        phoneNumber: true
      }
    });

    // Also update in Vapi API if possible
    try {
      await vapi.patch(`/assistant/${assistant.vapiId}`, {
        model: {
          messages: [
            {
              role: "system",
              content: systemPrompt
            }
          ]
        }
      });
    } catch (vapiError) {
      console.error("Error updating assistant in Vapi API:", vapiError);
      // Continue even if Vapi API update fails
    }

    const transformedAssistant = {
      ...updatedAssistant,
      phoneNumber: updatedAssistant.phoneNumber?.phoneNumber || null
    };

    return NextResponse.json(transformedAssistant);
  } catch (error) {
    console.error("Error updating assistant:", error);
    return NextResponse.json(
      { error: "Failed to update assistant" },
      { status: 500 }
    );
  }
} 