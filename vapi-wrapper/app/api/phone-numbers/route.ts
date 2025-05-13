import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { vapi } from "@/lib/vapi";
import { authOptions } from "@/auth";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // Get all phone numbers for the current user
    const phoneNumbers = await prisma.phoneNumber.findMany({
      where: {
        ownerId: session.userId,
        isDeleted: false,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json(phoneNumbers);
  } catch (error) {
    console.error("Error fetching phone numbers:", error);
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
    
    // Create a phone number via Vapi API
    const phoneNumberResponse = await vapi.post("/phone-number", { provider: "vapi" });
    const phoneNumberData = phoneNumberResponse.data;
    
    if (!phoneNumberData?.id) {
      return NextResponse.json({ error: "Failed to create phone number" }, { status: 500 });
    }
    
    // Save phone number to database
    const newPhoneNumber = await prisma.phoneNumber.create({
      data: {
        vapiId: phoneNumberData.id,
        phoneNumber: phoneNumberData.number || null,
        ownerId: userId,
      }
    });
    
    return NextResponse.json(newPhoneNumber);
  } catch (error) {
    console.error("Error creating phone number:", error);
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
    const phoneNumberId = searchParams.get('id');
    
    if (!phoneNumberId) {
      return NextResponse.json({ error: "Phone number ID is required" }, { status: 400 });
    }
    
    // Verify the phone number belongs to the user
    const phoneNumber = await prisma.phoneNumber.findFirst({
      where: {
        id: phoneNumberId,
        ownerId: session.userId,
        isDeleted: false
      },
      include: {
        assistants: {
          where: {
            isDeleted: false
          }
        }
      }
    });
    
    if (!phoneNumber) {
      return NextResponse.json({ error: "Phone number not found" }, { status: 404 });
    }
    
    // Check if the phone number is assigned to any active assistants
    if (phoneNumber.assistants.length > 0) {
      return NextResponse.json({ 
        error: "Cannot delete phone number that is assigned to assistants", 
        assistants: phoneNumber.assistants 
      }, { status: 400 });
    }
    
    try {
      // Delete from Vapi API first
      await vapi.delete(`/phone-number/${phoneNumber.vapiId}`);
    } catch (vapiError) {
      console.error("Error deleting phone number from Vapi API:", vapiError);
      // Continue with local deletion even if Vapi API deletion fails
    }
    
    // Soft delete the phone number in our database
    const updatedPhoneNumber = await prisma.phoneNumber.update({
      where: {
        id: phoneNumberId
      },
      data: {
        isDeleted: true
      }
    });
    
    return NextResponse.json({ 
      success: true, 
      message: "Phone number deleted successfully" 
    });
  } catch (error) {
    console.error("Error deleting phone number:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
} 