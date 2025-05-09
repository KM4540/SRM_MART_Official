-- Add metadata column to pickup_schedules table
ALTER TABLE pickup_schedules ADD COLUMN IF NOT EXISTS metadata JSONB;

-- Add seller_no_show and buyer_no_show columns if they don't exist yet
ALTER TABLE pickup_schedules ADD COLUMN IF NOT EXISTS seller_no_show BOOLEAN DEFAULT false;
ALTER TABLE pickup_schedules ADD COLUMN IF NOT EXISTS buyer_no_show BOOLEAN DEFAULT false;

-- Make transaction_id a UUID type instead of TEXT
DO $$ 
BEGIN
  -- First check if the column exists
  IF EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'pickup_schedules' 
    AND column_name = 'transaction_id' 
    AND data_type = 'text'
  ) THEN
    -- Create a new UUID column
    ALTER TABLE pickup_schedules ADD COLUMN transaction_id_uuid UUID;
    
    -- Try to convert existing values
    UPDATE pickup_schedules 
    SET transaction_id_uuid = transaction_id::UUID 
    WHERE transaction_id IS NOT NULL AND transaction_id ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';
    
    -- Drop the old column and rename the new one
    ALTER TABLE pickup_schedules DROP COLUMN transaction_id;
    ALTER TABLE pickup_schedules RENAME COLUMN transaction_id_uuid TO transaction_id;
  END IF;
EXCEPTION WHEN OTHERS THEN
  -- If it fails, we'll keep the text column
  RAISE NOTICE 'Could not convert transaction_id to UUID: %', SQLERRM;
END $$; 