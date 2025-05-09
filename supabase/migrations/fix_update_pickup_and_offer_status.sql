-- Drop existing triggers and functions
DROP TRIGGER IF EXISTS update_statuses_trigger ON pickup_schedules;
DROP FUNCTION IF EXISTS update_pickup_and_offer_status();

-- Create new RPC function for updating pickup and creating transaction
CREATE OR REPLACE FUNCTION update_pickup_and_offer_status(
  _pickup_id UUID,
  _transaction_id TEXT,
  _offer_id UUID
) RETURNS VOID AS $$
DECLARE
  transaction_id_val UUID;
BEGIN
  -- Convert the transaction_id from TEXT to UUID
  BEGIN
    transaction_id_val := _transaction_id::UUID;
  EXCEPTION WHEN OTHERS THEN
    -- If conversion fails, generate a new UUID
    transaction_id_val := gen_random_uuid();
  END;

  -- Update the pickup schedule
  UPDATE pickup_schedules
  SET 
    item_delivered = TRUE,
    transaction_id = _transaction_id,
    updated_at = NOW()
  WHERE id = _pickup_id;
  
  -- Update the offer status to 'completed'
  UPDATE price_offers
  SET 
    status = 'completed',
    updated_at = NOW()
  WHERE id = _offer_id;
  
  -- The transaction will be created by the create_transaction_for_completed_offer trigger
END;
$$ LANGUAGE plpgsql;

-- Create function to update offer status when pickup status changes
CREATE OR REPLACE FUNCTION update_pickup_status_trigger()
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
CREATE TRIGGER update_statuses_trigger
AFTER UPDATE ON pickup_schedules
FOR EACH ROW
WHEN (
    (NEW.item_received = TRUE AND OLD.item_received = FALSE) OR
    (NEW.item_delivered = TRUE AND OLD.item_delivered = FALSE)
)
EXECUTE FUNCTION update_pickup_status_trigger(); 