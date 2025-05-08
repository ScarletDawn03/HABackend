const express = require('express');
const cors = require('cors');

// Initialize the app
const app = express();


// Use CORS middleware to allow cross-origin requests
app.use(cors());

// Set up middleware to parse JSON request bodies
app.use(express.json());

const PORT = process.env.PORT || 8080;

// Test route
app.get('/api/test', (req, res) => {
  res.json({ message: 'Hello from backend!' });
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
