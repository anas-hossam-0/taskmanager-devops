const express = require('express');
const taskRoutes = require('./routes/tasks');

const app = express();

// Middleware
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Routes
app.use('/api/tasks', taskRoutes);

module.exports = app;