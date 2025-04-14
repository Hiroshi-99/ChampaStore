// Image Proxy Netlify Function
// This function bypasses CSP restrictions by proxying image requests

const axios = require('axios');

exports.handler = async function(event, context) {
  try {
    // Get the image URL from query parameters
    const imageUrl = event.queryStringParameters.url;
    
    if (!imageUrl) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Missing URL parameter' })
      };
    }
    
    // Validate URL (simple validation)
    let url;
    try {
      url = new URL(imageUrl);
      // Only allow http and https protocols
      if (url.protocol !== 'http:' && url.protocol !== 'https:') {
        throw new Error('Invalid protocol');
      }
      
      // Only allow images from trusted domains
      const allowedDomains = [
        'feaxosxwaajfagfjkmrx.supabase.co',
        'ymzksxrmsocggozepqsu.supabase.co',
        'i.imgur.com'
      ];
      
      // Check if the domain is in our allowed list
      const isAllowedDomain = allowedDomains.some(domain => url.hostname.includes(domain));
      if (!isAllowedDomain) {
        return {
          statusCode: 403,
          body: JSON.stringify({ error: 'Domain not allowed' })
        };
      }
    } catch (error) {
      console.error('URL validation error:', error);
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Invalid URL' })
      };
    }
    
    // Fetch the image from the source URL
    const response = await axios({
      method: 'GET',
      url: imageUrl,
      responseType: 'arraybuffer'
    });
    
    // Get the content type from the response
    const contentType = response.headers['content-type'];
    
    // Only allow image content types
    if (!contentType || !contentType.startsWith('image/')) {
      return {
        statusCode: 403,
        body: JSON.stringify({ error: 'Not an image' })
      };
    }
    
    // Return the image with appropriate headers
    return {
      statusCode: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=86400', // Cache for one day
        'Access-Control-Allow-Origin': '*' // Allow cross-origin access
      },
      body: response.data.toString('base64'),
      isBase64Encoded: true
    };
  } catch (error) {
    console.error('Proxy error:', error);
    
    // Return a fallback image on error
    return {
      statusCode: 302, // Redirect
      headers: {
        'Location': 'https://i.imgur.com/JzDJS2A.png' // Fallback image
      },
      body: ''
    };
  }
}; 