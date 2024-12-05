require("dotenv").config();

const express = require("express");
const axios = require("axios");
const cheerio = require("cheerio");
const cors = require("cors");

// Express app setup
const app = express();

const redis = require("redis");
const client = redis.createClient(); // Create Redis client instance

// Connect to Redis
client.on("connect", () => {
  console.log("Connected to Redis");
});
client.on("error", (err) => {
  console.error("Redis error:", err);
});

app.use(cors()); // Enable CORS for all routes
// Use CORS middleware
app.get("/api/player/:id", async (req, res) => {
  const playerId = req.params.id;
  const url = `https://wank.wavu.wiki/player/${playerId}`;

  try {
    // Fetch data from the external URL
    const response = await axios.get(url);
    const html = response.data;

    // Load the HTML into Cheerio for parsing
    const $ = cheerio.load(html);

    let winData = [];
    let loseData = [];

    const playerName = $("section.player-header .name").text().trim();

    //Extracting player's name, win/loss gain, opponent name and ingame id
    $("tbody tr").each(function () {
      const dateCell = $(this).find("td:nth-child(1)");

      const p1CharacterCell = $(this).find("td:nth-child(2)");
      const p2CharacterCell = $(this).find("td:nth-child(6)");

      const playerRatingCell = $(this).find("td:nth-child(4)");
      const winSpan = playerRatingCell.find("span.win");
      const loseSpan = playerRatingCell.find("span.lose");

      const opponentCell = $(this).find("td:nth-child(5)");
      let opponentName = opponentCell.text().trim();
      const opponentId = opponentCell.find("a").attr("href")?.split("/").pop();

      // Clean up the opponent's name
      opponentName = opponentName
        .replace(/\s+/g, " ")
        .replace("(h2h)", "")
        .trim();

      const date = dateCell.text().trim();
      const playerChar = p1CharacterCell.text().trim();
      const oppChar = p2CharacterCell.text().trim();

      if (winSpan.length > 0) {
        winData.push({
          date: date,
          char: playerChar,
          opp: opponentName,
          oppId: opponentId,
          oppChar: oppChar,
          result: winSpan.text().trim(),
        });
      }

      if (loseSpan.length > 0) {
        loseData.push({
          date: date,
          char: playerChar,
          opp: opponentName,
          oppId: opponentId,
          oppChar: oppChar,
          result: loseSpan.text().trim(),
        });
      }
    });

    res.json({
      playerName: playerName,
      wins: winData,
      losses: loseData,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch player data" });
  }
});

// New endpoint for matchup data
app.get("/api/player/:id/matchups", async (req, res) => {
  const playerId = req.params.id;
  const url = `https://wank.wavu.wiki/player/${playerId}/matchups`;

  try {
    // Fetch data from the external URL
    const response = await axios.get(url);
    const html = response.data;

    // Load HTML into Cheerio for parsing
    const $ = cheerio.load(html);

    // Array to hold matchup data
    let matchups = [];

    // Loop through each row in the matchup table (adjust selectors as needed)
    $("tbody tr").each(function () {
      // Extract player name and opponent character
      const opponentCell = $(this).find("td:nth-child(1)");
      const opponentText = opponentCell.find("a").text().trim();

      // Extract the opponent character (e.g., "Kazuya")
      const opponentCharacter = opponentText.split("vs")[1]?.trim();

      // Extract games played as total of both values (e.g., 35 + 36)
      const gamesPlayedText = $(this)
        .find("td:nth-child(2) span")
        .text()
        .trim();
      const [wins, losses] = gamesPlayedText
        .split("–")
        .map((num) => parseInt(num.trim()));
      const gamesPlayed = wins + losses;

      // Extract win rate as a float
      const winRate = parseFloat($(this).find("td:nth-child(3)").text().trim());

      // Push parsed data into matchups array
      matchups.push({
        opponent: opponentCharacter, // use just the opponent character
        gamesPlayed: gamesPlayed, // total games played as sum of wins and losses
        wins: wins, // individual wins
        losses: losses, // individual losses
        winRate: winRate, // keeps decimal points
      });
    });

    // Send the matchup data as JSON response
    res.status(200).json({ matchups });
  } catch (error) {
    console.error(error);
    res.status(500).send("Error fetching matchup data");
  }
});

app.get("/api/player/:id/highest-rating", async (req, res) => {
  const playerId = req.params.id;
  const url = `https://wank.wavu.wiki/player/${playerId}`;

  try {
    const response = await axios.get(url);
    const html = response.data;
    const $ = cheerio.load(html);

    // Get the first rating-group and then its first rating
    const highestRatedCharacter = $(
      ".rating-group:first-child .rating:first-child .char"
    )
      .text()
      .trim();

    //console.log("Highest rated character found:", highestRatedCharacter);

    res.status(200).json({
      highestRatedCharacter: highestRatedCharacter,
    });
  } catch (error) {
    console.error("Error details:", error);
    res.status(500).json({
      error: "Error fetching highest rating data",
      details: error.message,
    });
  }
});

// Listen for requests
app.listen(process.env.PORT, () => {
  console.log("listening on port", process.env.PORT);
});
