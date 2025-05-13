import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const assistantId = session.assistantId as string;
    const { slotId, patientName, phoneNumber, symptoms } = await req.json();

    // Verify the slot exists and belongs to the user's assistant
    const slot = await prisma.slot.findUnique({
      where: {
        id: slotId,
        assistantId,
        isBooked: false
      }
    });

    if (!slot) {
      return NextResponse.json({ error: "Slot not available" }, { status: 400 });
    }

    // Create booking in a transaction to ensure consistency
    const booking = await prisma.$transaction(async (tx) => {
      // Update slot to mark it as booked
      await tx.slot.update({
        where: { id: slotId },
        data: { isBooked: true }
      });

      // Create the booking
      return tx.booking.create({
        data: {
          assistantId,
          slotId,
          patientName,
          phoneNumber,
          symptoms
        }
      });
    });

    return NextResponse.json(booking, { status: 201 });
  } catch (error) {
    console.error("Create booking error:", error);
    return NextResponse.json({ error: "Failed to create booking" }, { status: 500 });
  }
} 