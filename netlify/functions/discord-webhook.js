// Secure Discord webhook handler
const fetch = require('node-fetch');

// Use NETLIFY_ prefix for environment variables in Netlify Functions
const DISCORD_WEBHOOK_URL = process.env.NETLIFY_DISCORD_WEBHOOK_URL;

const RATE_LIMIT_DURATION = 60 * 1000; // 1 minute
const MAX_ATTEMPTS = 5;
const rateLimitStore = new Map();

// Clean up expired rate limit entries
const cleanupRateLimits = () => {
  const now = Date.now();
  for (const [key, value] of rateLimitStore.entries()) {
    if (now - value.timestamp > RATE_LIMIT_DURATION) {
      rateLimitStore.delete(key);
    }
  }
};

exports.handler = async (event, context) => {
  // Log the request for debugging
  console.log("Discord webhook function called");
  console.log("HTTP Method:", event.httpMethod);
  
  // Enable CORS for development
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };
  
  // Handle preflight requests
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ message: 'Preflight call successful' }),
    };
  }
  
  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ message: 'Method Not Allowed' }),
    };
  }

  try {
    // Clean up expired rate limits
    cleanupRateLimits();

    // Get client IP for rate limiting
    const clientIp = event.headers['client-ip'] || event.headers['x-forwarded-for'] || 'unknown';
    
    // Check rate limit
    const rateLimit = rateLimitStore.get(clientIp) || { attempts: 0, timestamp: Date.now() };
    
    if (rateLimit.attempts >= MAX_ATTEMPTS) {
      const timeLeft = Math.ceil((RATE_LIMIT_DURATION - (Date.now() - rateLimit.timestamp)) / 1000);
      return {
        statusCode: 429,
        headers: {
          ...headers,
          'Retry-After': timeLeft.toString()
        },
        body: JSON.stringify({ 
          message: `Too many requests. Please try again in ${timeLeft} seconds.` 
        }),
      };
    }

    // Check if webhook URL is configured
    if (!DISCORD_WEBHOOK_URL) {
      console.error('Discord webhook URL not configured');
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ message: 'Server configuration error: webhook URL not set' }),
      };
    }
    
    // Parse and validate the incoming request
    let payload;
    try {
      payload = JSON.parse(event.body);
    } catch (error) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ message: 'Invalid JSON payload' }),
      };
    }

    // Validate required fields
    if (!payload.type || !payload.data) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ message: 'Missing required fields: type and data' }),
      };
    }

    // Validate notification type
    if (payload.type !== 'new_order') {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ message: 'Invalid notification type' }),
      };
    }

    // Validate webhook data structure
    const webhookData = payload.data;
    if (!webhookData.embeds || !Array.isArray(webhookData.embeds)) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ message: 'Invalid webhook data format' }),
      };
    }

    // Update rate limit
    rateLimit.attempts += 1;
    rateLimit.timestamp = Date.now();
    rateLimitStore.set(clientIp, rateLimit);

    // Send to Discord with timeout
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Request timeout')), 10000);
    });

    const fetchPromise = fetch(DISCORD_WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(webhookData),
    });

    const response = await Promise.race([fetchPromise, timeoutPromise]);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Discord webhook error:', errorText);
      
      // Handle specific Discord error codes
      if (response.status === 429) {
        return {
          statusCode: 429,
          headers,
          body: JSON.stringify({ 
            message: 'Discord rate limit reached. Please try again later.',
            error: errorText
          }),
        };
      }
      
      return {
        statusCode: response.status,
        headers,
        body: JSON.stringify({ 
          message: 'Failed to send Discord notification',
          error: `${response.status} ${response.statusText}: ${errorText}`
        }),
      };
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ 
        message: 'Notification sent successfully',
        attempts: rateLimit.attempts,
        remaining: MAX_ATTEMPTS - rateLimit.attempts
      }),
    };
  } catch (error) {
    console.error('Error in discord-webhook function:', error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        message: 'Server error',
        error: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      }),
    };
  }
}; 