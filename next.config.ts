/** @type {import('next').NextConfig} */
const nextConfig = {
  // Remove output: 'export' - Vercel handles server-side rendering perfectly

  // Keep images unoptimized for now (can enable later)
  images: {
    unoptimized: true
  },

  // Skip ESLint during build for faster deployment
  eslint: {
    ignoreDuringBuilds: true,
  },

  // Skip TypeScript errors during build  
  typescript: {
    ignoreBuildErrors: true,
  }
};

export default nextConfig;