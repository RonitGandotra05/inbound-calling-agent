const db = require('../lib/db');

// Create a new conversation or get existing one by caller number and session ID
async function getOrCreateConversation(callerNumber, sessionId) {
  try {
    // Check if conversation exists
    const existingConv = await db.query(
      'SELECT * FROM conversations WHERE caller_number = $1 AND session_id = $2',
      [callerNumber, sessionId]
    );

    if (existingConv.rows.length > 0) {
      return existingConv.rows[0];
    }

    // Create new conversation
    const newConv = await db.query(
      'INSERT INTO conversations (caller_number, session_id) VALUES ($1, $2) RETURNING *',
      [callerNumber, sessionId]
    );

    return newConv.rows[0];
  } catch (error) {
    console.error('Error getting or creating conversation:', error);
    throw error;
  }
}

// Add a message to the conversation history
async function addMessage(conversationId, content, role) {
  try {
    const result = await db.query(
      'INSERT INTO messages (conversation_id, content, role) VALUES ($1, $2, $3) RETURNING *',
      [conversationId, content, role]
    );
    return result.rows[0];
  } catch (error) {
    console.error('Error adding message:', error);
    throw error;
  }
}

// Get the last N messages from a conversation
async function getLastMessages(conversationId, limit = 10) {
  try {
    const result = await db.query(
      'SELECT * FROM messages WHERE conversation_id = $1 ORDER BY created_at DESC LIMIT $2',
      [conversationId, limit]
    );
    
    // Return in chronological order
    return result.rows.reverse().map(row => ({
      role: row.role,
      content: row.content,
      timestamp: row.created_at
    }));
  } catch (error) {
    console.error('Error getting last messages:', error);
    throw error;
  }
}

module.exports = {
  getOrCreateConversation,
  addMessage,
  getLastMessages
}; 