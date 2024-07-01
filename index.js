const express = require('express');
const cheerio = require('cheerio');
const NodeCache = require('node-cache');

const app = express();

// Cache setup with TTL and check period for efficiency
const cache = new NodeCache({
  stdTTL: 600, // 10 minutes
  checkperiod: 120 // 2 minutes
});

// Fetch and attempt to extract the key
async function fetchAndExtractKey() {
  const url = 'https://flux.li/android/external/main.php';

  try {
    // Dynamically import 'node-fetch'
    const { default: fetch } = await import('node-fetch');
    const response = await fetch(url, {
      method: 'GET'
    });

    const body = await response.text();
    const $ = cheerio.load(body);
    const extractedKey = $('body > main > code').text().trim();

    if (extractedKey) {
      return { status: "Success", key: extractedKey };
    } else {
      throw new Error("Key extraction failed");
    }
  } catch (error) {
    // Return a generic error message
    return { status: "Error", message: "An error occurred" };
  }
}

app.get('/api/extract', async (req, res) => {
  fetchAndExtractKey()
    .then(result => {
      res.json(result);
    })
    .catch(error => {
      // Send a generic error message without specifying "Nuh Uhh"
      res.status(500).json({ error: "An error occurred during processing." });
    });
});
// Catch-all route handler for undefined routes
app.all('*', (req, res) => {
  res.status(404).send('Resource not found.');
  
});

module.exports = app;
