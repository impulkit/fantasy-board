// Dream11 T20 Scoring Rules Implementation

class Dream11T20Scoring {
    static calculatePlayerPoints(playerStats) {
        let points = 0;

        // Example scoring rules
        points += playerStats.runs * 1; // 1 point per run
        points += playerStats.fours * 1; // 1 point per four
        points += playerStats.sixes * 2; // 2 points per six
        points += playerStats.wickets * 25; // 25 points per wicket
        points -= playerStats.oversBowled * 5; // 5 points deduction per over bowled
        points += playerStats.catches * 10; // 10 points per catch
        points += playerStats.stumpings * 10; // 10 points per stumping

        return points;
    }

    static calculateTeamPoints(teamStats) {
        let totalPoints = 0;

        // Calculate total points based on players' points
        for (const player of teamStats.players) {
            totalPoints += this.calculatePlayerPoints(player);
        }

        return totalPoints;
    }
}

// Export for external use
export default Dream11T20Scoring;