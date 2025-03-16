
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

    // Get request body
    const { email, otp } = await req.json();

    if (!email) {
      throw new Error('Email is required');
    }

    // This is a mock implementation
    // In a real app, you would:
    // 1. For sending OTP: Generate an OTP, save it in a secure table with an expiry time, and send via email
    // 2. For verifying OTP: Check the OTP against the stored one, verify it's not expired

    // Mock verification
    if (otp) {
      // Verify OTP (mock implementation)
      if (otp === '123456') { // In a real app, compare with the OTP stored in the database
        // Get user by email
        const { data: user, error: userError } = await supabase
          .from('users')
          .select('id')
          .eq('email', email)
          .single();

        if (userError) {
          // Sign up the user if not found
          const { data: authData, error: signUpError } = await supabase.auth.signUp({
            email,
            password: `OTP-${otp}-${Date.now()}`, // Generate a random password
          });

          if (signUpError) {
            throw new Error(`Error signing up: ${signUpError.message}`);
          }

          return new Response(JSON.stringify({ 
            success: true, 
            user: authData.user,
            message: 'User created and signed in successfully' 
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
          });
        }

        // Sign in the user
        const { data: signInData, error: signInError } = await supabase.auth.signInWithOtp({
          email
        });

        if (signInError) {
          throw new Error(`Error signing in: ${signInError.message}`);
        }

        return new Response(JSON.stringify({ 
          success: true, 
          user: signInData.user,
          message: 'Signed in successfully' 
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        });
      } else {
        throw new Error('Invalid OTP');
      }
    } else {
      // Send OTP (mock implementation)
      // In a real app, generate a random OTP, store it securely, and send via email

      // Send magic link instead (this will work with the Supabase setup)
      const { error: otpError } = await supabase.auth.signInWithOtp({
        email,
      });

      if (otpError) {
        throw new Error(`Error sending OTP: ${otpError.message}`);
      }

      // Return mock response
      return new Response(JSON.stringify({ 
        success: true, 
        message: 'OTP sent to email (mock)' 
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
