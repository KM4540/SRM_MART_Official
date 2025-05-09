// Script to check for offer-related transactions
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

// Initialize environment variables
dotenv.config();

// Initialize Supabase client with service role key for admin access
const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_SERVICE_KEY
);

async function checkTransactions() {
  console.log('Checking transactions related to offers...');
  
  try {
    // 1. Check if transactions table has data
    const { data: transCount, error: transCountError } = await supabase
      .from('transactions')
      .select('id', { count: 'exact', head: true });
    
    if (transCountError) {
      console.error('Error checking transaction count:', transCountError);
    } else {
      console.log(`Total transactions in database: ${transCount?.count || 0}`);
    }
    
    // 2. Check for offer-related transactions
    const { data: offerTransactions, error: offerTransError } = await supabase
      .from('transactions')
      .select('*')
      .not('offer_id', 'is', null);
    
    if (offerTransError) {
      console.error('Error checking offer transactions:', offerTransError);
    } else {
      console.log(`Transactions with offer_id: ${offerTransactions?.length || 0}`);
      if (offerTransactions?.length > 0) {
        console.log('Sample offer transaction:', offerTransactions[0]);
      }
    }
    
    // 3. Check recent transactions (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const { data: recentTrans, error: recentTransError } = await supabase
      .from('transactions')
      .select('id, created_at, transaction_id, product_id, buyer_id, seller_id, amount, payment_status')
      .gte('created_at', sevenDaysAgo.toISOString());
    
    if (recentTransError) {
      console.error('Error checking recent transactions:', recentTransError);
    } else {
      console.log(`Transactions in the last 7 days: ${recentTrans?.length || 0}`);
      if (recentTrans?.length > 0) {
        console.log('Recent transactions:', recentTrans);
      }
    }
    
    // 4. Check offers table to see if there are completed offers
    const { data: completedOffers, error: offersError } = await supabase
      .from('offers')
      .select('id, status, created_at, product_id, buyer_id, seller_id')
      .eq('status', 'accepted')
      .order('created_at', { ascending: false })
      .limit(5);
    
    if (offersError) {
      console.error('Error checking completed offers:', offersError);
    } else {
      console.log(`Recent completed offers: ${completedOffers?.length || 0}`);
      if (completedOffers?.length > 0) {
        console.log('Completed offers sample:', completedOffers);
        
        // 5. Check for any transaction linked to these offers
        if (completedOffers.length > 0) {
          const offerIds = completedOffers.map(o => o.id);
          const { data: linkedTransactions, error: linkedError } = await supabase
            .from('transactions')
            .select('*')
            .in('offer_id', offerIds);
          
          if (linkedError) {
            console.error('Error checking transactions linked to offers:', linkedError);
          } else {
            console.log(`Transactions linked to recent completed offers: ${linkedTransactions?.length || 0}`);
            if (linkedTransactions?.length > 0) {
              console.log('Linked transactions:', linkedTransactions);
            } else {
              console.log('No transactions found for recently completed offers!');
            }
          }
        }
      }
    }
    
    console.log('Transaction check completed.');
  } catch (error) {
    console.error('Unexpected error during transaction check:', error);
  }
}

// Execute check
checkTransactions()
  .then(() => console.log('Check completed'))
  .catch(err => console.error('Error running check script:', err)); 