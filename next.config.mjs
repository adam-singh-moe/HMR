/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  webpack: (config) => {
    // Avoid wasm-based hashing (xxhash64) which can crash in some environments
    // during production builds with an unhelpful stack trace.
    config.output.hashFunction = 'sha256';
    return config;
  },
}

export default nextConfig
