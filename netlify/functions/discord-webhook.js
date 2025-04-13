// Secure Discord webhook handler
const fetch = require('node-fetch');

// Environment variable for webhook URL (configured in Netlify dashboard)
const DISCORD_WEBHOOK_URL = process.env.VITE_DISCORD_WEBHOOK_URL;

exports.handler = async (event, context) => {
  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ message: 'Method Not Allowed' }),
    };
  }

  try {
    // Parse the incoming request
    const payload = JSON.parse(event.body);
    
    // Validate the request has required fields
    if (!payload.type || !payload.data) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: 'Invalid request format' }),
      };
    }

    // Check for valid notification types
    if (payload.type !== 'new_order') {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: 'Invalid notification type' }),
      };
    }

    // Basic validation of Discord webhook data structure
    const webhookData = payload.data;
    if (!webhookData.embeds || !Array.isArray(webhookData.embeds)) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: 'Invalid webhook data format' }),
      };
    }

    // Rate limiting could be implemented here
    // (Consider using Redis or DynamoDB for distributed rate limiting in production)

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
        body: JSON.stringify({ 
          message: 'Failed to send Discord notification',
          error: `${response.status} ${response.statusText}`
        }),
      };
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'Notification sent successfully' }),
    };
  } catch (error) {
    console.error('Error in discord-webhook function:', error);
    
    return {
      statusCode: 500,
      body: JSON.stringify({ message: 'Server error', error: error.message }),
    };
  }
}; 