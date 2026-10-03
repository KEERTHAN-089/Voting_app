const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const mongoose = require('mongoose');
const multer = require('multer');
const rateLimit = require('express-rate-limit');
const User = require('../models/user');
const Election = require('../models/election');
const Candidate = require('../models/candidate');
const Membership = require('../models/membership');
const Vote = require('../models/vote');
const Image = require('../models/image');
const { jwtAuthMiddleware, optionalAuth } = require('../jwt');
const { asyncHandler, loadElection, requireOrganizer, requireApprovedVoter } = require('../access');

const { MAX_VOTERS_LIMIT } = Election;
const MAX_ACTIVE_SESSIONS = 10;
const MAX_CANDIDATES = 50;
const MAX_CANDIDATE_IMAGE_BYTES = 1024 * 1024;
const MAX_SELFIE_BYTES = 200 * 1024;
const RESULTS_CACHE_MS = 3000;
const SELFIE_MODES = ['none', 'photo', 'faceMatch'];
const RESULTS_MODES = ['live', 'afterClose'];
const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// Letters and digits that are hard to confuse when read off a projector
const JOIN_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
// Two face descriptors closer than this are treated as the same person
const FACE_MATCH_THRESHOLD = Number(process.env.FACE_MATCH_THRESHOLD) || 0.5;

// Limits are counted per signed-in user. Counting per IP would block a whole
// class that shares one Wi-Fi address.
const perUserLimiter = (limit, windowMs, message) => rateLimit({
  windowMs,
  limit,
  keyGenerator: (req) => String(req.user.id),
  standardHeaders: true,
  legacyHeaders: false,
  message: { message }
});
const generalLimiter = perUserLimiter(300, 60 * 1000, 'Too many requests. Please slow down.');
const voteLimiter = perUserLimiter(20, 60 * 1000, 'Too many vote attempts. Please wait a minute.');
const createLimiter = perUserLimiter(20, 60 * 60 * 1000, 'Too many sessions created. Please try again later.');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_CANDIDATE_IMAGE_BYTES },
  fileFilter: (req, file, cb) => {
    if (IMAGE_TYPES.includes(file.mimetype)) return cb(null, true);
    const error = new Error('Only JPEG, PNG or WebP images are allowed');
    error.status = 400;
    cb(error);
  }
});

const badRequest = (message) => {
  const error = new Error(message);
  error.status = 400;
  return error;
};

const generateJoinCode = () => {
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += JOIN_CODE_ALPHABET[crypto.randomInt(JOIN_CODE_ALPHABET.length)];
  }
  return code;
};

// Accepts an array or a pasted block of text separated by commas, spaces or new lines
const parseEmails = (input) => {
  const parts = Array.isArray(input) ? input : String(input || '').split(/[\s,;]+/);
  const emails = new Set();
  const invalid = [];
  for (const part of parts) {
    const email = String(part).trim().toLowerCase();
    if (!email) continue;
    if (EMAIL_PATTERN.test(email) && email.length <= 254) emails.add(email);
    else invalid.push(email);
  }
  return { emails: [...emails], invalid };
};

// Reads the editable session fields from a request body, validating each one present
const readElectionFields = (body, { requireAll }) => {
  const fields = {};

  if (requireAll || body.title !== undefined) {
    const title = typeof body.title === 'string' ? body.title.trim() : '';
    if (!title || title.length > 120) throw badRequest('Title is required (up to 120 characters)');
    fields.title = title;
  }
  if (body.description !== undefined) {
    const description = String(body.description).trim();
    if (description.length > 1000) throw badRequest('Description is too long (up to 1000 characters)');
    fields.description = description;
  }
  if (requireAll || body.maxVoters !== undefined) {
    const maxVoters = Number(body.maxVoters);
    if (!Number.isInteger(maxVoters) || maxVoters < 1 || maxVoters > MAX_VOTERS_LIMIT) {
      throw badRequest(`Number of voters must be between 1 and ${MAX_VOTERS_LIMIT}`);
    }
    fields.maxVoters = maxVoters;
  }
  if (body.selfieMode !== undefined) {
    if (!SELFIE_MODES.includes(body.selfieMode)) throw badRequest('Unknown selfie setting');
    fields.selfieMode = body.selfieMode;
  }
  if (body.resultsVisible !== undefined) {
    if (!RESULTS_MODES.includes(body.resultsVisible)) throw badRequest('Unknown results setting');
    fields.resultsVisible = body.resultsVisible;
  }
  return fields;
};

// Stores a selfie sent as a data URL. The browser shrinks it before upload.
const saveSelfie = async (dataUrl, electionId) => {
  const match = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/.exec(
    typeof dataUrl === 'string' ? dataUrl : ''
  );
  if (!match) throw badRequest('A selfie is required for this session');
  const data = Buffer.from(match[2], 'base64');
  if (data.length === 0 || data.length > MAX_SELFIE_BYTES) throw badRequest('The selfie image is too large');
  return Image.create({ election: electionId, kind: 'selfie', contentType: match[1], data });
};

const isFaceDescriptor = (value) =>
  Array.isArray(value) && value.length === 128 &&
  value.every((n) => typeof n === 'number' && Number.isFinite(n) && Math.abs(n) <= 10);

const faceDistance = (a, b) => Math.sqrt(a.reduce((sum, n, i) => sum + (n - b[i]) ** 2, 0));

// What a voter may know about a session
const toPublicElection = (election) => ({
  _id: election._id,
  title: election.title,
  description: election.description,
  status: election.status,
  selfieMode: election.selfieMode,
  resultsVisible: election.resultsVisible
});

/*
 * Approves one voter without ever exceeding the session's voter cap.
 * The slot is claimed with a single conditional update, so two approvals
 * racing for the last place cannot both succeed.
 * Returns 'approved', 'full' or 'unchanged'.
 */
const approveMembership = async (electionId, membershipId, via) => {
  const slot = await Election.findOneAndUpdate(
    { _id: electionId, status: { $ne: 'closed' }, $expr: { $lt: ['$approvedCount', '$maxVoters'] } },
    { $inc: { approvedCount: 1 } }
  );
  if (!slot) return 'full';

  const updated = await Membership.findOneAndUpdate(
    { _id: membershipId, election: electionId, status: { $in: ['pending', 'rejected'] } },
    { status: 'approved', approvedVia: via }
  );
  if (!updated) {
    // Someone else approved this voter first: hand the slot back
    await Election.updateOne({ _id: electionId }, { $inc: { approvedCount: -1 } });
    return 'unchanged';
  }
  return 'approved';
};

// Vote totals per session, shared by everyone polling within the cache window
const resultsCache = new Map();

const countVotes = (electionId) => {
  const key = String(electionId);
  const cached = resultsCache.get(key);
  if (cached && Date.now() - cached.at < RESULTS_CACHE_MS) return cached.promise;

  const promise = (async () => {
    const [candidates, tallies] = await Promise.all([
      Candidate.find({ election: electionId }).select('name party image').sort({ createdAt: 1 }).lean(),
      Vote.aggregate([
        { $match: { election: new mongoose.Types.ObjectId(key) } },
        { $group: { _id: '$candidate', votes: { $sum: 1 } } }
      ])
    ]);
    const votesByCandidate = new Map(tallies.map((t) => [String(t._id), t.votes]));
    const rows = candidates
      .map((c) => ({ ...c, votes: votesByCandidate.get(String(c._id)) || 0 }))
      .sort((a, b) => b.votes - a.votes);
    return { candidates: rows, totalVotes: rows.reduce((sum, c) => sum + c.votes, 0) };
  })();

  if (resultsCache.size > 500) resultsCache.clear();
  resultsCache.set(key, { at: Date.now(), promise });
  promise.catch(() => resultsCache.delete(key));
  return promise;
};

const csvCell = (value) => {
  let text = String(value);
  // Stop spreadsheet apps from running a cell as a formula
  if (/^[=+\-@]/.test(text)) text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
};

/* ---------- Join page (works signed out) ---------- */

router.get('/join/:code', optionalAuth, asyncHandler(async (req, res) => {
  const election = await Election.findOne({ joinCode: String(req.params.code).toUpperCase() }).lean();
  if (!election) {
    return res.status(404).json({ message: 'No voting session found for this code' });
  }

  let membership = null;
  if (req.user) {
    membership = await Membership.findOne({ election: election._id, user: req.user.id })
      .select('status hasVoted').lean();
  }

  res.status(200).json({
    election: toPublicElection(election),
    full: election.approvedCount >= election.maxVoters,
    isOrganizer: Boolean(req.user) && String(election.organizer) === String(req.user.id),
    membership: membership ? { status: membership.status, hasVoted: membership.hasVoted } : null
  });
}));

// Everything below needs a signed-in user
router.use(jwtAuthMiddleware, generalLimiter);

/* ---------- Creating and listing sessions ---------- */

// Anyone signed in can create a session and becomes its organizer
router.post('/', createLimiter, asyncHandler(async (req, res) => {
  const fields = readElectionFields(req.body, { requireAll: true });
  const { emails, invalid } = parseEmails(req.body.allowList);
  if (invalid.length > 0) {
    return res.status(400).json({ message: `These are not valid emails: ${invalid.slice(0, 5).join(', ')}` });
  }
  if (emails.length > MAX_VOTERS_LIMIT) {
    return res.status(400).json({ message: `The voter list can hold up to ${MAX_VOTERS_LIMIT} emails` });
  }

  const active = await Election.countDocuments({ organizer: req.user.id, status: { $in: ['draft', 'open'] } });
  if (active >= MAX_ACTIVE_SESSIONS) {
    return res.status(409).json({
      message: `You already have ${MAX_ACTIVE_SESSIONS} sessions in progress. Close or delete one first.`
    });
  }

  // Retry on the rare chance the random join code is already taken
  for (let attempt = 0; ; attempt++) {
    try {
      const election = await Election.create({
        ...fields,
        organizer: req.user.id,
        joinCode: generateJoinCode(),
        allowList: emails
      });
      return res.status(201).json({ election: { ...toPublicElection(election), joinCode: election.joinCode } });
    } catch (error) {
      if (error.code !== 11000 || attempt >= 4) throw error;
    }
  }
}));

// Sessions I run, with the numbers an organizer needs at a glance
router.get('/organizing', asyncHandler(async (req, res) => {
  const elections = await Election.find({ organizer: req.user.id })
    .sort({ createdAt: -1 }).limit(100).lean();

  const counts = await Membership.aggregate([
    { $match: { election: { $in: elections.map((e) => e._id) } } },
    { $group: {
      _id: '$election',
      pending: { $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] } },
      voted: { $sum: { $cond: ['$hasVoted', 1, 0] } }
    } }
  ]);
  const countsByElection = new Map(counts.map((c) => [String(c._id), c]));

  res.status(200).json(elections.map((election) => {
    const count = countsByElection.get(String(election._id)) || { pending: 0, voted: 0 };
    return {
      ...toPublicElection(election),
      joinCode: election.joinCode,
      maxVoters: election.maxVoters,
      approvedCount: election.approvedCount,
      pendingCount: count.pending,
      votedCount: count.voted,
      createdAt: election.createdAt
    };
  }));
}));

// Sessions I have joined as a voter
router.get('/voting', asyncHandler(async (req, res) => {
  const memberships = await Membership.find({ user: req.user.id })
    .sort({ createdAt: -1 }).limit(100)
    .populate('election', 'title description status selfieMode resultsVisible joinCode')
    .lean();

  res.status(200).json(memberships
    .filter((m) => m.election)
    .map((m) => ({
      ...toPublicElection(m.election),
      joinCode: m.election.joinCode,
      membershipStatus: m.status,
      hasVoted: m.hasVoted
    })));
}));

/* ---------- Joining ---------- */

router.post('/join/:code', asyncHandler(async (req, res) => {
  const election = await Election.findOne({ joinCode: String(req.params.code).toUpperCase() }).lean();
  if (!election) {
    return res.status(404).json({ message: 'No voting session found for this code' });
  }

  let membership = await Membership.findOne({ election: election._id, user: req.user.id });

  if (!membership) {
    if (election.status === 'closed') {
      return res.status(409).json({ message: 'This voting session is closed' });
    }

    const doc = { election: election._id, user: req.user.id };
    let selfie = null;
    if (election.selfieMode === 'faceMatch') {
      // Face-match sessions enrol the voter's face when they join
      if (!isFaceDescriptor(req.body.faceDescriptor)) {
        return res.status(400).json({ message: 'A clear selfie with your face is required to join this session' });
      }
      selfie = await saveSelfie(req.body.selfie, election._id);
      doc.enrolSelfie = selfie._id;
      doc.faceDescriptor = req.body.faceDescriptor;
    }

    try {
      membership = await Membership.create(doc);
    } catch (error) {
      if (error.code !== 11000) throw error;
      // A second request from the same voter got there first: use that membership
      if (selfie) await Image.deleteOne({ _id: selfie._id });
      membership = await Membership.findOne({ election: election._id, user: req.user.id });
    }
  }

  // A voter on the organizer's list is approved on the spot
  let full = false;
  if (membership.status === 'pending' && election.status !== 'closed') {
    const listed = await Election.exists({ _id: election._id, allowList: req.user.email });
    if (listed) {
      const outcome = await approveMembership(election._id, membership._id, 'list');
      if (outcome === 'full') full = true;
      else membership.status = 'approved';
    }
  }

  res.status(200).json({
    electionId: election._id,
    status: membership.status,
    hasVoted: membership.hasVoted,
    full
  });
}));

/* ---------- Voting ---------- */

// The ballot never includes vote counts
router.get('/:id/ballot', requireApprovedVoter, asyncHandler(async (req, res) => {
  const candidates = await Candidate.find({ election: req.election._id })
    .select('name party image').sort({ createdAt: 1 }).lean();

  res.status(200).json({
    election: toPublicElection(req.election),
    candidates,
    hasVoted: req.membership.hasVoted
  });
}));

router.post('/:id/vote', voteLimiter, requireApprovedVoter, asyncHandler(async (req, res) => {
  const election = req.election;
  if (election.status !== 'open') {
    return res.status(409).json({
      message: election.status === 'draft' ? 'Voting has not started yet' : 'Voting has closed'
    });
  }
  if (req.membership.hasVoted) {
    return res.status(409).json({ message: 'You have already voted in this session' });
  }

  const { candidateId } = req.body;
  if (!mongoose.isValidObjectId(candidateId)) {
    return res.status(400).json({ message: 'Choose a candidate' });
  }
  const candidate = await Candidate.findOne({ _id: candidateId, election: election._id }).select('_id').lean();
  if (!candidate) {
    return res.status(404).json({ message: 'Candidate not found in this session' });
  }

  if (election.selfieMode === 'faceMatch') {
    if (!isFaceDescriptor(req.body.faceDescriptor)) {
      return res.status(400).json({ message: 'We could not find a face in the selfie. Please try again.' });
    }
    const enrolled = await Membership.findById(req.membership._id).select('+faceDescriptor').lean();
    if (!isFaceDescriptor(enrolled.faceDescriptor) ||
        faceDistance(req.body.faceDescriptor, enrolled.faceDescriptor) > FACE_MATCH_THRESHOLD) {
      return res.status(403).json({ message: 'Your face did not match the selfie you joined with. Please try again.' });
    }
  }

  let selfie = null;
  if (election.selfieMode !== 'none') {
    selfie = await saveSelfie(req.body.selfie, election._id);
  }

  /*
   * The vote itself. Marking the voter as voted and recording the anonymous
   * ballot commit together or not at all. The update only matches a voter who
   * has not voted yet, so a repeated or simultaneous request finds nothing to
   * update and is rejected.
   */
  let alreadyVoted = false;
  try {
    await mongoose.connection.transaction(async (session) => {
      const flipped = await Membership.findOneAndUpdate(
        { _id: req.membership._id, status: 'approved', hasVoted: false },
        { hasVoted: true, votedAt: new Date(), ...(selfie && { voteSelfie: selfie._id }) },
        { session }
      );
      if (!flipped) {
        alreadyVoted = true;
        throw new Error('Vote rejected');
      }
      await Vote.create([{ election: election._id, candidate: candidate._id }], { session });
    });
  } catch (error) {
    if (selfie) await Image.deleteOne({ _id: selfie._id });
    if (alreadyVoted) {
      return res.status(409).json({ message: 'You have already voted in this session' });
    }
    throw error;
  }

  res.status(200).json({ success: true, message: 'Vote cast successfully' });
}));

/* ---------- Results ---------- */

router.get('/:id/results', loadElection, asyncHandler(async (req, res) => {
  const election = req.election;

  if (!req.isOrganizer) {
    const membership = await Membership.findOne({ election: election._id, user: req.user.id })
      .select('status').lean();
    if (!membership || membership.status !== 'approved') {
      return res.status(403).json({ message: 'Only voters in this session can see its results' });
    }
    if (election.resultsVisible === 'afterClose' && election.status !== 'closed') {
      return res.status(403).json({
        message: 'Results will be shown when the organizer closes the session',
        hidden: true,
        election: toPublicElection(election)
      });
    }
  }

  const { candidates, totalVotes } = await countVotes(election._id);
  res.status(200).json({
    election: toPublicElection(election),
    candidates,
    totalVotes,
    approvedCount: election.approvedCount,
    maxVoters: election.maxVoters
  });
}));

/* ---------- Organizer: the session itself ---------- */

router.get('/:id/manage', requireOrganizer, asyncHandler(async (req, res) => {
  const [withList, candidates, pendingCount, votedCount] = await Promise.all([
    Election.findById(req.election._id).select('+allowList').lean(),
    Candidate.find({ election: req.election._id }).select('name party image').sort({ createdAt: 1 }).lean(),
    Membership.countDocuments({ election: req.election._id, status: 'pending' }),
    Membership.countDocuments({ election: req.election._id, hasVoted: true })
  ]);

  res.status(200).json({
    election: {
      ...toPublicElection(withList),
      joinCode: withList.joinCode,
      maxVoters: withList.maxVoters,
      approvedCount: withList.approvedCount,
      allowList: withList.allowList || [],
      createdAt: withList.createdAt,
      closedAt: withList.closedAt
    },
    candidates,
    pendingCount,
    votedCount
  });
}));

router.put('/:id/manage', requireOrganizer, asyncHandler(async (req, res) => {
  const election = req.election;
  if (election.status === 'closed') {
    return res.status(409).json({ message: 'A closed session cannot be edited' });
  }

  const fields = readElectionFields(req.body, { requireAll: false });

  if (fields.selfieMode !== undefined && fields.selfieMode !== election.selfieMode) {
    // Voters enrol their face when they join, so the mode must be settled before anyone does
    const joined = await Membership.exists({ election: election._id });
    if (joined) {
      return res.status(409).json({ message: 'The selfie setting cannot change after voters have joined' });
    }
  }

  // The cap can never drop below the number of voters already approved
  const filter = { _id: election._id, status: { $ne: 'closed' } };
  if (fields.maxVoters !== undefined) filter.approvedCount = { $lte: fields.maxVoters };

  const updated = await Election.findOneAndUpdate(filter, fields, { new: true }).lean();
  if (!updated) {
    return res.status(409).json({
      message: `${election.approvedCount} voters are already approved. The limit cannot be lower than that.`
    });
  }
  res.status(200).json({ election: toPublicElection(updated) });
}));

router.post('/:id/manage/open', requireOrganizer, asyncHandler(async (req, res) => {
  const candidateCount = await Candidate.countDocuments({ election: req.election._id });
  if (candidateCount < 2) {
    return res.status(409).json({ message: 'Add at least two candidates before opening the session' });
  }
  const updated = await Election.findOneAndUpdate(
    { _id: req.election._id, status: 'draft' },
    { status: 'open' }
  );
  if (!updated) {
    return res.status(409).json({ message: 'Only a draft session can be opened' });
  }
  res.status(200).json({ status: 'open' });
}));

router.post('/:id/manage/close', requireOrganizer, asyncHandler(async (req, res) => {
  const updated = await Election.findOneAndUpdate(
    { _id: req.election._id, status: 'open' },
    { status: 'closed', closedAt: new Date() }
  );
  if (!updated) {
    return res.status(409).json({ message: 'Only an open session can be closed' });
  }
  // Make sure the final results are counted fresh
  resultsCache.delete(String(req.election._id));
  res.status(200).json({ status: 'closed' });
}));

router.delete('/:id/manage', requireOrganizer, asyncHandler(async (req, res) => {
  const electionId = req.election._id;
  await Promise.all([
    Vote.deleteMany({ election: electionId }),
    Membership.deleteMany({ election: electionId }),
    Candidate.deleteMany({ election: electionId }),
    Image.deleteMany({ election: electionId })
  ]);
  await Election.deleteOne({ _id: electionId });
  resultsCache.delete(String(electionId));
  res.status(200).json({ message: 'Voting session deleted' });
}));

/* ---------- Organizer: candidates ---------- */

router.post('/:id/manage/candidates', requireOrganizer, upload.single('image'), asyncHandler(async (req, res) => {
  if (req.election.status !== 'draft') {
    return res.status(409).json({ message: 'Candidates can only be added before the session is opened' });
  }
  const name = typeof req.body.name === 'string' ? req.body.name.trim() : '';
  const party = typeof req.body.party === 'string' ? req.body.party.trim() : '';
  if (!name || name.length > 80 || party.length > 120) {
    return res.status(400).json({ message: 'Candidate name is required (up to 80 characters)' });
  }
  const count = await Candidate.countDocuments({ election: req.election._id });
  if (count >= MAX_CANDIDATES) {
    return res.status(409).json({ message: `A session can have up to ${MAX_CANDIDATES} candidates` });
  }

  let image = null;
  if (req.file) {
    image = await Image.create({
      election: req.election._id,
      kind: 'candidate',
      contentType: req.file.mimetype,
      data: req.file.buffer
    });
  }
  const candidate = await Candidate.create({
    election: req.election._id,
    name,
    party,
    image: image ? image._id : null
  });

  res.status(201).json({ message: 'Candidate created successfully', candidate });
}));

router.put('/:id/manage/candidates/:candidateId', requireOrganizer, upload.single('image'), asyncHandler(async (req, res) => {
  if (req.election.status === 'closed') {
    return res.status(409).json({ message: 'A closed session cannot be edited' });
  }
  if (!mongoose.isValidObjectId(req.params.candidateId)) {
    return res.status(404).json({ message: 'Candidate not found' });
  }
  const candidate = await Candidate.findOne({ _id: req.params.candidateId, election: req.election._id });
  if (!candidate) {
    return res.status(404).json({ message: 'Candidate not found' });
  }

  if (req.body.name !== undefined) {
    const name = String(req.body.name).trim();
    if (!name || name.length > 80) {
      return res.status(400).json({ message: 'Candidate name is required (up to 80 characters)' });
    }
    candidate.name = name;
  }
  if (req.body.party !== undefined) {
    const party = String(req.body.party).trim();
    if (party.length > 120) {
      return res.status(400).json({ message: 'Group / tagline is too long (up to 120 characters)' });
    }
    candidate.party = party;
  }

  if (req.file) {
    const oldImage = candidate.image;
    const image = await Image.create({
      election: req.election._id,
      kind: 'candidate',
      contentType: req.file.mimetype,
      data: req.file.buffer
    });
    candidate.image = image._id;
    if (oldImage) await Image.deleteOne({ _id: oldImage });
  }

  await candidate.save();
  resultsCache.delete(String(req.election._id));
  res.status(200).json({ message: 'Candidate updated successfully', candidate });
}));

router.delete('/:id/manage/candidates/:candidateId', requireOrganizer, asyncHandler(async (req, res) => {
  if (req.election.status !== 'draft') {
    return res.status(409).json({ message: 'Candidates can only be removed before the session is opened' });
  }
  if (!mongoose.isValidObjectId(req.params.candidateId)) {
    return res.status(404).json({ message: 'Candidate not found' });
  }
  const candidate = await Candidate.findOneAndDelete({ _id: req.params.candidateId, election: req.election._id });
  if (!candidate) {
    return res.status(404).json({ message: 'Candidate not found' });
  }
  if (candidate.image) await Image.deleteOne({ _id: candidate.image });
  res.status(200).json({ message: 'Candidate deleted successfully' });
}));

/* ---------- Organizer: voters ---------- */

router.get('/:id/manage/voters', requireOrganizer, asyncHandler(async (req, res) => {
  const memberships = await Membership.find({ election: req.election._id })
    .select('status approvedVia hasVoted enrolSelfie voteSelfie createdAt user')
    .populate('user', 'name email')
    .sort({ createdAt: 1 })
    .lean();

  res.status(200).json(memberships.map((m) => ({
    _id: m._id,
    name: m.user ? m.user.name : '',
    email: m.user ? m.user.email : '',
    status: m.status,
    approvedVia: m.approvedVia,
    hasVoted: m.hasVoted,
    enrolSelfie: m.enrolSelfie || null,
    voteSelfie: m.voteSelfie || null,
    joinedAt: m.createdAt
  })));
}));

router.post('/:id/manage/voters/approve-all', requireOrganizer, asyncHandler(async (req, res) => {
  const pending = await Membership.find({ election: req.election._id, status: 'pending' })
    .select('_id').sort({ createdAt: 1 }).lean();

  // First come, first approved, until the cap is reached
  let approved = 0;
  let full = false;
  for (const membership of pending) {
    const outcome = await approveMembership(req.election._id, membership._id, 'organizer');
    if (outcome === 'full') {
      full = true;
      break;
    }
    if (outcome === 'approved') approved++;
  }
  res.status(200).json({ approved, full, remaining: pending.length - approved });
}));

router.post('/:id/manage/voters/:membershipId/approve', requireOrganizer, asyncHandler(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.membershipId)) {
    return res.status(404).json({ message: 'Voter not found' });
  }
  const exists = await Membership.exists({ _id: req.params.membershipId, election: req.election._id });
  if (!exists) {
    return res.status(404).json({ message: 'Voter not found' });
  }
  if (req.election.status === 'closed') {
    return res.status(409).json({ message: 'This voting session is closed' });
  }

  const outcome = await approveMembership(req.election._id, req.params.membershipId, 'organizer');
  if (outcome === 'full') {
    return res.status(409).json({
      message: `The session is full: all ${req.election.maxVoters} places are taken. Raise the limit to approve more voters.`
    });
  }
  res.status(200).json({ status: 'approved' });
}));

router.post('/:id/manage/voters/:membershipId/reject', requireOrganizer, asyncHandler(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.membershipId)) {
    return res.status(404).json({ message: 'Voter not found' });
  }
  // Only a voter who has not voted yet can be rejected; this returns the state before the change
  const before = await Membership.findOneAndUpdate(
    { _id: req.params.membershipId, election: req.election._id, hasVoted: false, status: { $ne: 'rejected' } },
    { status: 'rejected' }
  );
  if (!before) {
    const membership = await Membership.findOne({ _id: req.params.membershipId, election: req.election._id }).lean();
    if (!membership) {
      return res.status(404).json({ message: 'Voter not found' });
    }
    if (membership.hasVoted) {
      return res.status(409).json({ message: 'This voter has already voted and cannot be removed' });
    }
    return res.status(200).json({ status: 'rejected' });
  }
  if (before.status === 'approved') {
    // Free the place they were holding
    await Election.updateOne({ _id: req.election._id }, { $inc: { approvedCount: -1 } });
  }
  res.status(200).json({ status: 'rejected' });
}));

// Add emails to the voter list, approving anyone on it who is already waiting
router.post('/:id/manage/allow-list', requireOrganizer, asyncHandler(async (req, res) => {
  if (req.election.status === 'closed') {
    return res.status(409).json({ message: 'This voting session is closed' });
  }
  const { emails, invalid } = parseEmails(req.body.emails);
  if (emails.length === 0) {
    return res.status(400).json({ message: 'Enter at least one valid email', invalid });
  }

  const current = await Election.findById(req.election._id).select('+allowList').lean();
  const existing = new Set(current.allowList || []);
  const added = emails.filter((email) => !existing.has(email));
  if (existing.size + added.length > MAX_VOTERS_LIMIT) {
    return res.status(400).json({ message: `The voter list can hold up to ${MAX_VOTERS_LIMIT} emails` });
  }
  await Election.updateOne({ _id: req.election._id }, { $addToSet: { allowList: { $each: added } } });

  const users = await User.find({ email: { $in: emails } }).select('_id').lean();
  const waiting = await Membership.find({
    election: req.election._id,
    status: 'pending',
    user: { $in: users.map((u) => u._id) }
  }).select('_id').sort({ createdAt: 1 }).lean();

  let autoApproved = 0;
  for (const membership of waiting) {
    const outcome = await approveMembership(req.election._id, membership._id, 'list');
    if (outcome === 'full') break;
    if (outcome === 'approved') autoApproved++;
  }

  res.status(200).json({ added: added.length, autoApproved, invalid });
}));

// Remove stored selfies and face data once a session is over
router.post('/:id/manage/purge-selfies', requireOrganizer, asyncHandler(async (req, res) => {
  if (req.election.status !== 'closed') {
    return res.status(409).json({ message: 'Selfies can be deleted after the session is closed' });
  }
  const deleted = await Image.deleteMany({ election: req.election._id, kind: 'selfie' });
  await Membership.updateMany(
    { election: req.election._id },
    { $unset: { enrolSelfie: 1, voteSelfie: 1, faceDescriptor: 1 } }
  );
  res.status(200).json({ deleted: deleted.deletedCount });
}));

router.get('/:id/manage/results.csv', requireOrganizer, asyncHandler(async (req, res) => {
  resultsCache.delete(String(req.election._id));
  const { candidates, totalVotes } = await countVotes(req.election._id);

  const lines = [
    ['Candidate', 'Group / tagline', 'Votes'].map(csvCell).join(','),
    ...candidates.map((c) => [c.name, c.party, c.votes].map(csvCell).join(',')),
    '',
    [csvCell('Total votes'), '', csvCell(totalVotes)].join(','),
    [csvCell('Approved voters'), '', csvCell(req.election.approvedCount)].join(','),
    [csvCell('Voter limit'), '', csvCell(req.election.maxVoters)].join(',')
  ];

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="results.csv"');
  res.status(200).send(lines.join('\r\n'));
}));

module.exports = router;
