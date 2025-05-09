import { createClient } from '@supabase/supabase-js';

// Use the environment variables directly
const supabaseUrl = "https://sldtztnpjemxbyzwkgem.supabase.co";
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNsZHR6dG5wamVteGJ5endrZ2VtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQ5NTQxNjIsImV4cCI6MjA2MDUzMDE2Mn0.RqnIIXLEmK71uCmrpDZXbB6PXaBUFB82tP4oJy33ZJw";

// Create Supabase client
export const supabaseTest = createClient(supabaseUrl, supabaseAnonKey);

// Function to test connection
export async function testSupabaseConnection() {
  try {
    // Try a simple query to check connection
    const { data, error } = await supabaseTest
      .from('products')
      .select('id')
      .limit(1);
    
    if (error) {
      console.error('Supabase connection error:', error);
      return { success: false, error };
    }
    
    return { success: true, data };
  } catch (err) {
    console.error('Unexpected error testing Supabase:', err);
    return { success: false, error: err };
  }
}

// Expose function to window for testing in browser
if (typeof window !== 'undefined') {
  (window as any).testSupabaseConnection = testSupabaseConnection;
} 