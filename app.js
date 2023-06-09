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
    const { mods, enabled } = req.body; // Assuming mods and enabled are sent as JSON in the request body

    // Check if all enabled mods are also in the mods array
    if (!enabled.every(mod => mods.includes(mod))) {
      return res.status(400).json({ error: 'Enabled mods must also be in the mods array' });
    }

    // Apply rate limiting
    await rateLimiter.consume(req.ip);

    // Increment the count for each mod in Redis
    for (const mod of mods) {
      if (enabled.includes(mod)) {
        const modCounts = await client.get(mod) || '0\n0'; // Get the mod counts from Redis or initialize them to 0
        const [modCount, enabledCount] = modCounts.split('\n').map(Number); // Split the mod counts string and convert to numbers
        await client.set(mod, `${modCount + 1}\n${enabledCount + 1}`); // Increment the mod count and enabled count
      } else {
        const modCounts = await client.get(mod) || '0\n0'; // Get the mod counts from Redis or initialize them to 0
        const [modCount, enabledCount] = modCounts.split('\n').map(Number); // Split the mod counts string and convert to numbers
        await client.set(mod, `${modCount + 1}\n${enabledCount}`); // Increment the mod count only
      }
    }

    res.json({ message: 'Mods tracked and enabled status stored successfully' });
  } catch (err) {
    console.error('Error tracking mods and storing enabled status in Redis:', err);
    res.status(500).json({ error: 'Unable to track mods and store enabled status' });
  }
});


// Route to retrieve the mods with the highest counts from Redis
app.get('/top-mods', async (req, res) => {
  try {
    const number = parseInt(req.query.n) || 10; // Parse the 'n' query parameter as an integer, or use a default value of 10
    const offset = parseInt(req.query.offset) || 0; // Parse the 'offset' query parameter as an integer, or use a default value of 0
    const sort = req.query.sort || 'total'; // Parse the 'sort' query parameter as a string, or use a default value of 'total'

    console.log('Number of mods to retrieve:', number);
    console.log('Offset:', offset);
    console.log('Sort order:', sort);

    if (isNaN(number) || isNaN(offset)) {
      console.log('Invalid or missing parameter: n or offset');
      return res.status(400).json({ error: 'Invalid or missing parameter: n or offset' });
    }

    // Get the mods with the highest counts from Redis
    const modsWithCounts = [];

    // Retrieve all mods from Redis
    const mods = await client.keys('*');

    console.log('Retrieved mods:', mods);

    // Retrieve the count and enabled status for each mod
    for (const mod of mods) {
      const counts = await client.get(mod);
      const [totalCount, enabledCount] = counts.split('\n').map(Number); // Split the counts string and convert to numbers
      modsWithCounts.push({ mod, totalCount, enabledCount });
    }

    // Sort the mods based on the specified sort order
    if (sort === 'total') {
      modsWithCounts.sort((a, b) => b.totalCount - a.totalCount);
    } else if (sort === 'enabled') {
      modsWithCounts.sort((a, b) => b.enabledCount - a.enabledCount);
    } else {
      console.log('Invalid sort parameter:', sort);
      return res.status(400).json({ error: 'Invalid sort parameter' });
    }

    // Limit the mods to the specified number
    const topMods = modsWithCounts.slice(offset, offset + number);

    console.log('Processed mods:', topMods);

    res.json({ mods: topMods });
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
