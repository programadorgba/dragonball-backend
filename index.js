const express = require('express');
const axios = require('axios');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Base URL for Dragon Ball API
const DRAGONBALL_API_BASE_URL = 'https://dragonball-api.com/api';

// Routes

// Get all characters (with pagination)
app.get('/api/characters', async (req, res) => {
  try {
    const limit = req.query.limit || 20;
    const page = req.query.page || 1;
    
    const response = await axios.get(`${DRAGONBALL_API_BASE_URL}/characters?limit=${limit}&page=${page}`);
    
    res.json({
      items: response.data.items,
      meta: response.data.meta,
      links: response.data.links
    });
  } catch (error) {
    console.error('Error fetching characters:', error.message);
    res.status(500).json({ error: 'Failed to fetch characters data' });
  }
});

// Get character by ID
app.get('/api/characters/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const response = await axios.get(`${DRAGONBALL_API_BASE_URL}/characters/${id}`);
    
    const character = {
      id: response.data.id,
      name: response.data.name,
      ki: response.data.ki,
      maxKi: response.data.maxKi,
      race: response.data.race,
      gender: response.data.gender,
      description: response.data.description,
      image: response.data.image,
      affiliation: response.data.affiliation,
      deletedAt: response.data.deletedAt,
      originPlanet: response.data.originPlanet,
      transformations: response.data.transformations
    };

    res.json(character);
  } catch (error) {
    console.error('Error fetching character:', error.message);
    if (error.response && error.response.status === 404) {
      res.status(404).json({ error: 'Character not found' });
    } else {
      res.status(500).json({ error: 'Failed to fetch character data' });
    }
  }
});

// Get all planets
app.get('/api/planets', async (req, res) => {
  try {
    const limit = req.query.limit || 20;
    const page = req.query.page || 1;
    
    const response = await axios.get(`${DRAGONBALL_API_BASE_URL}/planets?limit=${limit}&page=${page}`);
    
    res.json({
      items: response.data.items,
      meta: response.data.meta,
      links: response.data.links
    });
  } catch (error) {
    console.error('Error fetching planets:', error.message);
    res.status(500).json({ error: 'Failed to fetch planets data' });
  }
});

// Get planet by ID
app.get('/api/planets/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const response = await axios.get(`${DRAGONBALL_API_BASE_URL}/planets/${id}`);
    
    res.json(response.data);
  } catch (error) {
    console.error('Error fetching planet:', error.message);
    if (error.response && error.response.status === 404) {
      res.status(404).json({ error: 'Planet not found' });
    } else {
      res.status(500).json({ error: 'Failed to fetch planet data' });
    }
  }
});

// Search characters by name
app.get('/api/characters/search/:name', async (req, res) => {
  try {
    const { name } = req.params;
    const response = await axios.get(`${DRAGONBALL_API_BASE_URL}/characters?name=${name}`);
    
    res.json({
      items: response.data.items,
      meta: response.data.meta
    });
  } catch (error) {
    console.error('Error searching characters:', error.message);
    res.status(500).json({ error: 'Failed to search characters' });
  }
});

// Get characters by race
app.get('/api/characters/race/:race', async (req, res) => {
  try {
    const { race } = req.params;
    const response = await axios.get(`${DRAGONBALL_API_BASE_URL}/characters?race=${race}`);
    
    res.json({
      items: response.data.items,
      meta: response.data.meta
    });
  } catch (error) {
    console.error('Error fetching characters by race:', error.message);
    res.status(500).json({ error: 'Failed to fetch characters by race' });
  }
});

// Get characters by affiliation
app.get('/api/characters/affiliation/:affiliation', async (req, res) => {
  try {
    const { affiliation } = req.params;
    const response = await axios.get(`${DRAGONBALL_API_BASE_URL}/characters?affiliation=${affiliation}`);
    
    res.json({
      items: response.data.items,
      meta: response.data.meta
    });
  } catch (error) {
    console.error('Error fetching characters by affiliation:', error.message);
    res.status(500).json({ error: 'Failed to fetch characters by affiliation' });
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', message: 'Dragon Ball API is running' });
});

// Start server
app.listen(PORT, () => {
  console.log(`🐉 Dragon Ball API server running on http://localhost:${PORT}`);
  console.log(`📡 Available endpoints:`);
  console.log(`   GET /api/characters - Get all characters (with pagination)`);
  console.log(`   GET /api/characters/:id - Get specific character by ID`);
  console.log(`   GET /api/characters/search/:name - Search characters by name`);
  console.log(`   GET /api/characters/race/:race - Get characters by race`);
  console.log(`   GET /api/characters/affiliation/:affiliation - Get characters by affiliation`);
  console.log(`   GET /api/planets - Get all planets (with pagination)`);
  console.log(`   GET /api/planets/:id - Get specific planet by ID`);
  console.log(`   GET /health - Health check`);
});
