import { PrismaClient } from "@prisma/client";
import { addDays, addHours, startOfDay } from "date-fns";

const prisma = new PrismaClient();

async function seedSlots(assistantId: string) {
  try {
    console.log(`Seeding slots for assistant ${assistantId}`);
    
    // Clear existing slots for this assistant that are not booked
    await prisma.slot.deleteMany({
      where: {
        assistantId,
        isBooked: false
      }
    });
    
    // Get current date and set to start of day
    const today = startOfDay(new Date());
    
    // Create slots for the next 7 days
    const slots = [];
    for (let day = 0; day < 7; day++) {
      const date = addDays(today, day);
      
      // Create slots from 9am to 5pm, 1-hour each
      for (let hour = 9; hour < 17; hour++) {
        const startTime = addHours(date, hour);
        const endTime = addHours(date, hour + 1);
        
        slots.push({
          assistantId,
          startTime,
          endTime,
          isBooked: false
        });
      }
    }
    
    // Insert all slots
    const result = await prisma.slot.createMany({
      data: slots
    });
    
    console.log(`Created ${result.count} slots`);
    return result.count;
  } catch (error) {
    console.error("Error seeding slots:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Check if script is run directly
if (require.main === module) {
  // Get assistant ID from command line argument
  const assistantId = process.argv[2];
  
  if (!assistantId) {
    console.error("Please provide an assistant ID as an argument");
    process.exit(1);
  }
  
  seedSlots(assistantId)
    .then(() => process.exit(0))
    .catch(error => {
      console.error(error);
      process.exit(1);
    });
}

export { seedSlots }; 