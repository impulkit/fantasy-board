import Link from "next/link";
import { createClient } from "@supabase/supabase-js";

export const dynamic = 'force-dynamic';

async function getStats() {
    const defaults = { teamCount: 0, playerCount: 0, matchCount: 0, lastSync: null };
    try {
        if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
            return defaults;
        }

        const supabase = createClient(
            process.env.SUPABASE_URL,
            process.env.SUPABASE_SERVICE_ROLE_KEY,
            { auth: { persistSession: false } }
        );

        const [teamsRes, playersRes, matchesRes, syncRes] = await Promise.all([
            // Use count: 'exact', head: true
            supabase.from("fantasy_teams").select("*", { count: "exact", head: true }),
            supabase.from("players").select("*", { count: "exact", head: true }),
            supabase.from("matches").select("*", { count: "exact", head: true }),
            supabase.from("sync_state").select("last_completed_match_time").eq("id", 1).maybeSingle(),
        ]);

        return {
            teamCount: teamsRes.count ?? 0,
            playerCount: playersRes.count ?? 0,
            matchCount: matchesRes.count ?? 0,
            lastSync: syncRes.data?.last_completed_match_time ?? null,
        };
    } catch (e) {
        console.error("Admin stats error:", e);
        return defaults;
    }
}

export default async function AdminPage() {
    const stats = await getStats();

    const lastSyncFormatted = stats.lastSync
        ? new Date(stats.lastSync).toLocaleString("en-IN", {
            dateStyle: "medium",
            timeStyle: "short",
        })
        : "Never";

    return (
        <main className="min-h-screen p-4 md:p-8 max-w-5xl mx-auto space-y-12">
            <header>
                <h1 className="text-3xl font-extrabold tracking-tight text-white mb-2">⚙️ Admin Dashboard</h1>
                <p className="text-slate-400">Manage your fantasy league settings and data.</p>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="glass-panel p-6 text-center card-hover">
                    <div className="text-4xl font-black text-indigo-400 mb-2">{stats.teamCount}</div>
                    <div className="text-xs uppercase tracking-widest text-slate-500 font-bold">Fantasy Teams</div>
                </div>
                <div className="glass-panel p-6 text-center card-hover">
                    <div className="text-4xl font-black text-purple-400 mb-2">{stats.playerCount}</div>
                    <div className="text-xs uppercase tracking-widest text-slate-500 font-bold">Players</div>
                </div>
                <div className="glass-panel p-6 text-center card-hover">
                    <div className="text-4xl font-black text-emerald-400 mb-2">{stats.matchCount}</div>
                    <div className="text-xs uppercase tracking-widest text-slate-500 font-bold">Matches Synced</div>
                </div>
            </div>

            <section className="space-y-4">
                <h2 className="text-sm font-bold uppercase tracking-widest text-slate-500 px-2">Last Sync</h2>
                <div className="glass-panel p-4 flex items-center justify-between">
                    <span className="text-slate-400">Last successful sync completed at:</span>
                    <span className="text-white font-mono">{lastSyncFormatted}</span>
                </div>
            </section>

            <section className="space-y-4">
                <h2 className="text-sm font-bold uppercase tracking-widest text-slate-500 px-2">Quick Actions</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Link href="/admin/teams" className="glass-panel p-6 flex items-center gap-4 hover:bg-white/5 transition-colors group">
                        <span className="text-4xl group-hover:scale-110 transition-transform">👥</span>
                        <div>
                            <div className="font-bold text-white text-lg">Manage Teams</div>
                            <div className="text-sm text-slate-400">Add or remove fantasy roster teams</div>
                        </div>
                    </Link>
                    <Link href="/admin/sync" className="glass-panel p-6 flex items-center gap-4 hover:bg-white/5 transition-colors group">
                        <span className="text-4xl group-hover:scale-110 transition-transform">🔄</span>
                        <div>
                            <div className="font-bold text-white text-lg">Sync Cricket Data</div>
                            <div className="text-sm text-slate-400">Fetch latest match scorecards automatically</div>
                        </div>
                    </Link>
                </div>
            </section>
        </main>
    );
}