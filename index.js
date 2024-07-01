const express = require('express');
const cheerio = require('cheerio');
const NodeCache = require('node-cache');

const app = express(); // Initialize the Express app

// Headers for mimicking browser requests
const headers = {
  Referer: 'https://linkvertise.com/',
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
  'Accept-Language': 'en-US,en;q=0.9',
  Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
  'Accept-Encoding': 'gzip, deflate, br',
  Connection: 'keep-alive',
  'Cache-Control': 'no-cache',
  Pragma: 'no-cache',
};

// Cache setup with TTL and checkperiod for efficiency
const cache = new NodeCache({
  stdTTL: 600, // 10 minutes
  checkperiod: 120 // 2 minutes
});

// Main bypass function
async function bypass(hwid) {
  const urls = [ // URLs for sequential requests
    `https://flux.li/android/external/start.php?HWID=${hwid}`,
    'https://flux.li/android/external/check1.php?hash=BZ69njzmM6dmjRfDB3cfrlbQY9IMvOAoYQELCmu6XoKOQ6OSPZnYcrk6zTB0DRZ0',
    'https://flux.li/android/external/main.php?hash=BZ69njzmM6dmjRfDB3cfrlbQY9IMvOAoYQELCmu6XoKOQ6OSPZnYcrk6zTB0DRZ0'
  ];

  try {
    // Check if the result is already in the cache
    const cachedResult = cache.get(hwid);
    if (cachedResult) {
      return cachedResult;
    }

    const startFetchTime = process.hrtime.bigint();
    const responses = [];

    // Perform sequential requests in the order specified
    for (const [index, url] of urls.entries()) {
      // Dynamically import 'node-fetch' within the loop
      const { default: fetch } = await import('node-fetch');
      const response = await fetch(url, { 
        method: index === 0 ? 'POST' : 'GET', 
        headers 
      });
      responses.push(response); // Store the response
    }

    const endFetchTime = process.hrtime.bigint();
    const fetchDuration = (Number(endFetchTime - startFetchTime) / 1e9).toFixed(2) + " s";

    // Optimized Cheerio Parsing:
    const $ = cheerio.load(await responses[2].text()); // Directly parse responses[2]
    const extractedKey = $('body > main > code').text().trim();

    // Since we are not checking against a hashed HWID, we just return the extracted key with a success status.
    const result = { status: "Success", key: extractedKey, fetchDuration };
    cache.set(hwid, result);
    return result;
  } catch (error) {
    let message = `Error: ${error.message}`;
    return { status: "Error", message };
  }
};

app.get('/api/bypass', async (req, res) => {
  const hwid = req.query.hwid;

  if (!hwid) {
    return res.status(400).json({ error: 'hwid is required' });
  }

  if (hwid.length < 32) {
    return res.status(400).json({ error: 'Invalid hwid.' });
  }

  bypass(hwid)
    .then(result => {
      res.json({ result });
    })
    .catch(error => {
      res.status(500).json({ error: `Error: ${error}` });
    });
});

// Catch-all route handler
app.all('*', (req, res) => {
  res.status(500).end();
});

module.exports = app;
