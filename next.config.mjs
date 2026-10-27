/** @type {import('next').NextConfig} */

// import withBundleAnalyzer from '@next/bundle-analyzer';

// const bundleAnalyzer = withBundleAnalyzer({
//   enabled: process.env.ANALYZE === 'true',
// });
const nextConfig = {
  reactStrictMode: true,
  serverExternalPackages: ["@sparticuz/chromium", "puppeteer-core"],
  outputFileTracingIncludes: {
    "/api/pdf/invoice": ["./node_modules/@sparticuz/chromium/bin/**/*", "./public/fonts/**/*", "./public/android-chrome-192x192.png"],
  },
  // cacheComponents: true,
  images: {
    qualities: [70, 75],
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
      {
        protocol: "https",
        hostname: "securepay.sslcommerz.com",
        port: "",
      },
    ],

    deviceSizes: [320, 480, 640, 768, 1024, 1280, 1536], // Common device widths
    // Specific widths for images that aren't full viewport width, e.g., cards
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 300, 384],
  },
  experimental: {
    serverActions: {
      bodySizeLimit: "6mb",
    },

    // optimizeCss: true,
    // workerThreads: true,
    // partytown: true,
  },
};

export default nextConfig;
