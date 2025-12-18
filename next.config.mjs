/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  webpack: (config) => {
    // Work around sporadic Webpack WasmHash crashes observed on Node 24.x on Windows.
    // Forcing a non-WASM hash function avoids WasmHash._updateWithBuffer.
    config.output = config.output || {}
    config.output.hashFunction = 'sha256'
    return config
  },
  images: {
    unoptimized: true,
  },
}

export default nextConfig
