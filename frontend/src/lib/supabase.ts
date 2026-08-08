import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as
  | string
  | undefined;

// Supabase is only used for Realtime push notifications on the admin order
// screens, and it is optional: those screens poll as their baseline refresh.
// Creating a client against a blank/placeholder URL makes the browser retry a
// websocket forever and floods the console, so stay null unless it is set up.
const isConfigured =
  !!supabaseUrl &&
  !!supabaseKey &&
  /^https?:\/\//.test(supabaseUrl) &&
  !supabaseUrl.includes("your-project");

export const supabase = isConfigured
  ? createClient(supabaseUrl, supabaseKey)
  : null;
