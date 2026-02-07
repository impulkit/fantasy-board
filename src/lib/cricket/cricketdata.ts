import fetch from 'node-fetch';

const API_URL = 'https://api.example.com/cricket'; // Replace with actual API endpoint

/**
 * Fetch cricket match data from the external API.
 * @returns {Promise<Object>} Match data
 */
export const fetchMatchData = async () => {
    try {
        const response = await fetch(`${API_URL}/matches`);
        if (!response.ok) {
            throw new Error('Failed to fetch match data');
        }
        return await response.json();
    } catch (error) {
        console.error('Error fetching match data:', error);
        throw error;
    }
};

/**
 * Fetch cricket player data from the external API.
 * @param {string} playerId - ID of the player
 * @returns {Promise<Object>} Player data
 */
export const fetchPlayerData = async (playerId) => {
    try {
        const response = await fetch(`${API_URL}/players/${playerId}`);
        if (!response.ok) {
            throw new Error('Failed to fetch player data');
        }
        return await response.json();
    } catch (error) {
        console.error('Error fetching player data:', error);
        throw error;
    }
};