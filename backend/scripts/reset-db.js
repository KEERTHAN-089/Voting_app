/*
 * Removes data left by the old version of the app (Aadhaar + password accounts
 * and the single global candidate list). The old users collection has unique
 * indexes that stop new users from signing in.
 *
 *   npm run reset-db             shows what would be deleted
 *   npm run reset-db -- --yes    deletes it
 *
 * This cannot be undone.
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const mongoose = require('mongoose');

const LEGACY_COLLECTIONS = ['users', 'candidates'];

const main = async () => {
  const confirmed = process.argv.includes('--yes');
  if (!process.env.MONGODB_URI) {
    console.error('MONGODB_URI is not set');
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGODB_URI);
  const db = mongoose.connection.db;
  const existing = (await db.listCollections().toArray()).map((c) => c.name);

  // Only touch a database that really holds old-version data
  const hasLegacyUsers = existing.includes('users') &&
    (await db.collection('users').indexes()).some((index) => index.name === 'aadharCardNumber_1');
  if (!hasLegacyUsers) {
    console.log('No data from the old version found. Nothing to do.');
    await mongoose.disconnect();
    return;
  }

  console.log(`Database: ${db.databaseName}`);
  for (const name of LEGACY_COLLECTIONS) {
    if (!existing.includes(name)) continue;
    const count = await db.collection(name).countDocuments();
    if (confirmed) {
      await db.collection(name).drop();
      console.log(`Deleted "${name}" (${count} documents)`);
    } else {
      console.log(`Would delete "${name}" (${count} documents)`);
    }
  }

  if (!confirmed) {
    console.log('\nNothing was deleted. Run again with --yes to delete:  npm run reset-db -- --yes');
  }
  await mongoose.disconnect();
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
