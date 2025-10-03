/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'export',
  transpilePackages: ['mui-tel-input'],
  images: {
    unoptimized: true,
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      },
    ],
  },
  trailingSlash: true,
  eslint: {
    // Only run ESLint on these directories during production builds
    dirs: ['src'],
    // Don't fail the build on ESLint errors (use npm run lint to check)
    ignoreDuringBuilds: true,
  },
}

module.exports = nextConfig