import { useState } from 'react';

const SearchPlayer = () => {
    const [playerId, setPlayerId] = useState(''); // State to hold the player ID from input
    const [matchHistory, setMatchHistory] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    // Function to handle form submission
    const handleSearch = async (e) => {
        e.preventDefault(); // Prevent page reload on form submit
        setError(null);     // Clear previous errors
        setMatchHistory(null); // Clear previous match history
        if (!playerId) {
            setError('Please enter a player ID.');
            return;
        }

        try {
            setLoading(true); // Start loading
            const response = await fetch(`http://localhost:4000/api/player/${playerId}`); // Use playerId from state

            if (!response.ok) {
                throw new Error('Failed to fetch data'); // Throw error if response is not OK
            }

            const json = await response.json();
            setMatchHistory(json); // Set match history data
        } catch (err) {
            setError(err.message); // Catch and set error message
        } finally {
            setLoading(false); // Stop loading after fetch completes
        }
    };

    return (
        <div className="search-player">
            <h2>Search for Player</h2>
            <form onSubmit={handleSearch}>
                <input
                    type="text"
                    placeholder="Enter Player ID"
                    value={playerId} // Controlled input bound to state
                    onChange={(e) => setPlayerId(e.target.value)} // Update playerId state on input change
                />
                <button type="submit">Search</button>
            </form>

            {error && <p style={{ color: 'red' }}>{error}</p>}
            {loading ? ( // Show loading indicator if loading
                <p>Loading...</p>
            ) : (
                matchHistory && ( // Show match history once data is fetched
                    <div>
                        <h3>Player: {matchHistory.playerName}</h3>
                        <p>Wins: {matchHistory.wins.length}</p>
                        <p>Losses: {matchHistory.losses.length}</p>
                    </div>
                )
            )}
        </div>
    );
};

export default SearchPlayer;
