import os
import sys
import bcrypt
import psycopg2
import pytz
from datetime import datetime
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# Get database connection string from environment variables
DB_CONNECTION_STRING = os.getenv('NEON_DB_CONNECTION_STRING')

if not DB_CONNECTION_STRING:
    print("Error: Database connection string not found in environment variables.")
    sys.exit(1)

def create_user_table():
    """Drop and recreate users table with proper fields and admin user"""
    try:
        # Connect to the database
        conn = psycopg2.connect(DB_CONNECTION_STRING)
        cur = conn.cursor()
        
        # Drop existing users table if it exists
        cur.execute("DROP TABLE IF EXISTS users CASCADE")
        print("Dropped existing users table.")
        
        # Create new users table
        cur.execute("""
        CREATE TABLE users (
            id SERIAL PRIMARY KEY,
            email VARCHAR(255) UNIQUE NOT NULL,
            password VARCHAR(255) NOT NULL,
            first_name VARCHAR(100),
            last_name VARCHAR(100),
            phone_number VARCHAR(20),
            is_admin BOOLEAN DEFAULT FALSE,
            is_active BOOLEAN DEFAULT TRUE,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            last_login TIMESTAMP WITH TIME ZONE,
            login_count INTEGER DEFAULT 0
        )
        """)
        print("Created new users table structure.")
        
        # Create admin user with IST timestamp
        admin_password = os.getenv('ADMIN_PASSWORD', 'P@$$w0rd123SecureAdmin!')
        hashed_password = bcrypt.hashpw(admin_password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
        
        ist_timezone = pytz.timezone('Asia/Kolkata')
        now_ist = datetime.now(ist_timezone)
        
        cur.execute("""
        INSERT INTO users (
            email, password, first_name, last_name, is_admin, 
            created_at, updated_at
        ) VALUES (%s, %s, %s, %s, %s, %s, %s)
        """, (
            'admin@example.com', 
            hashed_password, 
            'Admin', 
            'User', 
            True, 
            now_ist, 
            now_ist
        ))
        
        print("Admin user created successfully.")
        
        # Commit changes
        conn.commit()
        print("User table created/updated successfully.")
        
    except Exception as e:
        print(f"Error: {e}")
        return False
    finally:
        # Close connection
        if conn:
            cur.close()
            conn.close()
    
    return True

if __name__ == "__main__":
    print("Recreating user table...")
    if create_user_table():
        print("Database setup completed successfully.")
    else:
        print("Database setup failed.")