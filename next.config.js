/** @type {import('next').NextConfig} */

// Server-side only (no NEXT_PUBLIC_ prefix): the Next.js server proxies API
// calls to the Express backend. Since this happens server-to-server,
// `localhost` correctly refers to this machine regardless of which host/IP
// a browser used to reach the Next.js dev server - avoiding CORS entirely.
const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:4000";

const nextConfig = {
  reactStrictMode: true,
  async rewrites() {
    return [
      { source: "/api/:path*", destination: `${BACKEND_URL}/api/:path*` },
      { source: "/uploads/:path*", destination: `${BACKEND_URL}/uploads/:path*` },
    ];
  },
};

module.exports = nextConfig;
