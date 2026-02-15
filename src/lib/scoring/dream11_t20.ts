// Dream11 T20 Scoring Rules
// - Runs: +1
// - Four bonus: +1
// - Six bonus: +2
// - Wicket: +25
// - Maiden: +8
// - Catch: +8
// - Stumping: +12
// - Runout: +6

export interface PlayerStats {
  runs: number;
  fours: number;
  sixes: number;
  wickets: number;
  maidens: number;
  catches: number;
  stumpings: number;
  runouts: number;
}

/**
 * Computes Dream11 points for ONE player from aggregated stats.
 */
export function computePlayerPointsFromScorecard(playerStats: PlayerStats): number {
  let points = 0;

  points += Number(playerStats.runs || 0);
  points += Number(playerStats.fours || 0) * 1;
  points += Number(playerStats.sixes || 0) * 2;

  points += Number(playerStats.wickets || 0) * 25;
  points += Number(playerStats.maidens || 0) * 8;

  points += Number(playerStats.catches || 0) * 8;
  points += Number(playerStats.stumpings || 0) * 12;
  points += Number(playerStats.runouts || 0) * 6;

  return points;
}

/**
 * Creates a stable player key from a name.
 */
export function normalizePlayerKey(name: string): string {
  return String(name || "unknown")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
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
      players[key] = {
        runs: 0,
        fours: 0,
        sixes: 0,
        wickets: 0,
        maidens: 0,
        catches: 0,
        stumpings: 0,
        runouts: 0,
      };
    }
    return players[key];
  }

  const innings = matchScorecard?.data?.scorecard || [];

  for (const inn of innings) {
    for (const b of inn?.batting || []) {
      const p = getPlayer(b.name);
      p.runs += Number(b.runs || 0);
      const fours = b.fours ?? b["4s"] ?? 0;
      const sixes = b.sixes ?? b["6s"] ?? 0;
      p.fours += Number(fours || 0);
      p.sixes += Number(sixes || 0);
    }

    for (const bw of inn?.bowling || []) {
      const p = getPlayer(bw.name);
      p.wickets += Number(bw.wickets || 0);
      p.maidens += Number(bw.maidens || 0);
    }

    for (const f of inn?.fielding || []) {
      const p = getPlayer(f.name);
      p.catches += Number(f.catches || 0);
      p.stumpings += Number(f.stumpings || 0);
      p.runouts += Number(f.runouts || 0);
    }
  }

  return players;
}
