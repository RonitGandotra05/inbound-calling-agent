import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const data = await req.json();
    const event = data.event;
    
    // Handle different event types from Vapi
    switch (event.type) {
      case "call.completed":
        await handleCallCompleted(event);
        break;
      case "call.started":
        await handleCallStarted(event);
        break;
      default:
        // Log other events but don't process them
        console.log(`Received unhandled event type: ${event.type}`);
    }
    
    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Webhook error:", error);
    return NextResponse.json({ error: "Failed to process webhook" }, { status: 500 });
  }
}

async function handleCallStarted(event: any) {
  const assistant = await prisma.vapiAssistant.findUnique({
    where: { id: event.assistant_id },
    include: { owner: true }
  });
  
  if (!assistant) {
    console.error(`No assistant found with ID: ${event.assistant_id}`);
    return;
  }
  
  // Create a new call log
  await prisma.callLog.create({
    data: {
      assistantId: event.assistant_id,
      ownerId: assistant.ownerId,
      fromNumber: event.from_number,
      toNumber: event.to_number,
      transcript: {}, // Empty transcript initially
      startedAt: new Date(event.start_time || Date.now()),
    }
  });
}

async function handleCallCompleted(event: any) {
  // Get the most recent call log for this assistant without an end time
  const callLog = await prisma.callLog.findFirst({
    where: {
      assistantId: event.assistant_id,
      endedAt: null
    },
    orderBy: {
      startedAt: 'desc'
    }
  });
  
  if (!callLog) {
    console.error(`No open call log found for assistant ID: ${event.assistant_id}`);
    return;
  }
  
  // Update the call log with transcript and end time
  await prisma.callLog.update({
    where: { id: callLog.id },
    data: {
      transcript: event.transcript || {},
      summary: event.summary,
      endedAt: new Date(event.end_time || Date.now())
    }
  });
} 