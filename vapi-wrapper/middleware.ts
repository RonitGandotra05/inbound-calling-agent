import { NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { NextRequest } from "next/server";

export async function middleware(req: NextRequest) {
  console.log(`Middleware running for path: ${req.nextUrl.pathname}`);
  
  const token = await getToken({
    req,
    secret: process.env.NEXTAUTH_SECRET,
  });
  
  console.log(`User token:`, JSON.stringify({
    userId: token?.userId,
    isAdmin: token?.isAdmin,
    assistantId: token?.assistantId
  }));

  // Protect admin routes
  if (req.nextUrl.pathname.startsWith("/admin") && !token?.isAdmin) {
    console.log("Unauthorized access to admin route, redirecting to dashboard");
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  // If user is an admin, redirect to admin dashboard
  if (token?.isAdmin && req.nextUrl.pathname === "/dashboard") {
    console.log("Admin user detected, redirecting to admin dashboard");
    return NextResponse.redirect(new URL("/admin", req.url));
  }

  /*
  // For regular users, only redirect if they have an assistantId
  if (token && !token.isAdmin && req.nextUrl.pathname === "/dashboard" && token.assistantId) {
    console.log(`Regular user with assistantId ${token.assistantId}, redirecting to assistant page`);
    return NextResponse.redirect(
      new URL(`/dashboard/${token.assistantId}`, req.url),
    );
  }
  */
  
  return NextResponse.next();
}

export const config = { 
  matcher: [
    "/dashboard", 
    "/admin/:path*"
  ]
}; 