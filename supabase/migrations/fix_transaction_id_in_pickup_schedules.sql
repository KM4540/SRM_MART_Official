-- Allow transaction_id to be TEXT in pickup_schedules
-- This ensures compatibility with the format "TXN-YYYYMMDD-XXXX" used in the application
ALTER TABLE pickup_schedules 
  ALTER COLUMN transaction_id TYPE TEXT;

-- Make sure the metadata column exists for storing transaction information
ALTER TABLE pickup_schedules 
  ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

-- Fix any existing triggers that might be updating the transaction_id
-- Create or replace function for completing transactions
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
            NEW.offered_price,
            service_fee_amount,
            'completed'
        )
        RETURNING * INTO transaction_record;
        
        -- Update product status to sold
        UPDATE products 
        SET status = 'sold', updated_at = NOW()
        WHERE id = NEW.product_id;
        
        -- If there's a pickup schedule, update its metadata with the transaction ID
        UPDATE pickup_schedules
        SET metadata = jsonb_set(
            COALESCE(metadata, '{}'::jsonb), 
            '{system_transaction_id}', 
            to_jsonb(new_transaction_id)
        ),
        updated_at = NOW()
        WHERE offer_id = NEW.id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql; 