const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const userSchema = new mongoose.Schema({
  username: {   type: String,  required: true, unique: true },
  age: { type: Number, required: true },
  email: { type: String, required: true, unique: true }, 
  mobile : { type: String, required: true, unique: true },
  address: { type: String, required: true },  
  aadharCardNumber: { type: Number, required: true, unique: true },
  password: { type: String, required: true },  
  role: { type: String, enum: ['admin', 'voter'], default: 'voter' },
  isVoted: { type: Boolean, default: false },  
});

userSchema.methods.comparePassword = async function (password) {
  return await bcrypt.compare(password, this.password);
}

userSchema.pre('save', async function (next) {
  const user = this;
  if (user.isModified('password')) {
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(user.password, salt);
  }
  next();
});

const User = mongoose.model('User', userSchema);
module.exports = User;