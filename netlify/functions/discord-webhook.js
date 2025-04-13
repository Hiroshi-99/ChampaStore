// Secure Discord webhook handler
const fetch = require('node-fetch');

// Use NETLIFY_ prefix for environment variables in Netlify Functions
const DISCORD_WEBHOOK_URL = process.env.NETLIFY_DISCORD_WEBHOOK_URL;

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
    // Check if webhook URL is configured
    if (!DISCORD_WEBHOOK_URL) {
      console.error('Discord webhook URL not configured');
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ message: 'Server configuration error: webhook URL not set' }),
      };
    }
    
    // Parse the incoming request
    const payload = JSON.parse(event.body);
    console.log("Received payload:", JSON.stringify(payload).substring(0, 200) + "...");
    
    // Validate the request has required fields
    if (!payload.type || !payload.data) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ message: 'Invalid request format' }),
      };
    }

    // Check for valid notification types
    if (payload.type !== 'new_order') {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ message: 'Invalid notification type' }),
      };
    }

    // Basic validation of Discord webhook data structure
    const webhookData = payload.data;
    if (!webhookData.embeds || !Array.isArray(webhookData.embeds)) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ message: 'Invalid webhook data format' }),
      };
    }

    // Log the Discord webhook URL (partial, for security)
    const webhookUrlPrefix = DISCORD_WEBHOOK_URL.substring(0, 30);
    console.log(`Sending to Discord webhook: ${webhookUrlPrefix}...`);

    // Send to Discord
    const response = await fetch(DISCORD_WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(webhookData),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Discord webhook error:', errorText);
      
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ 
          message: 'Failed to send Discord notification',
          error: `${response.status} ${response.statusText}`
        }),
      };
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ message: 'Notification sent successfully' }),
    };
  } catch (error) {
    console.error('Error in discord-webhook function:', error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ message: 'Server error', error: error.message }),
    };
  }
}; 