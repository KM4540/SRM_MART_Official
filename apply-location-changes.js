import { createClient } from '@supabase/supabase-js';

// Get Supabase credentials from command line arguments
const args = process.argv.slice(2);

if (args.length < 2) {
  console.error('Error: Please provide Supabase URL and key as arguments');
  console.error('Usage: node apply-location-changes.js <SUPABASE_URL> <SUPABASE_KEY>');
  process.exit(1);
}

const supabaseUrl = args[0];
const supabaseKey = args[1];

console.log('Connecting to Supabase...');
const supabase = createClient(supabaseUrl, supabaseKey);

async function updateLocations() {
  try {
    console.log('Updating pickup locations...');
    
    // Step 1: Deactivate old locations including Tech Park
    console.log('Marking old locations as inactive...');
    const { error: deactivateError } = await supabase
      .from('pickup_locations')
      .update({ is_active: false })
      .in('name', ['Sanasi Block', 'Paari Block', 'Tech Park']);
      
    if (deactivateError) {
      throw new Error(`Error deactivating old locations: ${deactivateError.message}`);
    }
    
    // Step 2: Add/update new locations
    const NEW_LOCATIONS = [
      {
        name: 'Sanasi C block reception',
        address: 'Sanasi C Block Reception, SRM University, Kattankulathur',
        description: 'Sanasi C Block main reception area',
        is_active: true
      },
      {
        name: 'Skywalk valyamai ESQ',
        address: 'Skywalk valyamai ESQ, SRM University, Kattankulathur',
        description: 'Skywalk valyamai ESQ entrance',
        is_active: true
      }
    ];
    
    for (const location of NEW_LOCATIONS) {
      // Check if location already exists
      const { data: existingLocations, error: checkError } = await supabase
        .from('pickup_locations')
        .select('id, name')
        .eq('name', location.name)
        .limit(1);
        
      if (checkError) {
        throw new Error(`Error checking for existing location: ${checkError.message}`);
      }
      
      if (existingLocations && existingLocations.length > 0) {
        console.log(`Location "${location.name}" already exists. Updating details...`);
        
        // Update existing location
        const { error: updateError } = await supabase
          .from('pickup_locations')
          .update({
            address: location.address,
            description: location.description,
            is_active: location.is_active
          })
          .eq('id', existingLocations[0].id);
          
        if (updateError) {
          throw new Error(`Error updating location: ${updateError.message}`);
        }
        
        console.log(`✅ Successfully updated location: ${location.name}`);
      } else {
        console.log(`Adding new location: ${location.name}`);
        // Insert new location
        const { error: insertError } = await supabase
          .from('pickup_locations')
          .insert([location]);
          
        if (insertError) {
          throw new Error(`Error adding location: ${insertError.message}`);
        }
        
        console.log(`✅ Successfully added new location: ${location.name}`);
      }
    }
    
    // Fetch all current active locations
    const { data: activeLocations, error: fetchError } = await supabase
      .from('pickup_locations')
      .select('*')
      .eq('is_active', true)
      .order('name');
      
    if (fetchError) {
      throw new Error(`Error fetching locations: ${fetchError.message}`);
    }
    
    console.log('\nCurrent Active Pickup Locations:');
    console.log('------------------------------');
    activeLocations.forEach(loc => {
      console.log(`- ${loc.name}`);
      console.log(`  Address: ${loc.address}`);
      if (loc.description) console.log(`  Description: ${loc.description}`);
      console.log('');
    });
    
    console.log(`Total active locations: ${activeLocations.length}`);
    
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

console.log('Starting location update process...');
updateLocations().then(() => {
  console.log('Location update completed successfully!');
  console.log('Please refresh your application to see the changes.');
}); 