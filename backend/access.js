const mongoose = require('mongoose');
const Election = require('./models/election');
const Membership = require('./models/membership');

// Wraps an async route so a thrown error reaches the error handler
const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

// Loads the session named by :id into req.election
const loadElection = asyncHandler(async (req, res, next) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return res.status(404).json({ message: 'Voting session not found' });
  }
  const election = await Election.findById(req.params.id).lean();
  if (!election) {
    return res.status(404).json({ message: 'Voting session not found' });
  }
  req.election = election;
  req.isOrganizer = String(election.organizer) === String(req.user.id);
  next();
});

// Only the person who created the session may manage it
const requireOrganizer = [loadElection, (req, res, next) => {
  if (!req.isOrganizer) {
    return res.status(403).json({ message: 'Only the organizer can manage this session' });
  }
  next();
}];

// Only a voter the organizer (or the voter list) approved for this session
const requireApprovedVoter = [loadElection, asyncHandler(async (req, res, next) => {
  const membership = await Membership.findOne({ election: req.election._id, user: req.user.id }).lean();
  if (!membership || membership.status !== 'approved') {
    return res.status(403).json({ message: 'You are not approved to vote in this session' });
  }
  req.membership = membership;
  next();
})];

module.exports = {
  asyncHandler,
  loadElection,
  requireOrganizer,
  requireApprovedVoter
};
