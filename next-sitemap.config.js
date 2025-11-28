module.exports = {
  siteUrl: "https://www.bdmart24.online",
  generateRobotsTxt: true,
  sitemapSize: 7000, // Adjust if needed
  changefreq: "daily",
  priority: 0.7,
  exclude: [
    "/admin",
    "/admin/*", // Exclude admin routes
    "/api/*", // Exclude api routes
  ],
};
