require("dotenv").config();

const express = require("express");
const axios = require("axios");
const cheerio = require("cheerio");
const cors = require("cors");

// Express app setup
const app = express();

const redis = require("redis");

// Create a Redis client
const client = redis.createClient();

const DEFAULT_EXPIRATION = 3600;

client.on("error", (err) => console.error("Redis Client Error", err));

// Ensure the client connects before using it
(async () => {
  await client.connect();
})();
app.use(cors()); // Enable CORS for all routes
// Use CORS middleware
app.get("/api/player/:id", async (req, res) => {
  const playerId = req.params.id;

  try {
    // Check Redis for cached data
    const cachedData = await client.get(`player_${playerId}`);
    if (cachedData) {
      console.log("Cache hit");
      return res.json(JSON.parse(cachedData));
    }

    // If no cache, fetch data from the external URL
    const url = `https://wank.wavu.wiki/player/${playerId}`;
    const response = await axios.get(url, { timeout: 10000 }); // 10-second timeout
    const html = response.data;
    const $ = cheerio.load(html);

    let winData = [];
    let loseData = [];
    const playerName = $("section.player-header .name").text().trim();

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

    const responseData = {
      playerName: playerName,
      wins: winData,
      losses: loseData,
    };

    // Cache data in Redis for 1 hour (3600 seconds)
    await client.setEx(
      `player_${playerId}`,
      DEFAULT_EXPIRATION,
      JSON.stringify(responseData)
    );

    res.json(responseData);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch player data" });
  }
});

app.get("/api/player/:id/matchups", async (req, res) => {
  const playerId = req.params.id;

  try {
    // Check Redis cache
    const cachedData = await client.get(`player_matchups_${playerId}`);
    if (cachedData) {
      console.log("Cache hit for matchups");
      return res.json(JSON.parse(cachedData));
    }

    // Fetch data from the external URL
    const url = `https://wank.wavu.wiki/player/${playerId}/matchups`;
    const response = await axios.get(url);
    const html = response.data;

    // Load HTML into Cheerio for parsing
    const $ = cheerio.load(html);

    // Array to hold matchup data
    let matchups = [];

    // Loop through each row in the matchup table (adjust selectors as needed)
    $("tbody tr").each(function () {
      const opponentCell = $(this).find("td:nth-child(1)");
      const opponentText = opponentCell.find("a").text().trim();
      const opponentCharacter = opponentText.split("vs")[1]?.trim();

      const gamesPlayedText = $(this)
        .find("td:nth-child(2) span")
        .text()
        .trim();
      const [wins, losses] = gamesPlayedText
        .split("–")
        .map((num) => parseInt(num.trim()));
      const gamesPlayed = wins + losses;

      const winRate = parseFloat($(this).find("td:nth-child(3)").text().trim());

      matchups.push({
        opponent: opponentCharacter,
        gamesPlayed: gamesPlayed,
        wins: wins,
        losses: losses,
        winRate: winRate,
      });
    });

    // Cache the data
    await client.setEx(
      `player_matchups_${playerId}`,
      DEFAULT_EXPIRATION,
      JSON.stringify({ matchups })
    );

    res.status(200).json({ matchups });
  } catch (error) {
    console.error(error);
    res.status(500).send("Error fetching matchup data");
  }
});

app.get("/api/player/:id/highest-rating", async (req, res) => {
  const playerId = req.params.id;

  try {
    // Check Redis cache
    const cachedData = await client.get(`player_highest_rating_${playerId}`);
    if (cachedData) {
      console.log("Cache hit for highest rating");
      return res.json(JSON.parse(cachedData));
    }

    // Fetch data from the external URL
    const url = `https://wank.wavu.wiki/player/${playerId}`;
    const response = await axios.get(url);
    const html = response.data;
    const $ = cheerio.load(html);

    // Get the first rating-group and then its first rating
    const highestRatedCharacter = $(
      ".rating-group:first-child .rating:first-child .char"
    )
      .text()
      .trim();

    // Cache the data
    await client.setEx(
      `player_highest_rating_${playerId}`,
      DEFAULT_EXPIRATION,
      JSON.stringify({ highestRatedCharacter })
    );

    res.status(200).json({ highestRatedCharacter });
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
