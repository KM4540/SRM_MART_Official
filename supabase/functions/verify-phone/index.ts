
// Follow this setup guide to integrate the Deno runtime into your application:
// https://deno.land/manual/examples/deploy_deno_apps

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Create Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY') || '';
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get the authorization header
    const authHeader = req.headers.get('Authorization') || '';
    if (!authHeader.startsWith('Bearer ')) {
      throw new Error('Missing or invalid authorization header');
    }

    // Extract the JWT token
    const token = authHeader.split(' ')[1];
    
    // Verify the JWT and get the user
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    // Get request body
    const { phoneNumber, otp } = await req.json();

    if (!phoneNumber) {
      throw new Error('Phone number is required');
    }

    // This is a placeholder for actual SMS verification logic
    // In a real app, you would:
    // 1. For sending OTP: Generate an OTP, save it in a secure table with an expiry time, and send via Twilio/similar
    // 2. For verifying OTP: Check the OTP against the stored one, verify it's not expired, then mark phone as verified

    // For demonstration, we'll mark the phone as verified directly
    // In production, you'd need to implement proper OTP generation and verification
    if (otp) {
      // Verify OTP (mock implementation)
      if (otp === '123456') { // In a real app, compare with the OTP stored in the database
        // Update the profile to mark phone as verified
        const { error: updateError } = await supabase
          .from('profiles')
          .update({ 
            is_phone_verified: true,
            updated_at: new Date().toISOString(),
          })
          .eq('id', user.id);

        if (updateError) {
          throw new Error(`Error updating profile: ${updateError.message}`);
        }

        return new Response(JSON.stringify({ 
          success: true, 
          message: 'Phone verified successfully' 
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        });
      } else {
        throw new Error('Invalid OTP');
      }
    } else {
      // Send OTP (mock implementation)
      // In a real app, generate a random OTP, store it securely, and send via SMS gateway
      
      // Update the phone number in the profile
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ 
          phone: phoneNumber,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);

      if (updateError) {
        throw new Error(`Error updating profile: ${updateError.message}`);
      }

      // Return mock response
      return new Response(JSON.stringify({ 
        success: true, 
        message: 'OTP sent to phone (mock)' 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }
  } catch (error) {
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});
