// Vote for a candidate
router.post('/:id/vote', auth, async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  
  try {
    const candidateId = req.params.id;
    const userId = req.user.id;
    
    // Check if user has already voted
    const user = await User.findById(userId).session(session);
    if (user.hasVoted) {
      await session.abortTransaction();
      session.endSession();
      return res.status(403).json({ message: 'You have already voted in this election' });
    }
    
    // Update candidate vote count
    const candidate = await Candidate.findById(candidateId).session(session);
    if (!candidate) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ message: 'Candidate not found' });
    }
    
    // Increment vote count
    candidate.voteCount = (candidate.voteCount || 0) + 1;
    
    // Add user to the votes array if it exists
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
    
    return res.status(200).json({ message: 'Vote recorded successfully' });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    
    console.error('Vote processing error:', error);
    return res.status(500).json({ 
      message: 'Error processing vote', 
      error: process.env.NODE_ENV === 'development' ? error.message : undefined 
    });
  }
});