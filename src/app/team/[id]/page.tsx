import { createClient } from "@supabase/supabase-js";
import Link from "next/link";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

// Types
interface PlayerContribution {
    playerId: string;
    name: string;
    role: "BAT" | "BOWL" | "AR" | "WK" | string;
    isCaptain: boolean;
    isViceCaptain: boolean;
    totalPoints: number; // Raw points from matches
    contributedPoints: number; // After multiplier
}

interface TeamDetails {
    id: number;
    teamName: string;
    owner: string;
    totalPoints: number;
    players: PlayerContribution[];
    lastUpdated: string | null;
}

// Fetch Data
async function getTeamDetails(teamId: number): Promise<TeamDetails | null> {
    const supabase = createClient(
        process.env.SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        { auth: { persistSession: false } }
    );

    // 1. Get Team Info
    const { data: team, error: teamErr } = await supabase
        .from("fantasy_teams")
        .select("id, team_name, owner")
        .eq("id", teamId)
        .single();

    if (teamErr || !team) return null;

    // 2. Get Roster
    const { data: roster, error: rosterErr } = await supabase
        .from("fantasy_team_players")
        .select("api_player_id, is_captain, is_vicecaptain, players(display_name)")
        .eq("fantasy_team_id", teamId);

    if (rosterErr) {
        console.error("Roster fetch error:", rosterErr);
        return null;
    }

    // 3. Get Points for these players
    // Note: Ideally we filter by match date vs effective_from, but for v1 we sum all points
    const playerIds = roster.map((r) => r.api_player_id);
    const { data: points, error: pointsErr } = await supabase
        .from("player_match_points")
        .select("api_player_id, points")
        .in("api_player_id", playerIds);

    if (pointsErr) console.error("Points fetch error:", pointsErr);

    // 4. Aggregate
    const playerPointsMap = new Map<string, number>();
    points?.forEach((p) => {
        const current = playerPointsMap.get(p.api_player_id) || 0;
        playerPointsMap.set(p.api_player_id, current + Number(p.points));
    });

    const players: PlayerContribution[] = roster.map((r: any) => {
        const rawPoints = playerPointsMap.get(r.api_player_id) || 0;
        let multiplier = 1;
        if (r.is_captain) multiplier = 2;
        if (r.is_vicecaptain) multiplier = 1.5;

        return {
            playerId: r.api_player_id,
            name: r.players?.display_name || r.api_player_id,
            role: "PLAYER", // We didn't store role in DB yet, unfortunately! Only in Excel.
            isCaptain: r.is_captain,
            isViceCaptain: r.is_vicecaptain,
            totalPoints: rawPoints,
            contributedPoints: rawPoints * multiplier,
        };
    });

    // Sort by contributed points desc
    players.sort((a, b) => b.contributedPoints - a.contributedPoints);

    // Calculate team total from players (sanity check vs cache)
    const teamTotal = players.reduce((sum, p) => sum + p.contributedPoints, 0);

    return {
        id: team.id,
        teamName: team.team_name,
        owner: team.owner,
        totalPoints: teamTotal,
        players,
        lastUpdated: new Date().toISOString(), // In real app, get from sync_state or cache
    };
}

export default async function TeamPage({ params }: { params: { id: string } }) {
    const teamId = parseInt(params.id);
    if (isNaN(teamId)) return notFound();

    const team = await getTeamDetails(teamId);
    if (!team) return notFound();

    return (
        <main className="min-h-screen p-4 md:p-8 max-w-4xl mx-auto">
            <div className="mb-6">
                <Link href="/" className="text-secondary hover:underline">
                    &larr; Back to Leaderboard
                </Link>
            </div>

            <header className="glass-panel p-6 mb-8 flex flex-col md:flex-row justify-between items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold gradient-text mb-2">{team.teamName}</h1>
                    <p className="text-gray-400">Owner: <span className="text-white">{team.owner}</span></p>
                </div>
                <div className="text-right">
                    <div className="text-sm text-gray-400 uppercase tracking-widest">Total Points</div>
                    <div className="text-4xl font-black text-primary">{team.totalPoints.toLocaleString()}</div>
                </div>
            </header>

            <section className="glass-panel overflow-hidden">
                <div className="p-4 border-b border-white/5 flex justify-between items-center">
                    <h2 className="text-xl font-semibold text-white">Squad</h2>
                    <span className="text-xs text-secondary">
                        Last Updated: {new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })} IST
                    </span>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-white/5 text-left text-xs uppercase tracking-wider text-gray-400">
                            <tr>
                                <th className="p-4">Player</th>
                                <th className="p-4 text-center">Role</th>
                                <th className="p-4 text-right">Match Pts</th>
                                <th className="p-4 text-right">Multiplier</th>
                                <th className="p-4 text-right">Total</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {team.players.map((player) => {
                                let rowClass = "hover:bg-white/5 transition-colors border-b border-white/5 last:border-0";
                                let nameClass = "font-medium text-white";
                                let badge = null;

                                if (player.isCaptain) {
                                    rowClass += " bg-blue-500/10 hover:bg-blue-500/20";
                                    nameClass = "font-bold text-blue-400";
                                    badge = <span className="ml-2 px-2 py-0.5 rounded bg-blue-500/20 text-blue-400 text-xs font-bold border border-blue-500/30">C</span>;
                                } else if (player.isViceCaptain) {
                                    rowClass += " bg-green-500/10 hover:bg-green-500/20";
                                    nameClass = "font-bold text-green-400";
                                    badge = <span className="ml-2 px-2 py-0.5 rounded bg-green-500/20 text-green-400 text-xs font-bold border border-green-500/30">VC</span>;
                                }

                                return (
                                    <tr key={player.playerId} className={rowClass}>
                                        <td className={`p-4 ${nameClass}`}>
                                            {player.name}
                                            {badge}
                                        </td>
                                        <td className="p-4 text-center text-gray-400 text-sm">
                                            {player.role === "PLAYER" ? "—" : player.role}
                                        </td>
                                        <td className="p-4 text-right text-gray-300">
                                            {player.totalPoints}
                                        </td>
                                        <td className="p-4 text-right text-gray-400 text-sm">
                                            {player.isCaptain ? "2x" : player.isViceCaptain ? "1.5x" : "1x"}
                                        </td>
                                        <td className={`p-4 text-right font-bold ${player.isCaptain ? 'text-blue-400' : player.isViceCaptain ? 'text-green-400' : 'text-primary'}`}>
                                            {player.contributedPoints}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </section>
        </main>
    );
}
