const mongoose = require('mongoose');
const Grid = require('gridfs-stream');
const multer = require('multer');
const { GridFsStorage } = require('multer-gridfs-storage');
const path = require('path');
require('dotenv').config();

// MongoDB Atlas connection string
const mongoURI = process.env.MONGODB_URI;

// Create MongoDB connection
const conn = mongoose.createConnection(mongoURI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

// Initialize GridFS
let gfs;
conn.once('open', () => {
  console.log('MongoDB GridFS connection opened');
  gfs = Grid(conn.db, mongoose.mongo);
  gfs.collection('uploads');
});

// Create storage engine
const storage = new GridFsStorage({
  url: mongoURI,
  options: { useNewUrlParser: true, useUnifiedTopology: true },
  file: (req, file) => {
    return {
      filename: `candidate_${Date.now()}${path.extname(file.originalname)}`,
      bucketName: 'uploads',
      metadata: {
        candidateId: req.body.candidateId || null,
        uploadedBy: req.user ? req.user.id : 'system'
      }
    };
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

module.exports = { upload, gfs, conn };
