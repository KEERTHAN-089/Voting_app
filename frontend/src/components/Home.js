import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Icon from './Icon';

const FEATURES = [
  {
    icon: 'checkCircle',
    title: 'One vote each',
    text: 'Every voter is approved by the organizer or a voter list, and can vote only once.'
  },
  {
    icon: 'lock',
    title: 'Secret ballot',
    text: 'The app records that you voted, never who you voted for.'
  },
  {
    icon: 'mail',
    title: 'Fast sign-in',
    text: 'No password. Enter your email and the 6-digit code we send you.'
  }
];

const STEPS = [
  { title: 'Create the session', text: 'Name the vote, add your candidates, and set how many people can take part.' },
  { title: 'Share the code', text: 'Put the QR code on a screen or send the link. Voters join from their own phone.' },
  { title: 'Open and watch', text: 'Approve who joins, open voting, and follow the count as it comes in.' }
];

const Home = () => {
  const [code, setCode] = useState('');
  const navigate = useNavigate();

  const onJoin = (e) => {
    e.preventDefault();
    if (code.trim()) navigate(`/join/${code.trim().toUpperCase()}`);
  };

  return (
    <div className="home">
      <section className="hero">
        <p className="hero-eyebrow">
          <Icon name="shield" size={16} />
          Secret ballot, one vote each
        </p>
        <h1 className="hero-title">Run a vote in minutes</h1>
        <p className="hero-lead">
          Class leader, club president, team captain: create a voting session, share the link
          or QR code, and watch the results come in.
        </p>
      </section>

      <div className="home-actions">
        <div className="action-card">
          <span className="action-icon" aria-hidden="true"><Icon name="ballot" size={22} /></span>
          <h2>Organizing a vote?</h2>
          <p>Anyone can create a session. You decide who votes and how many.</p>
          <Link to="/create" className="btn btn-primary btn-lg btn-block">
            Create a voting session
            <Icon name="arrowRight" />
          </Link>
        </div>

        <form className="action-card" onSubmit={onJoin}>
          <span className="action-icon action-icon-alt" aria-hidden="true"><Icon name="qr" size={22} /></span>
          <h2>Here to vote?</h2>
          <p>Scan the organizer&apos;s QR code, or type the session code here.</p>
          <div className="form-group">
            <label htmlFor="join-code" className="sr-only">Session code</label>
            <input
              type="text"
              id="join-code"
              className="code-input"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="ABC123"
              maxLength={8}
              autoCapitalize="characters"
              autoComplete="off"
            />
          </div>
          <button type="submit" className="btn btn-success btn-lg btn-block" disabled={!code.trim()}>
            Join with a code
          </button>
        </form>
      </div>

      <section className="home-section" aria-labelledby="features-heading">
        <h2 className="section-title" id="features-heading">Built for a vote people can trust</h2>
        <ul className="feature-grid">
          {FEATURES.map((feature) => (
            <li className="feature-card" key={feature.title}>
              <span className="feature-icon" aria-hidden="true"><Icon name={feature.icon} size={22} /></span>
              <h3>{feature.title}</h3>
              <p>{feature.text}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="home-section" aria-labelledby="steps-heading">
        <h2 className="section-title" id="steps-heading">How it works</h2>
        <ol className="step-list">
          {STEPS.map((step, index) => (
            <li className="step" key={step.title}>
              <span className="step-number" aria-hidden="true">{index + 1}</span>
              <div>
                <h3>{step.title}</h3>
                <p>{step.text}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
};

export default Home;
