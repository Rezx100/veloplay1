const serverless = require('serverless-http');

// Import the serverless app initializer
const initializeApp = require('../dist/serverless.js').default;

let cachedApp = null;

module.exports = async (req, res) => {
  if (!cachedApp) {
    cachedApp = await initializeApp();
  }
  return serverless(cachedApp)(req, res);
};