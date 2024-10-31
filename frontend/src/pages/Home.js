import { useState } from 'react';
import { hatch } from 'ldrs';
import { Line } from 'react-chartjs-2';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
    Filler
} from 'chart.js';

hatch.register();
ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler);

const SearchPlayer = () => {
    const [playerId, setPlayerId] = useState('');
    const [matchHistory, setMatchHistory] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const handleSearch = async (e) => {
        e.preventDefault();
        setError(null);
        setMatchHistory(null);
        if (!playerId) {
            setError('Please enter a player ID.');
            return;
        }

        try {
            setLoading(true);
            const response = await fetch(`http://localhost:4000/api/player/${playerId}`);

            if (!response.ok) {
                throw new Error('Failed to fetch data');
            }

            const json = await response.json();
            setMatchHistory(json);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

// Transform matchHistory data to count cumulative wins and losses over time
const dailyCounts = matchHistory ? matchHistory.wins.concat(matchHistory.losses).reduce((acc, item) => {
    // Convert date to consistent YYYY-MM-DD format
    const dateOnly = new Date(item.date).toISOString().split('T')[0];

    // Initialize the date entry if it doesn't exist
    if (!acc[dateOnly]) {
        acc[dateOnly] = { wins: 0, losses: 0 };
    }

    // Count each win or loss as 1 for the date
    if (matchHistory.wins.includes(item)) {
        acc[dateOnly].wins += 1;
    } else if (matchHistory.losses.includes(item)) {
        acc[dateOnly].losses += 1;
    }

    return acc;
}, {}) : {};

// Sort dates and calculate cumulative totals
const sortedDates = Object.keys(dailyCounts).sort();
let cumulativeWins = 0;
let cumulativeLosses = 0;
const cumulativeWinCounts = [];
const cumulativeLossCounts = [];

// Calculate cumulative totals for each date
sortedDates.forEach(date => {
    cumulativeWins += dailyCounts[date].wins;
    cumulativeLosses += dailyCounts[date].losses;
    cumulativeWinCounts.push(cumulativeWins);
    cumulativeLossCounts.push(cumulativeLosses);
});


// Configure the chart data
const chartData = {
    labels: sortedDates,
    datasets: [
        {
            label: 'Cumulative Wins',
            data: cumulativeWinCounts,
            backgroundColor: 'rgba(75, 192, 192, 0.2)',
            borderColor: 'rgba(75, 192, 192, 1)',
            fill: true,
            tension: 0.3,
        },
        {
            label: 'Cumulative Losses',
            data: cumulativeLossCounts,
            backgroundColor: 'rgba(255, 99, 132, 0.2)',
            borderColor: 'rgba(255, 99, 132, 1)',
            fill: true,
            tension: 0.3,
        }
    ],
};



    return (
        <div className="search-player">
            <h2>Search for Player</h2>
            <form onSubmit={handleSearch}>
                <input
                    type="text"
                    placeholder="Enter Player ID"
                    value={playerId}
                    onChange={(e) => setPlayerId(e.target.value)}
                />
                <button type="submit">Search</button>
            </form>

            {error && <p style={{ color: 'red' }}>{error}</p>}
            {loading ? (
                <div style={{ padding: '20px 0' }}>
                    <l-hatch size="28" stroke="4" speed="3.5" color="black"></l-hatch>
                </div>
            ) : (
                matchHistory && (
                    <div>
                        <h3>Player: {matchHistory.playerName}</h3>
                        <Line data={chartData} options={{
                            responsive: true,
                            plugins: {
                                legend: { display: true, position: 'top' },
                                title: { display: true, text: 'Wins vs Losses' },
                            },
                            scales: {
                                x: {
                                    title: { display: true, text: 'Date' }
                                },
                                y: { beginAtZero: true, title: { display: true, text: 'Count' } }
                            }
                        }} />
                    </div>
                )
            )}
        </div>
    );
};

export default SearchPlayer;
