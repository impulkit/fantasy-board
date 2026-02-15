import { createClient, SupabaseClient } from "@supabase/supabase-js";

let _client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient | null {
    if (_client) return _client;
    try {
        const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
        const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
        if (!url || !key) return null;
        _client = createClient(url, key);
        return _client;
    } catch (e) {
        console.error("Supabase client init failed:", e);
        return null;
    }
}

// backwards compat — will be null during SSR/prerender if env vars are missing
export const supabase = typeof window !== "undefined" ? getSupabase() : null;
