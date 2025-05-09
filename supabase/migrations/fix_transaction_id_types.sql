-- First check the type of transaction_id in pickup_schedules
DO $$ 
DECLARE 
  column_type TEXT; 
BEGIN 
  SELECT data_type INTO column_type FROM information_schema.columns 
  WHERE table_name = 'pickup_schedules' AND column_name = 'transaction_id';
  
  -- If transaction_id is TEXT, alter it to UUID
  IF column_type = 'text' THEN
    -- Create temporary column to store UUID values
    ALTER TABLE pickup_schedules ADD COLUMN transaction_id_uuid UUID;
    
    -- Convert existing values where possible
    UPDATE pickup_schedules 
    SET transaction_id_uuid = transaction_id::UUID 
    WHERE transaction_id IS NOT NULL AND transaction_id ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';
    
    -- Drop the old column and rename the new one
    ALTER TABLE pickup_schedules DROP COLUMN transaction_id;
    ALTER TABLE pickup_schedules RENAME COLUMN transaction_id_uuid TO transaction_id;
  END IF;
END $$;

-- Add missing status column to transactions table if it doesn't exist
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'completed';

-- Update create_transaction_for_completed_offer function to handle possible issues
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
        
        -- If there's a pickup schedule, update its transaction_id
        UPDATE pickup_schedules
        SET transaction_id = new_transaction_id,
            updated_at = NOW()
        WHERE offer_id = NEW.id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql; 