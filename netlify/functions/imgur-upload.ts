import { Handler } from '@netlify/functions';

const handler: Handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const { image } = JSON.parse(event.body || '{}');
    
    if (!image) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Image data is required' })
      };
    }

    const response = await fetch('https://api.imgur.com/3/image', {
      method: 'POST',
      headers: {
        'Authorization': `Client-ID ${process.env.IMGUR_CLIENT_ID}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        image,
        type: 'base64'
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.data.error);
    }

    const result = await response.json();
    
    return {
      statusCode: 200,
      body: JSON.stringify({ url: result.data.link })
    };
  } catch (error: any) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message || 'Failed to upload image' })
    };
  }
};

export { handler }; 