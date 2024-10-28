require('dotenv').config();

const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const cors = require('cors');

// Express app setup
const app = express();

// Use CORS middleware
app.use(cors()); // Enable CORS for all routes

app.get('/api/player/:id', async (req, res) => {
    const playerId = req.params.id;
    const url = `https://wank.wavu.wiki/player/${playerId}`;

    try {
        // Fetch data from the external URL
        const response = await axios.get(url);
        const html = response.data;

        // Load the HTML into Cheerio for parsing
        const $ = cheerio.load(html);

        // Create arrays to store win and lose data with dates
        let winData = [];
        let loseData = [];

        // Extract player's name from the appropriate div in player-header section
        const playerName = $('section.player-header .name').text().trim();

        // Loop through each table row in the replay table
        $('tbody tr').each(function(i, elem) {
            // Find the date column for each match (adjust based on actual structure)
            const dateCell = $(this).find('td:nth-child(1)'); // Assuming the date is in the first column

            // Find the rating data column for the player 
            const playerRatingCell = $(this).find('td:nth-child(4)');

            // Check for a win or loss in the player's rating cell
            const winSpan = playerRatingCell.find('span.win');
            const loseSpan = playerRatingCell.find('span.lose');

            const date = dateCell.text().trim();
             // If a win span is found, add the date and result to winData
    if (winSpan.length > 0) {
        winData.push({
            date: date,
            result: winSpan.text().trim()
        });
    }

    // If a lose span is found, add the date and result to loseData
    if (loseSpan.length > 0) {
        loseData.push({
            date: date,
            result: loseSpan.text().trim()
        });
    }
        });

        // Send the win and lose data with dates as JSON response
        res.status(200).json({
            playerName: playerName,
            wins: winData,
            losses: loseData
        });

    } catch (error) {
        console.error(error);
        res.status(500).send('Error fetching data');
    }
});

// Listen for requests
app.listen(process.env.PORT, () => {
    console.log('listening on port', process.env.PORT);
});
