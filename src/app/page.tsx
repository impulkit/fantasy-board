import { createClient } from "@supabase/supabase-js";
import Link from "next/link";

export const dynamic = 'force-dynamic';

async function getLeaderboard() {
    try {
        if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
            return [];
        }

        const supabase = createClient(
            process.env.SUPABASE_URL,
            process.env.SUPABASE_SERVICE_ROLE_KEY,
            { auth: { persistSession: false } }
        );

        const { data, error } = await supabase
            .from("leaderboard_cache")
            .select("*, fantasy_teams(*)")
            .order("total_points", { ascending: false });

        if (error) {
            console.error("Leaderboard fetch error:", error.message);
            return [];
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
        return [];
    }
}

async function getRecentMatches() {
    try {
        const supabase = createClient(
            process.env.SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!,
            { auth: { persistSession: false } }
        );

        // Fetch last 3 completed matches
        const { data } = await supabase
            .from("matches")
            .select("*")
            .eq("status", "Match Ended")
            .order("completed_at", { ascending: false })
            .limit(3);

        return data || [];
    } catch (e) {
        return [];
    }
}

function getAvatar(name: string) {
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random&color=fff&size=128`;
}

export default async function LeaderboardPage() {
    const leaderboard = await getLeaderboard();
    const recentMatches = await getRecentMatches();

    const top3 = leaderboard.slice(0, 3);
    const rest = leaderboard.slice(3);

    // Reorder for podium: 2nd, 1st, 3rd
    const podium = [top3[1], top3[0], top3[2]].filter(Boolean);

    return (
        <main className="min-h-screen p-4 pb-20 md:p-8 max-w-5xl mx-auto space-y-12">
            {/* Header */}
            <header className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                    <span className="text-4xl filter drop-shadow-lg">🏏</span>
                    <div>
                        <h1 className="text-3xl font-extrabold tracking-tight text-white">
                            Fantasy <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400">Board</span>
                        </h1>
                        <p className="text-sm text-slate-400 font-medium">T20 World Cup 2026</p>
                    </div>
                </div>
                <div className="flex gap-3">
                    <Link href="/stats/ranks" className="px-4 py-2 text-xs font-bold uppercase tracking-wider text-slate-400 hover:text-white transition-colors bg-white/5 hover:bg-white/10 rounded-lg flex items-center gap-2">
                        <span>📊</span> Stats
                    </Link>
                    <Link href="/admin" className="px-4 py-2 text-xs font-bold uppercase tracking-wider text-slate-400 hover:text-white transition-colors bg-white/5 hover:bg-white/10 rounded-lg">
                        Admin
                    </Link>
                </div>
            </header>

            {/* Podium Section */}
            {leaderboard.length > 0 ? (
                <section className="relative mt-8">
                    <div className="grid grid-cols-3 gap-4 items-end max-w-3xl mx-auto">
                        {podium.map((team, index) => {
                            // 1st place is center (index 1 in our reordered array)
                            const isFirst = index === 1;
                            const isSecond = index === 0;
                            const isThird = index === 2;

                            let rank = 0;
                            let heightClass = "";
                            let gradientBorder = "";
                            let glowColor = "";

                            if (isFirst) { rank = 1; heightClass = "h-48"; gradientBorder = "from-yellow-300 to-yellow-600"; glowColor = "shadow-yellow-500/20"; }
                            if (isSecond) { rank = 2; heightClass = "h-40"; gradientBorder = "from-slate-300 to-slate-500"; glowColor = "shadow-slate-500/20"; }
                            if (isThird) { rank = 3; heightClass = "h-36"; gradientBorder = "from-amber-600 to-amber-800"; glowColor = "shadow-amber-700/20"; }

                            return (
                                <Link href={`/team/${team?.teamId}`} key={team?.teamId} className="group relative flex flex-col items-center">
                                    <div className={`relative z-10 mb-4 transition-transform duration-300 group-hover:-translate-y-2 ${isFirst ? 'scale-110' : 'scale-90'}`}>
                                        <div className={`absolute inset-0 rounded-full blur-xl opacity-40 bg-gradient-to-tr ${gradientBorder}`}></div>
                                        <img
                                            src={getAvatar(team?.owner)}
                                            alt={team?.owner}
                                            className={`relative w-20 h-20 rounded-full border-4 border-slate-900 object-cover shadow-2xl ring-2 ring-offset-4 ring-offset-slate-900 ring-transparent group-hover:ring-white/20 transition-all`}
                                        />
                                        <div className={`absolute -bottom-2 -right-2 w-8 h-8 flex items-center justify-center rounded-full font-bold text-slate-900 text-sm shadow-lg bg-gradient-to-br ${gradientBorder}`}>
                                            {rank}
                                        </div>
                                    </div>

                                    <div className={`w-full ${heightClass} bg-slate-800/50 backdrop-blur-md rounded-t-2xl border-x border-t border-white/5 flex flex-col items-center justify-end pb-6 px-2 hover:bg-slate-800/80 transition-colors`}>
                                        <div className="text-center">
                                            <h3 className={`font-bold text-white text-sm md:text-base leading-tight mb-1 truncate w-full ${isFirst ? 'text-lg' : ''}`}>
                                                {team?.teamName}
                                            </h3>
                                            <p className="text-xs text-slate-400 uppercase tracking-wider mb-2">{team?.owner}</p>
                                            <div className={`font-black text-2xl md:text-3xl tabular-nums tracking-tight bg-clip-text text-transparent bg-gradient-to-b ${gradientBorder}`}>
                                                {team?.points.toLocaleString()}
                                            </div>
                                        </div>
                                    </div>
                                </Link>
                            );
                        })}
                    </div>
                </section>
            ) : (
                <div className="text-center py-20 text-slate-500">
                    <div className="text-6xl mb-4">🏆</div>
                    <p>No scores yet. Sync matches to start the league!</p>
                </div>
            )}

            {/* Full Leaderboard List */}
            {rest.length > 0 && (
                <section className="space-y-4">
                    <h2 className="text-sm font-bold uppercase tracking-widest text-slate-500 px-2">League Standings</h2>
                    <div className="glass-panel overflow-hidden">
                        {rest.map((row) => (
                            <Link href={`/team/${row.teamId}`} key={row.teamId} className="flex items-center p-4 border-b border-white/5 hover:bg-white/5 transition-colors group">
                                <div className="w-8 text-center font-bold text-slate-500 text-sm">
                                    {row.rank}
                                </div>
                                <div className="ml-4">
                                    <div className="w-10 h-10 rounded-full bg-slate-700 overflow-hidden relative">
                                        <img src={getAvatar(row.owner)} alt={row.owner} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
                                    </div>
                                </div>
                                <div className="ml-4 flex-1">
                                    <h3 className="font-bold text-white group-hover:text-indigo-400 transition-colors">{row.teamName}</h3>
                                    <p className="text-xs text-slate-400">{row.owner}</p>
                                </div>
                                <div className="text-right">
                                    <div className="font-bold text-xl text-white tabular-nums">{row.points.toLocaleString()}</div>
                                    <div className="text-xs text-slate-500">pts</div>
                                </div>
                            </Link>
                        ))}
                    </div>
                </section>
            )}

            {/* Recent Activity */}
            {recentMatches.length > 0 && (
                <section className="space-y-4">
                    <h2 className="text-sm font-bold uppercase tracking-widest text-slate-500 px-2">Recent Matches</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {recentMatches.map((match: any) => (
                            <div key={match.api_match_id} className="glass-panel p-4 hover:border-white/20 transition-colors">
                                <div className="text-xs text-slate-400 mb-2 truncate">{new Date(match.start_time).toLocaleDateString()}</div>
                                <div className="flex justify-between items-center mb-3">
                                    <div className="font-bold">{match.team_a}</div>
                                    <div className="text-xs text-slate-500 px-2">vs</div>
                                    <div className="font-bold text-right">{match.team_b}</div>
                                </div>
                                <div className="text-xs text-emerald-400 font-medium truncate border-t border-white/5 pt-2">
                                    {match.result || "Match Completed"}
                                </div>
                            </div>
                        ))}
                    </div>
                </section>
            )}

            <footer className="text-center text-xs text-slate-600 mt-20">
                Last updated: {leaderboard[0]?.lastUpdated ? new Date(leaderboard[0].lastUpdated).toLocaleString() : "Never"}
            </footer>
        </main>
    );
}