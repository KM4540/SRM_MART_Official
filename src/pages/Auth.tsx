import { useNavigate, useSearchParams } from "react-router-dom";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { ArrowLeft, Mail, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { FcGoogle } from "react-icons/fc";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

// Constants
const ALLOWED_EMAIL_DOMAIN = "srmist.edu.in";

const Auth = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isFreshLogin = searchParams.get('fresh') === 'true';
  const { signInWithGoogle } = useAuth();

  // If this is a fresh login request, clear any potential Google OAuth state
  useEffect(() => {
    if (isFreshLogin) {
      // Set a flag in localStorage to indicate we should use a fresh login
      localStorage.setItem('force_fresh_login', 'true');
      
      // Clear the URL parameter to avoid infinite loops
      navigate('/auth', { replace: true });
    }
  }, [isFreshLogin, navigate]);

  const handleGoogleSignIn = async () => {
    try {
      // Check if we need to force a fresh login
      const forceFreshLogin = localStorage.getItem('force_fresh_login') === 'true';
      
      if (forceFreshLogin) {
        // Clear the flag
        localStorage.removeItem('force_fresh_login');
        
        // Redirect directly to Google OAuth with prompt=select_account to force account selection
        // This will show the account picker without logging out of all accounts
        window.location.href = `https://egkrkqkhujphdmrydgps.supabase.co/auth/v1/authorize?provider=google&prompt=select_account&hd=${ALLOWED_EMAIL_DOMAIN}`;
        return;
      }
      
      // Normal sign-in flow
      await signInWithGoogle();
    } catch (error) {
      console.error("Google sign in error:", error);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-blue-100 dark:from-gray-900 dark:to-gray-800 py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <Button 
            variant="ghost" 
            onClick={() => navigate("/")} 
            className="mb-4"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Home
          </Button>
          <h2 className="text-3xl font-bold tracking-tight text-primary">
            SRMMart
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Campus marketplace exclusively for SRM students
          </p>
        </div>

        <Card className="w-full">
          <CardHeader>
            <CardTitle className="text-center">Sign in to SRMMart</CardTitle>
            <CardDescription className="text-center">
              Use your SRM Google account to access the marketplace
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-4">
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Only <strong>@{ALLOWED_EMAIL_DOMAIN}</strong> email addresses are allowed
              </AlertDescription>
            </Alert>
            
            <div className="flex flex-col space-y-4">
              <Button 
                variant="outline" 
                size="lg" 
                className="w-full py-6 flex items-center justify-center space-x-2"
                onClick={handleGoogleSignIn}
              >
                <FcGoogle className="h-5 w-5" />
                <span>Sign in with Google</span>
              </Button>
              
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-300 dark:border-gray-600"></div>
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="px-2 bg-white dark:bg-gray-800 text-muted-foreground">
                    SRM students only
                  </span>
                </div>
              </div>
              
              <p className="text-center text-sm text-muted-foreground">
                Please use your SRM email address (@{ALLOWED_EMAIL_DOMAIN})
              </p>
            </div>
          </CardContent>
          
          <CardFooter className="border-t pt-6 flex flex-col space-y-2">
            <p className="text-center text-sm text-muted-foreground px-6">
              By continuing, you agree to SRMMart's Terms of Service and Privacy Policy.
            </p>
            <p className="text-center text-xs text-muted-foreground">
              © {new Date().getFullYear()} SRMMart. All rights reserved.
            </p>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
};

export default Auth;
