import NextAuth from "next-auth";
import { authOptions } from "@/auth";

// Use a named export format that Next.js App Router expects
const handler = NextAuth(authOptions);

// Export the handler functions correctly for HTTP methods
export { handler as GET, handler as POST }; 