const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const ObjectId = mongoose.Types.ObjectId;
const { upload, gfs } = require('../config/gridfs-config');
const Candidate = require('../models/Candidate');
const auth = require('../middleware/auth');
const admin = require('../middleware/admin');

// Create a new candidate with image
router.post('/', [auth, admin], upload.single('image'), async (req, res) => {
  try {
    const { name, party, age } = req.body;
    
    const candidate = new Candidate({
      name,
      party,
      age: age ? parseInt(age) : undefined,
      imageId: req.file ? req.file.id : null
    });
    
    const savedCandidate = await candidate.save();
    res.status(201).json(savedCandidate);
  } catch (error) {
    console.error('Error creating candidate:', error);
    res.status(400).json({ message: error.message });
  }
});

// Get all candidates
router.get('/', async (req, res) => {
  try {
    const candidates = await Candidate.find().sort({ createdAt: -1 });
    res.json(candidates);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get candidate by ID
router.get('/:id', async (req, res) => {
  try {
    const candidate = await Candidate.findById(req.params.id);
    if (!candidate) {
      return res.status(404).json({ message: 'Candidate not found' });
    }
    res.json(candidate);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Update candidate
router.put('/:id', [auth, admin], upload.single('image'), async (req, res) => {
  try {
    const { name, party, age } = req.body;
    
    const candidate = await Candidate.findById(req.params.id);
    if (!candidate) {
      return res.status(404).json({ message: 'Candidate not found' });
    }
    
    // Update fields if provided
    if (name) candidate.name = name;
    if (party) candidate.party = party;
    if (age) candidate.age = parseInt(age);
    
    // If new image uploaded
    if (req.file) {
      // Delete old image if exists
      if (candidate.imageId) {
        try {
          await gfs.files.deleteOne({ _id: new ObjectId(candidate.imageId) });
        } catch (err) {
          console.error('Error deleting old image:', err);
        }
      }
      candidate.imageId = req.file.id;
    }
    
    await candidate.save();
    res.json(candidate);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Delete candidate and associated image
router.delete('/:id', [auth, admin], async (req, res) => {
  try {
    const candidate = await Candidate.findById(req.params.id);
    
    if (!candidate) {
      return res.status(404).json({ message: 'Candidate not found' });
    }
    
    // Delete associated image if it exists
    if (candidate.imageId) {
      try {
        await gfs.files.deleteOne({ _id: new ObjectId(candidate.imageId) });
      } catch (err) {
        console.error('Error deleting image:', err);
      }
    }
    
    await candidate.deleteOne();
    
    res.json({ message: 'Candidate deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get image by ID
router.get('/image/:id', async (req, res) => {
  if (!ObjectId.isValid(req.params.id)) {
    return res.status(400).json({ message: 'Invalid image ID' });
  }
  
  try {
    const file = await gfs.files.findOne({ _id: new ObjectId(req.params.id) });
    
    if (!file) {
      return res.status(404).json({ message: 'Image not found' });
    }
    
    // Check if image
    if (file.contentType.startsWith('image/')) {
      // Create read stream
      const readstream = gfs.createReadStream(file.filename);
      // Set content type
      res.set('Content-Type', file.contentType);
      // Return image as a stream
      return readstream.pipe(res);
    } else {
      res.status(400).json({ message: 'Not an image' });
    }
  } catch (err) {
    console.error('Error retrieving image:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
