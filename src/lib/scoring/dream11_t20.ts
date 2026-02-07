// Dream11 T20 Scoring Rules

/**
 * Computes the player points based on the scorecard for Dream11 T20
 *
 * @param {Object} scorecard - The scorecard object containing player stats.
 * @returns {number} - The computed player points.
 */
function computePlayerPointsFromScorecard(scorecard) {
    let points = 0;
    points += scorecard.runs || 0; // runs +1
    points += (scorecard.fours || 0) * 1; // four bonus +1
    points += (scorecard.sixes || 0) * 2; // six bonus +2
    points += (scorecard.wickets || 0) * 25; // wicket +25
    points += (scorecard.maidens || 0) * 8; // maiden +8
    points += (scorecard.catches || 0) * 8; // catch +8
    points += (scorecard.stumpings || 0) * 12; // stumping +12
    points += (scorecard.runouts || 0) * 6; // runout +6
    return points;
}

// Exporting the function for use in other modules
module.exports = { computePlayerPointsFromScorecard };