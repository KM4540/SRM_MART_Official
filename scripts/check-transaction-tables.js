// Database schema validation for transaction tables
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { promises as fs } from 'fs';

// Initialize environment variables
dotenv.config();

// Initialize Supabase client
const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_SERVICE_KEY
);

async function checkDatabaseSchema() {
  console.log('Checking database schema for transaction tables...');
  
  try {
    // Check if transactions table exists
    const { data: tables, error: tablesError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .in('table_name', ['transactions', 'products', 'profiles']);
    
    if (tablesError) {
      console.error('Error checking tables:', tablesError);
      return false;
    }
    
    const tableNames = tables.map(t => t.table_name);
    console.log('Found tables:', tableNames);
    
    // Check if required tables exist
    const requiredTables = ['transactions', 'products', 'profiles'];
    const missingTables = requiredTables.filter(t => !tableNames.includes(t));
    
    if (missingTables.length > 0) {
      console.error('Missing required tables:', missingTables);
      return false;
    }
    
    // Check columns in transactions table
    const { data: columns, error: columnsError } = await supabase
      .from('information_schema.columns')
      .select('column_name')
      .eq('table_schema', 'public')
      .eq('table_name', 'transactions');
    
    if (columnsError) {
      console.error('Error checking columns:', columnsError);
      return false;
    }
    
    const columnNames = columns.map(c => c.column_name);
    console.log('Found columns in transactions table:', columnNames);
    
    // Check if required columns exist
    const requiredColumns = [
      'id', 
      'transaction_id', 
      'created_at',
      'product_id',
      'buyer_id',
      'seller_id',
      'amount',
      'service_fee',
      'final_amount',
      'payment_status'
    ];
    
    const missingColumns = requiredColumns.filter(c => !columnNames.includes(c));
    
    if (missingColumns.length > 0) {
      console.error('Missing required columns in transactions table:', missingColumns);
      return false;
    }
    
    // Check if foreign keys are set up properly
    const { data: fkeys, error: fkeysError } = await supabase
      .from('information_schema.key_column_usage')
      .select(`
        constraint_name,
        table_name,
        column_name,
        referenced_table_name,
        referenced_column_name
      `)
      .eq('table_schema', 'public')
      .eq('table_name', 'transactions');
    
    if (fkeysError) {
      console.error('Error checking foreign keys:', fkeysError);
      return false;
    }
    
    console.log('Foreign key relationships:', fkeys);
    
    // Check RLS policies on transactions table
    const { data: rls, error: rlsError } = await supabase
      .rpc('get_policies_for_table', { table_name: 'transactions' });
    
    if (rlsError) {
      console.error('Error checking RLS policies:', rlsError);
      console.log('Note: You may need to create the get_policies_for_table function in your database');
      
      // Try to check if RLS is enabled at all (this may not work on all Supabase instances)
      const { data: rlsCheck, error: rlsCheckError } = await supabase
        .from('pg_tables')
        .select('rowsecurity')
        .eq('tablename', 'transactions')
        .eq('schemaname', 'public')
        .single();
      
      if (!rlsCheckError && rlsCheck) {
        console.log('RLS enabled for transactions table:', rlsCheck.rowsecurity);
      }
    } else {
      console.log('RLS policies for transactions table:', rls);
    }
    
    // Attempt to make a simple test query
    const { data: testQuery, error: testQueryError } = await supabase
      .from('transactions')
      .select('id')
      .limit(1);
    
    if (testQueryError) {
      console.error('Test query failed:', testQueryError);
      console.log('This suggests a permission issue or RLS policy blocking access');
      return false;
    }
    
    console.log('Test query successful:', testQuery ? 'Data found' : 'No data but query worked');
    console.log('Database schema validation passed!');
    return true;
    
  } catch (error) {
    console.error('Unexpected error during database schema validation:', error);
    return false;
  }
}

// Execute check
checkDatabaseSchema()
  .then(isValid => {
    if (isValid) {
      console.log('All checks passed! Database schema is valid for transactions.');
    } else {
      console.log('Some checks failed. Please review the issues above and fix them.');
    }
  })
  .catch(err => {
    console.error('Error running validation script:', err);
  }); 