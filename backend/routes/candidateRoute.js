const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { User, Candidate } = require('../models/modelIndex');
const { jwtAuthMiddleware, generateToken } = require('./../jwt');
const authMiddleware = require('../middleware/authMiddleware');

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function(req, file, cb) {
    // Create uploads directory if it doesn't exist
    const uploadDir = path.join(__dirname, '..', 'uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function(req, file, cb) {
    // Create unique filename
    cb(null, Date.now() + '-' + file.originalname.replace(/\s+/g, '-'));
  }
});

// File filter for images
const fileFilter = (req, file, cb) => {
  // Accept images only
  if (!file.originalname.match(/\.(jpg|jpeg|png|gif)$/)) {
    return cb(new Error('Only image files are allowed!'), false);
  }
  cb(null, true);
};

const upload = multer({ 
  storage: storage,
  fileFilter: fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 } // Increased from 5MB to 10MB limit
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

// GET route to fetch all candidates
router.get('/', async (req, res) => {
    try {
        const candidates = await Candidate.find().sort({ name: 1 });
        res.status(200).json(candidates);
    } catch (error) {
        console.error('Error fetching candidates:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

router.post('/', authMiddleware, async (req, res) => {
  try {
    upload.single('image')(req, res, async (err) => {
      if (err) {
        if (err instanceof multer.MulterError) {
          if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(413).json({ 
              message: 'Image file is too large. Maximum size is 10MB.' 
            });
          }
          return res.status(400).json({ message: `Upload error: ${err.message}` });
        }
        return res.status(500).json({ message: `Unknown error: ${err.message}` });
      }
      
      // Continue with normal processing
      console.log('Creating candidate with data:', req.body);
      console.log('File upload info:', req.file);
      
      const candidateData = {
        name: req.body.name,
        party: req.body.party,
        age: req.body.age
      };
      
      // Add image URL if file was uploaded
      if (req.file) {
        // Create relative URL for the uploaded file
        candidateData.imageUrl = `/uploads/${req.file.filename}`;
        console.log(`Image saved at ${candidateData.imageUrl}`);
      }
      
      const newCandidate = new Candidate(candidateData);
      const savedCandidate = await newCandidate.save();
      
      res.status(201).json(savedCandidate);
    });
  } catch (error) {
    console.error('Error in candidate creation route:', error);
    res.status(500).json({ message: error.message });
  }
});

// Update a candidate
router.put('/:id', upload.single('image'), async (req, res) => {
  try {
    const candidateId = req.params.id;
    console.log('Request body:', req.body);
    console.log('Request file:', req.file);
    
    // Check if the data is nested in a data property
    let updateData = {};
    
    if (req.body.data) {
      // Handle case where data is sent as a JSON string
      try {
        const parsedData = JSON.parse(req.body.data);
        updateData = {
          name: parsedData.name,
          party: parsedData.party,
          age: parsedData.age ? Number(parsedData.age) : undefined
        };
      } catch (e) {
        console.error('Error parsing JSON data:', e);
      }
    } else {
      // Standard case - data sent directly
      updateData = {
        name: req.body.name,
        party: req.body.party,
        age: req.body.age ? Number(req.body.age) : undefined
      };
    }
    
    // Handle image update
    if (req.file) {
      updateData.imageUrl = `/uploads/${req.file.filename}`;
      console.log(`New image saved at ${updateData.imageUrl}`);
    }
    
    console.log('Final update data:', updateData);
    
    // Remove undefined values
    Object.keys(updateData).forEach(key => 
      updateData[key] === undefined && delete updateData[key]);
    
    // Only proceed if we have valid data
    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ message: 'No valid update data provided' });
    }
    
    const updatedCandidate = await Candidate.findByIdAndUpdate(
      candidateId, 
      updateData, 
      { new: true, runValidators: true }
    );
    
    if (!updatedCandidate) {
      return res.status(404).json({ message: 'Candidate not found' });
    }
    
    res.json(updatedCandidate);
  } catch (error) {
    console.error('Error updating candidate:', error);
    res.status(500).json({ message: error.message, stack: error.stack });
  }
});

router.delete('/:candidateId', jwtAuthMiddleware, async (req, res) => {
    try {
        if(!(await checkAdminRole(req.user.id))) {
            return res.status(403).json({ message: 'Forbidden: Only admins can delete candidates' });
        }
        const candidateId = req.params.candidateId;
        const deletedCandidate = await Candidate.findByIdAndDelete(candidateId);
        if (!deletedCandidate) {
            return res.status(404).json({ message: 'Candidate not found' });
        }
        res.status(200).json({
            message: 'Candidate deleted successfully',
            candidate: deletedCandidate
        });
    } catch (error) {
        console.error('Error deleting candidate:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// Place this route BEFORE any route with :candidateId param to avoid conflicts
router.post('/:candidateId/vote', jwtAuthMiddleware, async (req, res) => {
    const candidateId = req.params.candidateId;
    const userId = req.user.id; 
    try {
        const user = await User.findById(userId);
        if (!user) {    
            return res.status(404).json({ message: 'User not found' });
        }
        
        //admin can not vote
        if (user.role === 'admin') {
            return res.status(403).json({ message: 'Admins cannot vote' });
        }
        
        // Fix inconsistency: use isVoted instead of hasVoted to match User model
        if (user.isVoted) {
            return res.status(403).json({ message: 'You have already voted' });
        }
        
        // Proceed with voting logic
        const candidate = await Candidate.findById(candidateId);
        if (!candidate) {
            return res.status(404).json({ message: 'Candidate not found' });
        }   
        
        // Ensure votes array is initialized
        if (!Array.isArray(candidate.votes)) {
            candidate.votes = [];
        }
        
        // Fix: Store only the userId as ObjectId, not an object with timestamp
        candidate.votes.push(userId);
        
        // Update vote count
        candidate.voteCount = candidate.votes.length;
        
        // Update the user's voting status
        user.isVoted = true;
        user.votedFor = candidateId;  // Store which candidate they voted for
        
        // Save both documents
        await user.save();
        await candidate.save();
        
        res.status(200).json({
            message: 'Vote cast successfully',
            candidate: candidate
        });
    } catch (error) {
        console.error('Error during voting:', error);
        res.status(500).json({ 
            message: 'Internal server error',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

//Vote count route - Update to include candidate names
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

//list of candidates
router.get('/candidates', async (req, res) => {
    try {
        const candidates = await Candidate.find().sort({ name: 1 });
        res.status(200).json(candidates);
    } catch (error) {
        console.error('Error fetching candidates:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});
module.exports = router;