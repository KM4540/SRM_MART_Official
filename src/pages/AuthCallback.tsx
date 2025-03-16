import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// Constants
const ALLOWED_EMAIL_DOMAIN = "srmist.edu.in";

const AuthCallback = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const handleAuthCallback = async () => {
      // Get the URL hash and search parameters
      const hash = window.location.hash;
      const searchParams = new URLSearchParams(window.location.search);
      
      // Check for error
      const error = searchParams.get("error");
      const errorDescription = searchParams.get("error_description");
      
      if (error) {
        toast.error(`Authentication error: ${errorDescription || error}`);
        navigate("/auth");
        return;
      }
      
      // Let Supabase handle the OAuth callback
      const { data, error: supabaseError } = await supabase.auth.getSession();
      
      if (supabaseError) {
        toast.error(`Authentication error: ${supabaseError.message}`);
        navigate("/auth");
        return;
      }
      
      if (data?.session) {
        // Check if the email domain is valid
        const email = data.session.user?.email;
        if (!email || !email.toLowerCase().endsWith(`@${ALLOWED_EMAIL_DOMAIN}`)) {
          toast.error(`Only @${ALLOWED_EMAIL_DOMAIN} email addresses are allowed`);
          // Sign the user out since they don't have a valid email domain
          await supabase.auth.signOut();
          navigate("/auth");
          return;
        }
        
        // Successfully authenticated with valid domain
        // The auth state change listener will already show a success toast
        // so we don't need to show one here to avoid duplicate notifications
        navigate("/");
      } else {
        // No session, go back to auth page
        navigate("/auth");
      }
    };

    handleAuthCallback();
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-blue-100 dark:from-gray-900 dark:to-gray-800">
      <div className="text-center">
        <h1 className="text-2xl font-bold mb-4">Processing your sign in...</h1>
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-primary mx-auto"></div>
      </div>
    </div>
  );
};

export default AuthCallback; 