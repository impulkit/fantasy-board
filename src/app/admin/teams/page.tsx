"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getSupabase } from "@/lib/supabaseClient";

interface Team {
    id: number;
    team_name: string;
    owner: string;
}

export default function TeamsPage() {
    const [teams, setTeams] = useState<Team[]>([]);
    const [teamName, setTeamName] = useState("");
    const [owner, setOwner] = useState("");
    const [loading, setLoading] = useState(true);
    const [message, setMessage] = useState<{ type: string; text: string } | null>(null);

    async function fetchTeams() {
        setLoading(true);
        const sb = getSupabase();
        if (!sb) { setLoading(false); return; }
        const { data, error } = await sb
            .from("fantasy_teams")
            .select("id, team_name, owner")
            .order("id");

        if (error) {
            setMessage({ type: "error", text: error.message });
        } else {
            setTeams(data || []);
        }
        setLoading(false);
    }

    useEffect(() => {
        fetchTeams();
    }, []);

    async function handleAdd() {
        if (!teamName.trim()) return;
        setMessage(null);

        const sb = getSupabase();
        if (!sb) { setMessage({ type: "error", text: "Supabase not configured" }); return; }
        const { error } = await sb.from("fantasy_teams").insert({
            team_name: teamName.trim(),
            owner: owner.trim() || "—",
        });

        if (error) {
            setMessage({ type: "error", text: error.message });
        } else {
            setTeamName("");
            setOwner("");
            setMessage({ type: "success", text: `Team "${teamName.trim()}" added!` });
            fetchTeams();
        }
    }

    async function handleDelete(id: number, name: string) {
        if (!confirm(`Remove team "${name}"? This deletes their roster and scores.`)) return;
        setMessage(null);

        const sb = getSupabase();
        if (!sb) return;
        const { error } = await sb.from("fantasy_teams").delete().eq("id", id);

        if (error) {
            setMessage({ type: "error", text: error.message });
        } else {
            setMessage({ type: "success", text: `Team "${name}" removed.` });
            fetchTeams();
        }
    }

    return (
        <main className="min-h-screen p-4 md:p-8 max-w-4xl mx-auto space-y-8">
            <header className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-black text-white">Manage Teams</h1>
                    <p className="text-slate-400 text-sm">Create and organize fantasy squads</p>
                </div>
                <Link href="/admin" className="text-sm font-bold text-slate-500 hover:text-white transition-colors">
                    Back to Dashboard
                </Link>
            </header>

            {/* Add Team Form */}
            <div className="glass-panel p-6 space-y-4">
                <h2 className="text-sm font-bold uppercase tracking-widest text-slate-500">Add New Team</h2>
                <div className="flex flex-col md:flex-row gap-3">
                    <input
                        type="text"
                        value={teamName}
                        onChange={(e) => setTeamName(e.target.value)}
                        placeholder="Team Name (e.g. Royal Challengers)"
                        className="flex-1 bg-slate-900/50 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
                        onKeyDown={(e) => e.key === "Enter" && handleAdd()}
                    />
                    <input
                        type="text"
                        value={owner}
                        onChange={(e) => setOwner(e.target.value)}
                        placeholder="Owner Name"
                        className="flex-1 bg-slate-900/50 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
                        onKeyDown={(e) => e.key === "Enter" && handleAdd()}
                    />
                    <button
                        onClick={handleAdd}
                        disabled={!teamName.trim()}
                        className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold px-6 py-3 rounded-lg transition-all shadow-lg shadow-indigo-500/20"
                    >
                        Add Team
                    </button>
                </div>

                {message && (
                    <div className={`p-4 rounded-lg text-sm font-medium ${message.type === 'error' ? 'bg-red-500/10 text-red-400 border border-red-500/20' :
                            'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                        }`}>
                        {message.text}
                    </div>
                )}
            </div>

            {/* Team List */}
            {loading ? (
                <div className="text-center py-12 text-slate-500 animate-pulse">Loading roster...</div>
            ) : teams.length === 0 ? (
                <div className="text-center py-12 text-slate-500">
                    <div className="text-4xl mb-4">👥</div>
                    <p>No teams found. Add one above to get started.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {teams.map((team) => (
                        <div key={team.id} className="glass-panel p-5 flex justify-between items-center group hover:bg-white/5 transition-colors">
                            <div>
                                <div className="text-xs text-slate-500 font-mono mb-1">TEAM #{team.id}</div>
                                <h3 className="text-lg font-bold text-white group-hover:text-indigo-400 transition-colors">{team.team_name}</h3>
                                <p className="text-sm text-slate-400">{team.owner}</p>
                            </div>
                            <div className="flex flex-col gap-2 text-right">
                                <Link
                                    href={`/admin/teams/${team.id}`}
                                    className="text-xs font-bold text-indigo-400 hover:text-indigo-300 uppercase tracking-wider bg-indigo-500/10 hover:bg-indigo-500/20 px-3 py-1.5 rounded transition-colors"
                                >
                                    Manage Roster
                                </Link>
                                <button
                                    onClick={() => handleDelete(team.id, team.team_name)}
                                    className="text-xs font-bold text-rose-400 hover:text-rose-300 uppercase tracking-wider hover:underline"
                                >
                                    Delete
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </main>
    );
}
