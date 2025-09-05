const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const auth = require('../middleware/auth');
const Candidate = require('../models/Candidate');
const User = require('../models/User');

// Vote for a candidate
router.post('/:id/vote', auth, async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  
  try {
    const candidateId = req.params.id;
    const userId = req.user.id;
    
    // Check if user has already voted
    const user = await User.findById(userId).session(session);
    if (!user) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ message: 'User not found' });
    }
    
    if (user.hasVoted) {
      await session.abortTransaction();
      session.endSession();
      return res.status(403).json({ message: 'You have already voted in this election' });
    }
    
    // Find the candidate
    const candidate = await Candidate.findById(candidateId).session(session);
    if (!candidate) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ message: 'Candidate not found' });
    }
    
    // Increment vote count
    candidate.voteCount = (candidate.voteCount || 0) + 1;
    
    // Add user to votes array if the array exists
    if (Array.isArray(candidate.votes)) {
      candidate.votes.push(userId);
    } else {
      candidate.votes = [userId];
    }
    
    await candidate.save({ session });
    
    // Mark user as having voted
    user.hasVoted = true;
    user.votedFor = candidateId;
    await user.save({ session });
    
    await session.commitTransaction();
    session.endSession();
    
    return res.status(200).json({ 
      success: true,
      message: 'Vote recorded successfully' 
    });
  } catch (error) {
    console.error('Vote processing error:', error);
    
    await session.abortTransaction();
    session.endSession();
    
    return res.status(500).json({ 
      message: 'Error processing vote', 
      error: process.env.NODE_ENV === 'development' ? error.message : 'An internal server error occurred'
    });
  }
});

module.exports = router;