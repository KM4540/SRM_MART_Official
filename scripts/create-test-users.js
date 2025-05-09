// Script to create test users in Supabase
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Get Supabase URL and key from environment variables
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

// Ensure both required environment variables are available
if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Error: Missing environment variables');
  console.error('Make sure you have defined VITE_SUPABASE_URL and SUPABASE_SERVICE_KEY in your .env file');
  console.error('Note: SUPABASE_SERVICE_KEY should be the service_role key, not the anon key');
  process.exit(1);
}

// Create Supabase client with service role key for admin access
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Read the SQL file
const sqlFilePath = path.join(__dirname, '..', 'create-test-users.sql');
const sql = fs.readFileSync(sqlFilePath, 'utf8');

async function createTestUsers() {
  console.log('Creating test users in Supabase...');
  
  try {
    // Execute the SQL directly using Supabase's REST API
    const { error } = await supabase.rpc('exec_sql', {
      query: sql
    });
    
    if (error) throw error;
    
    console.log('✅ Test users created successfully!');
    console.log('\nYou can now log in with the following credentials:');
    console.log('Admin User:');
    console.log('  Email: admin@test.com');
    console.log('  Password: admin123');
    console.log('\nRegular User:');
    console.log('  Email: user@test.com');
    console.log('  Password: user123');
    
  } catch (error) {
    console.error('❌ Error creating test users:', error.message);
    
    if (error.message.includes('permission denied')) {
      console.error('\nMake sure you are using the service_role key, not the anon key');
      console.error('The service_role key can be found in your Supabase project settings under API');
    }
    
    if (error.message.includes('function') && error.message.includes('does not exist')) {
      console.error('\nThe exec_sql function may not be available in your Supabase instance.');
      console.error('As an alternative, you can:');
      console.error('1. Go to your Supabase Dashboard');
      console.error('2. Open the SQL Editor');
      console.error('3. Paste the contents of create-test-users.sql');
      console.error('4. Run the query manually');
    }
  }
}

// Run the function
createTestUsers(); 