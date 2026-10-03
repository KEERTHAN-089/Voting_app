const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Image = require('../models/image');
const Election = require('../models/election');
const { optionalAuth } = require('../jwt');
const { asyncHandler } = require('../access');

// Candidate photos are public. Selfies go only to the organizer of their session.
router.get('/:id', optionalAuth, asyncHandler(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return res.status(404).json({ message: 'Image not found' });
  }
  const image = await Image.findById(req.params.id).lean();
  if (!image) {
    return res.status(404).json({ message: 'Image not found' });
  }

  if (image.kind === 'selfie') {
    if (!req.user) {
      return res.status(401).json({ message: 'Sign in to view this image' });
    }
    const isOrganizer = await Election.exists({ _id: image.election, organizer: req.user.id });
    if (!isOrganizer) {
      return res.status(403).json({ message: 'Only the organizer can view selfies' });
    }
    res.setHeader('Cache-Control', 'private, no-store');
  } else {
    // A replaced photo gets a new id, so the old one can be cached for a long time
    res.setHeader('Cache-Control', 'public, max-age=604800, immutable');
  }

  res.setHeader('Content-Type', image.contentType);
  // lean() returns the bytes as a BSON Binary
  res.status(200).send(Buffer.isBuffer(image.data) ? image.data : image.data.buffer);
}));

module.exports = router;
