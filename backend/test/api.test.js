process.env.JWT_SECRET = 'test-secret';
process.env.NODE_ENV = 'test';

const { test, before, after, describe } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryReplSet } = require('mongodb-memory-server');

const app = require('../app');
const mailer = require('../mailer');
const { generateToken } = require('../jwt');
const User = require('../models/user');
const OtpCode = require('../models/otpCode');
const Election = require('../models/election');
const Candidate = require('../models/candidate');
const Membership = require('../models/membership');
const Vote = require('../models/vote');

let mongo;
let server;
let api;
let userCounter = 0;

// Capture sign-in codes instead of emailing them
const sentCodes = new Map();
const sentSessions = new Map();
mailer.sendLoginCode = async (email, code, session) => {
  sentCodes.set(email, code);
  sentSessions.set(email, session);
};

const SELFIE = `data:image/jpeg;base64,${Buffer.from('not-a-real-jpeg-but-fine-for-tests').toString('base64')}`;
const descriptor = (value) => Array.from({ length: 128 }, () => value);

before(async () => {
  // Transactions need a replica set, even a one-node one
  mongo = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
  await mongoose.connect(mongo.getUri());
  await Promise.all(Object.values(mongoose.models).map((model) => model.init()));
  server = app.listen(0);
  api = request(server);
});

after(async () => {
  await new Promise((resolve) => server.close(resolve));
  await mongoose.disconnect();
  await mongo.stop();
});

// A signed-in user, created directly so tests do not have to go through email codes
const makeUser = async (email) => {
  userCounter++;
  const user = await User.create({ email: email || `user${userCounter}@test.dev`, name: `User ${userCounter}` });
  const token = generateToken({ id: user._id, email: user.email });
  return { id: String(user._id), email: user.email, auth: { Authorization: `Bearer ${token}` } };
};

const createSession = async (organizer, overrides = {}) => {
  const res = await api.post('/api/elections').set(organizer.auth)
    .send({ title: 'Class leader', maxVoters: 100, resultsVisible: 'live', ...overrides });
  assert.equal(res.status, 201, JSON.stringify(res.body));
  return res.body.election;
};

const addCandidates = async (organizer, electionId, count = 2) => {
  const candidates = [];
  for (let i = 0; i < count; i++) {
    const res = await api.post(`/api/elections/${electionId}/manage/candidates`).set(organizer.auth)
      .field('name', `Candidate ${i + 1}`).field('party', `Group ${i + 1}`);
    assert.equal(res.status, 201, JSON.stringify(res.body));
    candidates.push(res.body.candidate);
  }
  return candidates;
};

const openSession = async (organizer, electionId) => {
  const res = await api.post(`/api/elections/${electionId}/manage/open`).set(organizer.auth);
  assert.equal(res.status, 200, JSON.stringify(res.body));
};

// A ready-to-vote session with its candidates
const openSessionWithCandidates = async (organizer, overrides = {}) => {
  const election = await createSession(organizer, overrides);
  const candidates = await addCandidates(organizer, election._id, overrides.candidateCount || 2);
  await openSession(organizer, election._id);
  return { election, candidates };
};

// Approved voters created straight in the database, for the load tests
const seedApprovedVoters = async (electionId, count) => {
  const voters = [];
  for (let i = 0; i < count; i++) voters.push(await makeUser());
  await Membership.insertMany(voters.map((v) => ({ election: electionId, user: v.id, status: 'approved' })));
  await Election.updateOne({ _id: electionId }, { $inc: { approvedCount: count } });
  return voters;
};

describe('sign-in with an emailed code', () => {
  test('a correct code signs the user in', async () => {
    const email = 'new.voter@test.dev';
    let res = await api.post('/api/auth/request-code').send({ email: '  New.Voter@Test.dev ' });
    assert.equal(res.status, 200);
    assert.match(sentCodes.get(email), /^\d{6}$/);

    res = await api.post('/api/auth/verify-code').send({ email, code: sentCodes.get(email) });
    assert.equal(res.status, 200);
    assert.equal(res.body.user.email, email);

    const me = await api.get('/api/auth/me').set({ Authorization: `Bearer ${res.body.token}` });
    assert.equal(me.status, 200);
    assert.equal(me.body.email, email);

    // The code cannot be used twice
    res = await api.post('/api/auth/verify-code').send({ email, code: sentCodes.get(email) });
    assert.equal(res.status, 400);
  });

  test('a second code cannot be requested within a minute', async () => {
    const email = 'impatient@test.dev';
    assert.equal((await api.post('/api/auth/request-code').send({ email })).status, 200);
    assert.equal((await api.post('/api/auth/request-code').send({ email })).status, 429);
  });

  test('a wrong code is rejected and the sixth attempt is locked out', async () => {
    const email = 'guesser@test.dev';
    await api.post('/api/auth/request-code').send({ email });
    const realCode = sentCodes.get(email);
    const wrongCode = realCode === '000000' ? '111111' : '000000';

    for (let attempt = 1; attempt <= 5; attempt++) {
      const res = await api.post('/api/auth/verify-code').send({ email, code: wrongCode });
      assert.equal(res.status, 401, `attempt ${attempt}`);
    }
    // Even the right code is refused now
    const res = await api.post('/api/auth/verify-code').send({ email, code: realCode });
    assert.equal(res.status, 429);
  });

  test('an expired code is rejected', async () => {
    const email = 'late@test.dev';
    await api.post('/api/auth/request-code').send({ email });
    await OtpCode.updateOne({ email }, { expiresAt: new Date(Date.now() - 1000) });
    const res = await api.post('/api/auth/verify-code').send({ email, code: sentCodes.get(email) });
    assert.equal(res.status, 400);
  });

  test('signing in from a join link names that session in the email', async () => {
    const organizer = await makeUser();
    const election = await createSession(organizer, { title: 'Club president' });
    const organizerName = (await User.findById(organizer.id)).name;

    let email = 'from.link@test.dev';
    let res = await api.post('/api/auth/request-code').send({ email, joinCode: election.joinCode.toLowerCase() });
    assert.equal(res.status, 200);
    assert.deepEqual(sentSessions.get(email), { title: 'Club president', organizerName });

    // An unknown or malformed code still sends the plain email
    for (const [address, joinCode] of [['unknown.code@test.dev', 'ZZZZZZZZ'], ['bad.code@test.dev', { $ne: '' }]]) {
      email = address;
      res = await api.post('/api/auth/request-code').send({ email, joinCode });
      assert.equal(res.status, 200);
      assert.match(sentCodes.get(email), /^\d{6}$/);
      assert.equal(sentSessions.get(email), undefined);
    }
  });

  test('the email text names the session, and drops anything that looks like a link', () => {
    const plain = mailer.buildLoginEmail('123456');
    assert.equal(plain.subject, '123456 is your Voting App sign-in code');
    assert.match(plain.text, /^Your sign-in code is 123456\n/);

    const named = mailer.buildLoginEmail('123456', { title: 'Class leader 3rd year CSE-A', organizerName: 'Asha Rao' });
    assert.equal(named.subject, '123456 is your code to join "Class leader 3rd year CSE-A"');
    assert.match(named.text, /^Your sign-in code is 123456\n/);
    assert.match(named.text, /You asked to join "Class leader 3rd year CSE-A", organized by Asha Rao\./);

    // A link in the title: fall back to the plain email
    for (const title of ['Verify at http://evil.example', 'Go to www.evil.example now', 'evil.example/login']) {
      assert.deepEqual(mailer.buildLoginEmail('123456', { title, organizerName: 'Asha Rao' }), plain);
    }
    // A link in the organizer name: keep the title, leave the name out
    const noName = mailer.buildLoginEmail('123456', { title: 'Class leader', organizerName: 'https://evil.example' });
    assert.match(noName.text, /You asked to join "Class leader"\./);
    assert.equal(noName.text.includes('evil'), false);

    // Line breaks cannot rearrange the email, and long titles are cut
    const messy = mailer.buildLoginEmail('123456', { title: `Class\r\nleader\n\n${'x'.repeat(200)}`, organizerName: '' });
    assert.equal(/[\r\n]/.test(messy.subject), false);
    assert.ok(messy.subject.length < 130);
    assert.match(messy.subject, /"Class leader x+"$/);
  });

  test('a client address with a port attached counts as the same visitor', async () => {
    const { stripPort } = require('../clientAddress');
    assert.equal(stripPort('1.2.3.4:56789'), '1.2.3.4');
    assert.equal(stripPort('[2001:db8::1]:56789'), '2001:db8::1');
    assert.equal(stripPort('1.2.3.4'), '1.2.3.4');
    assert.equal(stripPort('2001:db8::1'), '2001:db8::1');
    assert.equal(stripPort('::ffff:127.0.0.1'), '::ffff:127.0.0.1');

    // Through the app, as a hosting front end would send it
    const res = await api.post('/api/auth/request-code')
      .set('X-Forwarded-For', '203.0.113.7:51234')
      .send({ email: 'behind.proxy@test.dev' });
    assert.equal(res.status, 200);
    assert.ok(Number(res.headers['ratelimit-remaining']) >= 0);
  });

  test('requests without a valid token are refused', async () => {
    assert.equal((await api.get('/api/elections/organizing')).status, 401);
    assert.equal((await api.get('/api/elections/organizing').set({ Authorization: 'Bearer nope' })).status, 401);
  });
});

describe('creating and managing sessions', () => {
  test('any signed-in user can create a session and is its organizer', async () => {
    const alice = await makeUser();
    const election = await createSession(alice);
    assert.match(election.joinCode, /^[A-Z2-9]{8}$/);

    const mine = await api.get('/api/elections/organizing').set(alice.auth);
    assert.equal(mine.body.length, 1);
    assert.equal(mine.body[0].status, 'draft');
  });

  test("a user cannot manage someone else's session", async () => {
    const alice = await makeUser();
    const bob = await makeUser();
    const election = await createSession(alice);
    const voter = await makeUser();
    await api.post(`/api/elections/join/${election.joinCode}`).set(voter.auth);
    const membership = await Membership.findOne({ election: election._id, user: voter.id });
    const base = `/api/elections/${election._id}/manage`;

    const attempts = await Promise.all([
      api.get(base).set(bob.auth),
      api.put(base).set(bob.auth).send({ title: 'Hijacked' }),
      api.delete(base).set(bob.auth),
      api.post(`${base}/open`).set(bob.auth),
      api.post(`${base}/candidates`).set(bob.auth).field('name', 'Intruder'),
      api.get(`${base}/voters`).set(bob.auth),
      api.post(`${base}/voters/${membership._id}/approve`).set(bob.auth),
      api.post(`${base}/voters/approve-all`).set(bob.auth),
      api.post(`${base}/allow-list`).set(bob.auth).send({ emails: bob.email }),
      api.get(`${base}/results.csv`).set(bob.auth)
    ]);
    for (const res of attempts) assert.equal(res.status, 403, res.req.path);

    const unchanged = await Election.findById(election._id);
    assert.equal(unchanged.title, 'Class leader');
    assert.equal((await Membership.findById(membership._id)).status, 'pending');
  });

  test('a session needs two candidates to open, and candidates lock once it is open', async () => {
    const alice = await makeUser();
    const election = await createSession(alice);
    const base = `/api/elections/${election._id}/manage`;

    await addCandidates(alice, election._id, 1);
    assert.equal((await api.post(`${base}/open`).set(alice.auth)).status, 409);

    const [second] = await addCandidates(alice, election._id, 1);
    await openSession(alice, election._id);

    assert.equal((await api.post(`${base}/candidates`).set(alice.auth).field('name', 'Late entry')).status, 409);
    assert.equal((await api.delete(`${base}/candidates/${second._id}`).set(alice.auth)).status, 409);
  });

  test('invalid session settings are refused', async () => {
    const alice = await makeUser();
    const cases = [
      { title: '', maxVoters: 10 },
      { title: 'x', maxVoters: 0 },
      { title: 'x', maxVoters: 5001 },
      { title: 'x', maxVoters: 10, selfieMode: 'retina' },
      { title: 'x', maxVoters: 10, allowList: 'not-an-email' }
    ];
    for (const body of cases) {
      const res = await api.post('/api/elections').set(alice.auth).send(body);
      assert.equal(res.status, 400, JSON.stringify(body));
    }
  });

  test('an organizer can run at most 10 sessions at a time', async () => {
    const alice = await makeUser();
    for (let i = 0; i < 10; i++) await createSession(alice, { title: `Session ${i}` });
    const res = await api.post('/api/elections').set(alice.auth).send({ title: 'One too many', maxVoters: 10 });
    assert.equal(res.status, 409);
  });
});

describe('joining and approval', () => {
  test('a listed email is approved on joining; an unlisted one waits for the organizer', async () => {
    const alice = await makeUser();
    const listed = await makeUser();
    const unlisted = await makeUser();
    const election = await createSession(alice, { allowList: `${listed.email.toUpperCase()}, someone.else@test.dev` });

    let res = await api.post(`/api/elections/join/${election.joinCode}`).set(listed.auth);
    assert.equal(res.body.status, 'approved');

    res = await api.post(`/api/elections/join/${election.joinCode.toLowerCase()}`).set(unlisted.auth);
    assert.equal(res.body.status, 'pending');

    // Joining twice does not create a second membership
    await api.post(`/api/elections/join/${election.joinCode}`).set(unlisted.auth);
    assert.equal(await Membership.countDocuments({ election: election._id }), 2);

    const voters = await api.get(`/api/elections/${election._id}/manage/voters`).set(alice.auth);
    const waiting = voters.body.find((v) => v.email === unlisted.email);
    assert.equal(waiting.status, 'pending');

    res = await api.post(`/api/elections/${election._id}/manage/voters/${waiting._id}/approve`).set(alice.auth);
    assert.equal(res.status, 200);
    const info = await api.get(`/api/elections/join/${election.joinCode}`).set(unlisted.auth);
    assert.equal(info.body.membership.status, 'approved');
    assert.equal((await Election.findById(election._id)).approvedCount, 2);
  });

  test('adding an email to the list approves a voter who is already waiting', async () => {
    const alice = await makeUser();
    const voter = await makeUser();
    const election = await createSession(alice);
    await api.post(`/api/elections/join/${election.joinCode}`).set(voter.auth);

    const res = await api.post(`/api/elections/${election._id}/manage/allow-list`).set(alice.auth)
      .send({ emails: `${voter.email}\nfuture@test.dev` });
    assert.equal(res.body.added, 2);
    assert.equal(res.body.autoApproved, 1);
    assert.equal((await Membership.findOne({ election: election._id, user: voter.id })).status, 'approved');
  });

  test('simultaneous approvals never exceed the voter cap', async () => {
    const alice = await makeUser();
    const election = await createSession(alice, { maxVoters: 5 });
    const voters = [];
    for (let i = 0; i < 20; i++) voters.push(await makeUser());
    await Promise.all(voters.map((v) => api.post(`/api/elections/join/${election.joinCode}`).set(v.auth)));
    const pending = await Membership.find({ election: election._id });
    assert.equal(pending.length, 20);

    const responses = await Promise.all(pending.map((m) =>
      api.post(`/api/elections/${election._id}/manage/voters/${m._id}/approve`).set(alice.auth)));

    assert.equal(responses.filter((r) => r.status === 200).length, 5);
    assert.equal(responses.filter((r) => r.status === 409).length, 15);
    assert.equal(await Membership.countDocuments({ election: election._id, status: 'approved' }), 5);
    assert.equal((await Election.findById(election._id)).approvedCount, 5);
  });

  test('simultaneous listed joiners never exceed the voter cap', async () => {
    const alice = await makeUser();
    const voters = [];
    for (let i = 0; i < 20; i++) voters.push(await makeUser());
    const election = await createSession(alice, { maxVoters: 5, allowList: voters.map((v) => v.email) });

    await Promise.all(voters.map((v) => api.post(`/api/elections/join/${election.joinCode}`).set(v.auth)));

    assert.equal(await Membership.countDocuments({ election: election._id, status: 'approved' }), 5);
    assert.equal(await Membership.countDocuments({ election: election._id, status: 'pending' }), 15);
    assert.equal((await Election.findById(election._id)).approvedCount, 5);
  });

  test('approve-all stops at the cap, and rejecting a voter frees their place', async () => {
    const alice = await makeUser();
    const election = await createSession(alice, { maxVoters: 3 });
    const voters = [];
    for (let i = 0; i < 5; i++) voters.push(await makeUser());
    for (const v of voters) await api.post(`/api/elections/join/${election.joinCode}`).set(v.auth);
    const base = `/api/elections/${election._id}/manage`;

    let res = await api.post(`${base}/voters/approve-all`).set(alice.auth);
    assert.deepEqual(res.body, { approved: 3, full: true, remaining: 2 });

    const approved = await Membership.findOne({ election: election._id, status: 'approved' });
    res = await api.post(`${base}/voters/${approved._id}/reject`).set(alice.auth);
    assert.equal(res.status, 200);
    assert.equal((await Election.findById(election._id)).approvedCount, 2);

    // The limit cannot be set below the number already approved
    assert.equal((await api.put(base).set(alice.auth).send({ maxVoters: 1 })).status, 409);
    assert.equal((await api.put(base).set(alice.auth).send({ maxVoters: 2 })).status, 200);
  });
});

describe('voting', () => {
  test('only an approved voter can vote, only while the session is open, and only once', async () => {
    const alice = await makeUser();
    const voter = await makeUser();
    const election = await createSession(alice);
    const candidates = await addCandidates(alice, election._id);
    const voteUrl = `/api/elections/${election._id}/vote`;
    const body = { candidateId: candidates[0]._id };

    // Not joined, then joined but still pending
    assert.equal((await api.post(voteUrl).set(voter.auth).send(body)).status, 403);
    await api.post(`/api/elections/join/${election.joinCode}`).set(voter.auth);
    assert.equal((await api.post(voteUrl).set(voter.auth).send(body)).status, 403);
    assert.equal((await api.get(`/api/elections/${election._id}/ballot`).set(voter.auth)).status, 403);

    await api.post(`/api/elections/${election._id}/manage/voters/approve-all`).set(alice.auth);

    // Approved, but the session is still a draft
    assert.equal((await api.post(voteUrl).set(voter.auth).send(body)).status, 409);

    await openSession(alice, election._id);
    const ballot = await api.get(`/api/elections/${election._id}/ballot`).set(voter.auth);
    assert.equal(ballot.body.candidates.length, 2);
    assert.equal(ballot.body.candidates[0].votes, undefined);

    assert.equal((await api.post(voteUrl).set(voter.auth).send({ candidateId: String(new mongoose.Types.ObjectId()) })).status, 404);
    assert.equal((await api.post(voteUrl).set(voter.auth).send(body)).status, 200);
    assert.equal((await api.post(voteUrl).set(voter.auth).send(body)).status, 409);

    // A voter who has voted cannot be removed afterwards
    const membership = await Membership.findOne({ election: election._id, user: voter.id });
    const reject = await api.post(`/api/elections/${election._id}/manage/voters/${membership._id}/reject`).set(alice.auth);
    assert.equal(reject.status, 409);

    await api.post(`/api/elections/${election._id}/manage/close`).set(alice.auth);
    const late = await makeUser();
    assert.equal((await api.post(`/api/elections/join/${election.joinCode}`).set(late.auth)).status, 409);
  });

  test('the stored ballot does not identify the voter', async () => {
    const alice = await makeUser();
    const { election, candidates } = await openSessionWithCandidates(alice);
    const [voter] = await seedApprovedVoters(election._id, 1);
    await api.post(`/api/elections/${election._id}/vote`).set(voter.auth).send({ candidateId: candidates[1]._id });

    const vote = await Vote.findOne({ election: election._id }).lean();
    assert.deepEqual(Object.keys(vote).sort(), ['_id', 'candidate', 'election']);
    const membership = await Membership.findOne({ election: election._id, user: voter.id }).lean();
    assert.equal(membership.hasVoted, true);
    assert.equal(JSON.stringify(membership).includes(String(candidates[1]._id)), false);
  });

  test('50 simultaneous requests from one voter count as exactly one vote', async () => {
    const alice = await makeUser();
    const { election, candidates } = await openSessionWithCandidates(alice);
    const [voter] = await seedApprovedVoters(election._id, 1);

    const responses = await Promise.all(Array.from({ length: 50 }, (_, i) =>
      api.post(`/api/elections/${election._id}/vote`).set(voter.auth)
        .send({ candidateId: candidates[i % 2]._id })));

    assert.equal(responses.filter((r) => r.status === 200).length, 1);
    assert.equal(responses.filter((r) => r.status >= 500).length, 0);
    assert.equal(await Vote.countDocuments({ election: election._id }), 1);
  });

  test('100 voters voting at once are all counted', async () => {
    const alice = await makeUser();
    const { election, candidates } = await openSessionWithCandidates(alice, { candidateCount: 3 });
    const voters = await seedApprovedVoters(election._id, 100);

    const responses = await Promise.all(voters.map((voter, i) =>
      api.post(`/api/elections/${election._id}/vote`).set(voter.auth)
        .send({ candidateId: candidates[i % 3]._id })));

    assert.equal(responses.filter((r) => r.status === 200).length, 100);
    assert.equal(await Vote.countDocuments({ election: election._id }), 100);
    assert.equal(await Membership.countDocuments({ election: election._id, hasVoted: true }), 100);

    const results = await api.get(`/api/elections/${election._id}/results`).set(alice.auth);
    assert.equal(results.body.totalVotes, 100);
    assert.deepEqual(results.body.candidates.map((c) => c.votes).sort(), [33, 33, 34]);
  });

  test('four sessions voting at the same time stay separate', async () => {
    const sizes = [10, 20, 30, 40];
    const sessions = [];
    for (const size of sizes) {
      const organizer = await makeUser();
      const { election, candidates } = await openSessionWithCandidates(organizer);
      const voters = await seedApprovedVoters(election._id, size);
      sessions.push({ organizer, election, candidates, voters });
    }
    // One person who is a voter in the first two sessions
    const shared = await makeUser();
    for (const session of sessions.slice(0, 2)) {
      await Membership.create({ election: session.election._id, user: shared.id, status: 'approved' });
      session.voters.push(shared);
    }

    const requests = [];
    for (const session of sessions) {
      for (const voter of session.voters) {
        // Everyone in a session votes for its first candidate
        requests.push(api.post(`/api/elections/${session.election._id}/vote`).set(voter.auth)
          .send({ candidateId: session.candidates[0]._id }));
      }
    }
    const responses = await Promise.all(requests);
    assert.equal(responses.filter((r) => r.status === 200).length, 10 + 20 + 30 + 40 + 2);

    for (const session of sessions) {
      const results = await api.get(`/api/elections/${session.election._id}/results`).set(session.organizer.auth);
      assert.equal(results.body.totalVotes, session.voters.length);
      const first = results.body.candidates.find((c) => c._id === session.candidates[0]._id);
      assert.equal(first.votes, session.voters.length);
    }
  });

  test('a voter approved in one session cannot see or vote in another', async () => {
    const alice = await makeUser();
    const bob = await makeUser();
    const first = await openSessionWithCandidates(alice);
    const second = await openSessionWithCandidates(bob);
    const [voter] = await seedApprovedVoters(first.election._id, 1);

    assert.equal((await api.get(`/api/elections/${second.election._id}/ballot`).set(voter.auth)).status, 403);
    assert.equal((await api.get(`/api/elections/${second.election._id}/results`).set(voter.auth)).status, 403);

    // Neither their own session's candidate nor the other session's candidate gets them in
    for (const candidate of [first.candidates[0], second.candidates[0]]) {
      const res = await api.post(`/api/elections/${second.election._id}/vote`).set(voter.auth)
        .send({ candidateId: candidate._id });
      assert.equal(res.status, 403);
    }
    // A candidate from another session cannot be voted for in their own
    const cross = await api.post(`/api/elections/${first.election._id}/vote`).set(voter.auth)
      .send({ candidateId: second.candidates[0]._id });
    assert.equal(cross.status, 404);
    assert.equal(await Vote.countDocuments({ election: { $in: [first.election._id, second.election._id] } }), 0);
  });
});

describe('results', () => {
  test('results stay hidden from voters until the session closes when set that way', async () => {
    const alice = await makeUser();
    const { election, candidates } = await openSessionWithCandidates(alice, { resultsVisible: 'afterClose' });
    const [voter] = await seedApprovedVoters(election._id, 1);
    await api.post(`/api/elections/${election._id}/vote`).set(voter.auth).send({ candidateId: candidates[0]._id });
    const url = `/api/elections/${election._id}/results`;

    const hidden = await api.get(url).set(voter.auth);
    assert.equal(hidden.status, 403);
    assert.equal(hidden.body.candidates, undefined);
    assert.equal((await api.get(url).set(alice.auth)).body.totalVotes, 1);

    await api.post(`/api/elections/${election._id}/manage/close`).set(alice.auth);
    assert.equal((await api.get(url).set(voter.auth)).body.totalVotes, 1);

    const csv = await api.get(`/api/elections/${election._id}/manage/results.csv`).set(alice.auth);
    assert.equal(csv.status, 200);
    assert.match(csv.text, /"Candidate 1","Group 1","1"/);
  });

  test('deleting a session removes everything that belongs to it', async () => {
    const alice = await makeUser();
    const { election, candidates } = await openSessionWithCandidates(alice);
    const [voter] = await seedApprovedVoters(election._id, 1);
    await api.post(`/api/elections/${election._id}/vote`).set(voter.auth).send({ candidateId: candidates[0]._id });

    assert.equal((await api.delete(`/api/elections/${election._id}/manage`).set(alice.auth)).status, 200);
    assert.equal(await Election.countDocuments({ _id: election._id }), 0);
    assert.equal(await Candidate.countDocuments({ election: election._id }), 0);
    assert.equal(await Membership.countDocuments({ election: election._id }), 0);
    assert.equal(await Vote.countDocuments({ election: election._id }), 0);
  });
});

describe('selfies', () => {
  test('photo mode requires a selfie, and only the organizer can view it', async () => {
    const alice = await makeUser();
    const bob = await makeUser();
    const { election, candidates } = await openSessionWithCandidates(alice, { selfieMode: 'photo' });
    const [voter] = await seedApprovedVoters(election._id, 1);
    const voteUrl = `/api/elections/${election._id}/vote`;

    assert.equal((await api.post(voteUrl).set(voter.auth).send({ candidateId: candidates[0]._id })).status, 400);
    assert.equal(await Vote.countDocuments({ election: election._id }), 0);

    const res = await api.post(voteUrl).set(voter.auth).send({ candidateId: candidates[0]._id, selfie: SELFIE });
    assert.equal(res.status, 200);

    const voters = await api.get(`/api/elections/${election._id}/manage/voters`).set(alice.auth);
    const imageUrl = `/api/images/${voters.body[0].voteSelfie}`;
    assert.equal((await api.get(imageUrl).set(alice.auth)).status, 200);
    assert.equal((await api.get(imageUrl).set(bob.auth)).status, 403);
    assert.equal((await api.get(imageUrl).set(voter.auth)).status, 403);
    assert.equal((await api.get(imageUrl)).status, 401);

    // Selfies can be deleted once the session is closed
    const purgeUrl = `/api/elections/${election._id}/manage/purge-selfies`;
    assert.equal((await api.post(purgeUrl).set(alice.auth)).status, 409);
    await api.post(`/api/elections/${election._id}/manage/close`).set(alice.auth);
    assert.equal((await api.post(purgeUrl).set(alice.auth)).body.deleted, 1);
    assert.equal((await api.get(imageUrl).set(alice.auth)).status, 404);
  });

  test('face match rejects a different face and accepts the enrolled one', async () => {
    const alice = await makeUser();
    const voter = await makeUser();
    const election = await createSession(alice, { selfieMode: 'faceMatch', allowList: voter.email });
    const candidates = await addCandidates(alice, election._id);
    await openSession(alice, election._id);
    const joinUrl = `/api/elections/join/${election.joinCode}`;
    const voteUrl = `/api/elections/${election._id}/vote`;

    // Joining needs an enrolment selfie with a face in it
    assert.equal((await api.post(joinUrl).set(voter.auth).send({})).status, 400);
    const joined = await api.post(joinUrl).set(voter.auth).send({ selfie: SELFIE, faceDescriptor: descriptor(0.1) });
    assert.equal(joined.body.status, 'approved');

    const stranger = { candidateId: candidates[0]._id, selfie: SELFIE, faceDescriptor: descriptor(0.3) };
    assert.equal((await api.post(voteUrl).set(voter.auth).send(stranger)).status, 403);
    assert.equal(await Vote.countDocuments({ election: election._id }), 0);

    const sameFace = { candidateId: candidates[0]._id, selfie: SELFIE, faceDescriptor: descriptor(0.11) };
    assert.equal((await api.post(voteUrl).set(voter.auth).send(sameFace)).status, 200);

    // The face data never leaves the server
    const voters = await api.get(`/api/elections/${election._id}/manage/voters`).set(alice.auth);
    assert.equal(JSON.stringify(voters.body).includes('faceDescriptor'), false);

    // The selfie setting is locked once someone has joined
    const draft = await createSession(alice, { selfieMode: 'none' });
    await api.post(`/api/elections/join/${draft.joinCode}`).set(voter.auth);
    const change = await api.put(`/api/elections/${draft._id}/manage`).set(alice.auth).send({ selfieMode: 'faceMatch' });
    assert.equal(change.status, 409);
  });

  test('a candidate photo is public', async () => {
    const alice = await makeUser();
    const election = await createSession(alice);
    const res = await api.post(`/api/elections/${election._id}/manage/candidates`).set(alice.auth)
      .field('name', 'With photo')
      .attach('image', Buffer.from('fake-png-bytes'), { filename: 'photo.png', contentType: 'image/png' });
    assert.equal(res.status, 201);

    const image = await api.get(`/api/images/${res.body.candidate.image}`);
    assert.equal(image.status, 200);
    assert.equal(image.headers['content-type'], 'image/png');

    const notAnImage = await api.post(`/api/elections/${election._id}/manage/candidates`).set(alice.auth)
      .field('name', 'With script')
      .attach('image', Buffer.from('<script>'), { filename: 'x.html', contentType: 'text/html' });
    assert.equal(notAnImage.status, 400);
  });
});
