import { verify } from 'jsonwebtoken';

/**
 * Verifies a JWT token and returns the decoded user data
 * @param {string} token - JWT token to verify
 * @returns {Promise<Object|null>} - Decoded token data or null if invalid
 */
export async function verifyAuthToken(token) {
  try {
    const decoded = verify(
      token,
      process.env.JWT_SECRET
    );
    
    return {
      id: decoded.id,
      email: decoded.email,
      isAdmin: decoded.isAdmin,
      role: decoded.isAdmin ? 'admin' : 'user'
    };
  } catch (error) {
    console.error('Error verifying token:', error);
    return null;
  }
} 