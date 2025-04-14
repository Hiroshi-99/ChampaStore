# ChampaStore with Admin Dashboard

A high-performance Minecraft store with an admin dashboard for easy customization of images, prices, discounts, and more.

## Features

- **Modern UI** - Beautiful, responsive design optimized for all devices
- **Admin Dashboard** - Easy management of store content
- **Supabase Integration** - Secure database for products, discounts, and settings
- **Performance Optimized** - Fast loading with code splitting and lazy loading
- **Maintenance Mode** - Easily put the store in maintenance mode when needed

## Admin Dashboard Features

- **Image Management** - Update banner image and logo easily
- **Price Management** - Update product prices in one place
- **Discount Management** - Create and manage promotional discount codes
- **Site Settings** - Update site title, Discord webhook, background video, etc.

## Setup Instructions

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- Supabase account

### Environment Setup

1. Clone the repository
2. Copy `.env.example` to `.env` and fill in your Supabase credentials:

```
VITE_DISCORD_WEBHOOK_URL=your_webhook_url_here
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### Database Setup

1. Log in to your Supabase project
2. Navigate to the SQL Editor
3. Execute the SQL migration script located at `supabase/migrations/20231010_init_admin_tables.sql`

### Admin User Setup

1. In your Supabase dashboard, go to Authentication > Users
2. Click "Add User" and create an admin user with email and password
3. This user will be able to access the admin dashboard

### Installing Dependencies

```bash
npm install
# or
yarn install
```

### Development

```bash
npm run dev
# or
yarn dev
```

Visit `http://localhost:5173` to see the store
Visit `http://localhost:5173/admin` to access the admin dashboard

### Building for Production

```bash
npm run build
# or
yarn build
```

## Usage Guide

### Accessing the Admin Dashboard

1. Navigate to `/admin` route
2. Log in with the admin credentials you created in Supabase
3. You'll see the admin dashboard with different management sections

### Image Management

- Update the banner image displayed on the store homepage
- Update the logo shown in the header

### Price Management

- View and update prices for all products
- Changes are instantly reflected on the store

### Discount Management

- Create new discount codes with percentage off
- Set optional expiry dates for promotions
- Activate/deactivate existing discount codes

### Settings

- Change site title
- Update Discord webhook URL for order notifications
- Enable/disable maintenance mode
- Update background video URL

## License

This project is licensed under the MIT License - see the LICENSE file for details. 