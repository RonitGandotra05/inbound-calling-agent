const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');
const { v4: uuidv4 } = require('uuid');

// Load environment variables
dotenv.config();

const prisma = new PrismaClient();

async function main() {
  const adminEmail = process.env.ADMIN_EMAIL || 'admin$128375@gmail.com';
  const adminPassword = process.env.ADMIN_PASSWORD || '3$%d382gG*29&';

  console.log(`Creating admin user with email: ${adminEmail}`);

  // Check if admin already exists
  const existingAdmin = await prisma.user.findUnique({
    where: { email: adminEmail }
  });

  if (existingAdmin) {
    console.log('Admin user already exists - updating to ensure admin rights');
    
    // Update the existing user to ensure they have admin rights
    const updatedAdmin = await prisma.user.update({
      where: { email: adminEmail },
      data: {
        hashedPassword: await bcrypt.hash(adminPassword, 10),
        isAdmin: true
      }
    });
    
    console.log(`Admin user updated: ${updatedAdmin.id}`);
    return;
  }

  // Create new admin user
  const hashedPassword = await bcrypt.hash(adminPassword, 10);
  
  const newAdmin = await prisma.user.create({
    data: {
      id: uuidv4(),
      email: adminEmail,
      hashedPassword,
      isAdmin: true
    }
  });

  console.log(`Admin user created successfully with id: ${newAdmin.id}`);
}

main()
  .catch((e) => {
    console.error('Error creating admin user:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  }); 