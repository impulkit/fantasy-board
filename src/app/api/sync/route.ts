import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import {
  computePlayerPointsFromScorecard,
  normalizeMatchScorecardToPlayerStats,
} from "@/lib/scoring/dream11_t20";

// ---- Supabase server client (service role) ----
function supabaseServer() {
  const url = process.env.SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(url, key, { auth: { persistSession: false } });
}

// ---- CricketData helpers ----
const CRIC_BASE = "https://api.cricapi.com/v1";

async function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function fetchJsonWithRetry(url: string, tries = 3) {
  let lastErr: any;
  for (let i = 0; i < tries; i++) {
    try {
      const res = await fetch(url, { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
      return await res.json();
    } catch (e) {
      lastErr = e;
      await sleep(250 * Math.pow(2, i));
    }
  }
  throw lastErr;
}

async function fetchMatches() {
  const apikey = process.env.CRICKETDATA_API_KEY!;
  const seriesId = process.env.CRICKETDATA_SERIES_ID!;
  // Use series_info endpoint to get ALL matches for this specific series
  const url = `${CRIC_BASE}/series_info?apikey=${apikey}&offset=0&id=${encodeURIComponent(seriesId)}`;
  const json = await fetchJsonWithRetry(url);
  return json?.data?.matchList ?? json?.data?.matches ?? json?.data ?? [];
}

async function fetchScorecard(matchId: string) {
  const apikey = process.env.CRICKETDATA_API_KEY!;
  const url = `${CRIC_BASE}/match_scorecard?apikey=${apikey}&offset=0&id=${encodeURIComponent(
    matchId
  )}`;
  return await fetchJsonWithRetry(url);
}

function isCompletedMatch(m: any) {
  const status = String(m?.status ?? "").toLowerCase();
  return m?.matchEnded === true || status.includes("ended") || status.includes("completed");
}

function getStartTimeISO(m: any): string | null {
  const t =
    m?.dateTimeGMT ||
    m?.dateTime ||
    m?.date ||
    m?.matchDateTime ||
    m?.timestamp ||
    null;
  if (!t) return null;

  const d = new Date(t);
  if (isNaN(d.getTime())) return null;
  return d.toISOString();
}

function seriesFilter(matches: any[]) {
  const seriesId = process.env.CRICKETDATA_SERIES_ID!;
  return matches.filter((m) => {
    // CricketData API uses different field names across versions
    const sid = m?.series_id || m?.series?.id || m?.seriesId || m?.series?.objectId || "";
    return sid === seriesId;
  });
}

// ---- Auth helper ----
function assertAdminKey(key: string | null) {
  if (!key || key !== process.env.ADMIN_KEY) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return null;
}

// ---- Sync core ----
async function runSync(overrideLastSyncTime?: number) {
  const supabase = supabaseServer();

  // 1) last sync time
  let last = 0;
  let stateRow: { last_completed_match_time: string } | null = null;

  if (overrideLastSyncTime !== undefined) {
    last = overrideLastSyncTime;
  } else {
    const { data, error: stateErr } = await supabase
      .from("sync_state")
      .select("last_completed_match_time")
      .eq("id", 1)
      .maybeSingle();

    if (stateErr) throw new Error(stateErr.message);
    stateRow = data;
    if (stateRow?.last_completed_match_time) {
      last = new Date(stateRow.last_completed_match_time).getTime();
    }
  }

  // 2) fetch matches from series_info (already filtered to our series)
  const all = await fetchMatches();

  // 3) filter completed and sort by start time
  const completed = (Array.isArray(all) ? all : [])
    .filter(isCompletedMatch)
    .map((m: any) => ({
      raw: m,
      id: String(m.id),
      startTimeISO: getStartTimeISO(m),
    }))
    .filter((m: any) => !!m.startTimeISO)
    .sort((a: any, b: any) => new Date(a.startTimeISO).getTime() - new Date(b.startTimeISO).getTime());

  // 4) process matches after last sync boundary
  const toProcess = completed.filter((m: any) => new Date(m.startTimeISO).getTime() > last);

  let processed = 0;
  let maxTime = last;

  // Fetch all fantasy teams once
  const { data: teams, error: teamsErr } = await supabase.from("fantasy_teams").select("id, manual_adjustment_points");
  if (teamsErr) throw new Error(teamsErr.message);

  for (const m of toProcess) {
    const matchId = m.id;
    const startTimeISO: string = m.startTimeISO!;

    // Fetch scorecard
    const scorecard = await fetchScorecard(matchId);

    // Build per-player aggregated stats, then compute points per player
    const playerStatsMap = normalizeMatchScorecardToPlayerStats(scorecard) || {};

    // Build rows for players + player_match_points
    const playerIds = Object.keys(playerStatsMap);

    // Upsert players table
    if (playerIds.length > 0) {
      const playersUpsert = playerIds.map((pid) => ({
        api_player_id: pid,
        display_name: pid,
      }));

      const { error: pErr } = await supabase.from("players").upsert(playersUpsert, { onConflict: "api_player_id" });
      if (pErr) throw new Error(pErr.message);
    }

    const playerMatchRows = playerIds.map((pid) => {
      const stats = playerStatsMap[pid];
      const breakdown = computePlayerPointsFromScorecard(stats);
      return {
        api_match_id: "",  // will be set after match upsert
        api_player_id: pid,
        points: breakdown.total,
        breakdown,
      };
    });

    // Upsert match metadata
    const teamA = Array.isArray(m.raw?.teams) ? String(m.raw.teams[0] ?? "") : "";
    const teamB = Array.isArray(m.raw?.teams) ? String(m.raw.teams[1] ?? "") : "";
    const status = String(m.raw?.status ?? "");
    const resultText = String(m.raw?.result ?? "");

    const { error: matchErr } = await supabase.from("matches").upsert({
      api_match_id: matchId,
      match_date: startTimeISO.slice(0, 10),
      start_time: startTimeISO,
      completed_at: startTimeISO,
      team_a: teamA,
      team_b: teamB,
      status,
      result: resultText,
      last_synced_at: new Date().toISOString(),
    });

    if (matchErr) throw new Error(matchErr.message);

    // Upsert player_match_points (set match_id from upserted match)
    for (const row of playerMatchRows) {
      row.api_match_id = matchId;
    }
    if (playerMatchRows.length > 0) {
      const { error: pmpErr } = await supabase.from("player_match_points").upsert(playerMatchRows, { onConflict: "api_match_id,api_player_id" });
      if (pmpErr) throw new Error(pmpErr.message);
    }

    // Prepare quick lookup: player -> points
    const pointsByPlayer = new Map<string, number>();
    for (const row of playerMatchRows) pointsByPlayer.set(row.api_player_id, Number(row.points || 0));

    // Roll up team match points
    for (const t of teams || []) {
      const teamId = Number(t.id);

      const { data: roster, error: rosterErr } = await supabase
        .from("fantasy_team_players")
        .select("api_player_id, is_captain, is_vicecaptain")
        .eq("fantasy_team_id", teamId);

      if (rosterErr) throw new Error(rosterErr.message);

      let total = 0;
      for (const r of roster || []) {
        const raw = pointsByPlayer.get(String(r.api_player_id)) || 0;
        let mult = 1;
        if (r.is_captain) mult = 2;
        else if (r.is_vicecaptain) mult = 1.5;

        total += raw * mult;
      }

      const { error: tmpErr } = await supabase.from("team_match_points").upsert({
        api_match_id: matchId,
        fantasy_team_id: teamId,
        points: total,
      });

      if (tmpErr) throw new Error(tmpErr.message);
    }

    processed += 1;
    const tms = new Date(startTimeISO).getTime();
    if (tms > maxTime) maxTime = tms;
  }

  // Recompute leaderboard_cache
  const { data: allTeamPoints, error: atpErr } = await supabase
    .from("team_match_points")
    .select("fantasy_team_id, points");

  if (atpErr) throw new Error(atpErr.message);

  const totals = new Map<number, number>();

  // Initialize with manual adjustments
  for (const t of teams || []) {
    totals.set(t.id, Number(t.manual_adjustment_points || 0));
  }
  for (const row of allTeamPoints || []) {
    const id = Number(row.fantasy_team_id);
    const pts = Number(row.points || 0);
    totals.set(id, (totals.get(id) || 0) + pts);
  }

  for (const [teamId, totalPoints] of totals.entries()) {
    const { error: lbErr } = await supabase.from("leaderboard_cache").upsert({
      fantasy_team_id: teamId,
      total_points: totalPoints,
      last_updated: new Date().toISOString(),
    });
    if (lbErr) throw new Error(lbErr.message);
  }

  // Update sync_state boundary
  if (processed > 0) {
    const { error: ssErr } = await supabase
      .from("sync_state")
      .upsert({ id: 1, last_completed_match_time: new Date(maxTime).toISOString() });

    if (ssErr) throw new Error(ssErr.message);
  }

  return {
    processed,
    boundaryISO: processed > 0 ? new Date(maxTime).toISOString() : stateRow?.last_completed_match_time ?? null,
    debug: {
      matchesFromSeriesAPI: Array.isArray(all) ? all.length : `(not array: ${typeof all})`,
      completedInSeries: completed.length,
      afterBoundary: toProcess.length,
      syncBoundaryUsed: new Date(last).toISOString(),
      seriesId: process.env.CRICKETDATA_SERIES_ID ?? "(not set)",
      sampleMatch: Array.isArray(all) && all.length > 0 ? {
        id: all[0].id,
        name: all[0].name,
        status: all[0].status,
        matchEnded: all[0].matchEnded,
        dateTimeGMT: all[0].dateTimeGMT,
      } : (typeof all === "object" ? all : null),
    },
  };
}

// ---- Route handlers ----
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const fromParam = searchParams.get("from");

  // Auth: accept Vercel cron secret header OR admin key query param
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  const key = searchParams.get("key");
  const isVercelCron = cronSecret && authHeader === `Bearer ${cronSecret}`;
  const isAdminKey = key && key === process.env.ADMIN_KEY;
  if (!isVercelCron && !isAdminKey) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    let overrideTime: number | undefined;
    if (fromParam) {
      overrideTime = new Date(fromParam).getTime();
      if (isNaN(overrideTime)) throw new Error("Invalid 'from' date format (use YYYY-MM-DD)");
    }

    const out = await runSync(overrideTime);
    return NextResponse.json({ ok: true, ...out });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message ?? String(e) }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const key = String(body?.key ?? "");
  const auth = assertAdminKey(key);
  if (auth) return auth;

  try {
    let overrideTime: number | undefined;
    const fromParam = body?.from;
    if (fromParam) {
      overrideTime = new Date(fromParam).getTime();
      if (isNaN(overrideTime)) throw new Error("Invalid 'from' date format (use YYYY-MM-DD)");
    }

    const out = await runSync(overrideTime);
    return NextResponse.json({ ok: true, ...out });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message ?? String(e) }, { status: 500 });
  }
}
