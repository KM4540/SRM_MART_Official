# Setting Up Cart and Wishlist Database Features

This guide explains how to set up the database tables and functionality for the cart and wishlist features in SRMMart.

## Database Tables

We've implemented two new tables in Supabase:

1. **cart_items** - Stores user cart items
2. **wishlist_items** - Stores user wishlist items

## How to Set Up in Supabase

### Option 1: Using the SQL Editor (Recommended)

1. Log in to your Supabase dashboard at https://app.supabase.com/
2. Navigate to your project
3. Go to SQL Editor
4. Create a new query
5. Paste the contents of `supabase/migrations/20240316_cart_wishlist_tables.sql`
6. Run the query

### Option 2: Using the Migration Script

If you're using the Supabase CLI for development:

```bash
supabase migration run
```

## Database Schema

### cart_items
- `id` (UUID, Primary Key): Unique identifier for each cart item
- `user_id` (UUID, Foreign Key): References auth.users(id)
- `product_id` (UUID, Foreign Key): References products(id)
- `quantity` (Integer): Number of items
- `created_at` (Timestamp): When the item was added to cart
- `updated_at` (Timestamp): Last updated time

### wishlist_items
- `id` (UUID, Primary Key): Unique identifier for each wishlist item
- `user_id` (UUID, Foreign Key): References auth.users(id)
- `product_id` (UUID, Foreign Key): References products(id)
- `created_at` (Timestamp): When the item was added to wishlist

## Row Level Security (RLS) Policies

Both tables have RLS policies to ensure users can only access their own data:

### For cart_items:
- Users can only view their own cart items
- Users can only insert their own cart items
- Users can only update their own cart items
- Users can only delete their own cart items

### For wishlist_items:
- Users can only view their own wishlist items
- Users can only insert their own wishlist items
- Users can only delete their own wishlist items

## How the Features Work

### Cart Feature
1. When a user adds a product to their cart:
   - For non-logged-in users: Item is stored only in browser localStorage
   - For logged-in users: Item is stored in both localStorage and the database

2. When a user logs in:
   - The system syncs their localStorage cart with the database
   - If conflicts exist, the system merges items, keeping the highest quantity

3. Cart operations (add, remove, update, clear) are mirrored to the database for logged-in users

### Wishlist Feature
1. When a user adds a product to their wishlist:
   - For non-logged-in users: Item is stored only in browser localStorage
   - For logged-in users: Item is stored in both localStorage and the database

2. When a user logs in:
   - The system syncs their localStorage wishlist with the database

3. Wishlist operations (add, remove, clear) are mirrored to the database for logged-in users

## How to Test

1. Create two different accounts
2. Add different items to each account's cart and wishlist
3. Log out and log back in to verify persistence
4. Try using the same account on different browsers to verify syncing

## Troubleshooting

### Cart/Wishlist Not Syncing
- Check browser console for errors
- Verify that RLS policies are correctly set up in Supabase
- Check if the user is properly authenticated

### Database Errors
- Check that foreign key relationships are properly set up
- Verify that the tables have been created with the correct structure
- Make sure your Supabase instance is running the latest version

## Additional Features You Can Add

1. **Cart/Wishlist Analytics**: Track which products are most frequently added to carts or wishlists
2. **Shared Wishlist**: Allow users to share their wishlist with others
3. **Cart Recovery**: Email users about abandoned carts
4. **Quantity Limits**: Add product inventory checks when adding to cart 