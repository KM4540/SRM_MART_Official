import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client (Replace these with your actual values)
// You'll need to provide these when running the script
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY; 

if (!supabaseUrl || !supabaseKey) {
  console.error('Error: SUPABASE_URL and SUPABASE_SERVICE_KEY environment variables must be set');
  console.error('Example usage:');
  console.error('SUPABASE_URL=your-url SUPABASE_SERVICE_KEY=your-key node add-pickup-locations.js');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// New pickup locations to add
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

async function main() {
  try {
    console.log('Adding new pickup locations...');
    
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
    
    // Fetch all current locations
    const { data: allLocations, error: fetchError } = await supabase
      .from('pickup_locations')
      .select('*')
      .order('name');
      
    if (fetchError) {
      throw new Error(`Error fetching locations: ${fetchError.message}`);
    }
    
    console.log('\nCurrent Pickup Locations:');
    console.log('------------------------');
    allLocations.forEach(loc => {
      console.log(`- ${loc.name} (${loc.is_active ? 'Active' : 'Inactive'})`);
      console.log(`  Address: ${loc.address}`);
      if (loc.description) console.log(`  Description: ${loc.description}`);
      console.log('');
    });
    
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

main(); 