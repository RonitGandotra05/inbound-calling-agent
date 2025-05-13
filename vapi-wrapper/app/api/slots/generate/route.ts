import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { prisma } from "@/lib/prisma";
import { addDays, addHours, startOfDay } from "date-fns";

interface Session {
  userId?: string;
  assistantId?: string;
  user?: {
    name?: string | null;
    email?: string | null;
    image?: string | null;
  };
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions) as Session | null;
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    const assistantId = session.assistantId as string;

    // Clear existing slots for this assistant that are not booked
    await prisma.slot.deleteMany({
      where: {
        assistantId,
        isBooked: false
      }
    });
    
    // Get current date and set to start of day
    const today = startOfDay(new Date());
    
    // Create slots for the next 7 days
    const slots = [];
    for (let day = 0; day < 7; day++) {
      const date = addDays(today, day);
      
      // Create slots from 9am to 5pm, 1-hour each
      for (let hour = 9; hour < 17; hour++) {
        const startTime = addHours(date, hour);
        const endTime = addHours(date, hour + 1);
        
        slots.push({
          assistantId,
          startTime,
          endTime,
          isBooked: false
        });
      }
    }
    
    // Insert all slots
    const result = await prisma.slot.createMany({
      data: slots as any
    });
    
    return NextResponse.json({ 
      message: `Created ${result.count} slots`,
      count: result.count 
    });
    
  } catch (error) {
    console.error("Error generating slots:", error);
    return NextResponse.json({ error: "Failed to generate slots" }, { status: 500 });
  }
} 