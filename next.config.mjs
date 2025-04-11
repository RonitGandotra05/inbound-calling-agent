/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    ADMIN_ENABLED: process.env.ADMIN_ENABLED,
    ADMIN_EMAIL: process.env.ADMIN_EMAIL,
    ADMIN_PASSWORD: process.env.ADMIN_PASSWORD,
  }
};

export default nextConfig;
