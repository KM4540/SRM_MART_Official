// Script to create test users in Supabase using the Auth API
// This is an alternative to using raw SQL
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

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

// Test users to create
const testUsers = [
  {
    email: 'admin@test.com',
    password: 'admin123',
    userData: {
      full_name: 'Admin User',
      username: 'admin_user',
      avatar_url: 'https://ui-avatars.com/api/?name=Admin+User&background=random',
      is_admin: true
    }
  },
  {
    email: 'user@test.com',
    password: 'user123',
    userData: {
      full_name: 'Regular User',
      username: 'regular_user',
      avatar_url: 'https://ui-avatars.com/api/?name=Regular+User&background=random',
      is_admin: false
    }
  }
];

async function createUser(email, password, userData) {
  console.log(`Creating user: ${email}`);
  
  try {
    // First check if the user already exists and delete if needed
    const { data: existingUsers } = await supabase
      .from('profiles')
      .select('id')
      .eq('username', userData.username);
    
    if (existingUsers && existingUsers.length > 0) {
      console.log(`User ${userData.username} already exists, removing...`);
      await supabase.auth.admin.deleteUser(existingUsers[0].id);
    }
    
    // Create the user
    const { data: user, error } = await supabase.auth.admin.createUser({
      email,
      password,
      user_metadata: { 
        name: userData.full_name 
      },
      email_confirm: true // Skip email verification
    });
    
    if (error) throw new Error(`Error creating user: ${error.message}`);
    
    if (!user || !user.user) throw new Error('No user returned from createUser');
    console.log(`User created with ID: ${user.user.id}`);
    
    // Update the profile with additional data
    const { error: profileError } = await supabase
      .from('profiles')
      .update({
        full_name: userData.full_name,
        username: userData.username,
        avatar_url: userData.avatar_url,
        is_admin: userData.is_admin,
        updated_at: new Date()
      })
      .eq('id', user.user.id);
    
    if (profileError) throw new Error(`Error updating profile: ${profileError.message}`);
    
    return user.user;
  } catch (error) {
    console.error(`❌ Error creating user ${email}:`, error.message);
    return null;
  }
}

async function createTestUsers() {
  console.log('Creating test users in Supabase via Auth API...');
  
  try {
    const results = [];
    
    for (const user of testUsers) {
      const result = await createUser(user.email, user.password, user.userData);
      if (result) {
        results.push({ email: user.email, id: result.id, isAdmin: user.userData.is_admin });
      }
    }
    
    console.log('\n✅ Test users created successfully!');
    if (results.length > 0) {
      console.log('\nYou can now log in with the following credentials:');
      
      results.forEach(user => {
        console.log(`\n${user.isAdmin ? 'Admin' : 'Regular'} User:`);
        console.log(`  Email: ${user.email}`);
        console.log(`  Password: ${user.email === 'admin@test.com' ? 'admin123' : 'user123'}`);
        console.log(`  ID: ${user.id}`);
      });
    }
  } catch (error) {
    console.error('❌ Error in createTestUsers:', error.message);
  }
}

// Run the function
createTestUsers(); 