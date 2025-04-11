const { query } = require('../lib/db');

/**
 * Create a new booking in the database
 * @param {Object} bookingData - Booking details
 * @returns {Promise<Object>} - Created booking
 */
async function createBooking({ customerName, serviceRequired, phoneNumber, appointmentDate, appointmentTime, transcript }) {
  try {
    const result = await query(
      `INSERT INTO bookings 
       (customer_name, service_required, phone_number, date_of_appointment, time, transcript) 
       VALUES ($1, $2, $3, $4, $5, $6) 
       RETURNING *`,
      [customerName, serviceRequired, phoneNumber, appointmentDate, appointmentTime, transcript]
    );
    
    return result.rows[0];
  } catch (error) {
    console.error('Error creating booking:', error);
    throw error;
  }
}

/**
 * Register a complaint in the database
 * @param {Object} complaintData - Complaint details
 * @returns {Promise<Object>} - Created complaint
 */
async function registerComplaint({ customerName, phoneNumber, service, transcript, summary }) {
  try {
    const result = await query(
      `INSERT INTO complaints 
       (customer_name, phone_number, service, transcript, summary) 
       VALUES ($1, $2, $3, $4, $5) 
       RETURNING *`,
      [customerName, phoneNumber, service, transcript, summary]
    );
    
    return result.rows[0];
  } catch (error) {
    console.error('Error registering complaint:', error);
    throw error;
  }
}

/**
 * Record feedback in the database
 * @param {Object} feedbackData - Feedback details
 * @returns {Promise<Object>} - Created feedback
 */
async function recordFeedback({ customerName, serviceName, phoneNumber, transcript, summary }) {
  try {
    const result = await query(
      `INSERT INTO feedback 
       (customer_name, service_name, phone_number, transcript, summary) 
       VALUES ($1, $2, $3, $4, $5) 
       RETURNING *`,
      [customerName, serviceName, phoneNumber, transcript, summary]
    );
    
    return result.rows[0];
  } catch (error) {
    console.error('Error recording feedback:', error);
    throw error;
  }
}

/**
 * Create a new inquiry in the database
 * @param {Object} inquiryData - Inquiry details
 * @returns {Promise<Object>} - Created inquiry
 */
async function createInquiry({ customerName, serviceName, phoneNumber, transcript }) {
  try {
    const result = await query(
      `INSERT INTO inquiry 
       (customer_name, service_name, phone_number, transcript) 
       VALUES ($1, $2, $3, $4) 
       RETURNING *`,
      [customerName, serviceName, phoneNumber, transcript]
    );
    
    return result.rows[0];
  } catch (error) {
    console.error('Error creating inquiry:', error);
    throw error;
  }
}

/**
 * Get all available services
 * @returns {Promise<Array>} - List of services
 */
async function getServices() {
  try {
    // Get unique services from all tables
    const bookingServices = await query('SELECT DISTINCT service_required FROM bookings');
    const complaintServices = await query('SELECT DISTINCT service FROM complaints');
    const feedbackServices = await query('SELECT DISTINCT service_name FROM feedback');
    const inquiryServices = await query('SELECT DISTINCT service_name FROM inquiry');
    
    // Combine and deduplicate
    const services = new Set([
      ...bookingServices.rows.map(row => row.service_required),
      ...complaintServices.rows.map(row => row.service),
      ...feedbackServices.rows.map(row => row.service_name),
      ...inquiryServices.rows.map(row => row.service_name)
    ]);
    
    return Array.from(services);
  } catch (error) {
    console.error('Error getting services:', error);
    return [];
  }
}

module.exports = {
  createBooking,
  registerComplaint,
  recordFeedback,
  createInquiry,
  getServices
}; 