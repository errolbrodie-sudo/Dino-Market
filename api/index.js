/**
 * Vercel Serverless Entrypoint for DINU MARKET
 * Routes all HTTP requests (API endpoints, Supabase Storage/Catalogue handlers,
 * static assets, and SPA country routes `/ph`, `/th`, `/in`, `/lk`, `/shop`)
 * to the main Dinu Market server handler.
 */
const server = require('../Website/server');

module.exports = (req, res) => {
  server.emit('request', req, res);
};
