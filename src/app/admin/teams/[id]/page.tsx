"use client";

import { useEffect, useState } from "react";
import { getSupabase } from "@/lib/supabaseClient";
import Link from "next/link";
import { notFound } from "next/navigation";

interface Player {
    api_player_id: string;
    display_name: string;
}

interface RosterItem {
    api_player_id: string;
    is_captain: boolean;
    is_vicecaptain: boolean;
    is_bench: boolean;
    players?: { display_name: string } | null;
}

export default function EditTeamPage({ params }: { params: { id: string } }) {
    const teamId = parseInt(params.id);
    if (isNaN(teamId)) return notFound();

    const [team, setTeam] = useState<any>(null);
    const [roster, setRoster] = useState<RosterItem[]>([]);
    const [allPlayers, setAllPlayers] = useState<Player[]>([]);
    const [loading, setLoading] = useState(true);
    const [adjustment, setAdjustment] = useState<number>(0);
    const [message, setMessage] = useState<{ type: string; text: string } | null>(null);
    const [newPlayerId, setNewPlayerId] = useState("");

    async function fetchData() {
        setLoading(true);
        const sb = getSupabase();
        if (!sb) return;

        // 1. Team
        const { data: teamData, error: teamErr } = await sb
            .from("fantasy_teams")
            .select("*")
            .eq("id", teamId)
            .single();

        if (teamErr) {
            setMessage({ type: "error", text: teamErr.message });
            setLoading(false);
            return;
        }
        setTeam(teamData);
        setAdjustment(teamData.manual_adjustment_points || 0);

        // 2. Roster
        const { data: rosterData } = await sb
            .from("fantasy_team_players")
            .select("api_player_id, is_captain, is_vicecaptain, is_bench, players(display_name)")
            .eq("fantasy_team_id", teamId)
            .order("is_bench", { ascending: true }); // Active first

        setRoster((rosterData as any[]) || []);

        // 3. All Players (for dropdown)
        const { data: allP } = await sb
            .from("players")
            .select("api_player_id, display_name")
            .order("display_name");
        setAllPlayers(allP || []);

        setLoading(false);
    }

    useEffect(() => {
        fetchData();
    }, [teamId]);

    // Update Adjustment
    async function saveAdjustment() {
        const sb = getSupabase();
        if (!sb) return;
        const { error } = await sb
            .from("fantasy_teams")
            .update({ manual_adjustment_points: adjustment })
            .eq("id", teamId);

        if (error) setMessage({ type: "error", text: error.message });
        else setMessage({ type: "success", text: "Adjustment saved." });
    }

    // Remove Player
    async function removePlayer(pid: string) {
        if (!confirm("Remove this player?")) return;
        const sb = getSupabase();
        if (!sb) return;
        const { error } = await sb
            .from("fantasy_team_players")
            .delete()
            .eq("fantasy_team_id", teamId)
            .eq("api_player_id", pid);

        if (error) setMessage({ type: "error", text: error.message });
        else {
            setMessage({ type: "success", text: "Player removed." });
            fetchData();
        }
    }

    // Add Player
    async function addPlayer() {
        if (!newPlayerId) return;
        const sb = getSupabase();
        if (!sb) return;

        const { error } = await sb.from("fantasy_team_players").insert({
            fantasy_team_id: teamId,
            api_player_id: newPlayerId,
            is_captain: false,
            is_vicecaptain: false,
            is_bench: true // Default to bench when adding? Safer.
        });

        if (error) setMessage({ type: "error", text: error.message });
        else {
            setMessage({ type: "success", text: "Player added (as Bench)." });
            setNewPlayerId("");
            fetchData();
        }
    }

    // Toggle Role (Captain, Vice, Bench)
    async function toggleRole(pid: string, role: 'is_captain' | 'is_vicecaptain' | 'is_bench', val: boolean) {
        const sb = getSupabase();
        if (!sb) return;

        // If setting Captain/Vice, ensure they are NOT bench
        let updates: any = { [role]: val };

        if ((role === 'is_captain' || role === 'is_vicecaptain') && val) {
            updates.is_bench = false;
        }

        // If setting Bench, ensure they are NOT Captain/Vice
        if (role === 'is_bench' && val) {
            updates.is_captain = false;
            updates.is_vicecaptain = false;
        }

        const { error } = await sb
            .from("fantasy_team_players")
            .update(updates)
            .eq("fantasy_team_id", teamId)
            .eq("api_player_id", pid);

        if (error) setMessage({ type: "error", text: error.message });
        else fetchData();
    }

    if (loading) return <div className="p-8 text-center text-gray-400">Loading...</div>;
    if (!team) return <div className="p-8">Team not found</div>;

    // Filter available players
    const existingIds = new Set(roster.map(r => r.api_player_id));
    const availablePlayers = allPlayers.filter(p => !existingIds.has(p.api_player_id));

    return (
        <main className="min-h-screen text-slate-200 p-8">
            <header className="mb-8">
                <Link href="/admin/teams" className="text-indigo-400 hover:text-indigo-300 mb-4 block transition-colors">&larr; Back to Teams</Link>
                <h1 className="text-3xl font-bold text-white mb-1">Edit Team: {team.team_name}</h1>
                <p className="text-slate-400">Owner: {team.owner}</p>
            </header>

            {message && (
                <div className={`p-4 mb-6 rounded border ${message.type === 'error' ? 'bg-rose-500/10 border-rose-500/20 text-rose-400' : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'}`}>
                    {message.text}
                </div>
            )}

            {/* Manual Adjustment */}
            <section className="bg-slate-800/50 p-6 rounded-xl border border-white/5 mb-8">
                <h3 className="text-lg font-bold mb-4 text-white">Manual Score Adjustment</h3>
                <div className="flex gap-4 items-end">
                    <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Points (+/-)</label>
                        <input
                            type="number"
                            className="bg-slate-900/50 border border-white/10 rounded p-2 text-white w-32 focus:border-indigo-500 outline-none"
                            value={adjustment}
                            onChange={e => setAdjustment(Number(e.target.value))}
                        />
                    </div>
                    <button onClick={saveAdjustment} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded transition-colors">
                        Save Adjustment
                    </button>
                </div>
                <p className="text-xs text-slate-500 mt-2">Use for trades (Net Difference) or penalties.</p>
            </section>

            {/* Roster */}
            <section className="bg-slate-800/50 p-6 rounded-xl border border-white/5">
                <h3 className="text-lg font-bold mb-4 text-white">Roster ({roster.length})</h3>

                <div className="overflow-x-auto">
                    <table className="w-full mb-6 text-sm text-left">
                        <thead>
                            <tr className="text-slate-400 border-b border-white/10 uppercase text-xs tracking-wider">
                                <th className="p-3">Player</th>
                                <th className="p-3 text-center">Bench</th>
                                <th className="p-3 text-center">Captain</th>
                                <th className="p-3 text-center">Vice</th>
                                <th className="p-3 text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {roster.map(r => (
                                <tr key={r.api_player_id} className={`hover:bg-white/5 transition-colors ${r.is_bench ? 'opacity-60 bg-slate-900/30' : ''}`}>
                                    <td className="p-3 font-medium text-white">
                                        {r.players?.display_name || r.api_player_id}
                                        <div className="text-xs text-slate-500 font-mono">{r.api_player_id}</div>
                                    </td>
                                    <td className="p-3 text-center">
                                        <input
                                            type="checkbox"
                                            className="w-4 h-4 rounded border-slate-600 text-indigo-500 focus:ring-indigo-500 bg-slate-700"
                                            checked={r.is_bench}
                                            onChange={e => toggleRole(r.api_player_id, 'is_bench', e.target.checked)}
                                        />
                                    </td>
                                    <td className="p-3 text-center">
                                        <input
                                            type="checkbox"
                                            className="w-4 h-4 rounded border-slate-600 text-yellow-500 focus:ring-yellow-500 bg-slate-700 disabled:opacity-30"
                                            checked={r.is_captain}
                                            disabled={r.is_bench}
                                            onChange={e => toggleRole(r.api_player_id, 'is_captain', e.target.checked)}
                                        />
                                    </td>
                                    <td className="p-3 text-center">
                                        <input
                                            type="checkbox"
                                            className="w-4 h-4 rounded border-slate-600 text-slate-400 focus:ring-slate-400 bg-slate-700 disabled:opacity-30"
                                            checked={r.is_vicecaptain}
                                            disabled={r.is_bench}
                                            onChange={e => toggleRole(r.api_player_id, 'is_vicecaptain', e.target.checked)}
                                        />
                                    </td>
                                    <td className="p-3 text-right">
                                        <button onClick={() => removePlayer(r.api_player_id)} className="text-rose-400 hover:text-rose-300 text-xs uppercase font-bold px-2 py-1 rounded hover:bg-rose-500/10">
                                            Remove
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                <div className="border-t border-white/10 pt-4">
                    <h4 className="font-bold mb-2 text-sm text-slate-400 uppercase tracking-wider">Add Player</h4>
                    <div className="flex gap-2 max-w-md">
                        <select
                            className="bg-slate-900/50 border border-white/10 rounded p-2 text-white flex-1 outline-none focus:border-indigo-500"
                            value={newPlayerId}
                            onChange={e => setNewPlayerId(e.target.value)}
                        >
                            <option value="">Select a player...</option>
                            {availablePlayers.map(p => (
                                <option key={p.api_player_id} value={p.api_player_id}>
                                    {p.display_name}
                                </option>
                            ))}
                        </select>
                        <button onClick={addPlayer} disabled={!newPlayerId} className="px-4 py-2 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 text-white font-bold rounded transition-colors whitespace-nowrap">
                            Add Player
                        </button>
                    </div>
                </div>
            </section>
        </main>
    );
}
