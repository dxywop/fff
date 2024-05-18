const express = require('express');
const fetch = require('node-fetch');
const crypto = require('crypto');
const cheerio = require('cheerio');
const NodeCache = require('node-cache');

const app = express();

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

const cache = new NodeCache({ stdTTL: 600 });

const md5 = (data) => crypto.createHash('md5').update(data).digest('hex');

const bypass = async (hwid) => {
  const hashedHwid = md5(hwid);

  const startUrl = `https://flux.li/android/external/start.php?HWID=${hwid}`;
  const check1Url = 'https://flux.li/android/external/check1.php';
  const mainUrl = 'https://flux.li/android/external/main.php';

  try {
    const cachedResult = cache.get(hwid);
    if (cachedResult) {
      return cachedResult;
    }

    await fetch(startUrl, { method: 'POST', headers });
    await fetch(check1Url, { headers });
    const response = await fetch(mainUrl, { headers });

    const text = await response.text();
    const $ = cheerio.load(text);
    const extractedKey = $('body > main > code').text().trim();

    if (extractedKey === hashedHwid) {
      const result = `Success:\nKey: ${hashedHwid}`;
      cache.set(hwid, result);
      return result;
    } else {
      return 'Error: Nuh Uhh';
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