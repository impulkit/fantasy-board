import { createClient } from "@supabase/supabase-js";
import Link from "next/link";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

interface TeamPoint {
    teamId: number;
    teamName: string;
    points: number;
    manualAdjustment: number;
    total: number;
    rank: number;
}

interface DateRank {
    date: string;
    teams: TeamPoint[];
}

async function getRankHistory() {
    const supabase = createClient(
        process.env.SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        { auth: { persistSession: false } }
    );

    // 1. Get all teams
    const { data: teams, error: tErr } = await supabase
        .from("fantasy_teams")
        .select("id, team_name, manual_adjustment_points");

    if (tErr) throw new Error(tErr.message);

    // 2. Get all match points
    const { data: matches, error: mErr } = await supabase
        .from("team_match_points")
        .select(`
            points,
            fantasy_team_id,
            matches (
                api_match_id,
                match_date,
                start_time
            )
        `)
        .order("matches(start_time)", { ascending: true }); // Supabase join sort might need raw execution or client sort

    if (mErr) throw new Error(mErr.message);

    // 3. Process Client Side
    // Sort matches by time
    const sortedPoints = (matches || [])
        .map((m: any) => ({
            teamId: m.fantasy_team_id,
            points: Number(m.points),
            date: m.matches?.match_date,
            timestamp: new Date(m.matches?.start_time).getTime()
        }))
        .sort((a, b) => a.timestamp - b.timestamp);

    // Group by Date
    const dates = Array.from(new Set(sortedPoints.map(p => p.date))).sort();

    // Calculate cumulative ranks for each date
    const history: DateRank[] = [];

    // Initialize current totals with manual adjustments (assuming they apply from start)
    const currentTotals = new Map<number, number>();
    const teamMap = new Map<number, { name: string, manual: number }>();

    teams?.forEach(t => {
        teamMap.set(t.id, { name: t.team_name, manual: Number(t.manual_adjustment_points || 0) });
        currentTotals.set(t.id, Number(t.manual_adjustment_points || 0));
    });

    for (const date of dates) {
        // Add points for this date
        const plays = sortedPoints.filter(p => p.date === date);
        for (const p of plays) {
            const current = currentTotals.get(p.teamId) || 0;
            currentTotals.set(p.teamId, current + p.points);
        }

        // Compute Ranks
        const dailyStandings: TeamPoint[] = [];
        for (const [teamId, total] of currentTotals.entries()) {
            dailyStandings.push({
                teamId,
                teamName: teamMap.get(teamId)?.name || `Team ${teamId}`,
                manualAdjustment: teamMap.get(teamId)?.manual || 0,
                points: total - (teamMap.get(teamId)?.manual || 0), // raw points accumulated
                total,
                rank: 0
            });
        }

        // Sort by total DESC
        dailyStandings.sort((a, b) => b.total - a.total);

        // Assign Rank
        dailyStandings.forEach((t, index) => {
            t.rank = index + 1;
        });

        history.push({
            date,
            teams: dailyStandings
        });
    }

    return { dates, history, teams: teams || [] };
}

export default async function RankHistoryPage() {
    const { dates, history, teams } = await getRankHistory();

    // Reverse history for display? No, keep it chronological left-to-right?
    // User asked "week wise dashboard", implying columns.
    // Let's create a table:
    // Header: Date
    // Row: Rank 1, Rank 2, ...
    // Cell: Team Name

    // OR
    // Header: Team
    // Cell: Rank on Date
    // This is better for tracking "who was on which rank".

    // Reformat for "Rank Chart" view
    // Let's use standard leaderboard table but with historical columns.

    // Let's pivot: Row = Team, Col = Date, Value = Rank
    const teamHistory = new Map<number, { name: string, ranks: number[] }>();
    teams.forEach(t => teamHistory.set(t.id, { name: t.team_name, ranks: [] }));

    history.forEach((day) => {
        day.teams.forEach(t => {
            teamHistory.get(t.teamId)?.ranks.push(t.rank);
        });
    });

    // Sort teams by FINAL rank (last day)
    const finalDay = history[history.length - 1];
    const finalRankMap = new Map<number, number>();
    finalDay?.teams.forEach(t => finalRankMap.set(t.teamId, t.rank));

    const sortedTeams = Array.from(teamHistory.values()).sort((a, b) => {
        // Find ID by name? messy. better to use objects.
        return 0;
    });
    // Re-sort using ID from history
    const rows = teams.map(t => ({
        id: t.id,
        name: t.team_name,
        ranks: history.map(h => h.teams.find(x => x.teamId === t.id)?.rank || "-")
    })).sort((a, b) => {
        const rankA = Number(a.ranks[a.ranks.length - 1] || 999);
        const rankB = Number(b.ranks[b.ranks.length - 1] || 999);
        return rankA - rankB;
    });

    return (
        <main className="min-h-screen p-4 pb-20 md:p-8 max-w-7xl mx-auto space-y-8">
            <Link href="/" className="inline-flex items-center text-sm font-medium text-indigo-400 hover:text-indigo-300 transition-colors mb-4 group">
                <span className="mr-2 group-hover:-translate-x-1 transition-transform">←</span> Back to Leaderboard
            </Link>

            <header className="glass-panel p-6">
                <h1 className="text-3xl font-extrabold text-white mb-2">Rank History</h1>
                <p className="text-slate-400">Daily breakdown of team rankings based on cumulative points.</p>
                <div className="mt-2 text-xs text-amber-500 bg-amber-500/10 p-2 rounded border border-amber-500/20 inline-block">
                    Note: Data is calculated from available match results. Missing matches will affect historical accuracy.
                </div>
            </header>

            <div className="glass-panel overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="border-b border-white/10 bg-white/5">
                            <th className="p-4 text-xs font-bold text-slate-400 uppercase tracking-widest sticky left-0 bg-slate-900/95 backdrop-blur z-10">Team</th>
                            {dates.map(date => (
                                <th key={date} className="p-4 text-xs font-bold text-slate-400 uppercase tracking-widest text-center whitespace-nowrap">
                                    {new Date(date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        {rows.map((row) => (
                            <tr key={row.id} className="hover:bg-white/5 transition-colors">
                                <td className="p-4 font-bold text-white sticky left-0 bg-slate-900/95 backdrop-blur z-10 border-r border-white/5 truncate max-w-[150px] md:max-w-xs">
                                    <div className="flex items-center gap-2">
                                        <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${row.ranks[row.ranks.length - 1] === 1 ? 'bg-yellow-500 text-slate-900' :
                                                row.ranks[row.ranks.length - 1] === 2 ? 'bg-slate-300 text-slate-900' :
                                                    row.ranks[row.ranks.length - 1] === 3 ? 'bg-orange-700 text-white' : 'bg-slate-800 text-slate-500'
                                            }`}>
                                            {row.ranks[row.ranks.length - 1]}
                                        </span>
                                        {row.name}
                                    </div>
                                </td>
                                {row.ranks.map((rank, i) => (
                                    <td key={i} className="p-4 text-center">
                                        <div className={`mx-auto w-8 h-8 flex items-center justify-center rounded-lg font-bold text-sm transition-all ${rank === 1 ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30' :
                                                rank === 2 ? 'bg-slate-300/20 text-slate-300 border border-slate-300/30' :
                                                    rank === 3 ? 'bg-orange-700/20 text-orange-400 border border-orange-700/30' :
                                                        'text-slate-600'
                                            }`}>
                                            {rank}
                                        </div>
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </main>
    );
}
