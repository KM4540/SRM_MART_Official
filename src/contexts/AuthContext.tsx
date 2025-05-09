import { createContext, useContext, useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { AuthChangeEvent, Session, User } from "@supabase/supabase-js";

interface AuthContextType {
  user: User | null;
  profile: any | null;
  session: Session | null;
  signInWithGoogle: () => Promise<void>;
  signInWithEmailPassword: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  loading: boolean;
  updateProfile: (data: any) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Constants
const ALLOWED_EMAIL_DOMAIN = "srmist.edu.in";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<any | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const lastAuthEventRef = useRef<{type: string, time: number}>({type: '', time: 0});
  const isInitialLoadRef = useRef(true);
  const navigate = useNavigate();

  useEffect(() => {
    // Set up initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        // Validate the email domain
        if (!isValidEmailDomain(session.user.email)) {
          // If invalid domain, sign the user out
          handleInvalidDomain();
          return;
        }
        
        setSession(session);
        setUser(session.user);
        fetchProfile(session.user.id);
      } else {
        setSession(null);
        setUser(null);
        setLoading(false);
      }
    });

    // Flag to track if we've shown a sign-in notification in this session
    let hasShownSignInNotification = false;

    // Set up listener for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event: AuthChangeEvent, currentSession: Session | null) => {
        console.log(`Auth state change: ${event}`, { isInitialLoad: isInitialLoadRef.current });
        
        if (currentSession?.user) {
          // Validate the email domain on auth state changes too
          if (!isValidEmailDomain(currentSession.user.email)) {
            // If invalid domain, sign the user out
            handleInvalidDomain();
            return;
          }
          
          setSession(currentSession);
          setUser(currentSession.user);
          fetchProfile(currentSession.user.id);
        } else {
          setSession(null);
          setUser(null);
          setProfile(null);
          setLoading(false);
        }

        // Always skip TOKEN_REFRESHED events which happen frequently and don't need notifications
        if (event === 'TOKEN_REFRESHED') {
          console.log('Skipping notification for TOKEN_REFRESHED event');
          return;
        }
        
        // Skip all notifications on initial load - they'll be distracting
        if (isInitialLoadRef.current) {
          console.log(`Skipping notification for ${event} during initial load`);
          isInitialLoadRef.current = false;
          return;
        }

        // Handle auth events with improved debounce to prevent duplicate toasts
        const now = Date.now();
        const lastEvent = lastAuthEventRef.current;
        const isDuplicate = (
          event === lastEvent.type && 
          now - lastEvent.time < 10000 // Increased to 10 seconds to prevent frequent notifications
        );
        
        if (!isDuplicate) {
          lastAuthEventRef.current = {type: event, time: now};
          
          switch (event) {
            case 'SIGNED_IN':
              // Only show sign-in notification once per session/component mount
              if (!hasShownSignInNotification) {
                hasShownSignInNotification = true;
                // Uncomment below line if you ever want to re-enable sign-in notifications
                // toast.success("Signed in successfully");
                console.log("Auth event: SIGNED_IN (notification suppressed)");
              } else {
                console.log("Suppressed duplicate SIGNED_IN notification");
              }
              break;
            case 'SIGNED_OUT':
              // Reset the flag when user signs out
              hasShownSignInNotification = false;
              toast.info("Signed out");
              break;
            case 'USER_UPDATED':
              toast.success("Profile updated");
              break;
          }
        } else {
          console.log(`Skipped duplicate notification for ${event}`, 
            { timeSinceLastEvent: now - lastEvent.time });
        }
      }
    );

    // Cleanup
    return () => {
      subscription.unsubscribe();
    };
  }, [navigate]);

  // Helper function to check if email domain is valid
  const isValidEmailDomain = (email?: string | null): boolean => {
    if (!email) return false;
    const lowerEmail = email.toLowerCase();
    // Allow SRMIST domain or test accounts
    return (
      lowerEmail.endsWith(`@${ALLOWED_EMAIL_DOMAIN}`) ||
      lowerEmail === 'admin@test.com' ||
      lowerEmail === 'user@test.com'
    );
  };

  // Handle invalid domain sign in attempts
  const handleInvalidDomain = async () => {
    toast.error(`Only @${ALLOWED_EMAIL_DOMAIN} email addresses or test accounts (admin@test.com, user@test.com) are allowed`);
    await supabase.auth.signOut();
    setSession(null);
    setUser(null);
    setProfile(null);
    setLoading(false);
    navigate('/auth');
  };

  async function fetchProfile(userId: string) {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        throw error;
      }

      setProfile(data);
    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      setLoading(false);
    }
  }

  async function signInWithGoogle() {
    try {
      setLoading(true);
      console.log("Starting Google sign in...");
      
      // Get the current origin and ensure it's properly formatted
      const origin = window.location.origin;
      const redirectTo = `${origin}/auth/callback`;
      
      console.log("Using redirect URL:", redirectTo);
      
      // Check if we're coming from a sign-out
      const isPostSignOut = new URLSearchParams(window.location.search).get('fresh') === 'true';
      
      if (isPostSignOut) {
        // Clear any existing sessions first
        await supabase.auth.signOut();
        
        // Clear any stored OAuth state
        localStorage.removeItem('supabase.auth.token');
        localStorage.removeItem('supabase.auth.refreshToken');
        
        // Force a completely fresh login by directly redirecting to Google OAuth
        const state = Math.random().toString(36).substring(2);
        localStorage.setItem('oauth_state', state);
        
        window.location.href = `https://sldtztnpjemxbyzwkgem.supabase.co/auth/v1/authorize?` +
          `provider=google` +
          `&prompt=select_account` +
          `&hd=${ALLOWED_EMAIL_DOMAIN}` +
          `&redirect_to=${encodeURIComponent(redirectTo)}` +
          `&state=${state}` +
          `&skip_http_redirect=true`;
        return;
      }
      
      // For normal sign in flow
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectTo,
          queryParams: {
            hd: ALLOWED_EMAIL_DOMAIN,
            prompt: "select_account",
            access_type: "offline",
          }
        },
      });

      if (error) {
        console.error("Google sign in error:", error);
        if (error.message.includes("Unexpected failure")) {
          toast.error("Authentication service is temporarily unavailable. Please try again later.");
        } else {
          toast.error(error.message || "Error signing in with Google");
        }
        throw error;
      }
      
      console.log("Google sign in successful, redirecting...");
    } catch (error: any) {
      console.error("Sign in with Google error:", error);
      if (error.message.includes("Unexpected failure")) {
        toast.error("Authentication service is temporarily unavailable. Please try again later.");
      } else {
        toast.error(error.message || "Error signing in with Google");
      }
      throw error;
    } finally {
      setLoading(false);
    }
  }

  async function signInWithEmailPassword(email: string, password: string) {
    try {
      setLoading(true);
      
      // Special exception for test accounts
      const isTestAccount = email === 'admin@test.com' || email === 'user@test.com';
      
      // For non-test accounts, enforce the SRM domain restriction
      if (!isTestAccount && !isValidEmailDomain(email)) {
        toast.error(`Only @${ALLOWED_EMAIL_DOMAIN} email addresses are allowed (or test accounts)`);
        return;
      }
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });
      
      if (error) {
        console.error("Email sign in error:", error);
        toast.error(error.message || "Invalid email or password");
        throw error;
      }
      
      if (data.user) {
        setSession(data.session);
        setUser(data.user);
        fetchProfile(data.user.id);
        return;
      }
    } catch (error: any) {
      console.error("Sign in with email error:", error);
      throw error;
    } finally {
      setLoading(false);
    }
  }

  async function signOut() {
    try {
      // Clear any stored OAuth state first
      localStorage.removeItem('supabase.auth.token');
      localStorage.removeItem('supabase.auth.refreshToken');
      localStorage.removeItem('oauth_state');
      
      await supabase.auth.signOut();
      setSession(null);
      setUser(null);
      setProfile(null);
      navigate('/');
    } catch (error: any) {
      console.error('Error signing out:', error);
      toast.error(error.message || 'Error signing out');
    }
  }

  async function updateProfile(data: any) {
    try {
      setLoading(true);

      if (!user) {
        throw new Error("User not authenticated");
      }

      // Create a copy of the data without the full_name field
      const { full_name, ...updateData } = data;

      // Update profile in the profiles table
      const { error } = await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          ...updateData,
          updated_at: new Date().toISOString(),
        });

      if (error) {
        throw error;
      }

      // Refresh the profile data
      await fetchProfile(user.id);
      
      toast.success("Profile updated successfully");
    } catch (error: any) {
      toast.error(error.message || "Error updating profile");
    } finally {
      setLoading(false);
    }
  }

  const value = {
    user,
    profile,
    session,
    signInWithGoogle,
    signInWithEmailPassword,
    signOut,
    loading,
    updateProfile,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
