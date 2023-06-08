require('dotenv').config(); // Load environment variables from .env file

const express = require('express');
const bodyParser = require('body-parser');
const Redis = require('ioredis');

const app = express();
const redisURL = process.env.REDIS_URL || 'redis://localhost:6379'; // Get Redis URL from environment or use a default value
const client = new Redis(redisURL); // Create a new Redis client

// Middleware
app.use(bodyParser.json());

// Route to retrieve the mods with the highest counts from Redis
app.get('/top-mods', async (req, res) => {
    try {
      const number = parseInt(req.query.n) || 10; // Parse the 'n' query parameter as an integer, or use a default value of 10
  
      console.log('Number of mods to retrieve:', number);
  
      if (isNaN(number)) {
        console.log('Invalid or missing parameter: n');
        return res.status(400).json({ error: 'Invalid or missing parameter: n' });
      }
  
      // Fetch the mods with the highest counts from Redis
      const modsWithCounts = [];
  
      // Retrieve all mods from Redis
      const mods = await client.keys('*');
  
      console.log('Retrieved mods:', mods);
  
      // Retrieve the count for each mod
      for (const mod of mods) {
        const count = await client.get(mod);
        modsWithCounts.push({ mod, count });
      }
  
      // Sort the mods based on count in descending order
      modsWithCounts.sort((a, b) => b.count - a.count);
  
      // Limit the mods to the specified number
      const topMods = modsWithCounts.slice(0, number);
  
      console.log('Processed mods:', topMods);
  
      res.json({ mods: topMods });
    } catch (err) {
      console.error('Error retrieving top mods from Redis:', err);
      res.status(500).json({ error: 'Unable to retrieve top mods' });
    }
  });
  

// Route to retrieve the count of a specific mod from Redis
app.get('/mods/:mod', async (req, res) => {
  try {
    const mod = req.params.mod;

    // Retrieve the count of the specific mod key
    const count = await client.get(mod);

    res.json({ mod, count });
  } catch (err) {
    console.error('Error retrieving mod count from Redis:', err);
    res.status(500).json({ error: 'Unable to retrieve mod count' });
  }
});

// Route to retrieve the mods with the highest counts from Redis
app.get('/top-mods', async (req, res) => {
    try {
      const number = parseInt(req.query.n) || 10; // Parse the 'n' query parameter as an integer, or use a default value of 10
  
      console.log('Number of mods to retrieve:', number);
  
      if (isNaN(number)) {
        console.log('Invalid or missing parameter: n');
        return res.status(400).json({ error: 'Invalid or missing parameter: n' });
      }
  
      // Get the mods with the highest counts from Redis
      const modsWithCounts = [];
  
      // Fetch the mods and their counts from Redis
      const mods = await client.zrevrange('mods', 0, number - 1);
  
      console.log('Retrieved mods:', mods);
  
      // Retrieve the count for each mod
      for (const mod of mods) {
        const count = await client.hget('mod-counts', mod);
        modsWithCounts.push({ mod, count });
      }
  
      console.log('Processed mods:', modsWithCounts);
  
      res.json({ mods: modsWithCounts });
    } catch (err) {
      console.error('Error retrieving top mods from Redis:', err);
      res.status(500).json({ error: 'Unable to retrieve top mods' });
    }
  });
  
  
  

// Start the server
const port = 3000; // Specify the desired port number
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
