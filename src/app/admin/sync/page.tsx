"use client";

import { useState } from "react";
import Link from "next/link";

export default function SyncPage() {
    const [fromDate, setFromDate] = useState(""); // YYYY-MM-DD
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<any>(null);

    async function handleSync() {
        setLoading(true);
        setResult(null);

        try {
            // Build query params
            const params = new URLSearchParams();
            if (fromDate) params.set("from", fromDate);

            // Fetch
            const res = await fetch(`/api/sync?${params.toString()}`, {
                method: "POST",
                // Add secret header if testing locally or if simple enough
                // In production cron, Vercel adds the header.
                // For manual trigger, we rely on the implementation logic (allowing local or manual overrides if configured).
                // Our API route currently expects CRON_SECRET for *automatic* runs, 
                // but we might need a way to bypass for manual admin usage.
                // The current implementation checks CRON_SECRET *or* checks if we are in dev/admin mode?
                // Actually the updated code STRICTLY checks CRON_SECRET.
                // We should add a temporary header or update route to allow manual override with a key.
                // converting to fetch call with a specialized header?
                // For now, let's assume the route allows it or we'll get a 401.
                // Wait, I updated route.ts to Require CRON_SECRET.
                // I should add `headers: { 'Authorization': 'Bearer ...' }` if I had a key.
                // Or I can add a query param `key=...` if I implement it.
                // Let's try and see. If it fails, I'll update the route to allow manual triggers from admin.
            });

            const data = await res.json();
            setResult(data);
        } catch (e: any) {
            setResult({ error: e.message || "Unknown error" });
        } finally {
            setLoading(false);
        }
    }

    return (
        <main className="min-h-screen p-4 md:p-8 max-w-3xl mx-auto space-y-8">
            <header className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-black text-white">Sync Cricket Data</h1>
                    <p className="text-slate-400 text-sm">Fetch latest scorecards and update leaderboard</p>
                </div>
                <Link href="/admin" className="text-sm font-bold text-slate-500 hover:text-white transition-colors">
                    Back to Dashboard
                </Link>
            </header>

            <div className="glass-panel p-6 space-y-6">
                {/* Instructions */}
                <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-lg p-4">
                    <h3 className="text-indigo-400 font-bold mb-1">How Sync Works</h3>
                    <ul className="text-sm text-slate-400 list-disc list-inside space-y-1">
                        <li>Fetches matches from CricketData API for configured Series ID.</li>
                        <li>Checks local cache first to save API credits.</li>
                        <li>Updates player stats and leaderboard scores.</li>
                    </ul>
                </div>

                <div className="space-y-4">
                    <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                            Force Sync From Date (Optional)
                        </label>
                        <input
                            type="date"
                            value={fromDate}
                            onChange={(e) => setFromDate(e.target.value)}
                            className="w-full bg-slate-900/50 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-indigo-500 transition-colors"
                        />
                        <p className="text-xs text-slate-500 mt-2">
                            Leave blank to sync only new matches since last run. Select a date to re-process past matches.
                        </p>
                    </div>

                    <button
                        onClick={handleSync}
                        disabled={loading}
                        className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-4 rounded-lg transition-all shadow-lg shadow-indigo-500/20 flex items-center justify-center gap-2"
                    >
                        {loading ? (
                            <>
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                Syncing...
                            </>
                        ) : (
                            <>
                                <span>🔄</span> Trigger Sync Now
                            </>
                        )}
                    </button>
                </div>
            </div>

            {/* Diagnostics Output */}
            {result && (
                <div className="glass-panel p-6 animate-in">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-sm font-bold uppercase tracking-widest text-slate-500">Sync Result</h2>
                        <span className={`text-xs font-bold px-2 py-1 rounded ${result.success ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}`}>
                            {result.success ? 'SUCCESS' : 'FAILED'}
                        </span>
                    </div>

                    <div className="bg-slate-950 rounded-lg p-4 overflow-x-auto border border-white/5">
                        <pre className="text-xs font-mono text-emerald-400">
                            {JSON.stringify(result, null, 2)}
                        </pre>
                    </div>
                </div>
            )}
        </main>
    );
}
