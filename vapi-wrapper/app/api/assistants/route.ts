import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { vapi } from "@/lib/vapi";
import { authOptions, onboardNewAssistant } from "@/auth";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // Get all assistants for the current user with their associated phone numbers
    const assistants = await prisma.vapiAssistant.findMany({
      where: {
        ownerId: session.userId,
        isDeleted: false,
      },
      include: {
        phoneNumber: true
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    // Transform the data to include the phone number directly
    const transformedAssistants = assistants.map((assistant: any) => ({
      ...assistant,
      phoneNumber: assistant.phoneNumber?.phoneNumber || null,
      phoneNumberId: assistant.phoneNumberId
    }));

    return NextResponse.json(transformedAssistants);
  } catch (error) {
    console.error("Error fetching assistants:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }
    
    const userId = session.userId;
    
    // Get user info to create a proper naming convention
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { 
        email: true,
        assistants: {
          where: { isDeleted: false },
          select: { id: true }
        }
      }
    });
    
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    
    // Extract username from email (everything before @)
    const username = user.email.split('@')[0];
    // Count existing assistants to determine number
    const assistantCount = user.assistants.length + 1;
    // Create name with format "username - Agent X"
    const assistantName = `${username} - Agent ${assistantCount}`;

    // Get user's available phone numbers
    const phoneNumber = await prisma.phoneNumber.findFirst({
      where: {
        ownerId: userId,
        isDeleted: false,
        assistants: { none: {} } // Phone number not assigned to any assistant
      }
    });

    // Create a phone number if none available
    let phoneNumberId = null;
    let actualPhoneNumber = null;
    
    if (!phoneNumber) {
      // Create a new phone number
      const phoneNumberResponse = await vapi.post("/phone-number", { provider: "vapi" });
      const newPhoneNumberData = phoneNumberResponse.data;
      
      console.log('Phone number creation response:', newPhoneNumberData);
      
      if (!newPhoneNumberData?.id) {
        return NextResponse.json({ error: "Failed to create phone number" }, { status: 500 });
      }
      
      // Save phone number to database - store both ID and actual number
      const newPhoneNumber = await prisma.phoneNumber.create({
        data: {
          vapiId: newPhoneNumberData.id,
          phoneNumber: newPhoneNumberData.number || null,
          ownerId: userId,
        }
      });
      
      phoneNumberId = newPhoneNumber.id;
      actualPhoneNumber = newPhoneNumberData.number;
    } else {
      phoneNumberId = phoneNumber.id;
      actualPhoneNumber = phoneNumber.phoneNumber;
    }
    
    // Create assistant via Vapi API
    const assistantResponse = await vapi.post("/assistant", {
      name: assistantName,
      model: {
        provider: "cerebras",
        model: "llama-3.3-70b",
        messages: [
          {
            role: "system",
            content: "You are a helpful AI assistant."
          }
        ]
      },
      voice: {
        provider: "11labs",
        voiceId: "sarah",
        cachingEnabled: true
      },
      transcriber: {
        provider: "11labs",
        model: "scribe_v1",
        language: "en"
      },
      firstMessage: "Hello! How can I assist you today?"
    });
    const assistantData = assistantResponse.data;
    
    if (!assistantData?.id) {
      return NextResponse.json({ error: "Failed to create assistant" }, { status: 500 });
    }
    
    // Create assistant in our database with phone number connection
    const newAssistant = await prisma.vapiAssistant.create({
      data: {
        id: assistantData.id,
        name: assistantName,
        vapiId: assistantData.id,
        phoneNumberId: phoneNumberId,
        ownerId: userId,
        systemPrompt: "You are a helpful AI assistant." 
      },
      include: {
        phoneNumber: true
      }
    });
    
    // Transform to match the expected format
    const transformedAssistant = {
      ...newAssistant,
      phoneNumber: actualPhoneNumber,
      phoneNumberId: phoneNumberId
    };
    
    return NextResponse.json(transformedAssistant);
  } catch (error) {
    console.error("Error creating assistant:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }
    
    const { searchParams } = new URL(req.url);
    const assistantId = searchParams.get('id');
    
    if (!assistantId) {
      return NextResponse.json({ error: "Assistant ID is required" }, { status: 400 });
    }
    
    // Verify the assistant belongs to the user
    const assistant = await prisma.vapiAssistant.findFirst({
      where: {
        id: assistantId,
        ownerId: session.userId,
        isDeleted: false
      }
    });
    
    if (!assistant) {
      return NextResponse.json({ error: "Assistant not found" }, { status: 404 });
    }
    
    try {
      // Delete from Vapi API first
      await vapi.delete(`/assistant/${assistant.vapiId}`);
    } catch (vapiError) {
      console.error("Error deleting assistant from Vapi API:", vapiError);
      // Continue with local deletion even if Vapi API deletion fails
    }
    
    // Soft delete the assistant in our database
    const updatedAssistant = await prisma.vapiAssistant.update({
      where: {
        id: assistantId
      },
      data: {
        isDeleted: true
      }
    });
    
    return NextResponse.json({ 
      success: true, 
      message: "Assistant deleted successfully" 
    });
  } catch (error) {
    console.error("Error deleting assistant:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
} 