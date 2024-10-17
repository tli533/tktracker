require('dotenv').config()

const express = require('express')
const axios = require('axios')
const cheerio = require('cheerio');

//express app
const app = express()

app.get('/api/player/:id', async (req, res) => {
    const playerId = req.params.id;
    const url = `https://wank.wavu.wiki/player/${playerId}`;

    try {
        // Fetch data from the external URL
        const response = await axios.get(url);
        const html = response.data;

        // Load the HTML into Cheerio for parsing
        const $ = cheerio.load(html);

        // Create arrays to store win and lose data
        let winData = [];
        let loseData = [];

        // Loop through each table row in the replay table
        $('tbody tr').each(function(i, elem) {
            // Find the rating data column for the player 
            const playerRatingCell = $(this).find('td:nth-child(4)');

            // Check for a win or loss in the player's rating cell
            const winSpan = playerRatingCell.find('span.win');
            const loseSpan = playerRatingCell.find('span.lose');

            // If a win span is found, add it to winData
            if (winSpan.length > 0) {
                winData.push(winSpan.text().trim());
            }

            // If a lose span is found, add it to loseData
            if (loseSpan.length > 0) {
                loseData.push(loseSpan.text().trim());
            }
        });
        // Send the win and lose data as JSON response
        res.status(200).json({
            wins: winData,
            losses: loseData
        });


    } catch (error) {
        console.error(error);
        res.status(500).send('Error fetching data');
    }
});

// listen for requests
app.listen(process.env.PORT, () => {
    console.log('listening on port', process.env.PORT)
})


