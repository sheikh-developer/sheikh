/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  env: {
    GITHUB_TOKEN: process.env.GITHUB_TOKEN,
    TARGET_USER: process.env.TARGET_USER,
  },
}

module.exports = nextConfig 