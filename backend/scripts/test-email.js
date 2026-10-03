/*
 * Checks the email settings in backend/.env by sending one test message.
 *
 *   npm run test-email -- you@example.com
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const mailer = require('../mailer');

const main = async () => {
  const to = process.argv[2];
  if (!to) {
    console.error('Give the address to send the test to:  npm run test-email -- you@example.com');
    process.exit(1);
  }

  const missing = ['SMTP_HOST', 'SMTP_USER', 'SMTP_PASS'].filter((key) => !process.env[key]);
  if (missing.length > 0) {
    console.error(`Not set in backend/.env: ${missing.join(', ')}`);
    console.error('Until these are filled in, sign-in codes are printed in the backend terminal instead of emailed.');
    process.exit(1);
  }

  console.log(`Signing in to ${process.env.SMTP_HOST} as ${process.env.SMTP_USER}...`);
  try {
    await mailer.getTransporter().verify();
  } catch (error) {
    console.error(`\nThe mail server refused the sign-in: ${error.message}`);
    if (error.code === 'EAUTH') {
      console.error('\nFor Gmail, SMTP_PASS must be an app password, not your normal Gmail password:');
      console.error('  1. Turn on 2-Step Verification at https://myaccount.google.com/security');
      console.error('  2. Create an app password at https://myaccount.google.com/apppasswords');
      console.error('  3. Put the 16 letters in SMTP_PASS');
    }
    process.exit(1);
  }

  await mailer.sendLoginCode(to, '123456');
  console.log(`\nSent. Check the inbox (and the spam folder) of ${to}.`);
};

main().catch((error) => {
  console.error(`\nSending failed: ${error.message}`);
  process.exit(1);
});
