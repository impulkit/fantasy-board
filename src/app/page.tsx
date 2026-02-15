import { createClient } from "@supabase/supabase-js";
import Link from "next/link";

export const dynamic = 'force-dynamic';

async function getLeaderboard() {
    try {
        if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
            console.warn("Supabase env vars not set — returning empty leaderboard");
            return [];
        }

        const supabase = createClient(
            process.env.SUPABASE_URL,
            process.env.SUPABASE_SERVICE_ROLE_KEY,
            { auth: { persistSession: false } }
        );

        // Simple query that works
        const { data, error } = await supabase
            .from("leaderboard_cache")
            .select("*, fantasy_teams(*)")
            .order("total_points", { ascending: false });

        if (error) {
            console.error("Leaderboard fetch error:", error.message);
            // Return a dummy error row to visualize it on frontend
            return [{
                rank: 0,
                teamId: 0,
                teamName: "Error",
                owner: error.message,
                points: 0,
                lastUpdated: new Date().toISOString()
            }];
        }

        return (data || []).map((row: any, i: number) => ({
            rank: i + 1,
            teamId: row.fantasy_team_id,
            teamName: row.fantasy_teams?.team_name ?? `Team #${row.fantasy_team_id}`,
            owner: row.fantasy_teams?.owner ?? "—",
            points: Number(row.total_points || 0),
            lastUpdated: row.last_updated,
        }));
    } catch (e: any) {
        console.error("Leaderboard error:", e);
        return [{
            rank: 0,
            teamId: 0,
            teamName: "Exception",
            owner: e.message,
            points: 0,
            lastUpdated: new Date().toISOString()
        }];
    }
}

function getRankClass(rank: number) {
    if (rank === 1) return "rank-badge rank-1";
    if (rank === 2) return "rank-badge rank-2";
    if (rank === 3) return "rank-badge rank-3";
    return "rank-badge rank-default";
}

export default async function LeaderboardPage() {
    const leaderboard = await getLeaderboard();

    return (
        <main className="min-h-screen p-4 md:p-8 max-w-4xl mx-auto">
            <header className="flex justify-between items-center mb-8">
                <div className="flex items-center gap-3">
                    <span className="text-4xl">🏏</span>
                    <div>
                        <h1 className="text-2xl font-bold text-white tracking-tight">Fantasy Board</h1>
                        <p className="text-sm text-gray-400">T20 World Cup 2024</p>
                    </div>
                </div>
                <div className="flex gap-4">
                    <Link href="/" className="text-sm font-medium text-white/80 hover:text-white transition-colors">
                        Leaderboard
                    </Link>
                    <Link href="/admin" className="text-sm font-medium text-white/50 hover:text-white transition-colors">
                        Admin
                    </Link>
                </div>
            </header>

            <div className="glass-panel overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-white/5 text-left text-xs uppercase tracking-wider text-gray-400">
                            <tr>
                                <th className="p-4 w-16 text-center">#</th>
                                <th className="p-4">Team</th>
                                <th className="p-4 hidden md:table-cell">Owner</th>
                                <th className="p-4 text-right">Points</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {leaderboard.length === 0 ? (
                                <tr>
                                    <td colSpan={4} className="p-8 text-center text-gray-400">
                                        No scores yet. Sync some matches first!
                                    </td>
                                </tr>
                            ) : (
                                leaderboard.map((row: any) => (
                                    <tr key={row.rank} className="hover:bg-white/5 transition-colors group">
                                        <td className="p-4 text-center">
                                            <span className={getRankClass(row.rank)}>{row.rank}</span>
                                        </td>
                                        <td className="p-4 font-medium text-white">
                                            {row.teamId > 0 ? (
                                                <Link href={`/team/${row.teamId}`} className="hover:text-primary transition-colors hover:underline decoration-primary/50 underline-offset-4">
                                                    {row.teamName}
                                                </Link>
                                            ) : (
                                                <span>{row.teamName}</span>
                                            )}
                                            <div className="md:hidden text-xs text-gray-400 mt-1">{row.owner}</div>
                                        </td>
                                        <td className="p-4 hidden md:table-cell text-gray-300">{row.owner}</td>
                                        <td className="p-4 text-right font-bold text-lg text-primary tabular-nums">
                                            {row.points.toLocaleString()}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            <footer className="mt-8 text-center text-xs text-gray-500">
                Last updated: {leaderboard[0]?.lastUpdated ? new Date(leaderboard[0].lastUpdated).toLocaleString() : "Never"}
            </footer>
        </main>
    );
}