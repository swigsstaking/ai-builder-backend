import logger from '../utils/logger.js';

export const protectAgent = (req, res, next) => {
  const apiKey = req.headers['x-agent-key'];
  
  // Check if API key exists and matches env variable
  if (!apiKey || apiKey !== process.env.NODE_AGENT_KEY) {
    logger.warn(`⛔ Access denied to Agent API from IP: ${req.ip}`);
    return res.status(401).json({
      success: false,
      message: 'Unauthorized Agent Access'
    });
  }
  
  next();
};
