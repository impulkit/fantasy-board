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

        // 1. Leaderboard cache
        const { data: cache, error: cacheErr } = await supabase.from("leaderboard_cache").select("*");
        const { data: teams, error: teamsErr } = await supabase.from("fantasy_teams").select("*");

        // 2. Roster player IDs (from seed)
        const { data: roster } = await supabase
            .from("fantasy_team_players")
            .select("fantasy_team_id, api_player_id, is_captain, is_vicecaptain")
            .limit(200);

        const rosterPlayerIds = [...new Set((roster || []).map((r: any) => r.api_player_id))].sort();

        // 3. Synced player IDs (from API)
        const { data: syncedPlayers } = await supabase
            .from("player_match_points")
            .select("api_player_id")
            .limit(500);

        const syncedPlayerIds = [...new Set((syncedPlayers || []).map((p: any) => p.api_player_id))].sort();

        // 4. Find mismatches
        const inRosterNotSynced = rosterPlayerIds.filter((id: string) => !syncedPlayerIds.includes(id));
        const inSyncedNotRoster = syncedPlayerIds.filter((id: string) => !rosterPlayerIds.includes(id));

        // 5. Team match points
        const { data: tmpData, error: tmpErr } = await supabase
            .from("team_match_points")
            .select("fantasy_team_id, api_match_id, points")
            .order("fantasy_team_id")
            .limit(200);

        return NextResponse.json({
            env: {
                url: !!process.env.SUPABASE_URL,
                key: !!process.env.SUPABASE_SERVICE_ROLE_KEY
            },
            cache,
            cacheError: cacheErr,
            teams,
            teamsError: teamsErr,
            playerIdAnalysis: {
                rosterPlayerIds,
                syncedPlayerIds: syncedPlayerIds.slice(0, 50),
                inRosterNotSynced,
                inSyncedNotRoster: inSyncedNotRoster.slice(0, 50),
                rosterCount: rosterPlayerIds.length,
                syncedCount: syncedPlayerIds.length,
                mismatchCount: inRosterNotSynced.length,
            },
            teamMatchPoints: tmpData,
            teamMatchPointsError: tmpErr,
        });
    } catch (e: any) {
        return NextResponse.json({ error: e.message });
    }
}
