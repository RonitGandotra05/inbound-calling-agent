import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { prisma } from "@/lib/prisma";
import { vapi } from "@/lib/vapi";
import bcrypt from "bcryptjs";
import { JWT } from "next-auth/jwt";
import crypto from "crypto";

interface SessionUser {
  id: string;
  email: string;
}

// Extend the built-in session types
declare module "next-auth" {
  interface Session {
    userId: string;
    assistantId?: string;
    isAdmin?: boolean;
    user?: {
      name?: string | null;
      email?: string | null;
      image?: string | null;
    };
  }
}

// Extend JWT type
declare module "next-auth/jwt" {
  interface JWT {
    userId: string;
    assistantId?: string;
    isAdmin?: boolean;
  }
}

// Track user login
async function trackUserLogin(userId: string, ipAddress?: string) {
  try {
    await prisma.loginHistory.create({
      data: {
        userId,
        ipAddress: ipAddress || null,
      },
    });
  } catch (error) {
    console.error("Failed to track login:", error);
    // Don't throw - we don't want login tracking to break the auth flow
  }
}

export const authOptions = {
  providers: [
    Credentials({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials, req) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Missing credentials");
        }
        
        try {
          const user = await prisma.user.findUnique({
            where: { email: credentials.email }
          });
          
          if (!user || !user.hashedPassword) {
            throw new Error("Invalid email or password");
          }
          
          const isPasswordValid = await bcrypt.compare(
            credentials.password,
            user.hashedPassword
          );
          
          if (!isPasswordValid) {
            throw new Error("Invalid email or password");
          }
          
          // Get client IP if available
          const ipAddress = req?.headers?.['x-forwarded-for'] || 
                           req?.headers?.['x-real-ip'] || 
                           null;
          
          // Track successful login
          await trackUserLogin(user.id, ipAddress as string);
          
          return user;
        } catch (error) {
          console.error("Authentication error:", error);
          return null;
        }
      }
    })
  ],
  pages: {
    signIn: '/',
    error: '/'
  },
  secret: process.env.NEXTAUTH_SECRET,
  session: { 
    strategy: "jwt" as const,
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  jwt: {
    maxAge: 30 * 24 * 60 * 60 // 30 days
  },
  debug: process.env.NODE_ENV === 'development',
  callbacks: {
    async jwt({ token, user }: { token: JWT; user: any }) {
      if (user) {
        // Store user ID in token
        token.userId = user.id;
        
        // Check if user is an admin
        const adminEmail = process.env.admin_email || process.env.ADMIN_EMAIL;
        // Avoid logging emails
        if (user.email === adminEmail || user.isAdmin) {
          token.isAdmin = true;
        }
        
        // We no longer automatically create an assistant
        // Just check if the user has any assistants assigned
        const assistant = await prisma.vapiAssistant.findFirst({
          where: { ownerId: user.id },
          orderBy: { createdAt: 'desc' }
        });
        
        if (assistant) {
          token.assistantId = assistant.id;
        }
      }
      return token;
    },
    async session({ session, token }: { session: any; token: JWT }) {
      session.userId = token.userId as string;
      
      if (token.assistantId) {
        session.assistantId = token.assistantId as string;
      }
      
      if (token.isAdmin) {
        session.isAdmin = true;
      }
      
      return session;
    },
  },
};

// Keep the onboardNewAssistant function but it won't be called automatically
// It will be called from the admin dashboard or user dashboard when needed
async function onboardNewAssistant(ownerId: string) {
  try {
    // Create a phone number via Vapi API
    const phoneNumberResponse = await vapi.post("/phone-number", { provider: "vapi" });
    const phoneNumber = phoneNumberResponse.data;
    
    if (!phoneNumber?.id) {
      throw new Error("Invalid phone number response from Vapi API");
    }
    
    // Create a new assistant via Vapi API with working configuration
    const assistantResponse = await vapi.post("/assistant", {
      name: `${ownerId}-assistant`,
      model: {
        provider: "cerebras",
        model: "llama-3.3-70b",
        messages: [
          {
            role: "system",
            content: "You are a helpful AI receptionist."
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
      firstMessage: "Hello! How can I assist you today!"
    });
    const assistant = assistantResponse.data;
    
    if (!assistant?.id) {
      throw new Error("Invalid assistant response from Vapi API");
    }
    
    // Create in our database
    const newAssistant = await prisma.vapiAssistant.create({
      data: {
        id: assistant.id,
        phoneNumber: phoneNumber.id, // We're using the phone number ID since we don't have the actual number
        ownerId,
        systemPrompt: "You are a helpful AI receptionist."
      },
    });
    
    return newAssistant;
  } catch (error) {
    console.error("Error creating Vapi assistant:", error);
    
    // Create a fallback assistant record if API call fails
    // This ensures login still works even if Vapi API is down
    const fallbackAssistant = await prisma.vapiAssistant.create({
      data: {
        id: crypto.randomUUID(),
        phoneNumber: "API_ERROR",
        ownerId,
        systemPrompt: "API Error - Please try again later"
      },
    });
    
    return fallbackAssistant;
  }
}

export { onboardNewAssistant }; 