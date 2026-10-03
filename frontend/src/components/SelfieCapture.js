import React, { useEffect, useRef, useState } from 'react';
import { drawScaled } from '../utils/image';
import Icon from './Icon';

const SELFIE_MAX_SIZE = 480;

const loadScript = (src) => new Promise((resolve, reject) => {
  const script = document.createElement('script');
  script.src = src;
  script.async = true;
  script.onload = resolve;
  script.onerror = () => reject(new Error(`Could not load ${src}`));
  document.head.appendChild(script);
});

// The face library and model are large, so they are downloaded only for sessions
// that use face match. scripts/copy-face-models.js puts them in public/models.
let faceApiPromise = null;
const loadFaceApi = () => {
  if (!faceApiPromise) {
    faceApiPromise = (async () => {
      const modelUrl = `${process.env.PUBLIC_URL}/models`;
      if (!window.faceapi) await loadScript(`${modelUrl}/face-api.js`);
      const faceapi = window.faceapi;
      await Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri(modelUrl),
        faceapi.nets.faceLandmark68Net.loadFromUri(modelUrl),
        faceapi.nets.faceRecognitionNet.loadFromUri(modelUrl)
      ]);
      return faceapi;
    })();
    // Allow another try if the download fails
    faceApiPromise.catch(() => { faceApiPromise = null; });
  }
  return faceApiPromise;
};

/*
 * Shows the front camera and captures a small selfie.
 * With `withFace`, it also finds the face and returns its descriptor
 * (a list of 128 numbers the server compares; the photo itself is not compared).
 */
const SelfieCapture = ({ withFace, onCapture, onCancel, busy, confirmLabel = 'Use this photo' }) => {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const [ready, setReady] = useState(false);
  const [captured, setCaptured] = useState(null);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    const start = async () => {
      if (!navigator.mediaDevices?.getUserMedia) {
        setError('This browser cannot use the camera. Open the link in Chrome or Safari.');
        return;
      }
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
          audio: false
        });
        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        streamRef.current = stream;
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setReady(true);
      } catch (err) {
        if (!cancelled) {
          setError('We could not open the camera. Allow camera access for this site and try again.');
        }
      }
    };

    start();
    // Start downloading the face model while the voter lines up the shot
    if (withFace) loadFaceApi().catch(() => {});

    return () => {
      cancelled = true;
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, [withFace]);

  const takePhoto = async () => {
    const video = videoRef.current;
    const canvas = drawScaled(video, video.videoWidth, video.videoHeight, SELFIE_MAX_SIZE);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
    setError('');

    if (!withFace) {
      setCaptured({ dataUrl });
      return;
    }

    setChecking(true);
    try {
      const faceapi = await loadFaceApi();
      const detection = await faceapi
        .detectSingleFace(canvas, new faceapi.TinyFaceDetectorOptions())
        .withFaceLandmarks()
        .withFaceDescriptor();
      if (!detection) {
        setError('We could not find your face. Face the camera in good light and try again.');
        return;
      }
      setCaptured({ dataUrl, faceDescriptor: Array.from(detection.descriptor) });
    } catch (err) {
      setError('The face check could not load. Check your connection and try again.');
    } finally {
      setChecking(false);
    }
  };

  return (
    <div className="selfie-capture">
      {error && <div className="alert alert-danger" role="alert">{error}</div>}

      <div className="selfie-frame">
        {/* The video stays mounted so "Retake" does not have to reopen the camera */}
        <video ref={videoRef} playsInline muted className={captured ? 'hidden' : ''} />
        {captured && <img src={captured.dataUrl} alt="Your selfie" />}
        {!ready && !error && (
          <div className="selfie-status">
            <Icon name="camera" size={26} />
            Starting camera...
          </div>
        )}
      </div>

      <p className="form-hint">
        Your selfie is stored with your voter record, not with your vote, and only the organizer of this session can see it.
      </p>

      <div className="form-buttons">
        {captured ? (
          <>
            <button type="button" className="btn btn-primary" onClick={() => onCapture(captured)} disabled={busy}>
              {busy ? 'Please wait...' : confirmLabel}
            </button>
            <button type="button" className="btn btn-secondary" onClick={() => setCaptured(null)} disabled={busy}>
              Retake
            </button>
          </>
        ) : (
          <button type="button" className="btn btn-primary" onClick={takePhoto} disabled={!ready || checking}>
            <Icon name="camera" />
            {checking ? 'Checking...' : 'Take selfie'}
          </button>
        )}
        {onCancel && (
          <button type="button" className="btn btn-secondary" onClick={onCancel} disabled={busy}>
            Back
          </button>
        )}
      </div>
    </div>
  );
};

export default SelfieCapture;
