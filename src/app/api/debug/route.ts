import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

export async function GET() {
    try {
        const supabase = createClient(
            process.env.SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!,
            { auth: { persistSession: false } }
        );

        // 1. Check Fetch
        const { data: cache, error: cacheErr } = await supabase.from("leaderboard_cache").select("*");
        const { data: teams, error: teamsErr } = await supabase.from("fantasy_teams").select("*");

        // 2. Check Join
        const { data: joined, error: joinErr } = await supabase
            .from("leaderboard_cache")
            .select("*, fantasy_teams(*)");

        return NextResponse.json({
            env: {
                url: !!process.env.SUPABASE_URL,
                key: !!process.env.SUPABASE_SERVICE_ROLE_KEY
            },
            cache,
            cacheError: cacheErr,
            teams,
            teamsError: teamsErr,
            joined,
            joinedError: joinErr
        });
    } catch (e: any) {
        return NextResponse.json({ error: e.message });
    }
}
