const db = require('../lib/db');

/**
 * Get available time slots for a specific date
 * @param {string} dateString - Date in YYYY-MM-DD format
 * @returns {Promise<Array>} - Available time slots
 */
async function getAvailableSlots(dateString) {
  try {
    // Parse the date
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      throw new Error('Invalid date format. Please use YYYY-MM-DD.');
    }
    
    // Set time bounds for the date (start of day to end of day)
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);
    
    // Get bookings for the specified date
    const bookingsResult = await db.query(
      `SELECT start_time, end_time 
       FROM bookings 
       WHERE start_time >= $1 AND end_time <= $2`,
      [startOfDay.toISOString(), endOfDay.toISOString()]
    );
    
    const existingBookings = bookingsResult.rows || [];
    
    // Define business hours (9 AM to 5 PM)
    const businessStartHour = 9;
    const businessEndHour = 17;
    
    // Create slots (30-minute intervals)
    const slots = [];
    let currentSlotStart = new Date(date);
    currentSlotStart.setHours(businessStartHour, 0, 0, 0);
    
    while (currentSlotStart.getHours() < businessEndHour) {
      const slotEnd = new Date(currentSlotStart);
      slotEnd.setMinutes(currentSlotStart.getMinutes() + 30);
      
      // Check if this slot conflicts with any existing booking
      const isAvailable = !existingBookings.some(booking => {
        const bookingStart = new Date(booking.start_time);
        const bookingEnd = new Date(booking.end_time);
        
        return (
          (currentSlotStart >= bookingStart && currentSlotStart < bookingEnd) ||
          (slotEnd > bookingStart && slotEnd <= bookingEnd) ||
          (currentSlotStart <= bookingStart && slotEnd >= bookingEnd)
        );
      });
      
      if (isAvailable) {
        slots.push({
          start: currentSlotStart.toISOString(),
          end: slotEnd.toISOString()
        });
      }
      
      // Move to next slot
      currentSlotStart = slotEnd;
    }
    
    return slots;
  } catch (error) {
    console.error('Error getting available slots:', error);
    throw error;
  }
}

/**
 * Create a new booking in the database
 * @param {Object} bookingData - Booking details
 * @returns {Promise<Object>} - Created booking details
 */
async function createBooking({ conversationId, title, description, startTime, endTime }) {
  try {
    // Store booking in the database
    const bookingResult = await db.query(
      `INSERT INTO bookings 
       (conversation_id, title, description, start_time, end_time) 
       VALUES ($1, $2, $3, $4, $5) 
       RETURNING *`,
      [
        conversationId,
        title,
        description || '',
        new Date(startTime),
        new Date(endTime)
      ]
    );
    
    const booking = bookingResult.rows[0];
    
    return {
      id: booking.id,
      title: booking.title,
      description: booking.description,
      startTime: booking.start_time,
      endTime: booking.end_time
    };
  } catch (error) {
    console.error('Error creating booking:', error);
    throw error;
  }
}

module.exports = {
  getAvailableSlots,
  createBooking
}; 