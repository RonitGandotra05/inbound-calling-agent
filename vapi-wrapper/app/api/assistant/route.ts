import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { prisma } from "@/lib/prisma";
import { vapi } from "@/lib/vapi";

export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { systemPrompt } = await req.json();
  await vapi.put(`/assistants/${session.assistantId}`, { system_prompt: systemPrompt });
  await prisma.vapiAssistant.update({
    where: { id: session.assistantId },
    data: { systemPrompt },
  });
  return NextResponse.json({ ok: true });
} 