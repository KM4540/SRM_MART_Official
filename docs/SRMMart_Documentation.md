# SRM Mart - Consolidated Documentation

This document consolidates all the documentation for the SRM Mart application, a platform for SRM Institute students to buy and sell second-hand college items.

## Table of Contents

1. [Project Overview](#project-overview)
2. [Setup and Development](#setup-and-development)
3. [Database](#database)
4. [Authentication](#authentication)
5. [Features](#features)
6. [Troubleshooting Guides](#troubleshooting-guides)
7. [Deployment](#deployment)

---

## Project Overview

SRM Mart is a platform designed for SRM Institute students to buy and sell second-hand college items. It features user authentication, product listings, offers, transactions, pickup scheduling, and administrative capabilities.

### Tech Stack
- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS
- Supabase (for database, authentication, and storage)

---

## Setup and Development

### How to Run the Project Locally

1. Clone the repository:
   ```sh
   git clone https://github.com/kartik4540/srmartttt.git
   ```

2. Navigate to the project directory:
   ```sh
   cd srmartttt
   ```

3. Install dependencies:
   ```sh
   npm i
   ```

4. Start the development server:
   ```sh
   npm run dev
   ```

### Edit Options

**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes. The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

**Edit a file directly in GitHub**
- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**
- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

---

## Database

The SRM Mart database schema is defined in a consolidated SQL file at `src/database/consolidated/srm_mart_schema.sql`.

### Core Tables

- **products** - Stores product listings
- **profiles** - Stores user profile information
- **price_offers** - Stores offers made by buyers to sellers
- **pickup_locations** - Stores available pickup locations
- **seller_contacts** - Stores seller contact information
- **pickup_schedules** - Stores scheduled pickups for accepted offers
- **cart** - Stores user cart items
- **wishlist** - Stores user wishlist items
- **transactions** - Stores completed transactions

### Setting Up the Database

1. Log in to your Supabase dashboard
2. Go to the SQL Editor
3. Copy the contents of `src/database/consolidated/srm_mart_schema.sql`
4. Paste it into the SQL Editor and run the script

### Database Updates

When updating the database, you can follow these steps:

1. Log in to your Supabase dashboard
2. Go to the SQL Editor
3. Copy the contents of the SQL script
4. Paste it into the SQL Editor
5. Run the script

### Adding Admin User

The SQL script includes a function to set a user as an admin:

```sql
SELECT set_user_as_admin('km5260@srmist.edu.in');
```

## Test Users

The repository includes scripts to create test accounts for the SRM Mart application:

**Admin User**:
- Email: `admin@test.com`
- Password: `admin123`

**Regular User**:
- Email: `user@test.com`
- Password: `user123`

### Creating Test Users

**Method 1: Using Supabase Auth API (Recommended)**

1. Create a `.env` file with:
   ```
   VITE_SUPABASE_URL=your_supabase_url
   SUPABASE_SERVICE_KEY=your_service_role_key
   ```

2. Run the API script:
   ```bash
   node scripts/create-test-users-api.js
   ```

**Method 2: Using SQL in Supabase Dashboard**

1. Open your Supabase dashboard
2. Go to the "SQL Editor" section
3. Create a new query
4. Copy the contents of `create-test-users.sql` file
5. Run the query

---

## Authentication

SRM Mart uses Google OAuth for authentication, restricted to the @srmist.edu.in domain.

### Setting Up Google OAuth

1. **Configure Supabase Authentication**:
   - Log in to your Supabase dashboard
   - Go to Authentication > Providers
   - Enable Google and note the callback URL

2. **Set Up Google OAuth Credentials**:
   - Go to the Google Cloud Console
   - Create a new project or select an existing one
   - Navigate to "APIs & Services" > "Credentials"
   - Create OAuth client ID for web application
   - Add the Supabase redirect URL to "Authorized redirect URIs"
   - Note the Client ID and Client Secret

3. **Configure OAuth Consent Screen for Domain Restriction**:
   - Go to "APIs & Services" > "OAuth consent screen"
   - Add `srmist.edu.in` as an authorized domain
   - Add the necessary scopes

4. **Add Google OAuth Credentials to Supabase**:
   - Return to your Supabase dashboard
   - Go to Authentication > Providers > Google
   - Enter the Client ID and Client Secret from Google

5. **Domain Restrictions in Application Code**:
   - The application uses the `hd` parameter in the OAuth request
   - Validates the user's email domain after authentication
   - Verifies the domain again in the AuthCallback component

---

## Features

### Cart and Wishlist

The cart and wishlist features allow users to save products for later or add them to their shopping cart.

**How the Features Work**:

1. **Cart Feature**:
   - For non-logged-in users: Items stored in localStorage
   - For logged-in users: Items stored in both localStorage and database
   - When a user logs in, the system syncs their localStorage cart with the database

2. **Wishlist Feature**:
   - Similar to cart, with localStorage for non-logged-in users
   - Database storage for logged-in users
   - Sync on login

### Price Offers

The price offers feature allows buyers to make offers on products and sellers to accept, reject, or counter those offers.

**Price Offers Workflow**:
1. Buyer makes an offer on a product
2. Seller receives notification and can accept, reject, or counter
3. If accepted, a pickup schedule is created
4. Admin coordinates pickup and delivery
5. When complete, a transaction record is created

### Admin Dashboard

The admin dashboard provides administrative capabilities:

1. View and manage pending products
2. Coordinate pickups and deliveries
3. View transaction reports and service fees
4. Manage user roles

---

## Troubleshooting Guides

### Fix for "Error Loading Transaction Data" Error

If you encounter the "Error loading transaction data" issue in the admin dashboard:

1. **Verify Database Structure**:
   ```
   node scripts/check-transaction-tables.js
   ```

2. **Apply Database Fixes**:
   - Go to your Supabase dashboard → SQL Editor
   - Open `fix-transaction-tables.sql`
   - Run the script against your database

3. **Clear Browser Cache**

4. **Verify Admin Permissions**:
   - Ensure you're signed in with an admin account
   - Check your profile has `is_admin` set to `true`

### Fix for Offers Not Displaying

If price offers are not displaying correctly:

1. **Update Database Schema**:
   - Run the SQL fix script in Supabase SQL Editor
   - Verify RLS policies are correctly set up

2. **Check Browser Console**:
   - Open developer tools and check the console for errors

3. **Verify User Context**:
   - The buyer should see their offers in "My Offers"
   - The seller should see offers for their products in "Profile"

4. **Test Creating a New Offer**:
   - Log in as a buyer
   - Navigate to a product detail page
   - Make an offer and check if it appears in "My Offers"

### Quick Fix for Offers Not Displaying

For a quick fix when offers are not showing:

1. **Temporarily Disable Row Level Security**:
   - Run the `quick-fix-permissions.sql` script
   - Check if offers become visible

2. **Re-enable Proper Security**:
   - Uncomment the RLS and policy statements
   - Run the script again

---

## Deployment

### How to Deploy

You can deploy the SRM Mart application to a service like Netlify:

1. Connect your repository to Netlify
2. Set the build command to `npm run build`
3. Set the publish directory to `dist`
4. Add environment variables for Supabase URL and anon key

### Custom Domains

While custom domains are not directly supported in Lovable, you can use Netlify:

1. Deploy your project to Netlify
2. Set up your custom domain in Netlify's domain settings
3. Configure DNS settings with your domain provider 