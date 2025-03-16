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
    return email.toLowerCase().endsWith(`@${ALLOWED_EMAIL_DOMAIN}`);
  };

  // Handle invalid domain sign in attempts
  const handleInvalidDomain = async () => {
    toast.error(`Only @${ALLOWED_EMAIL_DOMAIN} email addresses are allowed`);
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
      
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
          queryParams: {
            // Add hd parameter to restrict to the srmist.edu.in domain in the OAuth flow
            hd: ALLOWED_EMAIL_DOMAIN,
            // Force Google to always show the account selector
            prompt: "select_account"
          }
        },
      });

      if (error) {
        throw error;
      }
      
      // The redirect happens automatically, so no need to navigate
    } catch (error: any) {
      console.error("Sign in with Google error:", error);
      toast.error(error.message || "Error signing in with Google");
      throw error;
    } finally {
      setLoading(false);
    }
  }

  async function signOut() {
    try {
      // Sign out from Supabase
      await supabase.auth.signOut();
      
      // Clear any local state
      setUser(null);
      setProfile(null);
      setSession(null);
      
      // Show a toast to inform the user
      toast.info("Signed out successfully");
      
      // Navigate back to auth page with a special parameter that ensures a fresh login
      navigate('/auth?fresh=true');
      
    } catch (error: any) {
      toast.error(error.message || "Error signing out");
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
