const mongoose = require('mongoose');
const path = require('path');
const multer = require('multer');
require('dotenv').config();

// Create a simpler version without GridFS for now
// This will allow the application to start while we implement proper file storage

// Set up storage for multer - use disk storage instead of GridFS
const storage = multer.diskStorage({
  destination: function(req, file, cb) {
    const uploadDir = path.join(__dirname, '..', 'uploads');
    cb(null, uploadDir);
  },
  filename: function(req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

// File filter function
const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|gif/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);
  
  if (extname && mimetype) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed!'), false);
  }
};

// Initialize upload middleware
const upload = multer({ 
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter
});

// Mock GridFS functions for compatibility
const gfs = {
  files: {
    findOne: async () => null,
    deleteOne: async () => ({ deletedCount: 0 })
  },
  createReadStream: () => null
};

module.exports = { upload, gfs };
