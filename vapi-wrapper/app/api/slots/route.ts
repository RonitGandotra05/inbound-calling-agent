import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const assistantId = session.assistantId as string;

    // Get query parameters
    const url = new URL(req.url);
    const startDate = url.searchParams.get("startDate");
    const endDate = url.searchParams.get("endDate");
    const filterBooked = url.searchParams.get("filterBooked") === "true";
    
    // Build query
    const query: any = { assistantId };
    
    if (startDate && endDate) {
      query.startTime = { gte: new Date(startDate) };
      query.endTime = { lte: new Date(endDate) };
    }
    
    if (filterBooked === false) {
      query.isBooked = false;
    }
    
    // Get slots
    const slots = await prisma.slot.findMany({
      where: query,
      orderBy: {
        startTime: 'asc'
      }
    });
    
    return NextResponse.json(slots);
  } catch (error) {
    console.error("Fetch slots error:", error);
    return NextResponse.json({ error: "Failed to fetch slots" }, { status: 500 });
  }
} 