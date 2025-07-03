const express = require('express');
const router = express.Router();
const User = require('../models/user');
const {jwtAuthMiddleware,generateToken} = require('./../jwt');
const Candidate = require('../models/candidate');

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

router.post('/', jwtAuthMiddleware, async (req, res) => {
    try {
        if(!(await checkAdminRole(req.user.id))) {
            return res.status(403).json({ message: 'Forbidden: Only admins can create candidates' });
        }
        const data= req.body;
        const userId = req.user.id;
        const newCandidate = new Candidate(data);
        const response = await newCandidate.save();
        res.status(201).json({
            message: 'Candidate created successfully',
            candidate: response
        });
    } catch (error) {
        console.error('Error creating candidate:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});


router.put('/:candidateId', jwtAuthMiddleware, async (req, res) => {
    try {
        if(!(await checkAdminRole(req.user.id))) {
            return res.status(403).json({ message: 'Forbidden: Only admins can update candidates' });
        }
        const candidateId = req.params.candidateId;
        const data = req.body;
        const updatedCandidate = await Candidate.findByIdAndUpdate(candidateId, data, { new: true , runValidators: true });
        if (!updatedCandidate) { 
            return res.status(404).json({ message: 'Candidate not found' });
        }
        res.status(200).json({
            message: 'Candidate updated successfully',
            candidate: updatedCandidate
        });
    } catch (error) {
        console.error('Error updating candidate:', error);
        res.status(500).json({ message: 'Internal server error' });
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


//lets start voting
router.post('/vote/:candidateId', jwtAuthMiddleware, async (req, res) => {
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
        
        if (user.isVoted) {
            return res.status(403).json({ message: 'You have already voted' });
        }
        
        // Proceed with voting logic
        const candidate = await Candidate.findById(candidateId);
        if (!candidate) {
            return res.status(404).json({ message: 'Candidate not found' });
        }   
        
        // Add the vote
        candidate.votes.push({ user: userId, votedAt: new Date() });
        candidate.voteCount = candidate.votes.length;
        
        // Update the user's isVoted status
        user.isVoted = true;
        
        await user.save();
        await candidate.save();
        
        res.status(200).json({
            message: 'Vote cast successfully',
            candidate: candidate
        });
    } catch (error) {
        console.error('Error during voting:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

//Vote count route
router.get('/vote/count', async (req, res) => {
    try {
        const candidates = await Candidate.find();
        const voteCounts = candidates.map(candidate => ({
            party: candidate.party,
            voteCount: candidate.votes.length
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