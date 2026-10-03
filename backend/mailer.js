const nodemailer = require('nodemailer');

let transporter = null;

// Email is only attempted once the host, user and password are all filled in,
// so a half-finished .env keeps printing codes instead of failing every sign-in
const smtpConfigured = () =>
  Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);

const getTransporter = () => {
  if (!transporter) {
    const port = Number(process.env.SMTP_PORT) || 587;
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port,
      secure: port === 465,
      auth: {
        user: process.env.SMTP_USER,
        // Google shows app passwords in groups of four with spaces; the spaces are not part of it
        pass: process.env.SMTP_PASS.replace(/\s+/g, '')
      }
    });
  }
  return transporter;
};

const SESSION_TEXT_LIMIT = 80;
const LINK_PATTERN = /(https?:|www\.|\S+\.\S+\/)/i;

// Session titles and organizer names are typed by users and would be emailed to
// any address someone enters. Anything that could pass as a link is left out,
// and line breaks are removed so the text cannot rearrange the email.
const cleanForEmail = (value) => {
  if (typeof value !== 'string') return '';
  const text = value
    .replace(/[\u0000-\u001f\u007f]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, SESSION_TEXT_LIMIT);
  return LINK_PATTERN.test(text) ? '' : text;
};

// The subject and body of the sign-in email. `session` ({ title, organizerName })
// is given when the person is signing in from a join link, so the email can name
// the vote they came for.
const buildLoginEmail = (code, session) => {
  const title = cleanForEmail(session && session.title);
  const organizerName = cleanForEmail(session && session.organizerName);
  const footer = 'It expires in 10 minutes. If you did not ask for it, ignore this email.';

  if (!title) {
    return {
      subject: `${code} is your Voting App sign-in code`,
      text: `Your sign-in code is ${code}\n\n${footer}`
    };
  }

  const organizedBy = organizerName ? `, organized by ${organizerName}` : '';
  return {
    subject: `${code} is your code to join "${title}"`,
    text: `Your sign-in code is ${code}\n\nYou asked to join "${title}"${organizedBy}.\n\n${footer}`
  };
};

// Sends the sign-in code. Without SMTP settings the code is printed to the
// server console instead, which is enough for local development.
const sendLoginCode = async (email, code, session) => {
  if (!smtpConfigured()) {
    console.log(`[no SMTP configured] Sign-in code for ${email}: ${code}`);
    return;
  }
  await getTransporter().sendMail({
    // Shows as "Voting App" in the inbox unless MAIL_FROM says otherwise
    from: process.env.MAIL_FROM || { name: 'Voting App', address: process.env.SMTP_USER },
    to: email,
    ...buildLoginEmail(code, session)
  });
};

module.exports = {
  smtpConfigured,
  getTransporter,
  buildLoginEmail,
  sendLoginCode
};
