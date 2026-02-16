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
            .select("api_player_id, is_captain, is_vicecaptain, players(display_name)")
            .eq("fantasy_team_id", teamId);
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
            is_vicecaptain: false
        });

        if (error) setMessage({ type: "error", text: error.message });
        else {
            setMessage({ type: "success", text: "Player added." });
            setNewPlayerId("");
            fetchData();
        }
    }

    // Toggle C/VC
    async function toggleRole(pid: string, role: 'is_captain' | 'is_vicecaptain', val: boolean) {
        const sb = getSupabase();
        if (!sb) return;

        // Ensure unique C/VC? Ideally yes, but let's just update for now.
        const { error } = await sb
            .from("fantasy_team_players")
            .update({ [role]: val })
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
        <main className="page-container">
            <header className="page-header mb-8">
                <Link href="/admin/teams" className="text-secondary mb-4 block">&larr; Back to Teams</Link>
                <h1>Edit Team: {team.team_name}</h1>
                <p>Owner: {team.owner}</p>
            </header>

            {message && (
                <div className={`p-4 mb-6 rounded ${message.type === 'error' ? 'bg-red-500/10 text-red-400' : 'bg-green-500/10 text-green-400'}`}>
                    {message.text}
                </div>
            )}

            {/* Manual Adjustment */}
            <section className="card mb-8">
                <h3 className="text-lg font-bold mb-4">Manual Score Adjustment</h3>
                <div className="flex gap-4 items-end">
                    <div>
                        <label className="block text-sm text-gray-400 mb-1">Points (+/-)</label>
                        <input
                            type="number"
                            className="bg-black/30 border border-white/10 rounded p-2 text-white w-32"
                            value={adjustment}
                            onChange={e => setAdjustment(Number(e.target.value))}
                        />
                    </div>
                    <button onClick={saveAdjustment} className="btn-primary">Save Adjustment</button>
                </div>
                <p className="text-xs text-gray-500 mt-2">Use for trades (Net Difference) or penalties.</p>
            </section>

            {/* Roster */}
            <section className="card">
                <h3 className="text-lg font-bold mb-4">Roster ({roster.length}/15)</h3>

                <table className="w-full mb-6 text-sm">
                    <thead>
                        <tr className="text-left text-gray-400 border-b border-white/10">
                            <th className="p-2">Name</th>
                            <th className="p-2 text-center">Captain</th>
                            <th className="p-2 text-center">Vice</th>
                            <th className="p-2 text-right">Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        {roster.map(r => (
                            <tr key={r.api_player_id} className="border-b border-white/5 hover:bg-white/5">
                                <td className="p-2 font-medium">
                                    {r.players?.display_name || r.api_player_id}
                                    <div className="text-xs text-gray-500">{r.api_player_id}</div>
                                </td>
                                <td className="p-2 text-center">
                                    <input
                                        type="checkbox"
                                        checked={r.is_captain}
                                        onChange={e => toggleRole(r.api_player_id, 'is_captain', e.target.checked)}
                                    />
                                </td>
                                <td className="p-2 text-center">
                                    <input
                                        type="checkbox"
                                        checked={r.is_vicecaptain}
                                        onChange={e => toggleRole(r.api_player_id, 'is_vicecaptain', e.target.checked)}
                                    />
                                </td>
                                <td className="p-2 text-right">
                                    <button onClick={() => removePlayer(r.api_player_id)} className="text-red-400 hover:text-red-300 text-xs uppercase font-bold">
                                        Remove
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                <div className="border-t border-white/10 pt-4">
                    <h4 className="font-bold mb-2 text-sm text-gray-400">Add Player</h4>
                    <div className="flex gap-2">
                        <select
                            className="bg-black/30 border border-white/10 rounded p-2 text-white flex-1"
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
                        <button onClick={addPlayer} disabled={!newPlayerId} className="btn-secondary whitespace-nowrap">
                            Add Player
                        </button>
                    </div>
                </div>
            </section>
        </main>
    );
}
