/** @type {import('next').NextConfig} */

// import withBundleAnalyzer from '@next/bundle-analyzer';

// const bundleAnalyzer = withBundleAnalyzer({
//   enabled: process.env.ANALYZE === 'true',
// });
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
        port: "",
      },
      {
        protocol: "https",
        hostname: "images.unsplash.com",
        port: "",
      },
      {
        protocol: "https",
        hostname: "avatars.githubusercontent.com",
        port: "",
      },
      {
        protocol: "https",
        hostname: "a0.muscache.com",
        port: "",
      },

      {
        protocol: "https",
        hostname: "facebook.com",
        port: "",
      },
    ],

    deviceSizes: [320, 480, 640, 768, 1024, 1280, 1536], // Common device widths
    // Specific widths for images that aren't full viewport width, e.g., cards
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 300, 384],
  },
  experimental: {
    serverActions: {
      bodySizeLimit: "3mb",
    },
    // optimizeCss: true,
    // workerThreads: true,
    // partytown: true,
  },
};

export default nextConfig;
