
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

const SUPABASE_URL = "https://egkrkqkhujphdmrydgps.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVna3JrcWtodWpwaGRtcnlkZ3BzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDEzNTA0ODgsImV4cCI6MjA1NjkyNjQ4OH0.3wpjLU_Krb7KLBBKwJ8QzWnyUHWBS58emqD4FCylIb8";

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY);
