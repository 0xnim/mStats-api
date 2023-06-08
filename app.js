require('dotenv').config(); // Load environment variables from .env file

const express = require('express');
const redis = require('redis');
const bodyParser = require('body-parser');

const app = express();
const redisURL = process.env.REDIS_URL || 'redis://localhost:6379'; // Get Redis URL from environment or use a default value
const client = redis.createClient(redisURL); // Connect to the Redis server

// Middleware
app.use(bodyParser.json());

// Route to track mods and store them in Redis
app.post('/track-mods', (req, res) => {
  const mods = req.body.mods; // Assuming mods is sent as JSON in the request body

  // Store the mods data in Redis
  client.set('mods', JSON.stringify(mods), (err) => {
    if (err) {
      console.error('Error storing mods in Redis:', err);
      res.status(500).json({ error: 'Unable to store mods data' });
    } else {
      res.json({ message: 'Mods data stored successfully' });
    }
  });
});

// Route to retrieve tracked mods from Redis
app.get('/mods', (req, res) => {
  // Retrieve the mods data from Redis
  client.get('mods', (err, mods) => {
    if (err) {
      console.error('Error retrieving mods from Redis:', err);
      res.status(500).json({ error: 'Unable to retrieve mods data' });
    } else {
      res.json({ mods: JSON.parse(mods) });
    }
  });
});

// Start the server
const port = 3000; // Specify the desired port number
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
