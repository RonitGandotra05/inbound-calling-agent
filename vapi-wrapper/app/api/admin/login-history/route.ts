import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/auth";

// Define user type with login history
interface UserWithLoginHistory {
  id: string;
  email: string;
  createdAt: Date;
  isAdmin: boolean;
  loginHistory: Array<{ timestamp: Date }>;
}

export async function GET(req: NextRequest) {
  try {
    // Check if the user is authenticated and is an admin
    const session = await getServerSession(authOptions);

    if (!session || !session.isAdmin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // Get today's date at midnight for filtering
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Get all users with their login history
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        createdAt: true,
        isAdmin: true,
        loginHistory: {
          orderBy: {
            timestamp: "desc"
          },
          take: 1,
        }
      },
    }) as UserWithLoginHistory[];

    // Count logins today for each user
    const loginCounts = await Promise.all(
      users.map(async (user: UserWithLoginHistory) => {
        const todayLoginCount = await prisma.loginHistory.count({
          where: {
            userId: user.id,
            timestamp: {
              gte: today
            }
          }
        });

        return {
          userId: user.id,
          count: todayLoginCount
        };
      })
    );

    // Combine the data
    const userLoginData = users.map((user: UserWithLoginHistory) => {
      const loginCount = loginCounts.find(count => count.userId === user.id)?.count || 0;
      
      return {
        id: user.id,
        email: user.email,
        createdAt: user.createdAt,
        isAdmin: user.isAdmin,
        lastLogin: user.loginHistory[0]?.timestamp || null,
        loginCountToday: loginCount
      };
    });

    return NextResponse.json(userLoginData);
  } catch (error) {
    console.error("Error fetching login history:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
} 