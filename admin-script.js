const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client (Replace these with your actual values)
// You'll need to provide these when running the script
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY; // Use service key for admin operations

if (!supabaseUrl || !supabaseKey) {
  console.error('Error: SUPABASE_URL and SUPABASE_SERVICE_KEY environment variables must be set');
  console.error('Example usage:');
  console.error('SUPABASE_URL=your-url SUPABASE_SERVICE_KEY=your-key node admin-script.js');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const TARGET_EMAIL = 'km5260@srmist.edu.in';

async function main() {
  try {
    // First, check if the user exists by getting their user ID
    console.log(`Checking if user ${TARGET_EMAIL} exists...`);
    
    const { data: userData, error: userError } = await supabase.auth.admin
      .listUsers();
      
    if (userError) {
      throw new Error(`Error fetching users: ${userError.message}`);
    }
    
    const user = userData.users.find(u => u.email === TARGET_EMAIL);
    
    if (!user) {
      console.log(`User with email ${TARGET_EMAIL} not found. They need to sign up first.`);
      return;
    }
    
    console.log(`User found with ID: ${user.id}`);
    
    // Check current admin status
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single();
      
    if (profileError) {
      if (profileError.code === 'PGRST116') {
        console.log(`Profile for user ${TARGET_EMAIL} not found. Creating a new profile with admin rights.`);
        
        // Create a new profile with admin rights
        const { error: insertError } = await supabase
          .from('profiles')
          .insert([
            { 
              id: user.id,
              is_admin: true,
              full_name: user.user_metadata?.full_name || 'Admin User',
              username: user.user_metadata?.username || 'admin',
            }
          ]);
          
        if (insertError) {
          throw new Error(`Error creating profile: ${insertError.message}`);
        }
        
        console.log(`✅ Successfully created a new profile with admin rights for ${TARGET_EMAIL}`);
        return;
      } else {
        throw new Error(`Error fetching profile: ${profileError.message}`);
      }
    }
    
    const isCurrentlyAdmin = profileData?.is_admin || false;
    console.log(`Current admin status: ${isCurrentlyAdmin}`);
    
    if (isCurrentlyAdmin) {
      console.log(`User ${TARGET_EMAIL} is already an admin. No changes needed.`);
      return;
    }
    
    // Update the user's admin status
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ is_admin: true })
      .eq('id', user.id);
      
    if (updateError) {
      throw new Error(`Error updating admin status: ${updateError.message}`);
    }
    
    console.log(`✅ Successfully granted admin access to ${TARGET_EMAIL}`);
    
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

main(); 