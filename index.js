const express = require('express');
const crypto = require('crypto');
const cheerio = require('cheerio');
const NodeCache = require('node-cache');
const fetch = (await import('node-fetch')).default; // Import early for Vercel


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

// MD5 hashing function
const md5 = (data) => crypto.createHash('md5').update(data).digest('hex');

// Main bypass function
async function bypass(hwid) {
  const hashedHwid = md5(hwid);  // Calculate MD5 hash of the provided HWID
  const urls = [ // URLs for sequential requests
    `https://flux.li/android/external/start.php?HWID=${hwid}`,
    'https://flux.li/android/external/check1.php',
    'https://flux.li/android/external/main.php'
  ];

  try {
    // Check if the result is already in the cache
    const cachedResult = cache.get(hwid);
    if (cachedResult) {
      return cachedResult;
    }

    const startFetchTime = process.hrtime.bigint(); // Start timing the fetches

    // Perform sequential requests in the order specified
    for (const [index, url] of urls.entries()) {
      await fetch(url, {
        method: index === 0 ? 'POST' : 'GET', // POST only for the first request
        headers 
      });
    }

    const endFetchTime = process.hrtime.bigint();
    const fetchDuration = (Number(endFetchTime - startFetchTime) / 1e9).toFixed(2) + " s"; // Calculate fetch duration

    // Re-fetch the last URL to get the final response
    const response = await fetch(urls[2], { headers });
    const $ = cheerio.load(await response.text()); 
    const extractedKey = $('body > main > code').text().trim();

    if (extractedKey === hashedHwid) { // Check if the extracted key matches
      const result = { status: "Success", key: hashedHwid, fetchDuration };
      cache.set(hwid, result);  // Cache successful result
      return result;
    } else {
      return { status: "Error", message: "Nuh Uhh" }; // Invalid response
    }
  } catch (error) {
    const cachedError = cache.get(error.config.url);
    if (cachedError) {
      return cachedError;
    }
    let message;

    if (error.response) {
      message = `Request error: ${error.response.status} - ${error.response.statusText}`;
    } else if (error.request) {
      message = `No response received - ${error.request}`;
    } else {
      message = `Error: ${error.message}`;
    }
    cache.set(error.config.url, message);
    return message;
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