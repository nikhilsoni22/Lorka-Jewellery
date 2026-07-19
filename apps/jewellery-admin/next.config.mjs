/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Compile the source-only shared workspace package.
  transpilePackages: ['@lorka/types'],
};

export default nextConfig;
