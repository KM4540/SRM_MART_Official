
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Mail, KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useAuth } from "@/contexts/AuthContext";
import { useLocation, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

// Preset credentials for testing
const TEST_EMAIL = "123@srmist.edu.in";
const TEST_PASSWORD = "123456";

const loginSchema = z.object({
  email: z
    .string()
    .email("Please enter a valid email address")
    .endsWith("@srmist.edu.in", "Please use your SRM email (@srmist.edu.in)")
    .transform(email => email.toLowerCase().trim()), // Normalize email
  password: z
    .string()
    .min(3, "Password must be at least 3 characters"),
});

type LoginValues = z.infer<typeof loginSchema>;

const LoginForm = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [creatingTestUser, setCreatingTestUser] = useState(false);
  const [rateLimit, setRateLimit] = useState(false);
  const [rateLimitTime, setRateLimitTime] = useState(0);
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as any)?.from?.pathname || "/";

  const form = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: TEST_EMAIL,
      password: TEST_PASSWORD,
    },
  });

  const onSubmit = async (data: LoginValues) => {
    if (rateLimit) {
      toast.error(`Please wait ${rateLimitTime} seconds before trying again`);
      return;
    }
    
    setIsLoading(true);
    try {
      await signIn(data.email, data.password);
      navigate(from, { replace: true });
    } catch (error: any) {
      console.error("Login error:", error);
      
      // Handle email not confirmed error
      if (error.message === "Email not confirmed") {
        toast.error("Email not confirmed. Confirming email automatically...");
        try {
          // Get the session - properly await the Promise
          const sessionResult = await supabase.auth.getSession();
          const accessToken = sessionResult.data.session?.access_token || '';
          
          // Call the confirm-user edge function to confirm the email
          const response = await fetch('https://egkrkqkhujphdmrydgps.supabase.co/functions/v1/confirm-user', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${accessToken}`,
            },
            body: JSON.stringify({ email: data.email }),
          });
          
          const result = await response.json();
          
          if (result.success) {
            toast.success("Email confirmed! Please try logging in again.");
          } else {
            throw new Error(result.error || "Failed to confirm email");
          }
        } catch (confirmError: any) {
          console.error("Confirmation error:", confirmError);
          
          // If confirmation fails, try to create a new test user
          toast.error("Could not confirm email. Creating new test account...");
          try {
            setCreatingTestUser(true);
            
            // Create test user with auto confirmation
            const { error: signUpError, data: signUpData } = await supabase.auth.signUp({
              email: TEST_EMAIL.toLowerCase(),
              password: TEST_PASSWORD,
              options: {
                data: {
                  full_name: "Test User",
                },
              }
            });
            
            if (signUpError) {
              // Check for rate limit error
              if (signUpError.message.includes("For security purposes, you can only request this after")) {
                // Extract the seconds from the error message
                const secondsMatch = signUpError.message.match(/(\d+) seconds/);
                const seconds = secondsMatch ? parseInt(secondsMatch[1]) : 60;
                
                setRateLimit(true);
                setRateLimitTime(seconds);
                
                // Start a countdown timer to show the user when they can try again
                let countdown = seconds;
                const timer = setInterval(() => {
                  countdown -= 1;
                  setRateLimitTime(countdown);
                  
                  if (countdown <= 0) {
                    clearInterval(timer);
                    setRateLimit(false);
                    toast.success("You can try again now!");
                  }
                }, 1000);
                
                toast.error(`Rate limited: Please wait ${seconds} seconds before trying again`);
              } else {
                throw signUpError;
              }
            } else {
              // Also create a profile entry for the test user
              if (signUpData?.user) {
                await supabase.from('profiles').upsert({
                  id: signUpData.user.id,
                  full_name: "Test User",
                  username: "testuser",
                });
              }
              toast.success("Test account created! Try logging in again.");
            }
          } catch (createError: any) {
            toast.error(`Failed to create test account: ${createError.message}`);
          } finally {
            setCreatingTestUser(false);
          }
        }
      } else if (error.message === "Invalid login credentials" && 
                data.email === TEST_EMAIL && 
                data.password === TEST_PASSWORD) {
        // Special case for test credentials
        toast.error("Test user does not exist. Creating test account...");
        try {
          setCreatingTestUser(true);
          // Create test user
          const { error: signUpError, data: signUpData } = await supabase.auth.signUp({
            email: TEST_EMAIL.toLowerCase(),
            password: TEST_PASSWORD,
            options: {
              data: {
                full_name: "Test User",
              },
            }
          });
          
          if (signUpError) {
            // Check for rate limit error
            if (signUpError.message.includes("For security purposes, you can only request this after")) {
              // Extract the seconds from the error message
              const secondsMatch = signUpError.message.match(/(\d+) seconds/);
              const seconds = secondsMatch ? parseInt(secondsMatch[1]) : 60;
              
              setRateLimit(true);
              setRateLimitTime(seconds);
              
              // Start a countdown timer to show the user when they can try again
              let countdown = seconds;
              const timer = setInterval(() => {
                countdown -= 1;
                setRateLimitTime(countdown);
                
                if (countdown <= 0) {
                  clearInterval(timer);
                  setRateLimit(false);
                  toast.success("You can try again now!");
                }
              }, 1000);
              
              toast.error(`Rate limited: Please wait ${seconds} seconds before trying again`);
            } else {
              throw signUpError;
            }
          } else {
            // Also create a profile entry for the test user
            if (signUpData?.user) {
              await supabase.from('profiles').upsert({
                id: signUpData.user.id,
                full_name: "Test User",
                username: "testuser",
              });
              toast.success("Test account created! Try logging in again.");
            }
          }
        } catch (createError: any) {
          toast.error(`Failed to create test account: ${createError.message}`);
        } finally {
          setCreatingTestUser(false);
        }
      } else {
        toast.error(error.message || "Error signing in");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const useTestCredentials = () => {
    form.setValue("email", TEST_EMAIL);
    form.setValue("password", TEST_PASSWORD);
    form.handleSubmit(onSubmit)();
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>SRM Email</FormLabel>
              <FormControl>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="student@srmist.edu.in"
                    className="pl-10"
                    {...field}
                  />
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Password</FormLabel>
              <FormControl>
                <div className="relative">
                  <KeyRound className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="password"
                    placeholder="••••••••"
                    className="pl-10"
                    {...field}
                  />
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <Button 
          type="submit" 
          className="w-full" 
          disabled={isLoading || creatingTestUser || rateLimit}
        >
          {isLoading ? "Signing in..." : 
           creatingTestUser ? "Creating test account..." : 
           rateLimit ? `Rate limited (${rateLimitTime}s)` : "Sign In"}
        </Button>
        
        <Button 
          type="button" 
          variant="outline" 
          className="w-full mt-2" 
          onClick={useTestCredentials}
          disabled={isLoading || creatingTestUser || rateLimit}
        >
          Use Test Credentials
        </Button>

        <div className="text-center text-sm text-muted-foreground mt-2">
          <p>Test credentials: {TEST_EMAIL} / {TEST_PASSWORD}</p>
        </div>
      </form>
    </Form>
  );
};

export default LoginForm;
