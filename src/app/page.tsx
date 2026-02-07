import React from 'react';

const Leaderboard = () => {
    const teams = [
        { name: 'Team A', points: 150 },
        { name: 'Team B', points: 120 },
        { name: 'Team C', points: 100 },
    ];

    return (
        <div>
            <h1>Fantasy Teams Leaderboard</h1>
            <table>
                <thead>
                    <tr>
                        <th>Team Name</th>
                        <th>Total Points</th>
                    </tr>
                </thead>
                <tbody>
                    {teams.map((team, index) => (
                        <tr key={index}>
                            <td>{team.name}</td>
                            <td>{team.points}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

export default Leaderboard;