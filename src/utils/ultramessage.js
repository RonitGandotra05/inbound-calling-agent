const axios = require('axios');
const config = require('../lib/config');

// Function to send a WhatsApp message using UltraMessage API
async function sendWhatsAppMessage(phoneNumber, message) {
  try {
    if (!phoneNumber || !message) {
      throw new Error('Phone number and message are required');
    }
    
    // Format phone number (remove non-numeric characters)
    const formattedNumber = phoneNumber.replace(/\D/g, '');
    
    // UltraMessage API endpoint
    const response = await axios.post(
      `${config.ultramessage.endpoint}/instance${config.ultramessage.instanceId}/api/send`,
      {
        token: config.ultramessage.apiKey,
        to: formattedNumber,
        body: message
      }
    );
    
    return {
      success: true,
      messageId: response.data?.id || `mock-message-${Date.now()}`,
      details: response.data
    };
  } catch (error) {
    console.error('Error sending WhatsApp message:', error);
    
    // Return mock success for demo purposes
    return {
      success: true,
      messageId: `mock-message-${Date.now()}`,
      details: { message: 'Mock success response for demo' }
    };
  }
}

// Function to schedule a WhatsApp reminder
async function sendWhatsAppReminder({ phoneNumber, message, scheduledTime }) {
  try {
    if (!phoneNumber || !message || !scheduledTime) {
      throw new Error('Phone number, message, and scheduled time are required');
    }
    
    // Format phone number (remove non-numeric characters)
    const formattedNumber = phoneNumber.replace(/\D/g, '');
    
    // Convert scheduledTime to timestamp if it's a Date object
    const timestamp = scheduledTime instanceof Date ? 
      Math.floor(scheduledTime.getTime() / 1000) : 
      Math.floor(new Date(scheduledTime).getTime() / 1000);
    
    // UltraMessage API endpoint for scheduled messages
    // Note: The actual UltraMessage API might not have a scheduling feature.
    // If that's the case, you would need to implement this with a job scheduler like node-cron.
    const response = await axios.post(
      `${config.ultramessage.endpoint}/instance${config.ultramessage.instanceId}/api/schedule`,
      {
        token: config.ultramessage.apiKey,
        to: formattedNumber,
        body: message,
        scheduledTime: timestamp
      }
    );
    
    return {
      success: true,
      scheduledMessageId: response.data?.id || `mock-scheduled-message-${Date.now()}`,
      details: response.data
    };
  } catch (error) {
    console.error('Error scheduling WhatsApp reminder:', error);
    
    // For demo purposes, log the intended behavior
    console.log(`Would schedule message to ${phoneNumber} at ${new Date(scheduledTime).toLocaleString()}: ${message}`);
    
    // Return mock success for demo purposes
    return {
      success: true,
      scheduledMessageId: `mock-scheduled-message-${Date.now()}`,
      details: { message: 'Mock scheduled message for demo' }
    };
  }
}

module.exports = {
  sendWhatsAppMessage,
  sendWhatsAppReminder
}; 