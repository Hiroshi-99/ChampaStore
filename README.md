# Champa Store

A modern Minecraft server store built with React, TypeScript, and Netlify Functions.

## Features

- Purchase Minecraft ranks with secure payment processing
- Discord webhook notifications for new orders
- Printable receipts for customers
- Mobile-responsive design

## Setup Instructions

### Local Development

1. Clone the repository
2. Install dependencies:
   ```
   npm install
   ```
3. Create a `.env` file with the following:
   ```
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_KEY=your_supabase_key
   ```
4. Start the development server:
   ```
   npm run dev
   ```

### Netlify Deployment

1. Connect your GitHub repository to Netlify
2. Configure the following environment variables in Netlify's dashboard (Settings > Environment):
   - `NETLIFY_DISCORD_WEBHOOK_URL`: Your Discord webhook URL for receiving order notifications
   - `VITE_SUPABASE_URL`: Your Supabase project URL
   - `VITE_SUPABASE_KEY`: Your Supabase API key

3. Make sure the build settings match:
   - Build command: `npm run build`
   - Publish directory: `dist`
   - Functions directory: `netlify/functions`

### Important Security Notes

1. Discord webhook notifications are handled securely through Netlify Functions, keeping your webhook URL private.
2. Always keep your environment variables secure and never commit them to your repository.
3. The Supabase connection is configured to restrict database access based on proper authentication.

## Troubleshooting

If you're seeing 404 errors with the Discord notifications:

1. Ensure the `NETLIFY_DISCORD_WEBHOOK_URL` environment variable is set correctly in the Netlify dashboard.
2. Verify that the Netlify Function is being properly deployed.
3. Check the Netlify function logs for detailed error information.

## Technology Stack

- React 18
- TypeScript
- Vite
- Tailwind CSS
- Supabase (database & storage)
- Netlify Functions (serverless backend) 