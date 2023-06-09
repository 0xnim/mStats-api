require('dotenv').config(); // Load environment variables from .env file

const express = require('express');
const bodyParser = require('body-parser');
const Redis = require('ioredis');
const { RateLimiterMemory } = require('rate-limiter-flexible');

//discord
const { spawn } = require('child_process');

const botProcess = spawn('node', ['discord.js'], { stdio: 'inherit' });

botProcess.on('close', (code) => {
  console.log(`Discord bot process exited with code ${code}`);
});

const app = express();
const redisURL = process.env.REDIS_URL || 'redis://localhost:6379'; // Get Redis URL from environment or use a default value
const client = new Redis(redisURL); // Create a new Redis client

// Middleware
app.use(bodyParser.json());

// Configure rate limiter (1 request per hour)
const rateLimiter = new RateLimiterMemory({
  points: 1,
  duration: 3600, // 1 hour
});

// Health check route
app.get('/healthz', (req, res) => {
  res.json({ message: 'OK' });
});

// Route to track mods
app.post('/track-mods', async (req, res) => {
  try {
    const mods = req.body.mods; // Assuming mods is sent as JSON in the request body

    // Apply rate limiting
    await rateLimiter.consume(req.ip);

    // Increment the count for each mod
    for (const mod of mods) {
      await client.incr(mod); // Increment the count of the mod key
    }

    res.json({ message: 'Mods counted successfully' });
  } catch (err) {
    console.error('Error counting mods in Redis:', err);
    res.status(500).json({ error: 'Unable to count mods' });
  }
});

// Route to retrieve the mods with the highest counts from Redis
app.get('/top-mods', async (req, res) => {
  try {
    const number = parseInt(req.query.n) || 10; // Parse the 'n' query parameter as an integer, or use a default value of 10
    const offset = parseInt(req.query.offset) || 0; // Parse the 'offset' query parameter as an integer, or use a default value of 0

    console.log('Number of mods to retrieve:', number);
    console.log('Offset:', offset);

    if (isNaN(number) || isNaN(offset)) {
      console.log('Invalid or missing parameter: n or offset');
      return res.status(400).json({ error: 'Invalid or missing parameter: n or offset' });
    }

    // Get the mods with the highest counts from Redis
    const modsWithCounts = [];

    // Retrieve all mods from Redis
    const mods = await client.keys('*');

    console.log('Retrieved mods:', mods);

    // Sort the mods based on count in descending order
    mods.sort((a, b) => b - a);

    // Limit the mods to the specified number
    const topMods = mods.slice(offset, offset + number);

    console.log('Processed mods:', topMods);

    // Retrieve the count for each mod
    for (const mod of topMods) {
      const count = await client.get(mod);
      modsWithCounts.push({ mod, count });
    }

    res.json({ mods: modsWithCounts });
  } catch (err) {
    console.error('Error retrieving top mods from Redis:', err);
    res.status(500).json({ error: 'Unable to retrieve top mods' });
  }
});

// Route to retrieve the count of a specific mod from Redis
app.get('/mod/:mod', async (req, res) => {
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

// Start the server
const port = 3000; // Specify the desired port number
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
