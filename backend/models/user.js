const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const UserSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  password: {
    type: String,
    required: true,
    minlength: 6
  },
  mobile: {
    type: String,
    required: true,
    unique: true
  },
  address: {
    type: String,
    required: true
  },
  aadharCardNumber: {
    type: String,
    required: true,
    unique: true
  },
  age: {
    type: Number,
    required: true,
    min: 18
  },
  role: {
    type: String,
    enum: ['voter', 'admin'],
    default: 'voter'
  },
  // Voting fields
  hasVoted: {
    type: Boolean,
    default: false,
    index: true // Add index for faster lookups
  },
  isVoted: {
    type: Boolean,
    default: false
  },
  votedFor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Candidate',
    default: null
  },
  votedAt: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

// Hash password before saving
UserSchema.pre('save', async function(next) {
  if (!this.isModified('password')) {
    return next();
  }
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (err) {
    next(err);
  }
});

// Compare password method
UserSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// Add a pre-save hook to ensure voting fields are consistent
UserSchema.pre('save', function(next) {
  // If one voting field is set, ensure the other is too
  if (this.isModified('hasVoted') || this.isModified('isVoted')) {
    if (this.hasVoted === true) {
      this.isVoted = true;
    }
    if (this.isVoted === true) {
      this.hasVoted = true;
    }
  }
  next();
});

module.exports = mongoose.model('User', UserSchema);