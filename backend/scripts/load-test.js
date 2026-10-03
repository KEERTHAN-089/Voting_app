/*
 * Simulates a rush of voters across several sessions at once and reports
 * response times and errors.
 *
 *   npm run load-test                 (400 voters over 4 sessions)
 *   npm run load-test -- 1000 4      (1000 voters over 4 sessions)
 *
 * It runs against a throwaway in-memory database, so it never touches real data.
 * Real response times also depend on the network distance to MongoDB Atlas.
 */
process.env.JWT_SECRET = process.env.JWT_SECRET || 'load-test-secret';
process.env.NODE_ENV = 'test';

const mongoose = require('mongoose');
const { MongoMemoryReplSet } = require('mongodb-memory-server');
const app = require('../app');
const { generateToken } = require('../jwt');
const User = require('../models/user');
const Election = require('../models/election');
const Candidate = require('../models/candidate');
const Membership = require('../models/membership');
const Vote = require('../models/vote');

const TOTAL_VOTERS = Number(process.argv[2]) || 400;
const SESSION_COUNT = Number(process.argv[3]) || 4;
const CANDIDATES_PER_SESSION = 4;
// Voters arrive spread over this window, like a room of people scanning a QR code.
// Opening every connection in the same millisecond only tests the OS connection queue.
const ARRIVAL_WINDOW_MS = 3000;

const timings = {};
let failures = 0;

const timed = async (label, url, options) => {
  const started = performance.now();
  const res = await fetch(url, options);
  await res.arrayBuffer();
  (timings[label] = timings[label] || []).push(performance.now() - started);
  if (!res.ok) {
    failures++;
    console.error(`${label} failed with ${res.status}`);
  }
  return res;
};

const percentile = (sorted, p) => sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * p))];

const seedSession = async (index, voterCount) => {
  const organizer = await User.create({ email: `organizer${index}@load.test`, name: `Organizer ${index}` });
  const election = await Election.create({
    title: `Load test session ${index}`,
    organizer: organizer._id,
    status: 'open',
    joinCode: `LOADTEST${index}`,
    maxVoters: voterCount,
    approvedCount: voterCount,
    resultsVisible: 'live'
  });
  const candidates = await Candidate.insertMany(
    Array.from({ length: CANDIDATES_PER_SESSION }, (_, i) => ({ election: election._id, name: `Candidate ${i + 1}` }))
  );
  const users = await User.insertMany(
    Array.from({ length: voterCount }, (_, i) => ({ email: `voter${index}-${i}@load.test`, name: `Voter ${i}` }))
  );
  await Membership.insertMany(users.map((u) => ({ election: election._id, user: u._id, status: 'approved' })));

  return {
    election,
    candidates,
    voters: users.map((u) => ({ Authorization: `Bearer ${generateToken({ id: u._id, email: u.email })}` }))
  };
};

// What one voter's phone does: open the link, load the ballot, vote, look at results
const runVoter = async (base, session, auth, number) => {
  await new Promise((resolve) => setTimeout(resolve, Math.random() * ARRIVAL_WINDOW_MS));
  const id = session.election._id;
  const candidate = session.candidates[number % session.candidates.length];
  await timed('join page', `${base}/api/elections/join/${session.election.joinCode}`, { headers: auth });
  await timed('ballot', `${base}/api/elections/${id}/ballot`, { headers: auth });
  await timed('vote', `${base}/api/elections/${id}/vote`, {
    method: 'POST',
    headers: { ...auth, 'Content-Type': 'application/json' },
    body: JSON.stringify({ candidateId: candidate._id })
  });
  await timed('results', `${base}/api/elections/${id}/results`, { headers: auth });
};

const main = async () => {
  console.log(`Simulating ${TOTAL_VOTERS} voters across ${SESSION_COUNT} sessions, arriving within ${ARRIVAL_WINDOW_MS / 1000} seconds...`);

  const mongo = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
  await mongoose.connect(mongo.getUri(), { maxPoolSize: 50 });
  await Promise.all(Object.values(mongoose.models).map((model) => model.init()));
  const server = app.listen(0);
  const base = `http://127.0.0.1:${server.address().port}`;

  const perSession = Math.ceil(TOTAL_VOTERS / SESSION_COUNT);
  const sessions = [];
  for (let i = 0; i < SESSION_COUNT; i++) sessions.push(await seedSession(i, perSession));

  const started = performance.now();
  await Promise.all(sessions.flatMap((session) =>
    session.voters.map((auth, number) => runVoter(base, session, auth, number))));
  const seconds = (performance.now() - started) / 1000;

  const requestCount = Object.values(timings).reduce((sum, list) => sum + list.length, 0);
  console.log(`\n${requestCount} requests in ${seconds.toFixed(1)}s (${Math.round(requestCount / seconds)} per second), ${failures} failed\n`);
  console.log('Response time (ms)   median      95%      99%      max');
  for (const [label, list] of Object.entries(timings)) {
    const sorted = list.sort((a, b) => a - b);
    const cells = [percentile(sorted, 0.5), percentile(sorted, 0.95), percentile(sorted, 0.99), sorted[sorted.length - 1]]
      .map((ms) => String(Math.round(ms)).padStart(8)).join(' ');
    console.log(`${label.padEnd(18)}${cells}`);
  }

  // Every voter must be counted exactly once, in their own session
  let correct = true;
  for (const session of sessions) {
    const votes = await Vote.countDocuments({ election: session.election._id });
    const voted = await Membership.countDocuments({ election: session.election._id, hasVoted: true });
    if (votes !== session.voters.length || voted !== session.voters.length) {
      correct = false;
      console.error(`Session ${session.election.title}: expected ${session.voters.length} votes, counted ${votes} (${voted} voters marked as voted)`);
    }
  }
  console.log(correct ? '\nVote counts are correct in every session.' : '\nVOTE COUNTS ARE WRONG.');

  await new Promise((resolve) => server.close(resolve));
  await mongoose.disconnect();
  await mongo.stop();
  process.exit(correct && failures === 0 ? 0 : 1);
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
