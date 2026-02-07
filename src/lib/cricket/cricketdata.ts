import axios from 'axios';

const BASE_URL = 'https://cricketdataapi.com/api/matches';

async function fetchMatches() {
    try {
        const response = await axios.get(`${BASE_URL}`);
        return response.data;
    } catch (error) {
        console.error('Error fetching matches:', error);
        throw error;
    }
}

async function fetchScorecard(matchId: string) {
    try {
        const response = await axios.get(`${BASE_URL}/${matchId}/scorecard`);
        return response.data;
    } catch (error) {
        console.error(`Error fetching scorecard for match ${matchId}:`, error);
        throw error;
    }
}

function filterMatchesBySeries(matches: any[], seriesId: string) {
    return matches.filter(match => match.seriesId === seriesId);
}

function isMatchCompleted(match: any) {
    return match.status === 'completed';
}

async function retryApiCall(apiCall: () => Promise<any>, retries: number = 3): Promise<any> {
    for (let i = 0; i < retries; i++) {
        try {
            return await apiCall();
        } catch (error) {
            if (i === retries - 1) throw error;
        }
    }
}

function extractMatchTime(match: any): string {
    const matchTime = new Date(match.date_time);
    return matchTime.toISOString();
}

export {
    fetchMatches,
    fetchScorecard,
    filterMatchesBySeries,
    isMatchCompleted,
    retryApiCall,
    extractMatchTime,
};
