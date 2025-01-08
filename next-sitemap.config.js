module.exports = {
    siteUrl: 'https://www.bdmart24.online',
    generateRobotsTxt: true,
    sitemapSize: 5000, // Adjust if needed
    exclude: [
        '/admin',
        '/admin/*', // Exclude admin routes
        '/api/*',   // Exclude api routes
      ],
  };
  