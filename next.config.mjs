/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  turbopack: {}, // Add empty turbopack config to allow coexistence with webpack config or silence error
  webpack: (config) => {
    // Avoid wasm-based hashing (xxhash64) which can crash in some environments
    // during production builds with an unhelpful stack trace.
    config.output.hashFunction = 'sha256';
    return config;
  },
}

export default nextConfig
