import { useState, useEffect } from "react";
import { hatch } from "ldrs";
import { Line, Pie, Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  ArcElement,
  BarElement, // Add this
  BarController, // Add this
} from "chart.js";

hatch.register();
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement, // Add this
  BarController, // Add this
  Title,
  Tooltip,
  Legend,
  Filler,
  ArcElement
);

const SearchPlayer = () => {
  const [playerId, setPlayerId] = useState("");
  const [matchHistory, setMatchHistory] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searchHistory, setSearchHistory] = useState([]);

  useEffect(() => {
    // Load search history from local storage when the component mounts
    const history = JSON.parse(localStorage.getItem("searchHistory")) || [];
    setSearchHistory(history);
  }, []);

  const handleSearch = async (e) => {
    e.preventDefault();
    setError(null);
    setMatchHistory(null);

    if (!playerId) {
      setError("Please enter a player ID.");
      return;
    }

    try {
      setLoading(true);

      // Fetch player match history
      const playerResponse = await fetch(
        `http://localhost:4000/api/player/${playerId}`
      );
      if (!playerResponse.ok) {
        throw new Error("Failed to fetch player data");
      }
      const playerData = await playerResponse.json();

      // Fetch player matchup data
      const matchupResponse = await fetch(
        `http://localhost:4000/api/player/${playerId}/matchups`
      );
      if (!matchupResponse.ok) {
        throw new Error("Failed to fetch matchup data");
      }
      const matchupData = await matchupResponse.json();
      console.log("Matchup Data:", matchupData);

      // Combine data in the matchHistory state
      setMatchHistory({
        ...playerData,
        matchups: matchupData, // Add the matchup data here
      });

      // Update search history
      const updatedHistory = [
        playerId,
        ...searchHistory.filter((id) => id !== playerId),
      ];
      setSearchHistory(updatedHistory);
      localStorage.setItem("searchHistory", JSON.stringify(updatedHistory));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Transform matchHistory data to count cumulative wins and losses over time
  const dailyCounts = matchHistory
    ? matchHistory.wins.concat(matchHistory.losses).reduce((acc, item) => {
        const dateOnly = new Date(item.date).toISOString().split("T")[0];
        if (!acc[dateOnly]) {
          acc[dateOnly] = { wins: 0, losses: 0 };
        }
        if (matchHistory.wins.includes(item)) {
          acc[dateOnly].wins += 1;
        } else if (matchHistory.losses.includes(item)) {
          acc[dateOnly].losses += 1;
        }
        return acc;
      }, {})
    : {};

  const sortedDates = Object.keys(dailyCounts).sort();
  let cumulativeWins = 0;
  let cumulativeLosses = 0;
  const cumulativeWinCounts = [];
  const cumulativeLossCounts = [];
  const matchupData = matchHistory?.matchups?.matchups || [];

  console.log("Processed Matchup Data:", matchupData);

  sortedDates.forEach((date) => {
    cumulativeWins += dailyCounts[date].wins;
    cumulativeLosses += dailyCounts[date].losses;
    cumulativeWinCounts.push(cumulativeWins);
    cumulativeLossCounts.push(cumulativeLosses);
  });

  const lineChartData = {
    labels: sortedDates,
    datasets: [
      {
        label: "Wins",
        data: cumulativeWinCounts,
        backgroundColor: "rgba(75, 192, 192, 0.2)",
        borderColor: "rgba(75, 192, 192, 1)",
        fill: true,
        tension: 0.3,
      },
      {
        label: "Losses",
        data: cumulativeLossCounts,
        backgroundColor: "rgba(255, 99, 132, 0.2)",
        borderColor: "rgba(255, 99, 132, 1)",
        fill: true,
        tension: 0.3,
      },
    ],
  };

  const pieChartData = {
    labels: ["Wins", "Losses"],
    datasets: [
      {
        data: [cumulativeWins, cumulativeLosses],
        backgroundColor: ["rgba(75, 192, 192, 0.6)", "rgba(255, 99, 132, 0.6)"],
        borderColor: ["rgba(75, 192, 192, 1)", "rgba(255, 99, 132, 1)"],
        borderWidth: 1,
      },
    ],
  };

  const barChartData = {
    labels: matchupData.map((matchup) => matchup.opponent),
    datasets: [
      {
        label: "Win Rate (%)",
        data: matchupData.map((matchup) => matchup.winRate),
        backgroundColor: "rgba(54, 162, 235, 0.6)",
        borderColor: "rgba(54, 162, 235, 1)",
        borderWidth: 1,
      },
    ],
  };
  const barChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true,
        position: "top",
      },
      tooltip: {
        callbacks: {
          // Customize tooltip content
          label: function (context) {
            const matchup = matchupData[context.dataIndex];
            return [
              `Win Rate: ${matchup.winRate}%`,
              `Total Games: ${matchup.gamesPlayed}`,
              `Record: ${matchup.wins}W-${matchup.losses}L`,
            ];
          },
        },
      },
      title: {
        display: true,
        text: "Character Matchup Win Rates",
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        max: 100,
        title: {
          display: true,
          text: "Win Rate (%)",
        },
      },
      x: {
        title: {
          display: true,
          text: "Characters",
        },
      },
    },
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
          list="player-history"
        />
        <datalist id="player-history">
          {searchHistory.map((id, index) => (
            <option key={index} value={id} />
          ))}
        </datalist>
        <button type="submit">Search</button>
      </form>

      {error && <p style={{ color: "red" }}>{error}</p>}
      {loading ? (
        <div style={{ padding: "20px 0" }}>
          <l-hatch size="28" stroke="4" speed="3.5" color="black"></l-hatch>
        </div>
      ) : (
        matchHistory && (
          <div>
            <h3>Player: {matchHistory.playerName}</h3>

            {/* Line Chart Component */}
            <div className="line-chart-container">
              <Line
                data={lineChartData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: {
                      display: true,
                      position: "top",
                      labels: {
                        font: { size: window.innerWidth < 600 ? 10 : 14 },
                      },
                    },
                    title: {
                      display: true,
                      text: "Wins vs Losses",
                      font: { size: window.innerWidth < 600 ? 14 : 20 },
                    },
                  },
                  scales: {
                    x: {
                      title: {
                        display: true,
                        text: "Date",
                        font: { size: window.innerWidth < 600 ? 10 : 14 },
                      },
                    },
                    y: {
                      beginAtZero: true,
                      title: {
                        display: true,
                        text: "Matches",
                        font: { size: window.innerWidth < 600 ? 10 : 14 },
                      },
                    },
                  },
                }}
              />
            </div>

            {/* Pie Chart Component */}
            <div className="pie-chart-container">
              <Pie
                data={pieChartData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: {
                      display: true,
                      position: "top",
                      labels: {
                        font: { size: window.innerWidth < 600 ? 10 : 14 },
                      },
                    },
                    title: {
                      display: true,
                      text: "Total Wins vs Losses",
                      font: { size: window.innerWidth < 600 ? 14 : 20 },
                    },
                  },
                }}
              />
            </div>

            {matchHistory?.matchups?.matchups &&
            matchHistory.matchups.matchups.length > 0 ? (
              <div className="bar-chart-container">
                <Bar data={barChartData} options={barChartOptions} />
              </div>
            ) : (
              <p>No matchups data available.</p>
            )}
          </div>
        )
      )}
    </div>
  );
};

export default SearchPlayer;
