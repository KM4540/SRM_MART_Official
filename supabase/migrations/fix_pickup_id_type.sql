-- Ensure id column is properly defined as UUID
DO $$ 
BEGIN
    -- Check if the id column is not a UUID and convert it
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'pickup_schedules' 
        AND column_name = 'id' 
        AND data_type != 'uuid'
    ) THEN
        -- Alter the id column to UUID
        ALTER TABLE pickup_schedules ALTER COLUMN id TYPE UUID USING id::uuid;
    END IF;
    
    -- Check that offer_id is UUID
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'pickup_schedules' 
        AND column_name = 'offer_id' 
        AND data_type != 'uuid'
    ) THEN
        -- Alter the offer_id column to UUID
        ALTER TABLE pickup_schedules ALTER COLUMN offer_id TYPE UUID USING offer_id::uuid;
    END IF;
    
    -- Define transaction_id as TEXT to avoid type issues
    ALTER TABLE pickup_schedules ALTER COLUMN transaction_id TYPE TEXT;
    
    -- Ensure metadata column exists
    ALTER TABLE pickup_schedules ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;
END $$;

-- Migrate data from transaction_id to metadata.transaction_id
UPDATE pickup_schedules
SET metadata = jsonb_set(
    COALESCE(metadata, '{}'::jsonb),
    '{transaction_id}',
    to_jsonb(transaction_id)
)
WHERE transaction_id IS NOT NULL AND 
      (metadata IS NULL OR (metadata -> 'transaction_id') IS NULL); 