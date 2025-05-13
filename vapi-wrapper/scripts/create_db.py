#!/usr/bin/env python3
import os
import sys
import psycopg2
from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# Get database connection string from environment variable or use default
db_url = os.getenv("DATABASE_URL", "")

if not db_url:
    print("Error: DATABASE_URL environment variable not set.")
    sys.exit(1)

try:
    # Parse the connection string
    if db_url.startswith("postgresql://"):
        db_url = db_url[len("postgresql://"):]
    
    credentials, rest = db_url.split("@", 1)
    user_pass, db_name = rest.split("/", 1)
    
    if ":" in credentials:
        user, password = credentials.split(":", 1)
    else:
        user = credentials
        password = ""
    
    host, port = user_pass.split(":") if ":" in user_pass else (user_pass, "5432")
    
    # Connect to PostgreSQL server
    conn = psycopg2.connect(
        user=user,
        password=password,
        host=host,
        port=port
    )
    conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
    cursor = conn.cursor()
    
    # Create database if it doesn't exist
    cursor.execute(f"SELECT 1 FROM pg_catalog.pg_database WHERE datname = '{db_name}'")
    exists = cursor.fetchone()
    if not exists:
        print(f"Creating database {db_name}...")
        cursor.execute(f"CREATE DATABASE {db_name}")
    else:
        print(f"Database {db_name} already exists.")
    
    cursor.close()
    conn.close()
    
    # Connect to the specific database
    conn = psycopg2.connect(
        user=user,
        password=password,
        host=host,
        port=port,
        database=db_name
    )
    cursor = conn.cursor()
    
    # Create tables
    print("Creating tables...")
    
    # Users table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS "User" (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            email TEXT UNIQUE NOT NULL,
            "hashedPassword" TEXT NOT NULL,
            "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        )
    """)
    
    # VapiAssistant table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS "VapiAssistant" (
            id TEXT PRIMARY KEY,
            "ownerId" UUID UNIQUE NOT NULL,
            "phoneNumber" TEXT NOT NULL,
            "systemPrompt" TEXT,
            "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY ("ownerId") REFERENCES "User"(id) ON DELETE CASCADE
        )
    """)
    
    # Slot table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS "Slot" (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            "assistantId" TEXT NOT NULL,
            "startTime" TIMESTAMP WITH TIME ZONE NOT NULL,
            "endTime" TIMESTAMP WITH TIME ZONE NOT NULL,
            "isBooked" BOOLEAN DEFAULT FALSE,
            FOREIGN KEY ("assistantId") REFERENCES "VapiAssistant"(id) ON DELETE CASCADE
        )
    """)
    
    # Booking table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS "Booking" (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            "assistantId" TEXT NOT NULL,
            "slotId" UUID UNIQUE NOT NULL,
            "patientName" TEXT NOT NULL,
            "phoneNumber" TEXT NOT NULL,
            symptoms TEXT,
            "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY ("assistantId") REFERENCES "VapiAssistant"(id) ON DELETE CASCADE,
            FOREIGN KEY ("slotId") REFERENCES "Slot"(id) ON DELETE CASCADE
        )
    """)
    
    # CallLog table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS "CallLog" (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            "assistantId" TEXT NOT NULL,
            "ownerId" UUID NOT NULL,
            "fromNumber" TEXT NOT NULL,
            "toNumber" TEXT NOT NULL,
            transcript JSONB NOT NULL,
            summary TEXT,
            "startedAt" TIMESTAMP WITH TIME ZONE NOT NULL,
            "endedAt" TIMESTAMP WITH TIME ZONE,
            FOREIGN KEY ("assistantId") REFERENCES "VapiAssistant"(id) ON DELETE CASCADE,
            FOREIGN KEY ("ownerId") REFERENCES "User"(id) ON DELETE CASCADE
        )
    """)
    
    conn.commit()
    print("Database setup completed successfully!")
    
except Exception as e:
    print(f"Error: {e}")
    sys.exit(1)
finally:
    if 'conn' in locals():
        cursor.close()
        conn.close() 