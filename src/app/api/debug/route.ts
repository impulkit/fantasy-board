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

        // 6. Sample player_match_points (actual per-player scores)
        const { data: pmpSample } = await supabase
            .from("player_match_points")
            .select("api_match_id, api_player_id, points")
            .neq("api_match_id", "seed-match-1")
            .neq("api_match_id", "seed-match-2")
            .neq("api_match_id", "seed-match-3")
            .gt("points", 0)
            .limit(20);

        // 7. Get a sample match ID to fetch raw scorecard
        const sampleApiMatchId = tmpData && tmpData.length > 0
            ? tmpData.find((t: any) => !t.api_match_id.startsWith("seed-"))?.api_match_id
            : null;

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
            teamMatchPoints: tmpData?.slice(0, 10),
            teamMatchPointsError: tmpErr,
            playerMatchPointsSample: pmpSample,
            sampleApiMatchId,
        });
    } catch (e: any) {
        return NextResponse.json({ error: e.message });
    }
}
