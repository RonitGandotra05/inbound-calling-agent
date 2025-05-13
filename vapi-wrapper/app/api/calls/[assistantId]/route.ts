import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { prisma } from "@/lib/prisma";

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

    // Check if the user owns this assistant
    const assistant = await prisma.vapiAssistant.findUnique({
      where: {
        id: params.assistantId,
        ownerId: session.userId as string,
      },
    });

    if (!assistant) {
      return NextResponse.json(
        { error: "Assistant not found" },
        { status: 404 }
      );
    }

    // Get call logs for this assistant
    const callLogs = await prisma.callLog.findMany({
      where: {
        assistantId: params.assistantId,
      },
      orderBy: {
        startedAt: "desc",
      },
    });

    return NextResponse.json(callLogs);
  } catch (error) {
    console.error("Error fetching call logs:", error);
    return NextResponse.json(
      { error: "Failed to fetch call logs" },
      { status: 500 }
    );
  }
} 