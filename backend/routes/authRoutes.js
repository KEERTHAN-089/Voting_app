const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const rateLimit = require('express-rate-limit');
const User = require('../models/user');
const OtpCode = require('../models/otpCode');
const Election = require('../models/election');
const mailer = require('../mailer');
const { jwtAuthMiddleware, generateToken } = require('../jwt');
const { asyncHandler } = require('../access');

const CODE_TTL_MS = 10 * 60 * 1000;
const RESEND_WAIT_MS = 60 * 1000;
const MAX_ATTEMPTS = 5;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const JOIN_CODE_PATTERN = /^[A-Za-z0-9]{4,16}$/;

// A whole class can share one Wi-Fi address, so the per-IP ceiling is generous.
// The real brake on abuse is one code per email per minute and 5 tries per code.
const ipLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 600,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many requests from this network. Please wait a few minutes.' }
});

const normalizeEmail = (value) => (typeof value === 'string' ? value.trim().toLowerCase() : '');

// Only a keyed hash of the code is stored, so a database leak does not reveal live codes
const hashCode = (email, code) =>
  crypto.createHmac('sha256', process.env.JWT_SECRET).update(`${email}:${code}`).digest('hex');

const toPublicUser = (user) => ({ id: user._id, email: user.email, name: user.name });

// When someone signs in from a join link, the email names that session.
// An unknown code is not an error: they just get the plain email.
const findSessionForEmail = async (joinCode) => {
  if (typeof joinCode !== 'string' || !JOIN_CODE_PATTERN.test(joinCode)) return undefined;
  const election = await Election.findOne({ joinCode: joinCode.toUpperCase() })
    .select('title organizer')
    .populate('organizer', 'name')
    .lean();
  if (!election) return undefined;
  return { title: election.title, organizerName: election.organizer ? election.organizer.name : '' };
};

// Step 1 of sign-in: email a 6-digit code
router.post('/request-code', ipLimiter, asyncHandler(async (req, res) => {
  const email = normalizeEmail(req.body.email);
  if (!EMAIL_PATTERN.test(email) || email.length > 254) {
    return res.status(400).json({ message: 'Enter a valid email address' });
  }

  const existing = await OtpCode.findOne({ email }).lean();
  if (existing) {
    const waitMs = RESEND_WAIT_MS - (Date.now() - new Date(existing.sentAt).getTime());
    if (waitMs > 0) {
      return res.status(429).json({
        message: `A code was just sent. Try again in ${Math.ceil(waitMs / 1000)} seconds.`,
        retryAfterSeconds: Math.ceil(waitMs / 1000)
      });
    }
  }

  const code = String(crypto.randomInt(0, 1000000)).padStart(6, '0');
  await OtpCode.findOneAndUpdate(
    { email },
    { codeHash: hashCode(email, code), attempts: 0, sentAt: new Date(), expiresAt: new Date(Date.now() + CODE_TTL_MS) },
    { upsert: true }
  );

  try {
    const session = await findSessionForEmail(req.body.joinCode);
    await mailer.sendLoginCode(email, code, session);
  } catch (error) {
    console.error('Error sending sign-in code:', error.message);
    // Remove the code so the user can retry straight away
    await OtpCode.deleteOne({ email });
    return res.status(502).json({ message: 'Could not send the email. Please try again.' });
  }

  res.status(200).json({ message: 'Code sent. Check your email.' });
}));

// Step 2 of sign-in: check the code and return a token
router.post('/verify-code', ipLimiter, asyncHandler(async (req, res) => {
  const email = normalizeEmail(req.body.email);
  const code = typeof req.body.code === 'string' ? req.body.code.trim() : '';
  if (!EMAIL_PATTERN.test(email) || !/^\d{6}$/.test(code)) {
    return res.status(400).json({ message: 'Enter the 6-digit code from your email' });
  }

  // Count the attempt first, in one atomic step, so parallel guesses cannot exceed the limit
  const otp = await OtpCode.findOneAndUpdate(
    { email, expiresAt: { $gt: new Date() }, attempts: { $lt: MAX_ATTEMPTS } },
    { $inc: { attempts: 1 } }
  );
  if (!otp) {
    const locked = await OtpCode.exists({ email, expiresAt: { $gt: new Date() } });
    if (locked) {
      return res.status(429).json({ message: 'Too many wrong attempts. Request a new code.' });
    }
    return res.status(400).json({ message: 'This code has expired. Request a new one.' });
  }

  const expected = Buffer.from(otp.codeHash, 'hex');
  const given = Buffer.from(hashCode(email, code), 'hex');
  if (expected.length !== given.length || !crypto.timingSafeEqual(expected, given)) {
    return res.status(401).json({
      message: 'Wrong code',
      attemptsLeft: MAX_ATTEMPTS - (otp.attempts + 1)
    });
  }

  await OtpCode.deleteOne({ _id: otp._id });

  const user = await User.findOneAndUpdate(
    { email },
    { $setOnInsert: { email } },
    { upsert: true, new: true }
  );

  const token = generateToken({ id: user._id, email: user.email });
  res.status(200).json({ user: toPublicUser(user), token });
}));

router.get('/me', jwtAuthMiddleware, asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id);
  if (!user) {
    return res.status(401).json({ message: 'User not found' });
  }
  res.status(200).json(toPublicUser(user));
}));

// Set the display name organizers see when approving voters
router.put('/me', jwtAuthMiddleware, asyncHandler(async (req, res) => {
  const name = typeof req.body.name === 'string' ? req.body.name.trim() : '';
  if (!name || name.length > 80) {
    return res.status(400).json({ message: 'Enter your name (up to 80 characters)' });
  }
  const user = await User.findByIdAndUpdate(req.user.id, { name }, { new: true });
  if (!user) {
    return res.status(401).json({ message: 'User not found' });
  }
  res.status(200).json(toPublicUser(user));
}));

module.exports = router;
