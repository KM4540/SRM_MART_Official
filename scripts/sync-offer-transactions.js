// Script to sync transactions from completed offers
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

// Initialize environment variables
dotenv.config();

// Initialize Supabase client with service role key for admin access
const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_SERVICE_KEY
);

// Generate a transaction ID
const generateTransactionId = () => {
  return 'TXN-' + Math.random().toString(36).substring(2, 10).toUpperCase();
};

async function syncOfferTransactions() {
  console.log('Syncing transactions from completed offers...');
  
  try {
    // 1. Get all accepted offers that don't have transactions
    const { data: completedOffers, error: offersError } = await supabase
      .from('offers')
      .select(`
        id, 
        status, 
        created_at, 
        product_id, 
        buyer_id, 
        seller_id, 
        offer_amount,
        product:products(price, title)
      `)
      .eq('status', 'accepted');
    
    if (offersError) {
      console.error('Error fetching completed offers:', offersError);
      return;
    }
    
    console.log(`Found ${completedOffers?.length || 0} completed offers`);
    
    if (!completedOffers || completedOffers.length === 0) {
      console.log('No completed offers to process');
      return;
    }
    
    // 2. Check which offers already have transactions
    const offerIds = completedOffers.map(o => o.id);
    const { data: existingTransactions, error: existingError } = await supabase
      .from('transactions')
      .select('offer_id')
      .in('offer_id', offerIds);
    
    if (existingError) {
      console.error('Error checking existing transactions:', existingError);
      return;
    }
    
    const existingOfferIds = existingTransactions?.map(t => t.offer_id) || [];
    console.log(`Found ${existingOfferIds.length} offers with existing transactions`);
    
    // 3. Filter out offers that already have transactions
    const offersWithoutTransactions = completedOffers.filter(
      offer => !existingOfferIds.includes(offer.id)
    );
    
    console.log(`Found ${offersWithoutTransactions.length} offers without transactions`);
    
    if (offersWithoutTransactions.length === 0) {
      console.log('All completed offers already have transactions');
      return;
    }
    
    // 4. Create transactions for offers that don't have them
    const transactionsToCreate = offersWithoutTransactions.map(offer => {
      // Calculate amounts
      // If offer_amount exists, use it, otherwise use product price
      const amount = offer.offer_amount || (offer.product ? offer.product.price : 0);
      const serviceFee = amount * 0.02; // 2% service fee
      const finalAmount = amount - serviceFee;
      
      return {
        transaction_id: generateTransactionId(),
        created_at: offer.created_at,
        product_id: offer.product_id,
        buyer_id: offer.buyer_id,
        seller_id: offer.seller_id,
        amount: amount,
        service_fee: serviceFee,
        final_amount: finalAmount,
        payment_status: 'completed',
        offer_id: offer.id
      };
    });
    
    console.log(`Creating ${transactionsToCreate.length} new transactions`);
    
    // 5. Insert the new transactions
    const { data: newTransactions, error: insertError } = await supabase
      .from('transactions')
      .insert(transactionsToCreate)
      .select();
    
    if (insertError) {
      console.error('Error creating transactions:', insertError);
      return;
    }
    
    console.log(`Successfully created ${newTransactions?.length || 0} new transactions!`);
    console.log('First new transaction:', newTransactions?.[0]);
    
  } catch (error) {
    console.error('Unexpected error during transaction sync:', error);
  }
}

// Execute sync
syncOfferTransactions()
  .then(() => console.log('Sync completed'))
  .catch(err => console.error('Error running sync script:', err)); 