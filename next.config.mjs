/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable experimental features for better performance
  experimental: {
    // Enable server actions for form handling
    serverActions: {
      allowedOrigins: ['localhost:3000'],
    },
  },
  // Configure webpack for better-sqlite3 compatibility
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals.push('better-sqlite3')
    }
    return config
  },
}

export default nextConfig
