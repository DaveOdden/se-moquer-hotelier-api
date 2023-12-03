/** @type {import('next').NextConfig} */
const nextConfig = {
  async headers() {
    const corsAccessControl = [
      { key: "Access-Control-Allow-Credentials", value: "true" },
      { key: "Access-Control-Allow-Origin", value: "http://localhost:5173" },
      { key: "Access-Control-Allow-Methods", value: "GET,OPTIONS,PATCH,DELETE,POST,PUT" },
      { key: "Access-Control-Allow-Headers", value: "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization" },
      { key: "Authorization", value: process.env.DATA_API_KEY },
    ]

    return [
      {
        // matching all API routes
        source: "/api/:path*",
        headers: corsAccessControl
      }
    ]
  }
}

module.exports = nextConfig
