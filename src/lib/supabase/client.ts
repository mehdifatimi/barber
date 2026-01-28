import { createBrowserClient as createSupabaseBrowserClient } from '@supabase/ssr';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Client-side client function for components
export const createBrowserClient = () => createSupabaseBrowserClient(supabaseUrl, supabaseAnonKey);

// Singleton instance
export const supabase = createBrowserClient();
