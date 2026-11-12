/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    serverComponentsExternalPackages: ["@xenova/transformers", "pg"],
  },
};

export default nextConfig;
