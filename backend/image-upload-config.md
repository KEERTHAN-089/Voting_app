# Backend Configuration for Image Uploads

To enable image uploads for candidates in your voting application, follow these steps to configure your backend server:

## 1. Install Required Dependencies

```bash
npm install multer express-fileupload cloudinary
```

Choose one of the following libraries based on your preference:
- `multer` - For local file storage
- `express-fileupload` - Simpler alternative to multer
- `cloudinary` - For cloud-based storage (recommended for production)

## 2. Set Up Multer for Local Storage

```javascript
// In your app.js or routes file
const multer = require('multer');
const path = require('path');

// Configure storage
const storage = multer.diskStorage({
  destination: function(req, file, cb) {
    cb(null, 'uploads/');  // Make sure this directory exists
  },
  filename: function(req, file, cb) {
    cb(null, `${Date.now()}-${file.originalname}`);
  }
});

// File filter - only accept images
const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Not an image! Please upload only images.'), false);
  }
};

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: fileFilter
});

// Create uploads directory if it doesn't exist
const fs = require('fs');
if (!fs.existsSync('./uploads')) {
  fs.mkdirSync('./uploads');
}
```

## 3. Create Static File Serving

```javascript
// In your app.js
const express = require('express');
const app = express();

// Serve static files from 'uploads' directory
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
```

## 4. Update Candidate Model

```javascript
// In your candidate model file (mongoose example)
const mongoose = require('mongoose');

const candidateSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  party: {
    type: String,
    required: true
  },
  age: {
    type: Number
  },
  imageUrl: {
    type: String,
    default: null
  }
});

module.exports = mongoose.model('Candidate', candidateSchema);
```

## 5. Update Candidate Routes

```javascript
// In your candidate routes file
const express = require('express');
const router = express.Router();
const Candidate = require('../models/candidate');
const auth = require('../middleware/auth');
const admin = require('../middleware/admin');

// Create candidate with image upload
router.post('/', [auth, admin], upload.single('image'), async (req, res) => {
  try {
    const { name, party, age } = req.body;
    
    const candidate = new Candidate({
      name,
      party,
      age: age ? parseInt(age) : undefined,
      // If an image was uploaded, store its path
      imageUrl: req.file ? `/uploads/${req.file.filename}` : null
    });
    
    await candidate.save();
    res.status(201).json(candidate);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Update candidate with possible image upload
router.put('/:id', [auth, admin], upload.single('image'), async (req, res) => {
  try {
    const { name, party, age } = req.body;
    const candidateId = req.params.id;
    
    const candidate = await Candidate.findById(candidateId);
    if (!candidate) {
      return res.status(404).json({ message: 'Candidate not found' });
    }
    
    // Update fields
    candidate.name = name || candidate.name;
    candidate.party = party || candidate.party;
    candidate.age = age ? parseInt(age) : candidate.age;
    
    // If a new image was uploaded, update the image URL
    if (req.file) {
      // Delete old image if exists
      if (candidate.imageUrl) {
        const oldImagePath = path.join(__dirname, '..', candidate.imageUrl);
        if (fs.existsSync(oldImagePath)) {
          fs.unlinkSync(oldImagePath);
        }
      }
      candidate.imageUrl = `/uploads/${req.file.filename}`;
    }
    
    await candidate.save();
    res.status(200).json(candidate);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Other routes...
```

## 6. CORS Configuration

Ensure your CORS settings allow requests from your frontend:

```javascript
// In your app.js
const cors = require('cors');

app.use(cors({
  origin: 'http://localhost:3001', // Your frontend URL
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));
```

## 7. Alternative: Using Cloudinary (Recommended for Production)

```javascript
// Install: npm install cloudinary multer-storage-cloudinary
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'voting-app-candidates',
    allowed_formats: ['jpg', 'png', 'jpeg', 'gif']
  }
});

const upload = multer({ storage: storage });

// Then use it in your routes
router.post('/', [auth, admin], upload.single('image'), async (req, res) => {
  try {
    const candidate = new Candidate({
      // ...other fields
      imageUrl: req.file ? req.file.path : null  // Cloudinary returns the URL in file.path
    });
    // ...rest of the code
  } catch (error) {
    // Error handling
  }
});
```

## 8. Environment Variables

If using Cloudinary or other cloud providers, set up environment variables:

