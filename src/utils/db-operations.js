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
      (customer_name, phone_number, service_required, date_of_appointment, time, transcript, status, date_of_booking) 
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
      (customer_name, phone_number, service, summary, transcript, status, date_of_complaint) 
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
      (customer_name, phone_number, service_name, transcript, date_of_enquiry) 
      VALUES ($1, $2, $3, $4, NOW()) 
      RETURNING *`,
      [
        customerName,
        inquiryData.phoneNumber,
        inquiryData.serviceName,
        inquiryData.transcript || ''
      ]
    );

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

    return result.rows[0];
  } catch (error) {
    logger.error('Error recording feedback', { error: error.message, data: feedbackData });
    throw error;
  }
}

/**
 * Save a conversation to the conversations table
 * @param {Object} conversationData - Conversation information
 * @param {string} conversationData.customerName - Name of the customer
 * @param {string} conversationData.phoneNumber - Customer's phone number
 * @param {string} conversationData.queryType - Type of query (booking, complaint, feedback, inquiry)
 * @param {number} conversationData.sourceId - ID of the source record (booking_id, complaint_id, etc.)
 * @param {string} conversationData.transcript - Full conversation transcript
 * @param {string} conversationData.service - Service related to the conversation
 * @param {Date} conversationData.interactionDate - Date of the interaction
 * @param {string} conversationData.time - Time of the interaction
 * @param {string} conversationData.summary - Summary of the conversation
 * @returns {Promise<Object>} The saved conversation
 */
async function saveConversation(conversationData) {
  try {
    // Validate required fields
    const requiredFields = ['customerName', 'phoneNumber', 'queryType', 'sourceId', 'service', 'interactionDate'];
    requiredFields.forEach(field => {
      if (!conversationData[field]) {
        throw new Error(`Missing required conversation field: ${field}`);
      }
    });

    logger.info('Saving conversation', { 
      customer: conversationData.customerName,
      type: conversationData.queryType
    });

    const result = await query(
      `INSERT INTO conversations 
      (customer_name, phone_number, query_type, source_id, transcript, service, interaction_date, time, summary) 
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) 
      RETURNING *`,
      [
        conversationData.customerName,
        conversationData.phoneNumber,
        conversationData.queryType,
        conversationData.sourceId,
        conversationData.transcript || '',
        conversationData.service,
        conversationData.interactionDate,
        conversationData.time || null,
        conversationData.summary || ''
      ]
    );

    return result.rows[0];
  } catch (error) {
    logger.error('Error saving conversation', { error: error.message, data: conversationData });
    throw error;
  }
}

module.exports = {
  createBooking,
  registerComplaint,
  createInquiry,
  recordFeedback,
  saveConversation
}; 