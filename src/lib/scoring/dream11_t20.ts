// =============================================================
// Dream11 T20I Scoring – Complete Rules (2025)
// =============================================================

export interface PlayerStats {
  // Batting
  runs: number;
  ballsFaced: number;
  fours: number;
  sixes: number;
  isDismissed: boolean;  // was the player out?

  // Bowling
  wickets: number;
  maidens: number;
  overs: number;         // overs bowled (e.g. 3.4 = 3 overs 4 balls)
  runsConceded: number;
  lbwBowled: number;     // wickets that were LBW or bowled

  // Fielding
  catches: number;
  stumpings: number;
  runoutsDirect: number;
  runoutsIndirect: number;

  // Meta
  isPlaying: boolean;    // appeared in playing XI
  role: "BAT" | "WK" | "AR" | "BOWL";
}

export function emptyStats(role: PlayerStats["role"] = "BAT"): PlayerStats {
  return {
    runs: 0, ballsFaced: 0, fours: 0, sixes: 0, isDismissed: false,
    wickets: 0, maidens: 0, overs: 0, runsConceded: 0, lbwBowled: 0,
    catches: 0, stumpings: 0, runoutsDirect: 0, runoutsIndirect: 0,
    isPlaying: false, role,
  };
}

// --- Breakdown for transparency ---
export interface PointsBreakdown {
  playing: number;
  runs: number;
  fourBonus: number;
  sixBonus: number;
  milestoneBonus: number;
  duckPenalty: number;
  strikeRateBonus: number;
  wickets: number;
  lbwBowledBonus: number;
  wicketHaulBonus: number;
  maidenBonus: number;
  economyBonus: number;
  catchPoints: number;
  catchBonus: number;
  stumpingPoints: number;
  runoutPoints: number;
  total: number;
}

/**
 * Compute full Dream11 T20I points from a player's match stats.
 */
export function computePlayerPointsFromScorecard(stats: PlayerStats): PointsBreakdown {
  const b: PointsBreakdown = {
    playing: 0, runs: 0, fourBonus: 0, sixBonus: 0,
    milestoneBonus: 0, duckPenalty: 0, strikeRateBonus: 0,
    wickets: 0, lbwBowledBonus: 0, wicketHaulBonus: 0,
    maidenBonus: 0, economyBonus: 0,
    catchPoints: 0, catchBonus: 0, stumpingPoints: 0, runoutPoints: 0,
    total: 0,
  };

  // ---- Playing XI ----
  if (stats.isPlaying) b.playing = 4;

  // ---- BATTING ----
  b.runs = stats.runs;                        // +1 per run
  b.fourBonus = stats.fours * 1;              // +1 bonus per four
  b.sixBonus = stats.sixes * 2;               // +2 bonus per six

  // Milestone bonus (highest only)
  if (stats.runs >= 100) b.milestoneBonus = 16;
  else if (stats.runs >= 50) b.milestoneBonus = 8;
  else if (stats.runs >= 30) b.milestoneBonus = 4;  // some sources say 25 runs

  // Duck penalty (BAT, WK, AR only — not pure bowlers)
  if (stats.isDismissed && stats.runs === 0 && stats.role !== "BOWL") {
    b.duckPenalty = -2;
  }

  // Strike rate bonus/penalty (min 10 balls faced)
  if (stats.ballsFaced >= 10) {
    const sr = (stats.runs / stats.ballsFaced) * 100;
    if (sr > 170) b.strikeRateBonus = 6;
    else if (sr > 150) b.strikeRateBonus = 4;
    else if (sr >= 130) b.strikeRateBonus = 2;
    else if (sr < 50) b.strikeRateBonus = -6;
    else if (sr < 60) b.strikeRateBonus = -4;
    else if (sr < 70) b.strikeRateBonus = -2;
  }

  // ---- BOWLING ----
  b.wickets = stats.wickets * 25;             // +25 per wicket
  b.lbwBowledBonus = stats.lbwBowled * 8;     // +8 per LBW/bowled wicket

  // Wicket haul bonus (highest only)
  if (stats.wickets >= 5) b.wicketHaulBonus = 16;
  else if (stats.wickets >= 4) b.wicketHaulBonus = 8;
  else if (stats.wickets >= 3) b.wicketHaulBonus = 4;

  b.maidenBonus = stats.maidens * 12;         // +12 per maiden

  // Economy rate bonus/penalty (min 2 overs)
  const fullOvers = Math.floor(stats.overs) + (stats.overs % 1) * 10 / 6;
  if (fullOvers >= 2) {
    const balls = Math.floor(stats.overs) * 6 + Math.round((stats.overs % 1) * 10);
    const overs = balls / 6;
    const er = stats.runsConceded / overs;
    if (er < 5) b.economyBonus = 6;
    else if (er < 6) b.economyBonus = 4;
    else if (er <= 7) b.economyBonus = 2;
    else if (er >= 11) b.economyBonus = -6;
    else if (er >= 10) b.economyBonus = -4;
    else if (er >= 9) b.economyBonus = -2;
  }

  // ---- FIELDING ----
  b.catchPoints = stats.catches * 8;          // +8 per catch
  if (stats.catches >= 3) b.catchBonus = 4;   // +4 bonus for 3+ catches
  b.stumpingPoints = stats.stumpings * 12;    // +12 per stumping
  b.runoutPoints = (stats.runoutsDirect * 12) + (stats.runoutsIndirect * 6);

  // ---- TOTAL ----
  b.total = b.playing + b.runs + b.fourBonus + b.sixBonus +
    b.milestoneBonus + b.duckPenalty + b.strikeRateBonus +
    b.wickets + b.lbwBowledBonus + b.wicketHaulBonus +
    b.maidenBonus + b.economyBonus +
    b.catchPoints + b.catchBonus + b.stumpingPoints + b.runoutPoints;

  return b;
}

/**
 * Creates a stable player key from a name.
 */
export function normalizePlayerKey(name: string): string {
  return String(name || "unknown")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-");
}

/**
 * Converts CricketData match_scorecard response into per-player aggregated stats.
 */
export function normalizeMatchScorecardToPlayerStats(
  matchScorecard: any
): Record<string, PlayerStats> {
  const players: Record<string, PlayerStats> = {};

  function getPlayer(name: string): PlayerStats {
    const key = normalizePlayerKey(name);
    if (!players[key]) {
      players[key] = emptyStats();
      players[key].isPlaying = true;
    }
    return players[key];
  }

  const innings = matchScorecard?.data?.scorecard || [];

  for (const inn of innings) {
    // Batting
    for (const b of inn?.batting || []) {
      const p = getPlayer(b.name);
      p.runs += Number(b.runs || 0);
      p.ballsFaced += Number(b.balls || b.ballsFaced || 0);
      const fours = b.fours ?? b["4s"] ?? 0;
      const sixes = b.sixes ?? b["6s"] ?? 0;
      p.fours += Number(fours || 0);
      p.sixes += Number(sixes || 0);

      // Check if dismissed
      const dismissal = String(b.dismissal || b.howOut || "").toLowerCase();
      if (dismissal && dismissal !== "not out" && dismissal !== "batting" && dismissal !== "") {
        p.isDismissed = true;
      }
    }

    // Bowling
    for (const bw of inn?.bowling || []) {
      const p = getPlayer(bw.name);
      p.wickets += Number(bw.wickets || 0);
      p.maidens += Number(bw.maidens || 0);
      p.overs += Number(bw.overs || 0);
      p.runsConceded += Number(bw.runs || bw.runsConceded || 0);
    }

    // Fielding
    for (const f of inn?.fielding || []) {
      const p = getPlayer(f.name);
      p.catches += Number(f.catches || 0);
      p.stumpings += Number(f.stumpings || 0);
      // CricketData API doesn't always distinguish direct/indirect
      const ro = Number(f.runouts || f.runout || 0);
      p.runoutsDirect += ro;  // treat all as direct for now
    }
  }

  return players;
}
