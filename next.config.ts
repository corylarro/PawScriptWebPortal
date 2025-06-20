/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export', // REQUIRED for Netlify with Next.js 13+/15

  // Disable image optimization for static export
  images: {
    unoptimized: true
  },

  // Optional: Add trailing slash for better static hosting
  trailingSlash: true,

  // Skip ESLint during build (for faster deployment)
  eslint: {
    ignoreDuringBuilds: true,
  },

  // Skip TypeScript type checking during build (optional)
  typescript: {
    ignoreBuildErrors: true,
  },

  // Optional: Disable server-side features
  experimental: {
    // Remove any server-side experimental features if you have them
  }
};

export default nextConfig;