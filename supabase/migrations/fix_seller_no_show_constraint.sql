-- Fix the constraint issue with seller_no_show status
-- First drop the existing constraint
ALTER TABLE price_offers DROP CONSTRAINT IF EXISTS price_offers_status_check;

-- Then recreate it with the correct format and values
ALTER TABLE price_offers ADD CONSTRAINT price_offers_status_check 
CHECK (status IN ('pending', 'accepted', 'rejected', 'completed', 'cancelled', 'expired', 'seller_no_show')); 