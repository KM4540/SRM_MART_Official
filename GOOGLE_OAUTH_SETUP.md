# Setting Up Google OAuth with Supabase

This guide will help you enable Google authentication for your SRMMart application with specific focus on restricting access to @srmist.edu.in email domains.

## Step 1: Configure Supabase Authentication

1. Log in to your Supabase dashboard at https://app.supabase.com/
2. Navigate to your project
3. Go to Authentication > Providers
4. Find Google in the list of providers and toggle it to enable
5. You will need to provide the Google Client ID and Client Secret (we'll get these in Step 2)
6. In the "Redirect URL" field, note the callback URL from Supabase. It should look like:
   `https://egkrkqkhujphdmrydgps.supabase.co/auth/v1/callback`

## Step 2: Set Up Google OAuth Credentials

1. Go to the Google Cloud Console at https://console.cloud.google.com/
2. Create a new project or select an existing one
3. Navigate to "APIs & Services" > "Credentials"
4. Click "Create Credentials" and select "OAuth client ID"
5. Select "Web application" as the Application type
6. Give your OAuth client a name (e.g., "SRMMart Authentication")
7. Add the following URLs to the "Authorized JavaScript origins":
   - `http://localhost:5173` (for local development)
   - Your production URL (e.g., `https://your-srm-mart-domain.com`)
8. Add the following URLs to the "Authorized redirect URIs":
   - The Supabase redirect URL you noted in Step 1
   - `http://localhost:5173/auth/callback` (for local development)
   - `https://your-srm-mart-domain.com/auth/callback` (for production)
9. Click "Create"
10. Note the generated Client ID and Client Secret

## Step 3: Configure OAuth Consent Screen for Domain Restriction

1. In Google Cloud Console, go to "APIs & Services" > "OAuth consent screen"
2. Select "External" user type (unless you have a Google Workspace domain)
3. Fill in the required information:
   - App name: "SRMMart"
   - User support email: your email
   - Developer contact information: your email
4. Click "Save and Continue"
5. Add the necessary scopes:
   - `./auth/userinfo.email`
   - `./auth/userinfo.profile`
6. Click "Save and Continue"
7. Under "Test users", add any test email addresses you want to use
8. Click "Save and Continue"
9. Review your settings and click "Back to Dashboard"
10. **IMPORTANT**: In the OAuth consent screen dashboard, scroll down to "Authorized domains"
11. Add `srmist.edu.in` as an authorized domain
12. This helps Google recognize the domain as trusted for your application

## Step 4: Add Google OAuth Credentials to Supabase

1. Return to your Supabase dashboard
2. Go back to Authentication > Providers > Google
3. Enter the Client ID and Client Secret from Google
4. Under "Additional Settings", make sure to:
   - Check that the "Domain Verification" is enabled if available
5. Click "Save"

## Step 5: Add Domain Restrictions in Your Application Code

We've implemented three layers of domain restriction in the code:

1. In the OAuth request, we use the `hd` parameter to request Google to only allow @srmist.edu.in domains:
   ```javascript
   await supabase.auth.signInWithOAuth({
     provider: 'google',
     options: {
       queryParams: {
         hd: "srmist.edu.in"  // Restricts to this domain
       }
     }
   });
   ```

2. In the `AuthContext`, we validate the user's email domain after authentication:
   ```javascript
   const isValidEmailDomain = (email?: string | null): boolean => {
     if (!email) return false;
     return email.toLowerCase().endsWith(`@srmist.edu.in`);
   };
   ```

3. In the `AuthCallback` component, we verify the domain again:
   ```javascript
   if (!email || !email.toLowerCase().endsWith(`@srmist.edu.in`)) {
     // Sign out users with invalid domains
     await supabase.auth.signOut();
   }
   ```

## Step 6: Testing Domain Restriction

1. Try signing in with a Google account that has an @srmist.edu.in email address 
   - This should work and redirect to your application
2. Try signing in with a Google account that does NOT have an @srmist.edu.in email address
   - This should be blocked by Google's OAuth (if the `hd` parameter is working)
   - If they somehow get past that, the code-level checks should catch them and sign them out

## Troubleshooting

If you encounter issues with the domain restriction:

1. **OAuth `hd` Parameter Not Working**: 
   - Verify that your Google Cloud project is correctly configured
   - Make sure you're passing the parameter correctly in the Supabase call

2. **Users with Wrong Domains Still Get In**:
   - Check that all three validation layers are working
   - Look for any bypass logic in your code
   - Review Supabase logs to see the exact sign-in flow

3. **Authentication Errors**:
   - Check browser console for specific error messages
   - Verify that your redirect URLs are correctly configured
   - Ensure that your Google Cloud project is properly set up with the right credentials

## Additional Notes

- The `hd` parameter in Google OAuth is helpful but not 100% foolproof, which is why we also have application-level checks
- For proper production use, consider using Google Workspace domain-restricted access if possible
- Always test with both valid and invalid email domains to ensure restrictions work
- Monitor your authentication logs for any unusual access patterns

## Step 5: Testing

1. Run your application and try logging in with Google
2. Check that the authentication flow works correctly
3. Verify that user profiles are created in your Supabase database

## Troubleshooting

If you encounter issues with the Google OAuth flow:

1. Check the browser console for errors
2. Verify that your redirect URLs are correctly configured in both Google Cloud Console and Supabase
3. Ensure that the Google OAuth consent screen is properly configured
4. Check Supabase logs for authentication errors

## Additional Notes

- For production, make sure to update all URLs to use your actual domain
- Consider implementing additional checks in your application to verify @srmist.edu.in email domains
- For local development, you may need to use a different OAuth configuration or temporarily disable domain restrictions 