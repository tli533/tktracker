import { useEffect, useState } from 'react'

const Home= () => {
    const [matchHistory, setMatchHistory] = useState(null)

    useEffect(() => {
        const fetchMatchHistory = async () => {
            const response = await fetch('http://localhost:3000/api/player/2rfr5TL7y3Ja')
            const json = await response.json()

            if (response.ok) {
                setMatchHistory(json)
            } else {
                console.error('failed to fetch')
            }
        }

        fetchMatchHistory()
    }, [])


    return (
        <div className="home">
            <h2>Home</h2>
            {matchHistory && (
                <div>
                    <p>Wins: {matchHistory.wins.length}</p>
                    <p>Losses: {matchHistory.losses.length}</p>
                </div>
            )}
        </div>
    )
}

export default Home