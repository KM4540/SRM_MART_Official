-- First check if we need to recreate the transactions table
DO $$ 
BEGIN
    -- Check if "id" is the primary key and not UUID type
    IF EXISTS (
        SELECT 1 
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
        JOIN information_schema.columns c ON kcu.column_name = c.column_name AND kcu.table_name = c.table_name
        WHERE tc.constraint_type = 'PRIMARY KEY' 
        AND kcu.table_name = 'transactions'
        AND kcu.column_name = 'id'
        AND c.data_type = 'text'
    ) THEN
        -- Backup existing data
        CREATE TEMP TABLE transactions_backup AS SELECT * FROM transactions;
        
        -- Drop the existing table
        DROP TABLE transactions;
        
        -- Recreate with proper schema
        CREATE TABLE transactions (
            "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            "transaction_id" TEXT,
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
        
        -- Reinsert data, generating new UUIDs for the primary key
        INSERT INTO transactions (transaction_id, offer_id, buyer_id, seller_id, product_id, amount, service_fee, status, payment_qr_url, created_at)
        SELECT id, offer_id, buyer_id, seller_id, product_id, amount, service_fee, status, payment_qr_url, created_at
        FROM transactions_backup;
        
        -- Drop the backup table
        DROP TABLE transactions_backup;
    END IF;
END $$;

-- Update the create_transaction_for_completed_offer function to use the new schema
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
        service_fee_amount := ROUND(NEW.offered_price * 0.02, 2);
        
        -- Insert transaction record with the new schema
        INSERT INTO transactions (
            transaction_id, 
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
            NEW.offered_price,
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