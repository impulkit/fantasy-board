import { createClient } from "@supabase/supabase-js";

export const revalidate = 30; // ISR: revalidate every 30 seconds

async function getLeaderboard() {
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
        console.warn("Supabase env vars not set — returning empty leaderboard");
        return [];
    }

    const supabase = createClient(
        process.env.SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY,
        { auth: { persistSession: false } }
    );

    const { data, error } = await supabase
        .from("leaderboard_cache")
        .select("total_points, fantasy_team_id, last_updated, fantasy_teams(team_name, owner)")
        .order("total_points", { ascending: false });

    if (error) {
        console.error("Leaderboard fetch error:", error.message);
        return [];
    }

    return (data || []).map((row: any, i: number) => ({
        rank: i + 1,
        teamName: row.fantasy_teams?.team_name ?? `Team #${row.fantasy_team_id}`,
        owner: row.fantasy_teams?.owner ?? "—",
        points: Number(row.total_points || 0),
        lastUpdated: row.last_updated,
    }));
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
        <main className="page-container">
            <header className="page-header animate-in">
                <h1>🏆 Leaderboard</h1>
                <p>Fantasy cricket standings among friends</p>
            </header>

            {leaderboard.length === 0 ? (
                <div className="empty-state animate-in">
                    <div className="empty-icon">📊</div>
                    <p>No scores yet. Sync some matches first!</p>
                </div>
            ) : (
                <div className="table-wrap animate-in">
                    <table>
                        <thead>
                            <tr>
                                <th>Rank</th>
                                <th>Team</th>
                                <th>Owner</th>
                                <th style={{ textAlign: "right" }}>Points</th>
                            </tr>
                        </thead>
                        <tbody>
                            {leaderboard.map((entry) => (
                                <tr key={entry.rank}>
                                    <td>
                                        <span className={getRankClass(entry.rank)}>{entry.rank}</span>
                                    </td>
                                    <td style={{ fontWeight: 600 }}>{entry.teamName}</td>
                                    <td style={{ color: "var(--text-secondary)" }}>{entry.owner}</td>
                                    <td style={{ textAlign: "right" }}>
                                        <span className="points-value">{entry.points.toLocaleString()}</span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </main>
    );
}