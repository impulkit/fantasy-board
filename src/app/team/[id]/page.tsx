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
    manualAdjustment: number;
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
        .select("id, team_name, owner, manual_adjustment_points")
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

    // Sort: 1. Captain, 2. Vice Captain, 3. Points DESC
    const players: PlayerContribution[] = roster.map((r: any) => {
        const rawPoints = playerPointsMap.get(r.api_player_id) || 0;
        let multiplier = 1;
        if (r.is_captain) multiplier = 2;
        if (r.is_vicecaptain) multiplier = 1.5;

        return {
            playerId: r.api_player_id,
            name: r.players?.display_name || r.api_player_id,
            role: "PLAYER", // Role data needs better source
            isCaptain: r.is_captain,
            isViceCaptain: r.is_vicecaptain,
            totalPoints: rawPoints,
            contributedPoints: rawPoints * multiplier,
        };
    });

    players.sort((a, b) => {
        if (a.isCaptain) return -1;
        if (b.isCaptain) return 1;
        if (a.isViceCaptain) return -1;
        if (b.isViceCaptain) return 1;
        return b.contributedPoints - a.contributedPoints;
    });

    const manualAdjustment = Number(team.manual_adjustment_points || 0);
    const teamTotal = players.reduce((sum, p) => sum + p.contributedPoints, 0) + manualAdjustment;

    return {
        id: team.id,
        teamName: team.team_name,
        owner: team.owner,
        totalPoints: teamTotal,
        manualAdjustment,
        players,
        lastUpdated: new Date().toISOString(),
    };
}

function getAvatar(name: string) {
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random&color=fff&size=200`;
}

export default async function TeamPage({ params }: { params: { id: string } }) {
    const teamId = parseInt(params.id);
    if (isNaN(teamId)) return notFound();

    const team = await getTeamDetails(teamId);
    if (!team) return notFound();

    return (
        <main className="min-h-screen p-4 pb-20 md:p-8 max-w-4xl mx-auto space-y-8">
            <Link href="/" className="inline-flex items-center text-sm font-medium text-indigo-400 hover:text-indigo-300 transition-colors mb-4 group">
                <span className="mr-2 group-hover:-translate-x-1 transition-transform">←</span> Back to Leaderboard
            </Link>

            {/* Hero Section */}
            <header className="glass-panel p-6 flex flex-col md:flex-row items-center md:items-start gap-6 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>

                <img
                    src={getAvatar(team.owner)}
                    alt={team.owner}
                    className="w-24 h-24 rounded-full border-4 border-slate-700 shadow-xl z-10"
                />

                <div className="flex-1 text-center md:text-left z-10">
                    <h1 className="text-3xl md:text-4xl font-extrabold text-white mb-2">{team.teamName}</h1>
                    <p className="text-slate-400 font-medium">Managed by <span className="text-indigo-400 font-bold">{team.owner}</span></p>
                </div>

                <div className="text-center md:text-right z-10 bg-slate-800/50 p-4 rounded-xl backdrop-blur-sm border border-white/5">
                    <div className="text-xs uppercase tracking-widest text-slate-500 font-bold mb-1">Total Points</div>
                    <div className="text-4xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-br from-indigo-400 to-purple-400 tabular-nums">
                        {team.totalPoints.toLocaleString()}
                    </div>
                </div>
            </header>

            {/* Manual Adjustment Alert */}
            {team.manualAdjustment !== 0 && (
                <div className={`p-4 rounded-xl border ${team.manualAdjustment > 0 ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-rose-500/10 border-rose-500/20 text-rose-400'} flex items-center justify-between`}>
                    <span className="font-medium text-sm">Manual Adjustment (Trades/Subs)</span>
                    <span className="font-bold tabular-nums">
                        {team.manualAdjustment > 0 ? '+' : ''}{team.manualAdjustment} pts
                    </span>
                </div>
            )}

            {/* Roster Grid */}
            <section>
                <h2 className="text-lg font-bold text-slate-400 uppercase tracking-widest mb-6 px-2">Starting XI</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {team.players.map((player) => {
                        const isCaptain = player.isCaptain;
                        const isVice = player.isViceCaptain;

                        let cardClass = "glass-panel p-4 flex items-center gap-4 hover:bg-white/5 transition-colors group relative overflow-hidden";
                        let ringClass = "";

                        if (isCaptain) {
                            ringClass = "ring-2 ring-yellow-500/50 shadow-yellow-500/10 shadow-lg";
                            cardClass += " bg-gradient-to-br from-slate-800/80 to-yellow-900/10";
                        } else if (isVice) {
                            ringClass = "ring-1 ring-slate-400/50";
                        }

                        return (
                            <div key={player.playerId} className={`${cardClass} ${ringClass}`}>
                                {/* Role/Status Icon */}
                                <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-sm shadow-inner shrink-0 ${isCaptain ? 'bg-yellow-500 text-slate-900' :
                                        isVice ? 'bg-slate-300 text-slate-900' :
                                            'bg-slate-700/50 text-slate-400'
                                    }`}>
                                    {isCaptain ? "C" : isVice ? "VC" : player.name.charAt(0)}
                                </div>

                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                        <h3 className={`font-bold truncate ${isCaptain ? 'text-yellow-400' : 'text-white'}`}>
                                            {player.name}
                                        </h3>
                                        {isCaptain && <span className="text-[10px] font-bold px-1.5 py-0.5 bg-yellow-500/20 text-yellow-400 rounded border border-yellow-500/30 uppercase">Capt</span>}
                                        {isVice && <span className="text-[10px] font-bold px-1.5 py-0.5 bg-slate-500/20 text-slate-300 rounded border border-slate-500/30 uppercase">Vice</span>}
                                    </div>
                                    <div className="text-xs text-slate-500 font-medium mt-0.5">
                                        {player.totalPoints} pts × {isCaptain ? '2' : isVice ? '1.5' : '1'}
                                    </div>
                                </div>

                                <div className="text-right">
                                    <div className={`text-xl font-bold tabular-nums ${isCaptain ? 'text-yellow-400' : 'text-white'}`}>
                                        {player.contributedPoints}
                                    </div>
                                    <div className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Total</div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </section>
        </main>
    );
}
