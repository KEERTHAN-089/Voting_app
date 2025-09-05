const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();

// Configure CORS middleware
app.use(cors({
  origin: ['http://localhost:3001', 'http://192.168.31.23:3001'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

app.use(express.json());

// ...existing code for routes and server setup...

module.exports = app;