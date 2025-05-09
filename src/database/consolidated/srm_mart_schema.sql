-- SRM Mart Consolidated SQL Schema
-- This file contains all the database schema, functions, and setup operations

-- =============================================================================
-- SECTION 1: MIGRATIONS TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS "migrations" (
  "id" SERIAL PRIMARY KEY,
  "name" VARCHAR(255) NOT NULL,
  "applied_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- =============================================================================
-- SECTION 2: CORE TABLES
-- =============================================================================

-- PRODUCTS TABLE
CREATE TABLE IF NOT EXISTS "products" (
  "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  "title" TEXT NOT NULL,
  "description" TEXT,
  "price" DECIMAL(10, 2) NOT NULL,
  "image" TEXT,
  "category" TEXT,
  "condition" TEXT,
  "status" TEXT DEFAULT 'available',
  "seller_id" UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  "created_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  "is_deleted" BOOLEAN DEFAULT FALSE
);

-- PROFILES TABLE
CREATE TABLE IF NOT EXISTS "profiles" (
  "id" UUID PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  "full_name" TEXT,
  "avatar_url" TEXT,
  "email" TEXT,
  "phone" TEXT,
  "created_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  "is_admin" BOOLEAN DEFAULT FALSE
);

-- PRICE OFFERS TABLE
CREATE TABLE IF NOT EXISTS "price_offers" (
  "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  "product_id" UUID REFERENCES "products"(id) ON DELETE CASCADE,
  "buyer_id" UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  "seller_id" UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  "amount" DECIMAL(10, 2) NOT NULL,
  "status" TEXT DEFAULT 'pending',
  "counter_amount" DECIMAL(10, 2),
  "created_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- PICKUP LOCATIONS TABLE
CREATE TABLE IF NOT EXISTS "pickup_locations" (
  "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  "name" TEXT NOT NULL,
  "description" TEXT,
  "is_active" BOOLEAN DEFAULT TRUE,
  "created_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- SELLER CONTACTS TABLE
CREATE TABLE IF NOT EXISTS "seller_contacts" (
  "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  "product_id" UUID REFERENCES "products"(id) ON DELETE CASCADE,
  "name" TEXT NOT NULL,
  "email" TEXT,
  "phone" TEXT,
  "created_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- PICKUP SCHEDULES TABLE
CREATE TABLE IF NOT EXISTS "pickup_schedules" (
  "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  "offer_id" UUID REFERENCES "price_offers"(id) ON DELETE CASCADE,
  "pickup_location_id" UUID REFERENCES "pickup_locations"(id),
  "pickup_time" TIMESTAMP WITH TIME ZONE NOT NULL,
  "buyer_pickup_time" TIMESTAMP WITH TIME ZONE,
  "item_received" BOOLEAN DEFAULT FALSE,
  "item_delivered" BOOLEAN DEFAULT FALSE,
  "transaction_id" TEXT,
  "created_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- CART TABLE
CREATE TABLE IF NOT EXISTS "cart" (
  "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  "user_id" UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  "product_id" UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  "quantity" INTEGER DEFAULT 1,
  "created_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE("user_id", "product_id")
);

-- WISHLIST TABLE
CREATE TABLE IF NOT EXISTS "wishlist" (
  "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  "user_id" UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  "product_id" UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  "created_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE("user_id", "product_id")
);

-- TRANSACTIONS TABLE
CREATE TABLE IF NOT EXISTS "transactions" (
  "id" TEXT PRIMARY KEY,
  "offer_id" UUID REFERENCES "price_offers"(id) ON DELETE CASCADE,
  "buyer_id" UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  "seller_id" UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  "product_id" UUID REFERENCES "products"(id) ON DELETE CASCADE,
  "amount" DECIMAL(10, 2) NOT NULL,
  "service_fee" DECIMAL(10, 2) NOT NULL,
  "status" TEXT DEFAULT 'completed',
  "payment_qr_url" TEXT,
  "created_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- =============================================================================
-- SECTION 3: FUNCTIONS AND TRIGGERS
-- =============================================================================

-- Create transaction for completed offer
CREATE OR REPLACE FUNCTION create_transaction_for_completed_offer()
RETURNS TRIGGER AS $$
DECLARE
    transaction_record RECORD;
    new_transaction_id TEXT;
    service_fee_amount DECIMAL;
BEGIN
    -- Only proceed if the new status is 'completed'
    IF NEW.status = 'completed' THEN
        -- Generate transaction ID in format TXN-YYYYMMDD-XXXX
        SELECT 
            'TXN-' || TO_CHAR(CURRENT_DATE, 'YYYYMMDD') || '-' || 
            LPAD(COALESCE(
                (SELECT COUNT(*) + 1 FROM transactions 
                 WHERE created_at::date = CURRENT_DATE), 
                1)::text, 4, '0')
        INTO new_transaction_id;
        
        -- Calculate service fee (2% of the offer amount)
        service_fee_amount := ROUND(NEW.amount * 0.02, 2);
        
        -- Insert transaction record
        INSERT INTO transactions (
            id, 
            offer_id, 
            buyer_id, 
            seller_id, 
            product_id,
            amount, 
            service_fee,
            status
        ) VALUES (
            new_transaction_id,
            NEW.id,
            NEW.buyer_id,
            NEW.seller_id,
            NEW.product_id,
            NEW.amount,
            service_fee_amount,
            'completed'
        )
        RETURNING * INTO transaction_record;
        
        -- Update product status to sold
        UPDATE products 
        SET status = 'sold', updated_at = NOW()
        WHERE id = NEW.product_id;
        
        -- If there's a pickup schedule, update its transaction_id
        UPDATE pickup_schedules
        SET transaction_id = new_transaction_id,
            updated_at = NOW()
        WHERE offer_id = NEW.id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for transaction creation
DROP TRIGGER IF EXISTS create_transaction_trigger ON price_offers;
CREATE TRIGGER create_transaction_trigger
AFTER UPDATE ON price_offers
FOR EACH ROW
WHEN (OLD.status <> 'completed' AND NEW.status = 'completed')
EXECUTE FUNCTION create_transaction_for_completed_offer();

-- Update pickup and offer status function
CREATE OR REPLACE FUNCTION update_pickup_and_offer_status()
RETURNS TRIGGER AS $$
BEGIN
    -- If item is received by admin
    IF NEW.item_received = TRUE AND OLD.item_received = FALSE THEN
        -- Update the offer status to 'item_received'
        UPDATE price_offers 
        SET status = 'item_received',
            updated_at = NOW()
        WHERE id = NEW.offer_id;
    END IF;
    
    -- If item is delivered to buyer
    IF NEW.item_delivered = TRUE AND OLD.item_delivered = FALSE THEN
        -- Update the offer status to 'completed'
        UPDATE price_offers 
        SET status = 'completed',
            updated_at = NOW()
        WHERE id = NEW.offer_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for pickup status updates
DROP TRIGGER IF EXISTS update_statuses_trigger ON pickup_schedules;
CREATE TRIGGER update_statuses_trigger
AFTER UPDATE ON pickup_schedules
FOR EACH ROW
WHEN (
    (NEW.item_received = TRUE AND OLD.item_received = FALSE) OR
    (NEW.item_delivered = TRUE AND OLD.item_delivered = FALSE)
)
EXECUTE FUNCTION update_pickup_and_offer_status();

-- =============================================================================
-- SECTION 4: STORAGE SETUP
-- =============================================================================

-- Create storage bucket for product images
INSERT INTO storage.buckets (id, name, public) 
VALUES ('product-images', 'Product Images', true)
ON CONFLICT (id) DO NOTHING;

-- Allow public access to product images
CREATE POLICY "Public Access" ON storage.objects
FOR SELECT
USING (bucket_id = 'product-images');

-- Allow authenticated users to upload to product images
CREATE POLICY "Authenticated Users Can Upload" ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'product-images');

-- Allow users to update their own uploads
CREATE POLICY "Users Can Update Own Uploads" ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'product-images' AND auth.uid() = owner);

-- =============================================================================
-- SECTION 5: RLS POLICIES
-- =============================================================================

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE price_offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE pickup_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE cart ENABLE ROW LEVEL SECURITY;
ALTER TABLE wishlist ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

-- Profile access policies
CREATE POLICY "Public profiles are viewable by everyone" ON profiles
FOR SELECT USING (true);

CREATE POLICY "Users can update own profile" ON profiles
FOR UPDATE USING (auth.uid() = id);

-- Product access policies
CREATE POLICY "Products are viewable by everyone" ON products
FOR SELECT USING (NOT is_deleted);

CREATE POLICY "Users can create their own products" ON products
FOR INSERT WITH CHECK (auth.uid() = seller_id);

CREATE POLICY "Users can update their own products" ON products
FOR UPDATE USING (auth.uid() = seller_id);

CREATE POLICY "Users can delete their own products" ON products
FOR DELETE USING (auth.uid() = seller_id);

-- Price offers access policies
CREATE POLICY "Buyers and sellers can view their offers" ON price_offers
FOR SELECT USING (
    auth.uid() = buyer_id OR 
    auth.uid() = seller_id OR
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
);

CREATE POLICY "Buyers can create offers" ON price_offers
FOR INSERT WITH CHECK (auth.uid() = buyer_id);

CREATE POLICY "Sellers can update offers" ON price_offers
FOR UPDATE USING (
    auth.uid() = seller_id OR
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
);

-- Pickup schedules access policies
CREATE POLICY "Buyers and sellers can view their pickup schedules" ON pickup_schedules
FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM price_offers
        WHERE id = pickup_schedules.offer_id
        AND (buyer_id = auth.uid() OR seller_id = auth.uid())
    ) OR
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
);

CREATE POLICY "Admin can update pickup schedules" ON pickup_schedules
FOR UPDATE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
);

-- Cart access policies
CREATE POLICY "Users can view their own cart" ON cart
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can add to their own cart" ON cart
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own cart" ON cart
FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete from their own cart" ON cart
FOR DELETE USING (auth.uid() = user_id);

-- Wishlist access policies
CREATE POLICY "Users can view their own wishlist" ON wishlist
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can add to their own wishlist" ON wishlist
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete from their own wishlist" ON wishlist
FOR DELETE USING (auth.uid() = user_id);

-- Transaction access policies
CREATE POLICY "Buyers and sellers can view their transactions" ON transactions
FOR SELECT USING (
    auth.uid() = buyer_id OR 
    auth.uid() = seller_id OR
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
);

-- =============================================================================
-- SECTION 6: ADMIN SETUP
-- =============================================================================

-- Create function to set user as admin
CREATE OR REPLACE FUNCTION set_user_as_admin(user_email TEXT)
RETURNS VOID AS $$
DECLARE
    user_id UUID;
BEGIN
    -- Get the user ID
    SELECT id INTO user_id FROM auth.users WHERE email = user_email;
    
    -- Update the profile
    UPDATE profiles
    SET is_admin = TRUE
    WHERE id = user_id;
END;
$$ LANGUAGE plpgsql; 