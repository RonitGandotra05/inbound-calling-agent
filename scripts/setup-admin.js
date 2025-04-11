require('dotenv').config();
const { query, pool } = require('../src/lib/db');
const bcrypt = require('bcrypt');

async function createAdminUser() {
  try {
    // Check if admin user already exists
    const existingAdmin = await query('SELECT * FROM users WHERE email = $1', ['admin@example.com']);
    
    if (existingAdmin.rows.length === 0) {
      // Hash the password
      const hashedPassword = await bcrypt.hash('admin123', 10);
      
      // Create an admin user
      await query(
        'INSERT INTO users (email, password, is_admin) VALUES ($1, $2, $3)',
        ['admin@example.com', hashedPassword, true]
      );
      
      console.log('Admin user created successfully');
    } else {
      console.log('Admin user already exists');
    }
  } catch (error) {
    console.error('Error creating admin user:', error);
  }
}

async function main() {
  try {
    console.log('Creating admin user...');
    await createAdminUser();
    
    console.log('Admin setup completed');
  } catch (error) {
    console.error('Error during admin setup:', error);
  } finally {
    // Close the database connection
    await pool.end();
  }
}

main(); 