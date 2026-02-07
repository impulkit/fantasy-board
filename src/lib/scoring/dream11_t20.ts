// Dream11 T20 Scoring Rules (Simplified)
// - Runs: +1
// - Four bonus: +1
// - Six bonus: +2
// - Wicket: +25
// - Maiden: +8
// - Catch: +8
// - Stumping: +12
// - Runout: +6
//
// This module contains TWO layers:
// 1) normalizeMatchScorecardToPlayerStats(matchScorecard): converts CricketData match_scorecard JSON to per-player aggregated stats
// 2) computePlayerPointsFromScorecard(playerStats): computes Dream11 points for ONE player's aggregated stats

/**
 * Computes points for ONE player from aggregated stats.
 * @param {Object} playerStats - Aggregated stats for one player.
 * @returns {number} points
 */
function computePlayerPointsFromScorecard(playerStats) {
  let points = 0;

  points += Number(playerStats.runs || 0); // runs +1
  points += Number(playerStats.fours || 0) * 1; // four bonus +1
  points += Number(playerStats.sixes || 0) * 2; // six bonus +2

  points += Number(playerStats.wickets || 0) * 25; // wicket +25
  points += Number(playerStats.maidens || 0) * 8; // maiden +8

  points += Number(playerStats.catches || 0) * 8; // catch +8
  points += Number(playerStats.stumpings || 0) * 12; // stumping +12
  points += Number(playerStats.runouts || 0) * 6; // runout +6

  return points;
}

/**
 * Creates a stable player key from a name.
 * For MVP, we use normalized name as the player id.
 * IMPORTANT: Your admin roster should store the same normalized key.
 */
function normalizePlayerKey(name) {
  return String(name || "unknown")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Converts CricketData match_scorecard response into per-player aggregated stats.
 * Output shape:
 * {
 *   "virat kohli": { runs, fours, sixes, wickets, maidens, catches, stumpings, runouts },
 *   "jasprit bumrah": { ... }
 * }
 *
 * @param {Object} matchScorecard - Full CricketData match_scorecard JSON
 * @returns {Object<string, Object>} per-player aggregated stats
 */
function normalizeMatchScorecardToPlayerStats(matchScorecard) {
  const players = {};

  function getPlayer(name) {
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

  // CricketData typical path: scorecard.data.scorecard = innings[]
  const innings = matchScorecard?.data?.scorecard || [];

  for (const inn of innings) {
    // Batting array
    for (const b of inn?.batting || []) {
      const p = getPlayer(b.name);

      p.runs += Number(b.runs || 0);

      // Some APIs use fours/sixes, some use 4s/6s
      const fours = b.fours ?? b["4s"] ?? 0;
      const sixes = b.sixes ?? b["6s"] ?? 0;

      p.fours += Number(fours || 0);
      p.sixes += Number(sixes || 0);
    }

    // Bowling array
    for (const bw of inn?.bowling || []) {
      const p = getPlayer(bw.name);

      p.wickets += Number(bw.wickets || 0);
      p.maidens += Number(bw.maidens || 0);
    }

    // Fielding array (may be missing in some scorecards)
    for (const f of inn?.fielding || []) {
      const p = getPlayer(f.name);

      p.catches += Number(f.catches || 0);
      p.stumpings += Number(f.stumpings || 0);
      p.runouts += Number(f.runouts || 0);
    }
  }

  return players;
}

module.exports = {
  computePlayerPointsFromScorecard,
  normalizeMatchScorecardToPlayerStats,
  normalizePlayerKey, // export this so admin can store consistent player keys if needed
};
