"use client";

import { useState } from "react";

export default function SyncPage() {
    const [adminKey, setAdminKey] = useState("");
    const [fromDate, setFromDate] = useState("");
    const [isSyncing, setIsSyncing] = useState(false);
    const [result, setResult] = useState<{ type: string; text: string } | null>(null);
    const [debugInfo, setDebugInfo] = useState<any>(null);

    async function handleSync() {
        if (!adminKey.trim()) {
            setResult({ type: "error", text: "Enter the admin key to authorize sync." });
            return;
        }

        setIsSyncing(true);
        setResult({ type: "info", text: "Syncing cricket data… this may take a moment." });
        setDebugInfo(null);

        try {
            const payload: any = { key: adminKey.trim() };
            if (fromDate.trim()) {
                payload.from = fromDate.trim();
            }

            const res = await fetch("/api/sync", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });

            const data = await res.json();

            if (!res.ok || !data.ok) {
                setResult({
                    type: "error",
                    text: data.error || `Sync failed (HTTP ${res.status})`,
                });
            } else {
                const boundary = data.boundaryISO
                    ? new Date(data.boundaryISO).toLocaleString("en-IN", {
                        dateStyle: "medium",
                        timeStyle: "short",
                    })
                    : "N/A";

                setResult({
                    type: "success",
                    text: `Sync complete! ${data.processed} match(es) processed. Boundary: ${boundary}`,
                });
            }

            if (data.debug) {
                setDebugInfo(data.debug);
            }
        } catch (err: any) {
            setResult({ type: "error", text: err?.message || "Network error during sync." });
        } finally {
            setIsSyncing(false);
        }
    }

    return (
        <main className="page-container">
            <header className="page-header animate-in">
                <h1>🔄 Sync Cricket Data</h1>
                <p>Fetch latest match scorecards and compute fantasy points</p>
            </header>

            <div className="card animate-in">
                <div className="section-title">Trigger Sync</div>
                <div className="input-group">
                    <input
                        type="password"
                        value={adminKey}
                        onChange={(e) => setAdminKey(e.target.value)}
                        placeholder="Admin key"
                        onKeyDown={(e) => e.key === "Enter" && handleSync()}
                    />
                    <input
                        type="date"
                        value={fromDate}
                        onChange={(e) => setFromDate(e.target.value)}
                        style={{ maxWidth: 180 }}
                        title="Sync from date (leave empty to use last sync boundary)"
                    />
                    <button
                        className="btn btn-primary"
                        onClick={handleSync}
                        disabled={isSyncing}
                    >
                        {isSyncing ? (
                            <>
                                <span className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} />
                                Syncing…
                            </>
                        ) : (
                            "Sync Now"
                        )}
                    </button>
                </div>
                <p style={{ color: "var(--text-muted)", fontSize: "0.75rem", marginTop: 6 }}>
                    Set a &quot;from&quot; date to re-sync all matches from that date onward. Leave blank for incremental sync.
                </p>

                {result && (
                    <div className={`status-message status-${result.type}`}>{result.text}</div>
                )}

                {debugInfo && (
                    <div style={{ marginTop: 16, padding: 16, background: "rgba(255,255,255,0.03)", borderRadius: 8, fontSize: "0.8rem", color: "var(--text-secondary)" }}>
                        <div style={{ fontWeight: 700, marginBottom: 8, color: "var(--text-primary)" }}>Diagnostic Info</div>
                        <table style={{ width: "100%", borderCollapse: "collapse" }}>
                            <tbody>
                                {Object.entries(debugInfo).map(([key, val]) => (
                                    <tr key={key} style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                                        <td style={{ padding: "4px 8px", color: "var(--text-muted)" }}>{key}</td>
                                        <td style={{ padding: "4px 8px", fontFamily: "monospace", whiteSpace: "pre-wrap", wordBreak: "break-all" }}>
                                            {typeof val === "object" ? JSON.stringify(val, null, 2) : String(val)}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            <div className="card animate-in" style={{ marginTop: 20, padding: "16px 24px" }}>
                <div className="section-title" style={{ marginBottom: 8 }}>How it works</div>
                <ul style={{ color: "var(--text-secondary)", fontSize: "0.875rem", paddingLeft: 20, display: "flex", flexDirection: "column", gap: 6 }}>
                    <li>Fetches all matches from CricketData API for your configured series</li>
                    <li>Filters completed matches since last sync boundary</li>
                    <li>Downloads scorecards and computes Dream11 T20 points per player</li>
                    <li>Rolls up team totals (captain 2×, vice-captain 1.5×) and updates leaderboard</li>
                </ul>
            </div>
        </main>
    );
}
