const express = require('express');
const router = express.Router();
const User = require('../models/user'); // Lowercase path for consistency
const {jwtAuthMiddleware, generateToken} = require('../jwt');
const Candidate = require('../models/candidate'); // Lowercase path for consistency
const path = require('path');
const fs = require('fs');
const multer = require('multer');

const upload = multer({
  storage: multer.diskStorage({
    destination: function(req, file, cb) {
      const uploadDir = path.join(__dirname, '..', 'uploads');
      // Create directory if it doesn't exist
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }
      cb(null, uploadDir);
    },
    filename: function(req, file, cb) {
      // Generate unique filename
      const uniqueName = `${Date.now()}-${file.originalname.replace(/\s+/g, '-')}`;
      cb(null, uniqueName);
    }
  }),
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

const checkAdminRole = async (userId) => {
    try {
        const user = await User.findById(userId);
        if (!user) {
            throw new Error('User not found');
        }
        return user.role === 'admin';
    } catch (error) {
        console.error('Error checking admin role:', error);
        throw error;
    }
}

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

// Create candidate route with FormData handling
router.post('/', jwtAuthMiddleware, upload.single('image'), async (req, res) => {
    try {
        // Check admin role
        if(!(await checkAdminRole(req.user.id))) {
            return res.status(403).json({ message: 'Forbidden: Only admins can create candidates' });
        }
        
        console.log('Received candidate creation request:', req.body);
        
        // Validate required fields
        if (!req.body.name || !req.body.party) {
            return res.status(400).json({ message: 'Name and party are required fields' });
        }
        
        // Create new candidate with proper data validation
        const newCandidate = new Candidate({
            name: req.body.name,
            party: req.body.party,
            age: req.body.age ? parseInt(req.body.age) : 0
        });
        
        // Add image URL if file was uploaded
        if (req.file) {
            newCandidate.imageUrl = `/uploads/${req.file.filename}`;
            console.log(`Image saved at ${newCandidate.imageUrl}`);
        }
        
        const response = await newCandidate.save();
        console.log('Candidate created successfully:', response);
        
        res.status(201).json({
            message: 'Candidate created successfully',
            candidate: response
        });
    } catch (error) {
        console.error('Error creating candidate:', error);
        
        // Return more detailed error information
        if (error.name === 'ValidationError') {
            // Mongoose validation error
            const validationErrors = Object.values(error.errors).map(err => err.message);
            return res.status(400).json({ 
                message: 'Validation error', 
                errors: validationErrors 
            });
        }
        
        res.status(500).json({ 
            message: 'Internal server error',
            error: error.message
        });
    }
});

// Update candidate with FormData handling
router.put('/:candidateId', jwtAuthMiddleware, upload.single('image'), async (req, res) => {
    try {
        if(!(await checkAdminRole(req.user.id))) {
            return res.status(403).json({ message: 'Forbidden: Only admins can update candidates' });
        }
        
        const candidateId = req.params.candidateId;
        console.log(`Updating candidate ${candidateId} with data:`, req.body);
        
        // Use findById instead of directly updating to handle votes array properly
        const candidate = await Candidate.findById(candidateId);
        if (!candidate) { 
            return res.status(404).json({ message: 'Candidate not found' });
        }
        
        // Update basic fields
        if (req.body.name) candidate.name = req.body.name;
        if (req.body.party) candidate.party = req.body.party;
        if (req.body.age) candidate.age = parseInt(req.body.age);
        
        // Handle votes array properly - don't modify it during update
        // This preserves the existing votes while updating other fields
        
        // Update image if a new one was uploaded
        if (req.file) {
            // Try to delete old image if it exists
            if (candidate.imageUrl && candidate.imageUrl !== '/default-candidate.jpg') {
                const oldImagePath = path.join(__dirname, '..', candidate.imageUrl);
                try {
                    if (fs.existsSync(oldImagePath)) {
                        fs.unlinkSync(oldImagePath);
                        console.log(`Deleted old image: ${oldImagePath}`);
                    }
                } catch (err) {
                    console.error('Error deleting old image:', err);
                }
            }
            
            // Set new image URL
            candidate.imageUrl = `/uploads/${req.file.filename}`;
            console.log(`New image saved at ${candidate.imageUrl}`);
        }
        
        // Save the updated candidate
        const updatedCandidate = await candidate.save();
        console.log('Candidate updated successfully:', updatedCandidate);
        
        res.status(200).json({
            message: 'Candidate updated successfully',
            candidate: updatedCandidate
        });
    } catch (error) {
        console.error('Error updating candidate:', error);
        
        if (error.name === 'ValidationError') {
            const validationErrors = Object.values(error.errors).map(err => err.message);
            return res.status(400).json({ 
                message: 'Validation error', 
                errors: validationErrors 
            });
        }
        
        res.status(500).json({ 
            message: 'Internal server error',
            error: error.message
        });
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

// Add the exact route that frontend is trying to access
router.post('/:candidateId/vote', jwtAuthMiddleware, async (req, res) => {
  const candidateId = req.params.candidateId;
  const userId = req.user.id;
  
  try {
    // Find the user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: 'User not found' 
      });
    }
    
    // Check if user is admin
    if (user.role === 'admin') {
      return res.status(403).json({ 
        success: false, 
        message: 'Admins cannot vote' 
      });
    }
    
    // Check if user has already voted
    if (user.isVoted || user.hasVoted) {
      return res.status(403).json({ 
        success: false, 
        message: 'You have already voted' 
      });
    }
    
    // Find the candidate
    const candidate = await Candidate.findById(candidateId);
    if (!candidate) {
      return res.status(404).json({ 
        success: false, 
        message: 'Candidate not found' 
      });
    }
    
    // Use the addVote method to ensure consistent vote format
    candidate.addVote(userId);
    
    // Mark user as voted
    user.isVoted = true;
    user.hasVoted = true;
    user.votedFor = candidateId;
    
    // Save both documents
    await Promise.all([
      candidate.save(),
      user.save()
    ]);
    
    return res.status(200).json({
      success: true,
      message: 'Vote cast successfully',
      candidate: {
        _id: candidate._id,
        name: candidate.name,
        party: candidate.party,
        voteCount: candidate.voteCount
      }
    });
  } catch (error) {
    console.error('Error casting vote:', error);
    return res.status(500).json({
      success: false,
      message: 'Error casting vote',
      error: error.message
    });
  }
});

//Vote count route - Update to include candidate names and fix the length error
router.get('/vote/count', async (req, res) => {
    try {
        const candidates = await Candidate.find();
        const voteCounts = candidates.map(candidate => ({
            _id: candidate._id,
            name: candidate.name,
            party: candidate.party,
            voteCount: Array.isArray(candidate.votes) ? candidate.votes.length : 0
        }));
        res.status(200).json(voteCounts);
    } catch (error) {
        console.error('Error fetching vote counts:', error);
        res.status(500).json({ message: 'Internal server error' });
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