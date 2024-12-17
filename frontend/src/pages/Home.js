import { useState, useEffect } from "react";
import MatchTable from "../components/MatchTable";
import { hatch } from "ldrs";
import ChartDataLabels from "chartjs-plugin-datalabels";
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
  ArcElement,
  ChartDataLabels
);

const SearchPlayer = () => {
  const [playerId, setPlayerId] = useState("");
  const [matchHistory, setMatchHistory] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searchHistory, setSearchHistory] = useState([]);
  const [highestRatedChar, setHighestRatedChar] = useState(null);

  const [suggestions, setSuggestions] = useState([]); // State for player suggestions

  // On component mount, load previous searches
  useEffect(() => {
    const history = JSON.parse(localStorage.getItem("searchHistory")) || [];
    setSearchHistory(history);
  }, []);

  // Fetch suggestions dynamically
  const handleInputChange = async (e) => {
    const query = e.target.value;
    setPlayerId(query);

    if (query.length > 1) {
      try {
        const response = await fetch(
          `http://localhost:4000/api/players/suggestions?q=${query}`
        );
        if (!response.ok) throw new Error("Failed to fetch suggestions");

        const data = await response.json();

        // Log the data to inspect the structure
        console.log("Suggestions Data:", data);

        const suggestionsData = data.players; // Extract the players array

        if (Array.isArray(suggestionsData)) {
          setSuggestions(suggestionsData); // Set only if data is an array
        } else {
          console.error("Suggestions data is not an array");
          setSuggestions([]); // Fallback to an empty array
        }
      } catch (err) {
        console.error("Suggestions Error:", err);
        setSuggestions([]); // Clear suggestions on error
      }
    } else {
      setSuggestions([]); // Clear suggestions if input is short
    }
  };

  const handlePlayerSelect = (e) => {
    const selectedName = e.target.value; // The player name selected
    const selectedPlayer = suggestions.find(
      (player) => player.name === selectedName
    );

    if (selectedPlayer) {
      setPlayerId(selectedPlayer.id); // Set the player ID to state
    }
  };

  // Handle search on form submission
  const handleSearch = async (e) => {
    e.preventDefault();
    setError(null);
    setMatchHistory(null);
    setHighestRatedChar(null);

    if (!playerId) {
      setError("Please enter a player ID.");
      return;
    }

    try {
      setLoading(true);

      // Fetch player data
      const playerResponse = await fetch(
        `http://localhost:4000/api/player/${playerId}`
      );
      if (!playerResponse.ok) throw new Error("Failed to fetch player data");
      const playerData = await playerResponse.json();

      // Fetch matchup data
      const matchupResponse = await fetch(
        `http://localhost:4000/api/player/${playerId}/matchups`
      );
      if (!matchupResponse.ok) throw new Error("Failed to fetch matchup data");
      const matchupData = await matchupResponse.json();

      // Fetch highest-rated character
      const ratingResponse = await fetch(
        `http://localhost:4000/api/player/${playerId}/highest-rating`
      );
      if (!ratingResponse.ok) throw new Error("Failed to fetch rating data");
      const ratingData = await ratingResponse.json();

      // Update states
      setMatchHistory({
        ...playerData,
        matchups: matchupData,
      });
      setHighestRatedChar(ratingData.highestRatedCharacter);

      // Update search history and localStorage
      const updatedHistory = [...searchHistory, playerId];
      localStorage.setItem("searchHistory", JSON.stringify(updatedHistory));
      setSearchHistory(updatedHistory);
    } catch (err) {
      console.error("Search Error:", err);
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

  sortedDates.forEach((date) => {
    cumulativeWins += dailyCounts[date].wins;
    cumulativeLosses += dailyCounts[date].losses;
    cumulativeWinCounts.push(cumulativeWins);
    cumulativeLossCounts.push(cumulativeLosses);
  });

  // --- Graphs --- //
  //Line chart
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

  const lineChartOptions = {
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
      datalabels: {
        display: false, // Disable datalabels for the line chart
      },
      tooltip: {
        enabled: true, // Show data on hover
        callbacks: {
          label: function (context) {
            const label = context.dataset.label || "";
            return `${label}: ${context.raw}`;
          },
        },
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
  };

  //Pie chart
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

  const pieChartOptions = {
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
      tooltip: {
        callbacks: {
          label: function (context) {
            const totalGames = cumulativeWins + cumulativeLosses;
            const winRate =
              totalGames > 0
                ? ((cumulativeWins / totalGames) * 100).toFixed(2)
                : 0;

            // Check if this is the 'Wins' slice of the pie chart
            if (context.label.includes("Wins")) {
              return `Wins: ${context.raw} (${winRate}%)`;
            } else {
              return `Losses: ${context.raw}`;
            }
          },
        },
      },
      title: {
        display: true,
        text: "Total Wins vs Losses",
        font: { size: window.innerWidth < 600 ? 14 : 20 },
      },
    },
  };

  // Bar graph
  const barChartData = {
    labels: matchupData.map((matchup) => matchup.opponent),
    datasets: [
      {
        label: "Win Rate (%)",
        data: matchupData.map((matchup) => matchup.winRate),
        backgroundColor: "rgba(75, 192, 192, 0.6)",
        borderColor: "rgba(75, 192, 192, 1)",
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
        enabled: true, // Always enable tooltip
        callbacks: {
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
      datalabels: {
        display: function (context) {
          // Only show data labels on larger screens
          return window.innerWidth >= 800;
        },
        color: "black",
        font: { size: 11 },
        formatter: function (value) {
          return `${value}%`;
        },
      },
      title: {
        display: true,
        text: "Character Matchup Win Rates",
        font: { size: window.innerWidth < 600 ? 14 : 20 },
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        max: 100,
        title: {
          display: true,
          text: "Win Rate (%)",
          font: { size: window.innerWidth < 600 ? 10 : 14 },
        },
      },
      x: {
        title: {
          display: true,
          text: "Characters",
          font: { size: window.innerWidth < 600 ? 10 : 14 },
        },
      },
    },
  };
  // Get the latest 10 matches from the match history
  // Get all matches from the match history
  const allMatches =
    matchHistory && matchHistory.wins && matchHistory.losses
      ? [...matchHistory.wins, ...matchHistory.losses].sort(
          (a, b) => new Date(b.date) - new Date(a.date) // Sort by date (newest first)
        )
      : [];

  return (
    <div className="search-player">
      <h2>Search for Player</h2>
      <div className="search-container">
        <form onSubmit={handleSearch}>
          <div className="search-input-wrapper">
            <span className="search-icon">🔍</span>
            <input
              type="text"
              placeholder="Search player..."
              value={playerId}
              onChange={handleInputChange}
              onInput={handlePlayerSelect}
              list="player-suggestions"
            />
            <button
              type="button"
              className="clear-button"
              onClick={() => setPlayerId("")}
            >
              ✖
            </button>

            {/* Datalist for player suggestions */}
            <datalist id="player-suggestions">
              {Array.isArray(suggestions) && suggestions.length > 0
                ? suggestions.map((player, index) => (
                    <option
                      key={index}
                      value={player.name}
                      data-id={player.id}
                    />
                  ))
                : null}
            </datalist>
            <p>Selected Player ID: {playerId}</p>
          </div>
        </form>
      </div>

      {error && <p style={{ color: "red" }}>{error}</p>}
      {loading ? (
        <div style={{ padding: "20px 0" }}>
          <l-hatch size="28" stroke="4" speed="3.5" color="black"></l-hatch>
        </div>
      ) : (
        matchHistory && (
          <div>
            <h3>Player: {matchHistory.playerName}</h3>
            {highestRatedChar && (
              <div className="highest-rated-char">
                <h4>
                  Highest Rated Character:{" "}
                  <span className="character-name">{highestRatedChar}</span>
                </h4>
              </div>
            )}

            {/* Main Graph Container */}
            <div className="graph-container">
              {/* Top Half: Line and Pie Charts */}
              <div className="charts-container">
                {/* Line Chart */}
                <div className="line-chart-container">
                  <Line data={lineChartData} options={lineChartOptions} />
                </div>

                {/* Pie Chart */}
                <div className="pie-chart-container">
                  <Pie data={pieChartData} options={pieChartOptions} />
                </div>
              </div>

              {/* Bottom Half: Bar Chart */}
              <div className="bar-chart-container">
                {matchupData.length > 0 ? (
                  <>
                    <Bar data={barChartData} options={barChartOptions} />
                    {/* Latest Matches Table */}
                    <MatchTable matches={allMatches} wins={matchHistory.wins} />
                  </>
                ) : (
                  <p>No matchups data available.</p>
                )}
              </div>
            </div>
          </div>
        )
      )}
    </div>
  );
};

export default SearchPlayer;
