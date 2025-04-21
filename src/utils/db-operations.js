const { query } = require('../lib/db');
const logger = require('./logger');

/**
 * Create a new booking in the database
 * @param {Object} bookingData - Booking information
 * @param {string} bookingData.customerName - Name of the customer
 * @param {string} bookingData.phoneNumber - Customer's phone number
 * @param {string} bookingData.serviceRequired - Service being booked
 * @param {string} bookingData.appointmentDate - Date of appointment (YYYY-MM-DD)
 * @param {string} bookingData.appointmentTime - Time of appointment (HH:MM)
 * @param {string} bookingData.transcript - Original transcribed query
 * @returns {Promise<Object>} The created booking
 */
async function createBooking(bookingData) {
  try {
    // Validate required fields
    const requiredFields = ['customerName', 'phoneNumber', 'serviceRequired', 'appointmentDate', 'appointmentTime'];
    requiredFields.forEach(field => {
      if (!bookingData[field]) {
        throw new Error(`Missing required booking field: ${field}`);
      }
    });

    logger.info('Creating booking', { service: bookingData.serviceRequired, customer: bookingData.customerName });

    const result = await query(
      `INSERT INTO bookings 
      (customer_name, phone_number, service_required, date_of_appointment, time, transcript, status, created_at) 
      VALUES ($1, $2, $3, $4, $5, $6, $7, NOW()) 
      RETURNING *`,
      [
        bookingData.customerName,
        bookingData.phoneNumber,
        bookingData.serviceRequired,
        bookingData.appointmentDate,
        bookingData.appointmentTime,
        bookingData.transcript || '',
        'scheduled'
      ]
    );

    // Add to conversation history
    await addToConversationHistory({
      phoneNumber: bookingData.phoneNumber,
      customerInput: bookingData.transcript || '',
      agentResponse: 'Booking created successfully',
      intent: 'booking'
    });

    return result.rows[0];
  } catch (error) {
    logger.error('Error creating booking', { error: error.message, data: bookingData });
    throw error;
  }
}

/**
 * Register a customer complaint in the database
 * @param {Object} complaintData - Complaint information
 * @param {string} complaintData.customerName - Name of the customer
 * @param {string} complaintData.phoneNumber - Customer's phone number
 * @param {string} complaintData.service - Service the complaint is about
 * @param {string} complaintData.summary - Summary of the complaint
 * @param {string} complaintData.transcript - Original transcribed query
 * @returns {Promise<Object>} The created complaint
 */
async function registerComplaint(complaintData) {
  try {
    // Validate required fields
    const requiredFields = ['customerName', 'phoneNumber', 'service', 'summary'];
    requiredFields.forEach(field => {
      if (!complaintData[field]) {
        throw new Error(`Missing required complaint field: ${field}`);
      }
    });

    logger.info('Registering complaint', { 
      customer: complaintData.customerName,
      service: complaintData.service
    });

    const result = await query(
      `INSERT INTO complaints 
      (customer_name, phone_number, service, summary, transcript, status, created_at) 
      VALUES ($1, $2, $3, $4, $5, $6, NOW()) 
      RETURNING *`,
      [
        complaintData.customerName,
        complaintData.phoneNumber,
        complaintData.service,
        complaintData.summary,
        complaintData.transcript || '',
        'open'
      ]
    );

    // Add to conversation history
    await addToConversationHistory({
      phoneNumber: complaintData.phoneNumber,
      customerInput: complaintData.transcript || '',
      agentResponse: 'Complaint registered successfully',
      intent: 'complaint'
    });

    return result.rows[0];
  } catch (error) {
    logger.error('Error registering complaint', { error: error.message, data: complaintData });
    throw error;
  }
}

/**
 * Create a new inquiry in the database
 * @param {Object} inquiryData - Inquiry information
 * @param {string} inquiryData.customerName - Name of the customer
 * @param {string} inquiryData.phoneNumber - Customer's phone number
 * @param {string} inquiryData.serviceName - Service the inquiry is about
 * @param {string} inquiryData.transcript - Original transcribed query
 * @returns {Promise<Object>} The created inquiry
 */
async function createInquiry(inquiryData) {
  try {
    // Validate required fields
    const requiredFields = ['phoneNumber', 'serviceName'];
    requiredFields.forEach(field => {
      if (!inquiryData[field]) {
        throw new Error(`Missing required inquiry field: ${field}`);
      }
    });

    const customerName = inquiryData.customerName || 'Unknown';
    
    logger.info('Creating inquiry', { 
      customer: customerName,
      service: inquiryData.serviceName 
    });

    const result = await query(
      `INSERT INTO inquiry 
      (customer_name, phone_number, service_name, transcript, created_at) 
      VALUES ($1, $2, $3, $4, NOW()) 
      RETURNING *`,
      [
        customerName,
        inquiryData.phoneNumber,
        inquiryData.serviceName,
        inquiryData.transcript || ''
      ]
    );

    // Add to conversation history
    await addToConversationHistory({
      phoneNumber: inquiryData.phoneNumber,
      customerInput: inquiryData.transcript || '',
      agentResponse: 'Inquiry recorded successfully',
      intent: 'inquiry'
    });

    return result.rows[0];
  } catch (error) {
    logger.error('Error creating inquiry', { error: error.message, data: inquiryData });
    throw error;
  }
}

/**
 * Record customer feedback in the database
 * @param {Object} feedbackData - Feedback information
 * @param {string} feedbackData.customerName - Name of the customer
 * @param {string} feedbackData.phoneNumber - Customer's phone number
 * @param {string} feedbackData.serviceName - Service the feedback is about
 * @param {string} feedbackData.summary - Feedback summary
 * @param {string} feedbackData.transcript - Original transcribed query
 * @returns {Promise<Object>} The recorded feedback
 */
async function recordFeedback(feedbackData) {
  try {
    // Validate required fields
    const requiredFields = ['customerName', 'phoneNumber', 'serviceName', 'summary'];
    requiredFields.forEach(field => {
      if (!feedbackData[field]) {
        throw new Error(`Missing required feedback field: ${field}`);
      }
    });

    logger.info('Recording feedback', { 
      customer: feedbackData.customerName,
      service: feedbackData.serviceName
    });

    const result = await query(
      `INSERT INTO feedback 
      (customer_name, phone_number, service_name, summary, transcript, date_of_feedback) 
      VALUES ($1, $2, $3, $4, $5, NOW()) 
      RETURNING *`,
      [
        feedbackData.customerName,
        feedbackData.phoneNumber,
        feedbackData.serviceName,
        feedbackData.summary,
        feedbackData.transcript || ''
      ]
    );

    // Add to conversation history
    await addToConversationHistory({
      phoneNumber: feedbackData.phoneNumber,
      customerInput: feedbackData.transcript || '',
      agentResponse: 'Feedback recorded successfully',
      intent: 'feedback'
    });

    return result.rows[0];
  } catch (error) {
    logger.error('Error recording feedback', { error: error.message, data: feedbackData });
    throw error;
  }
}

/**
 * Add an entry to the conversation history
 * @param {Object} conversationData - Conversation data
 * @param {string} conversationData.phoneNumber - Customer's phone number
 * @param {string} conversationData.customerInput - What the customer said
 * @param {string} conversationData.agentResponse - What the agent responded with
 * @param {string} [conversationData.intent] - Detected intent (booking, complaint, etc.)
 * @returns {Promise<Object>} The recorded conversation entry
 */
async function addToConversationHistory(conversationData) {
  try {
    if (!conversationData.phoneNumber) {
      throw new Error('Phone number is required for conversation history');
    }

    // This function should not interrupt the main flow, so we log errors but don't throw
    const result = await query(
      `INSERT INTO conversations 
      (phone_number, customer_input, agent_response, intent, timestamp) 
      VALUES ($1, $2, $3, $4, NOW()) 
      RETURNING *`,
      [
        conversationData.phoneNumber,
        conversationData.customerInput || '',
        conversationData.agentResponse || '',
        conversationData.intent || 'general'
      ]
    );

    return result.rows[0];
  } catch (error) {
    logger.error('Error adding to conversation history', { 
      error: error.message, 
      phoneNumber: conversationData.phoneNumber 
    });
    // Return null instead of throwing to prevent disrupting the main flow
    return null;
  }
}

/**
 * Get conversation history for a specific phone number
 * @param {string} phoneNumber - Customer's phone number
 * @param {number} [limit=5] - Maximum number of records to retrieve
 * @returns {Promise<Array>} Array of conversation records
 */
async function getConversationHistory(phoneNumber, limit = 5) {
  try {
    if (!phoneNumber) {
      throw new Error('Phone number is required to retrieve conversation history');
    }

    const result = await query(
      `SELECT * FROM conversations 
      WHERE phone_number = $1 
      ORDER BY timestamp DESC 
      LIMIT $2`,
      [phoneNumber, limit]
    );

    return result.rows;
  } catch (error) {
    logger.error('Error retrieving conversation history', { 
      error: error.message, 
      phoneNumber 
    });
    throw error;
  }
}

module.exports = {
  createBooking,
  registerComplaint,
  createInquiry,
  recordFeedback,
  addToConversationHistory,
  getConversationHistory
}; 