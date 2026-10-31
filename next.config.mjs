// /** @type {import('next').NextConfig} */

// // const bundleAnalyzer = withBundleAnalyzer({
// //   enabled: process.env.ANALYZE === 'true',
// // });
// const nextConfig = {
//   reactStrictMode: true,
//   serverExternalPackages: ["@sparticuz/chromium", "puppeteer-core", "sharp"],
//   productionBrowserSourceMaps: false,
//   outputFileTracingIncludes: {
//     "/api/pdf/invoice": [
//       "./node_modules/@sparticuz/chromium/bin/**/*",
//       "./public/fonts/**/*",
//       "./public/android-chrome-192x192.png",
//     ],
//     "/api/chat/order-card": [
//       "./node_modules/@sparticuz/chromium/bin/**/*",
//       "./public/fonts/SolaimanLipi.ttf",
//     ],
//     "/api/chat/messenger-order": [
//       "./node_modules/@sparticuz/chromium/bin/**/*",
//       "./public/fonts/SolaimanLipi.ttf",
//     ],
//     "/api/webhooks/meta-chat": [
//       "./node_modules/@sparticuz/chromium/bin/**/*",
//       "./public/fonts/SolaimanLipi.ttf",
//     ],
//   },
//   // cacheComponents: true,
//   images: {
//     qualities: [70, 75],
//     remotePatterns: [
//       {
//         protocol: "https",
//         hostname: "res.cloudinary.com",
//         port: "",
//       },
//       {
//         protocol: "https",
//         hostname: "images.unsplash.com",
//         port: "",
//       },
//       {
//         protocol: "https",
//         hostname: "avatars.githubusercontent.com",
//         port: "",
//       },
//       {
//         protocol: "https",
//         hostname: "a0.muscache.com",
//         port: "",
//       },

//       {
//         protocol: "https",
//         hostname: "facebook.com",
//         port: "",
//       },
//       {
//         protocol: "https",
//         hostname: "securepay.sslcommerz.com",
//         port: "",
//       },
//     ],

//     deviceSizes: [320, 480, 640, 768, 1024, 1280, 1536], // Common device widths
//     // Specific widths for images that aren't full viewport width, e.g., cards
//     imageSizes: [16, 32, 48, 64, 96, 128, 256, 300, 384],
//   },
//   experimental: {
//     serverActions: {
//       bodySizeLimit: "6mb",
//     },

//     // optimizeCss: true,
//     // workerThreads: true,
//     // partytown: true,
//   },
// };

// export default nextConfig;
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  serverExternalPackages: ["@sparticuz/chromium", "puppeteer-core", "sharp"],
  productionBrowserSourceMaps: false,

  // Keep these runtime assets limited to the two routes that render images/PDFs.
  // The Bengali font is read with fs at runtime, and Chromium's compressed binary
  // must be present beside the function bundle.
  outputFileTracingIncludes: {
    "/api/pdf/invoice": [
      "./node_modules/@sparticuz/chromium/bin/**/*",
      "./public/fonts/SolaimanLipi.ttf",
      "./public/android-chrome-192x192.png",
    ],
    "/api/chat/order-card": [
      "./node_modules/@sparticuz/chromium/bin/**/*",
      "./public/fonts/SolaimanLipi.ttf",
    ],
  },

  images: {
    qualities: [70, 75],
    remotePatterns: [
      { protocol: "https", hostname: "res.cloudinary.com" },
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "avatars.githubusercontent.com" },
      { protocol: "https", hostname: "a0.muscache.com" },
      { protocol: "https", hostname: "facebook.com" },
      { protocol: "https", hostname: "securepay.sslcommerz.com" },
    ],
    deviceSizes: [320, 480, 640, 768, 1024, 1280, 1536],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 300, 384],
  },
  experimental: {
    serverActions: { bodySizeLimit: "6mb" },
  },
};

export default nextConfig;
