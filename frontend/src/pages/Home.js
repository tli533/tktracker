import { useEffect, useState } from 'react'

const Home = () => {
    const [matchHistory, setMatchHistory] = useState(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)  // Add error state

    useEffect(() => {
        const fetchMatchHistory = async () => {
            try {
                setLoading(true);  // Start loading
                setError(null);    // Reset error before fetching
                const response = await fetch('http://localhost:4000/api/player/2rfr5TL7y3Ja');
                
                if (!response.ok) {
                    throw new Error('Failed to fetch data');  // Throw error if response is not OK
                }

                const json = await response.json();
                setMatchHistory(json);  // Set match history data if fetch is successful
            } catch (err) {
                setError(err.message);  // Catch and set error message if fetch fails
            } finally {
                setLoading(false);  // Stop loading after fetch completes
            }
        }

        fetchMatchHistory();
    }, [])


    return (
        <div className="home">
            <h2>Home</h2>
            {error && <p style={{ color: 'red' }}>{error}</p>}
            {loading ? (  // Show loading indicator if loading
                <p>Loading...</p>
            ) : (
                matchHistory && (  // Show match history once data is fetched
                    <div>
                        <h3>Player: {matchHistory.playerName}</h3>
                        <p>Wins: {matchHistory.wins.length}</p>
                        <p>Losses: {matchHistory.losses.length}</p>
                    </div>
                )
            )}
        </div>
    )
}

export default Home