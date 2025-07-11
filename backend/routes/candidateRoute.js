const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const Candidate = require('../models/Candidate');
const auth = require('../middleware/auth');
const mongoose = require('mongoose');

// Set up multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '..', 'uploads');
    if (!fs.existsSync(uploadDir)){
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  }
});

const upload = multer({ 
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'), false);
    }
  }
});

// Debug log
console.log('Candidate routes loaded with multer');

// GET all candidates
router.get('/', async (req, res) => {
  try {
    const candidates = await Candidate.find().sort({ party: 1 });
    res.json(candidates);
  } catch (err) {
    console.error('Error fetching candidates:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// POST create new candidate with image upload
router.post('/', upload.single('image'), async (req, res) => {
  console.log('POST /api/candidates received body:', req.body);
  console.log('File received:', req.file);
  
  try {
    const { name, party, age } = req.body;
    
    if (!name || !party) {
      return res.status(400).json({ 
        message: 'Name and party are required fields',
        debug: { receivedBody: req.body }
      });
    }
    
    const candidate = new Candidate({
      name,
      party,
      age: age ? parseInt(age) : undefined,
      imageUrl: req.file ? `/uploads/${req.file.filename}` : null,
      voteCount: 0
    });
    
    const savedCandidate = await candidate.save();
    console.log('Candidate created:', savedCandidate);
    res.status(201).json(savedCandidate);
  } catch (err) {
    console.error('Error creating candidate:', err);
    res.status(400).json({ 
      message: err.message, 
      details: err.errors ? Object.keys(err.errors).map(key => ({
        field: key,
        message: err.errors[key].message
      })) : undefined
    });
  }
});

// PUT update candidate
router.put('/:id', upload.single('image'), async (req, res) => {
  try {
    console.log('PUT /api/candidates/:id received body:', req.body);
    console.log('File received:', req.file);
    
    const updateData = {
      name: req.body.name,
      party: req.body.party,
    };
    
    if (req.body.age) {
      updateData.age = parseInt(req.body.age);
    }
    
    if (req.file) {
      updateData.imageUrl = `/uploads/${req.file.filename}`;
    }
    
    const candidate = await Candidate.findByIdAndUpdate(
      req.params.id, 
      updateData,
      { new: true, runValidators: true }
    );
    
    if (!candidate) {
      return res.status(404).json({ message: 'Candidate not found' });
    }
    
    res.json(candidate);
  } catch (err) {
    console.error('Error updating candidate:', err);
    res.status(400).json({ message: err.message });
  }
});

// DELETE candidate
router.delete('/:id', async (req, res) => {
  try {
    const candidate = await Candidate.findByIdAndDelete(req.params.id);
    
    if (!candidate) {
      return res.status(404).json({ message: 'Candidate not found' });
    }
    
    res.json({ message: 'Candidate deleted successfully' });
  } catch (err) {
    console.error('Error deleting candidate:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Vote for a candidate - implement strict vote checking
router.post('/vote/:id', auth, async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  
  try {
    const candidateId = req.params.id;
    const userId = req.user.id;
    
    console.log(`Vote attempt by user ${userId} for candidate ${candidateId}`);
    
    // Check if user exists using the session
    const User = require('../models/User');
    const user = await User.findById(userId).session(session);
    
    if (!user) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ message: 'User not found' });
    }
    
    // STRICT CHECK: Has this user already voted?
    if (user.hasVoted === true || user.isVoted === true) {
      console.log(`VOTE REJECTED: User ${userId} has already voted`);
      await session.abortTransaction();
      session.endSession();
      return res.status(403).json({ message: 'You have already voted in this election' });
    }
    
    // Check if candidate exists
    const Candidate = require('../models/Candidate');
    const candidate = await Candidate.findById(candidateId).session(session);
    
    if (!candidate) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ message: 'Candidate not found' });
    }
    
    // Everything is valid, record the vote
    console.log(`Recording vote: User ${userId} for candidate ${candidateId} (${candidate.name})`);
    
    // Update candidate vote count
    candidate.voteCount = (candidate.voteCount || 0) + 1;
    await candidate.save({ session });
    
    // Mark user as voted
    user.hasVoted = true;
    user.isVoted = true;
    user.votedFor = candidateId;
    user.votedAt = new Date();
    await user.save({ session });
    
    // Commit the transaction
    await session.commitTransaction();
    session.endSession();
    
    console.log(`Vote successfully recorded for user ${userId}`);
    
    res.status(200).json({ message: 'Your vote has been successfully recorded' });
  } catch (error) {
    // If anything fails, abort the transaction
    await session.abortTransaction();
    session.endSession();
    
    console.error('Error recording vote:', error);
    res.status(500).json({ message: 'Failed to record vote', error: error.message });
  }
});

router.get('/vote/count', async (req, res) => {
  try {
    const results = await Candidate.find({}, 'party voteCount');
    res.json(results);
  } catch (err) {
    console.error('Error fetching vote count:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Serve uploaded files
router.get('/image/:filename', (req, res) => {
  const filename = req.params.filename;
  const filePath = path.join(__dirname, '..', 'uploads', filename);
  
  if (fs.existsSync(filePath)) {
    res.sendFile(filePath);
  } else {
    res.status(404).send('Image not found');
  }
});

module.exports = router;