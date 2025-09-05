const crypto = require('crypto');
const secret = crypto.randomBytes(64).toString('hex');
console.log('Use this as your JWT_SECRET:');
console.log(secret);
