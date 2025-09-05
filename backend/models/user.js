const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

// Export schema definition but don't register the model
const userSchema = new mongoose.Schema({
  username: {   type: String,  required: true, unique: true },
  age: { type: Number, required: true },
  email: { type: String, required: true, unique: true }, 
  mobile : { type: String, required: true, unique: true },
  address: { type: String, required: true },  
  aadharCardNumber: { type: Number, required: true, unique: true },
  password: { type: String, required: true },  
  role: { type: String, enum: ['admin', 'voter'], default: 'voter' },
  // Keep both field names for backward compatibility during transition
  isVoted: { type: Boolean, default: false },
  hasVoted: { type: Boolean, default: false },  // For compatibility with other parts of the app
  votedFor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Candidate',
    default: null
  }
});

// Add a pre-save middleware to synchronize isVoted and hasVoted
userSchema.pre('save', async function(next) {
  // Keep both voting status fields in sync
  if (this.isModified('isVoted')) {
    this.hasVoted = this.isVoted;
  }
  if (this.isModified('hasVoted')) {
    this.isVoted = this.hasVoted;
  }
  
  // Handle password hashing
  if (this.isModified('password')) {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
  }
  next();
});

userSchema.methods.comparePassword = async function (password) {
  return await bcrypt.compare(password, this.password);
}

// Add static methods for more resilient database operations
userSchema.statics.findByAadhar = async function(aadharCardNumber) {
  try {
    return await this.findOne({ aadharCardNumber });
  } catch (error) {
    console.error('Error finding user by Aadhar:', error);
    // Re-throw with more context
    throw new Error(`Database error when finding user: ${error.message}`);
  }
};

userSchema.statics.createWithRetry = async function(userData, maxRetries = 3) {
  let retries = 0;
  let lastError;

  while (retries < maxRetries) {
    try {
      const user = new this(userData);
      return await user.save();
    } catch (error) {
      lastError = error;
      
      // If it's a duplicate key error, don't retry
      if (error.code === 11000) {
        const field = Object.keys(error.keyPattern)[0];
        throw new Error(`User with this ${field} already exists`);
      }
      
      // If it's a connection error, retry
      if (error.name === 'MongoNetworkError') {
        retries++;
        console.log(`Retrying database operation (${retries}/${maxRetries})...`);
        await new Promise(resolve => setTimeout(resolve, 1000 * retries));
        continue;
      }
      
      // For other errors, don't retry
      throw error;
    }
  }
  
  throw new Error(`Failed after ${maxRetries} retries: ${lastError.message}`);
};

// Check if model already exists before creating a new one
const User = mongoose.models.User || mongoose.model('User', userSchema);

module.exports = User;
