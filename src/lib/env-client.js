/**
 * Safe client-side environment variables
 * Only expose non-sensitive variables to the client
 */
export const clientEnv = {
  ADMIN_ENABLED: process.env.ADMIN_ENABLED === 'true',
  ADMIN_EMAIL: process.env.ADMIN_EMAIL,
  ADMIN_PASSWORD: process.env.ADMIN_PASSWORD,
}; 