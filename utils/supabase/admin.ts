import { createClient } from '@supabase/supabase-js';

export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!, // ¡Asegúrate de tener esto en .env.local!
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  );
}