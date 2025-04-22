/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    ADMIN_ENABLED: process.env.ADMIN_ENABLED,
    ADMIN_EMAIL: process.env.ADMIN_EMAIL,
    ADMIN_PASSWORD: process.env.ADMIN_PASSWORD,
    WEBSOCKET_PORT: process.env.WEBSOCKET_PORT || '8000',
  }
};

export default nextConfig;
