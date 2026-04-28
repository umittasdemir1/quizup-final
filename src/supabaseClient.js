import { createClient } from '@supabase/supabase-js';
import { supabaseConfig } from './config.js';

export const supabase = createClient(
  supabaseConfig.url,
  supabaseConfig.publishableKey,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true
    }
  }
);

window.supabase = supabase;

