"use client";

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
        <main className="page-container">
            <header className="page-header animate-in">
                <h1>👥 Manage Teams</h1>
                <p>Add or remove fantasy cricket teams</p>
            </header>

            <div className="card animate-in" style={{ marginBottom: 24 }}>
                <div className="section-title">Add a New Team</div>
                <div className="input-group">
                    <input
                        type="text"
                        value={teamName}
                        onChange={(e) => setTeamName(e.target.value)}
                        placeholder="Team name"
                        onKeyDown={(e) => e.key === "Enter" && handleAdd()}
                    />
                    <input
                        type="text"
                        value={owner}
                        onChange={(e) => setOwner(e.target.value)}
                        placeholder="Owner name (optional)"
                        onKeyDown={(e) => e.key === "Enter" && handleAdd()}
                    />
                    <button className="btn btn-primary" onClick={handleAdd} disabled={!teamName.trim()}>
                        Add Team
                    </button>
                </div>

                {message && (
                    <div className={`status-message status-${message.type}`}>{message.text}</div>
                )}
            </div>

            {loading ? (
                <div className="loading">
                    <div className="spinner" />
                    Loading teams...
                </div>
            ) : teams.length === 0 ? (
                <div className="empty-state animate-in">
                    <div className="empty-icon">👥</div>
                    <p>No teams yet. Add your first team above!</p>
                </div>
            ) : (
                <div className="table-wrap animate-in">
                    <table>
                        <thead>
                            <tr>
                                <th>ID</th>
                                <th>Team Name</th>
                                <th>Owner</th>
                                <th style={{ textAlign: "right" }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {teams.map((team) => (
                                <tr key={team.id}>
                                    <td style={{ color: "var(--text-muted)" }}>#{team.id}</td>
                                    <td style={{ fontWeight: 600 }}>{team.team_name}</td>
                                    <td style={{ color: "var(--text-secondary)" }}>{team.owner}</td>
                                    <td style={{ textAlign: "right" }}>
                                        <button
                                            className="btn btn-danger"
                                            style={{ padding: "6px 14px", fontSize: "0.8rem" }}
                                            onClick={() => handleDelete(team.id, team.team_name)}
                                        >
                                            Remove
                                        </button>
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
