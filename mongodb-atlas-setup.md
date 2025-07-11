# Step-by-Step Guide: Setting Up MongoDB Atlas with Image Storage

This guide will walk you through setting up MongoDB Atlas and implementing GridFS for storing candidate images in your voting application.

## Part 1: Setting Up MongoDB Atlas

### Step 1: Create a MongoDB Atlas Account
1. Go to [MongoDB Atlas website](https://www.mongodb.com/cloud/atlas/register)
2. Sign up with your email or Google/GitHub account
3. Complete the initial setup questions about your project

### Step 2: Create Your First Cluster
1. Click "Build a Cluster" button
2. Select "Shared" option (Free tier)
3. Choose a cloud provider (AWS, Google Cloud, or Azure) and a region closest to your users
4. Keep the default cluster tier (M0 Sandbox - Free)
5. Name your cluster (e.g., "VotingAppCluster")
6. Click "Create Cluster" (creation takes 1-3 minutes)

### Step 3: Configure Database Security
1. In the Security section, click "Database Access"
2. Click "Add New Database User"
3. Set up authentication:
   - Username and Password
   - Select "Password" as authentication method
   - Create a secure password
   - Set user privileges to "Atlas admin" for simplicity in development
4. Click "Add User"

### Step 4: Set Network Access
1. Go to "Network Access" under Security
2. Click "Add IP Address"
3. For development, select "Allow Access from Anywhere" 
   (Note: For production, restrict to specific IP addresses)
4. Click "Confirm"

### Step 5: Get Your Connection String
1. Click "Connect" on your cluster dashboard
2. Select "Connect your application"
3. Copy the connection string
4. Replace `<password>` with your database user's password
5. Replace `myFirstDatabase` with your preferred database name (e.g., `voting-app`)

## Part 2: Implementing GridFS for Image Storage

### Step 6: Install Required Packages
Create a new terminal in your project directory and install:
```bash
npm install mongoose gridfs-stream multer-gridfs-storage
```

### Step 7: Create GridFS Configuration File

Create a new file at `config/gridfs-config.js`:

```javascript
const mongoose = require('mongoose');
const Grid = require('gridfs-stream');

// Mongo URI
const mongoURI = process.env.MONGODB_URI;

// Create mongo connection
const conn = mongoose.createConnection(mongoURI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

// Init gfs
let gfs;
conn.once('open', () => {
  // Initialize stream
  gfs = Grid(conn.db, mongoose.mongo);
  gfs.collection('uploads'); // Set the default collection to search
});

module.exports = gfs;
```

### Step 8: Create Candidate Model

Create a new file at `models/Candidate.js`:

```javascript
const mongoose = require('mongoose');

const CandidateSchema = new mongoose.Schema({
  name: { type: String, required: true },
  party: { type: String, required: true },
  age: { type: Number, required: true },
  imageId: { type: String } // This will store the file ID from GridFS
});

module.exports = mongoose.model('Candidate', CandidateSchema);
```

### Step 9: Set Up Routes for Candidates

Create a new file at `routes/candidates.js`:

```javascript
const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const multer = require('multer');
const GridFsStorage = require('multer-gridfs-storage').GridFsStorage;
const Grid = require('gridfs-stream');
const Candidate = require('../models/Candidate');
const gfs = require('../config/gridfs-config');

// Middleware to handle multipart/form-data
const storage = new GridFsStorage({
  url: process.env.MONGODB_URI,
  file: (req, file) => {
    return new Promise((resolve, reject) => {
      // Set the file name and metadata
      const fileName = `${req.body.name}-${Date.now()}`;
      const fileInfo = {
        filename: fileName,
        bucketName: 'uploads'
      };
      resolve(fileInfo);
    });
  }
});
const upload = multer({ storage });

// @route   POST /api/candidates
// @desc    Create a new candidate
// @access  Public
router.post('/', upload.single('image'), async (req, res) => {
  try {
    // Create a new candidate document
    const newCandidate = new Candidate({
      name: req.body.name,
      party: req.body.party,
      age: req.body.age,
      imageId: req.file.id // Save the file ID to the candidate document
    });

    // Save the candidate to the database
    const savedCandidate = await newCandidate.save();
    res.status(201).json(savedCandidate);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// @route   GET /api/candidates
// @desc    Get all candidates
// @access  Public
router.get('/', async (req, res) => {
  try {
    const candidates = await Candidate.find();
    res.json(candidates);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// @route   GET /api/candidates/image/:id
// @desc    Get image by ID
// @access  Public
router.get('/image/:id', (req, res) => {
  gfs.files.findOne({ _id: mongoose.Types.ObjectId(req.params.id) }, (err, file) => {
    if (!file || file.length === 0) {
      return res.status(404).json({ err: 'No file exists' });
    }

    // Check if the file is an image
    if (file.contentType === 'image/jpeg' || file.contentType === 'image/png' || file.contentType === 'image/gif') {
      // Create read stream and pipe to response
      const readstream = gfs.createReadStream(file.filename);
      readstream.pipe(res);
    } else {
      res.status(400).json({ err: 'Not an image file' });
    }
  });
});

module.exports = router;
```

## Part 3: Integration and Testing

### Step 10: Update Your .env File
Add your MongoDB Atlas connection string:
```bash
# MongoDB Atlas Connection
MONGODB_URI=mongodb+srv://<username>:<password>@<cluster>.mongodb.net/voting-app?retryWrites=true&w=majority
```

### Step 11: Connect Everything in app.js
Update your main app.js file to use the MongoDB connection and routes:

```javascript
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

// Import routes
const candidateRoutes = require('./routes/candidates');

// Initialize app
const app = express();

// Connect to MongoDB Atlas
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log('MongoDB Atlas connected'))
.catch(err => console.error('MongoDB connection error:', err));

// Middleware
app.use(cors({
  origin: 'http://localhost:3001',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

// Routes
app.use('/api/candidates', candidateRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send('Something broke!');
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
```

### Step 12: Test Your Implementation

1. **Test Image Upload**
   - Use Postman or your frontend to upload a candidate with an image
   - Request: `POST /api/candidates`
   - Set Content-Type: `multipart/form-data`
   - Include fields: `name`, `party`, `age`, and file field `image`

2. **Retrieve Candidate Data**
   - Request: `GET /api/candidates`
   - Verify your candidate has an `imageId` property

3. **View Image**
   - Using the `imageId` from the previous step
   - Access: `GET /api/candidates/image/<imageId>`
   - The image should be displayed

### Step 13: Update Your Frontend Components

1. **Candidate Form Component**
   Update your CandidateForm component to handle file uploads:

```jsx
// In your CandidateForm.js component
const handleSubmit = async (e) => {
  e.preventDefault();
  
  const formData = new FormData();
  formData.append('name', name);
  formData.append('party', party);
  formData.append('age', age);
  if (image) {
    formData.append('image', image);
  }
  
  try {
    const response = await api.post('/api/candidates', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    // Handle success...
  } catch (error) {
    // Handle error...
  }
};
```

2. **Displaying Candidates with Images**
   Update your candidate display component:

```jsx
function CandidateCard({ candidate }) {
  return (
    <div className="candidate-card">
      {candidate.imageId && (
        <img 
          src={`/api/candidates/image/${candidate.imageId}`} 
          alt={candidate.name}
          className="candidate-image"
        />
      )}
      <h3>{candidate.name}</h3>
      <p>Party: {candidate.party}</p>
      {candidate.age && <p>Age: {candidate.age}</p>}
    </div>
  );
}
```

## Part 4: Troubleshooting Common Issues

### Issue: Connection Failed
- Verify your connection string is correct
- Check that your IP is whitelisted in MongoDB Atlas
- Ensure your username/password is correct

### Issue: "MongooseServerSelectionError"
- This usually means MongoDB Atlas can't be reached
- Check your internet connection
- Verify the cluster is running in Atlas dashboard

### Issue: Images Not Displaying
- Check the browser console for errors
- Verify the image route is working correctly
- Ensure the imageId in your database is valid

### Issue: "MulterError: Unexpected field"
- Make sure your form field name matches what your backend expects
- For file uploads, the field should be named 'image' in this example

### Issue: "Error: Only image files are allowed"
- Verify you're uploading a supported image format (JPEG, PNG, GIF)

## Part 5: Next Steps

After successfully setting up MongoDB Atlas with GridFS image storage:

1. **Implement Image Optimization**
   - Consider using the Sharp library to resize images before storage
   - Add multiple size variants for different display contexts

2. **Add Security Enhancements**
   - Implement rate limiting for uploads
   - Add virus scanning for uploaded files

3. **Improve Performance**
   - Add caching for frequently accessed images
   - Consider implementing lazy loading in your frontend

4. **Monitoring and Maintenance**
   - Set up automated backups of your MongoDB Atlas database
   - Monitor storage usage to stay within your plan limits
