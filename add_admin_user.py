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

def add_admin_user():
    """Add admin user to the database"""
    try:
        # Connect to the database
        conn = psycopg2.connect(DB_CONNECTION_STRING)
        cur = conn.cursor()
        
        # Check if admin user already exists
        cur.execute("SELECT * FROM users WHERE email = %s", ['admin@gmail.com'])
        admin_exists = cur.fetchone()
        
        if admin_exists:
            print("Admin user already exists. Removing existing admin...")
            cur.execute("DELETE FROM users WHERE email = %s", ['admin@gmail.com'])
        
        # Admin credentials
        admin_email = 'admin@gmail.com'
        admin_password = 'P@$$w0rd123SecureAdmin!'
        admin_first_name = 'Admin'
        admin_last_name = 'User'
        admin_phone = '8130294123'
        
        # Create admin password hash
        hashed_password = bcrypt.hashpw(admin_password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
        
        # Create admin user with IST timestamp
        ist_timezone = pytz.timezone('Asia/Kolkata')
        now_ist = datetime.now(ist_timezone)
        
        cur.execute("""
        INSERT INTO users (
            email, password, first_name, last_name, phone_number, is_admin, 
            created_at, updated_at, is_active
        ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
        """, (
            admin_email, 
            hashed_password, 
            admin_first_name,
            admin_last_name,
            admin_phone,
            True, 
            now_ist, 
            now_ist,
            True
        ))
        
        # Commit changes
        conn.commit()
        print("Admin user created successfully with the following details:")
        print(f"Email: {admin_email}")
        print(f"Password: {admin_password}")
        print(f"Name: {admin_first_name} {admin_last_name}")
        print(f"Phone: {admin_phone}")
        print(f"Is Admin: Yes")
        
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
    print("Adding admin user to database...")
    if add_admin_user():
        print("Admin user setup completed successfully.")
    else:
        print("Admin user setup failed.") 