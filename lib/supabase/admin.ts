import { createClient } from "@supabase/supabase-js";
import { getSupabaseServiceRoleKey, getSupabaseUrl } from "./config";

export const supabaseAdmin = createClient(getSupabaseUrl(), getSupabaseServiceRoleKey(), {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});
