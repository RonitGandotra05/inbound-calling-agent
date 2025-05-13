import { getSession } from "next-auth/react";
import { NextRequest, NextResponse } from "next/server";

/**
 * Utility function to check if the current user is an admin
 * This can be used on the client side
 */
export async function isUserAdmin() {
  const session = await getSession();
  return session?.isAdmin === true;
}

/**
 * Server-side middleware to protect admin routes
 * Redirects to dashboard if user is not an admin
 */
export async function adminProtect(req: NextRequest) {
  const session = await getSession({ req: req as any });
  
  if (!session?.isAdmin) {
    console.log("Unauthorized access attempt to admin route");
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }
  
  return NextResponse.next();
} 