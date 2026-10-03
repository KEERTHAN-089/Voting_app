import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import api, { errorMessage } from '../utils/api';
import { useAuth } from '../utils/AuthContext';
import usePolling from '../utils/usePolling';
import { NameGate } from './RequireAuth';
import { StatusBadge } from './Dashboard';
import SelfieCapture from './SelfieCapture';
import Icon from './Icon';

// The page a voter lands on from the organizer's link or QR code
const JoinElection = () => {
  const { code } = useParams();
  const { user, loading: authLoading } = useAuth();
  const [info, setInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState('');
  const [joining, setJoining] = useState(false);
  const [wantsToJoin, setWantsToJoin] = useState(false);
  const autoJoinTried = useRef(false);

  const loadInfo = useCallback(async () => {
    try {
      const response = await api.get(`/elections/join/${code}`);
      setInfo(response.data);
    } catch (err) {
      if (err.response?.status === 404) setNotFound(true);
      else setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [code]);

  // Reload once sign-in state is known, so the response includes this user's status
  useEffect(() => {
    if (!authLoading) loadInfo();
  }, [authLoading, user, loadInfo]);

  const join = useCallback(async (selfie) => {
    setJoining(true);
    setError('');
    try {
      await api.post(`/elections/join/${code}`, selfie
        ? { selfie: selfie.dataUrl, faceDescriptor: selfie.faceDescriptor }
        : {});
      await loadInfo();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setJoining(false);
    }
  }, [code, loadInfo]);

  const election = info?.election;
  const membership = info?.membership;
  const needsEnrolment = election?.selfieMode === 'faceMatch';
  const canAutoJoin = Boolean(
    user && user.name && info && !membership && election.status !== 'closed' && !needsEnrolment &&
    (!info.isOrganizer || wantsToJoin)
  );

  // Opening the link is the request to join: no extra button to press
  useEffect(() => {
    if (canAutoJoin && !autoJoinTried.current) {
      autoJoinTried.current = true;
      join();
    }
  }, [canAutoJoin, join]);

  // While waiting for approval or for voting to start, keep checking
  const waiting = Boolean(membership) && !membership.hasVoted && election.status !== 'closed' &&
    (membership.status === 'pending' || (membership.status === 'approved' && election.status === 'draft'));
  usePolling(loadInfo, 4000, waiting);

  if (loading || authLoading) return <div className="loading">Loading...</div>;
  if (notFound) {
    return (
      <div className="login-container">
        <h2>Session not found</h2>
        <p>There is no voting session with the code <strong>{code}</strong>. Check the code with your organizer.</p>
        <Link to="/" className="btn btn-primary">
          <Icon name="arrowLeft" />
          Go to home page
        </Link>
      </div>
    );
  }
  if (!info) return <div className="alert alert-danger" role="alert">{error}</div>;

  // Approved and voting is open: straight to the ballot
  if (membership?.status === 'approved' && election.status === 'open' && !membership.hasVoted) {
    return <Navigate to={`/elections/${election._id}/vote`} replace />;
  }

  const canSeeResults = membership?.status === 'approved' &&
    (election.resultsVisible === 'live' || election.status === 'closed');

  const body = () => {
    if (!user) {
      const next = encodeURIComponent(`/join/${code}`);
      return (
        <>
          <p>Sign in with your email to join this voting session.</p>
          <Link to={`/login?next=${next}`} className="btn btn-primary btn-lg btn-block">
            <Icon name="mail" />
            Sign in to join
          </Link>
        </>
      );
    }

    if (!membership) {
      if (election.status === 'closed') {
        return (
          <div className="alert alert-info">
            <Icon name="lock" />
            <div>This voting session is closed.</div>
          </div>
        );
      }
      if (info.isOrganizer && !wantsToJoin) {
        return (
          <>
            <p>You are the organizer of this session.</p>
            <div className="form-buttons">
              <Link to={`/elections/${election._id}/manage`} className="btn btn-primary">Manage session</Link>
              <button type="button" className="btn btn-secondary" onClick={() => setWantsToJoin(true)}>
                Join as a voter too
              </button>
            </div>
          </>
        );
      }
      if (needsEnrolment) {
        return (
          <>
            <p>This session checks voters by face. Take a selfie to join; your face is checked again when you vote.</p>
            <SelfieCapture withFace onCapture={join} busy={joining} confirmLabel="Join with this selfie" />
          </>
        );
      }
      return joining
        ? <div className="loading">Joining...</div>
        : (
          <button type="button" className="btn btn-primary btn-lg btn-block" onClick={() => join()}>
            Join this session
          </button>
        );
    }

    if (membership.status === 'rejected') {
      return <div className="alert alert-danger" role="alert">The organizer did not approve you for this session.</div>;
    }
    if (membership.hasVoted) {
      return (
        <>
          <div className="alert alert-success">
            <Icon name="checkCircle" />
            <div>You have voted in this session. Thank you!</div>
          </div>
          {canSeeResults && (
            <Link to={`/elections/${election._id}/results`} className="btn btn-primary">
              <Icon name="barChart" />
              View results
            </Link>
          )}
        </>
      );
    }
    if (election.status === 'closed') {
      return (
        <>
          <div className="alert alert-info">
            <Icon name="lock" />
            <div>Voting has closed.</div>
          </div>
          {canSeeResults && (
            <Link to={`/elections/${election._id}/results`} className="btn btn-primary">
              <Icon name="barChart" />
              View results
            </Link>
          )}
        </>
      );
    }
    if (membership.status === 'pending') {
      return (
        <div className="alert alert-info">
          <Icon name="clock" />
          <div>
            <strong>Waiting for the organizer to approve you.</strong>
            <p>
              {info.full
                ? 'All places in this session are taken for now. The organizer can raise the limit.'
                : 'Keep this page open. It will continue on its own once you are approved.'}
            </p>
          </div>
        </div>
      );
    }
    // Approved, and the session has not been opened yet
    return (
      <div className="alert alert-success">
        <Icon name="checkCircle" />
        <div>
          <strong>You are approved.</strong>
          <p>Voting has not started yet. Keep this page open; the ballot will appear when the organizer opens the session.</p>
        </div>
      </div>
    );
  };

  const content = (
    <div className="login-container join-container">
      <h2>{election.title}</h2>
      <p className="join-status"><StatusBadge status={election.status} /></p>
      {election.description && <p>{election.description}</p>}
      {error && <div className="alert alert-danger" role="alert">{error}</div>}
      {body()}
    </div>
  );

  // A signed-in user without a name is asked for it before joining
  return user ? <NameGate>{content}</NameGate> : content;
};

export default JoinElection;
