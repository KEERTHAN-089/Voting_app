/*
 * Starts the backend on a temporary database that lives in memory, so the app
 * can be tried without a MongoDB Atlas cluster.
 *
 *   npm run demo
 *
 * Everything (users, sessions, votes) is lost when this stops. Do not use it
 * for a real vote.
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const { MongoMemoryReplSet } = require('mongodb-memory-server');

const main = async () => {
  console.log('Starting a temporary in-memory database (the first run downloads MongoDB)...');
  const mongo = await MongoMemoryReplSet.create({ replSet: { count: 1 } });

  // server.js reads these; values already set here win over the ones in .env
  process.env.MONGODB_URI = mongo.getUri('voting_app');
  process.env.JWT_SECRET = process.env.JWT_SECRET || 'demo-only-secret';

  console.log('');
  console.log('DEMO MODE: using a temporary database. All data is lost when you stop the server.');
  console.log('');
  require('../server');
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
