import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

// server-side client (service key, never expose in frontend)
export const supabase = createClient(supabaseUrl, supabaseKey);

