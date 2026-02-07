import axios from 'axios';

const baseURL = 'https://api.cricapi.com/v1';
const CRICKETDATA_API_KEY = process.env.CRICKETDATA_API_KEY;
const CRICKETDATA_SERIES_ID = process.env.CRICKETDATA_SERIES_ID;

const fetchMatches = async () => {
    try {
        const response = await axios.get(`${baseURL}/matches`, {
            headers: {
                'apikey': CRICKETDATA_API_KEY,
            },
            params: {
                seriesId: CRICKETDATA_SERIES_ID
            }
        });
        return response.data;
    } catch (error) {
        console.error('Error fetching matches:', error);
        throw error;
    }
};

const fetchScorecard = async (matchId) => {
    let attempts = 0;
    while (attempts < 3) {
        try {
            const response = await axios.get(`${baseURL}/scorecard/${matchId}`, {
                headers: {
                    'apikey': CRICKETDATA_API_KEY,
                }
            });
            return response.data;
        } catch (error) {
            attempts++;
            console.warn(`Attempt ${attempts} failed. Retrying...`);
            if (attempts === 3) {
                console.error('Error fetching scorecard:', error);
                throw error;
            }
        }
    }
};

const isMatchCompleted = (match) => {
    return match.status === 'completed';
};

const filterSeries = (matches) => {
    return matches.filter(match => match.seriesId === CRICKETDATA_SERIES_ID);
};

export { fetchMatches, fetchScorecard, filterSeries, isMatchCompleted };