require("dotenv").config();

const express = require("express");
const axios = require("axios");
const cheerio = require("cheerio");
const cors = require("cors");

// Express app setup
const app = express();

const redis = require("redis");

// Create a Redis client
const client = redis.createClient({
  username: process.env.REDIS_USERNAME,
  password: process.env.REDIS_PASSWORD,
  socket: {
    host: process.env.REDIS_HOST,
    port: parseInt(process.env.REDIS_PORT, 10), // Convert to a number
  },
});

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
    const url = `https://wank.wavu.wiki/player/${playerId}?limit=5000`;
    const response = await axios.get(url, { timeout: 10000 }); // 10-second timeout
    const html = response.data;
    const $ = cheerio.load(html);

    let winData = [];
    let loseData = [];
    const playerName = $("section.player-header .name").text().trim();

    $("tbody tr").each(function () {
      const dateCell = $(this).find("td:nth-child(1)");
      const p1CharacterCell = $(this).find("td:nth-child(2)");
      const p2CharacterCell = $(this).find("td:nth-child(4)");
      const playerRatingCell = $(this).find("td:nth-child(2)");
      const winSpan = playerRatingCell.find("span.win");
      const loseSpan = playerRatingCell.find("span.lose");

      const opponentCell = $(this).find("td:nth-child(4) .player"); // Correct cell for opponent
      const opponentName = opponentCell.find("a").text().trim();
      const opponentId = opponentCell.find("a").attr("href")?.split("/").pop();
      const oppChar = $(this).find("td:nth-child(4) .char").text().trim();

      let date = dateCell.text().trim();
      date = date
        .replace(/(printDateTime)/, "") // Removing the substring
        .replace(/\(\d+\)/, "")
        .trim();

      const playerChar = p1CharacterCell.find(".char").text().trim();

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

    // Filter out null or invalid entries
    matchups = matchups.filter(
      (matchup) =>
        matchup.opponent &&
        !isNaN(matchup.gamesPlayed) &&
        !isNaN(matchup.wins) &&
        !isNaN(matchup.losses) &&
        !isNaN(matchup.winRate)
    );

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

// Search suggestions endpoint
app.get("/api/players/suggestions", async (req, res) => {
  const query = req.query.q;

  if (!query) {
    return res.status(400).json({ error: "Query parameter 'q' is required" });
  }

  try {
    // Fetch the HTML from the external site
    const response = await axios.get(
      `https://wank.wavu.wiki/player/search?q=${encodeURIComponent(query)}`
    );
    const html = response.data;

    // Load the HTML into Cheerio
    const $ = cheerio.load(html);

    // Parse the dropdown table rows
    const players = [];
    $("div.container table tr").each((_, row) => {
      const rawId = $(row).find("td:nth-child(1)").text().trim();
      const rawName = $(row).find("td:nth-child(2)").text().trim();

      // Clean up the raw ID and name
      const cleanedId = rawId.replace(/\n+/g, "").trim(); // Remove newlines and extra spaces
      let cleanedName = rawName.replace(/\n+/g, "").trim(); // Remove newlines and extra spaces

      // Use regex to extract the ID (12 characters alphanumeric with hyphens)
      const idMatch = cleanedId.match(/[a-zA-Z0-9-]{14}/); // Match 12-character alphanumeric ID with hyphens (14)
      let id = cleanedId;
      let name = cleanedName;

      if (idMatch) {
        id = idMatch[0]; // Set the ID to the matched 12-character ID
        name = cleanedId.replace(id, "").trim(); // Extract the name by removing the ID part
      }

      // Fallback if no valid ID found: Clean up the ID to only alphanumeric characters
      if (!idMatch) {
        id = cleanedId.replace(/[^a-zA-Z0-9]/g, ""); // Remove non-alphanumeric characters
      }

      id = id.replace(/-/g, ""); // Remove all dashes

      // Clean the name further by removing platform info and numbers at the end
      // Remove occurrences of platform names like 'steam', 'playstation' and any digits after it
      name = name
        .replace(/\s+(steam|playstation|xbox|psn)\s+.*$/i, "") // Match and remove platform info and anything after
        .replace(/\s+/g, " ") // Collapse multiple spaces into one
        .trim();

      if (id && name) {
        players.push({
          id: id, // Alphanumeric ID
          name: name, // Player's name
        });
      }
    });

    // Get the remaining results count
    const remainingText = $("div.container").text();
    const match = remainingText.match(/(\d+)\s+remaining/i);
    const remaining = match ? parseInt(match[1], 10) : 0;

    // Prepare the response
    const responseData = {
      players: players.slice(0, 50), // Limit to 50 results
      remaining,
    };

    // Send the response
    res.json(responseData);
  } catch (error) {
    console.error("Error fetching search results:", error.message);
    res.status(500).json({ error: "Failed to fetch player suggestions" });
  }
});

app.get("/", (req, res) => {
  res.json({ mssg: "Welcome to the app" });
});

// Listen for requests
app.listen(process.env.PORT, () => {
  console.log("listening on port", process.env.PORT);
});
