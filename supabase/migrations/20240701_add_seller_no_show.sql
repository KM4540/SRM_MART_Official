-- Add seller_no_show column to pickup_schedules table
ALTER TABLE pickup_schedules ADD COLUMN IF NOT EXISTS seller_no_show BOOLEAN DEFAULT false;

-- Create a new status for price_offers to track seller no-shows
ALTER TABLE price_offers DROP CONSTRAINT IF EXISTS price_offers_status_check;
ALTER TABLE price_offers ADD CONSTRAINT price_offers_status_check 
  CHECK (status IN ('pending', 'accepted', 'rejected', 'completed', 'cancelled', 'expired', 'seller_no_show')); 