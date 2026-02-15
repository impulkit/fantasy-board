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
            supabase.from("fantasy_teams").select("id", { count: "exact", head: true }),
            supabase.from("players").select("api_player_id", { count: "exact", head: true }),
            supabase.from("matches").select("api_match_id", { count: "exact", head: true }),
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
        <main className="page-container">
            <header className="page-header animate-in">
                <h1>⚙️ Admin Dashboard</h1>
                <p>Manage your fantasy league</p>
            </header>

            <div className="card-grid stagger">
                <div className="card stat-card">
                    <div className="stat-value">{stats.teamCount}</div>
                    <div className="stat-label">Fantasy Teams</div>
                </div>
                <div className="card stat-card">
                    <div className="stat-value">{stats.playerCount}</div>
                    <div className="stat-label">Players</div>
                </div>
                <div className="card stat-card">
                    <div className="stat-value">{stats.matchCount}</div>
                    <div className="stat-label">Matches Synced</div>
                </div>
            </div>

            <div className="section">
                <div className="section-title">Last Sync</div>
                <div className="card" style={{ padding: "16px 24px" }}>
                    <span style={{ color: "var(--text-secondary)" }}>{lastSyncFormatted}</span>
                </div>
            </div>

            <div className="section" style={{ marginTop: 32 }}>
                <div className="section-title">Quick Actions</div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: 12 }} className="stagger">
                    <Link href="/admin/teams" className="card link-card">
                        <span className="link-icon">👥</span>
                        <div>
                            <div className="link-label">Manage Teams</div>
                            <div className="link-desc">Add or remove fantasy teams</div>
                        </div>
                    </Link>
                    <Link href="/admin/sync" className="card link-card">
                        <span className="link-icon">🔄</span>
                        <div>
                            <div className="link-label">Sync Cricket Data</div>
                            <div className="link-desc">Fetch latest match scorecards</div>
                        </div>
                    </Link>
                </div>
            </div>
        </main>
    );
}