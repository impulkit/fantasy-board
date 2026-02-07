import React, { useState } from 'react';

const TeamsPage = () => {
    const [teams, setTeams] = useState([]);
    const [newTeam, setNewTeam] = useState('');

    const handleTeamChange = (e) => {
        setNewTeam(e.target.value);
    };

    const handleAddTeam = () => {
        if (newTeam) {
            setTeams([...teams, newTeam]);
            setNewTeam('');
        }
    };

    const handleRemoveTeam = (index) => {
        const updatedTeams = teams.filter((_, i) => i !== index);
        setTeams(updatedTeams);
    };

    return (
        <div>
            <h1>Manage Fantasy Teams</h1>
            <input 
                type='text' 
                value={newTeam} 
                onChange={handleTeamChange} 
                placeholder='Enter team name' 
            />
            <button onClick={handleAddTeam}>Add Team</button>
            <ul>
                {teams.map((team, index) => (
                    <li key={index}>
                        {team} <button onClick={() => handleRemoveTeam(index)}>Remove</button>
                    </li>
                ))}
            </ul>
        </div>
    );
};

export default TeamsPage;
