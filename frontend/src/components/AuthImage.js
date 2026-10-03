import React, { useEffect, useState } from 'react';
import api from '../utils/api';

// Shows an image that needs the sign-in token to load (selfies), which a plain <img> cannot send
const AuthImage = ({ imageId, alt, className }) => {
  const [url, setUrl] = useState(null);

  useEffect(() => {
    let objectUrl = null;
    let cancelled = false;

    api.get(`/images/${imageId}`, { responseType: 'blob' })
      .then((response) => {
        if (cancelled) return;
        objectUrl = URL.createObjectURL(response.data);
        setUrl(objectUrl);
      })
      .catch(() => {
        // Leave the placeholder in place
      });

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [imageId]);

  if (!url) return <div className={`${className} selfie-placeholder`} aria-label={alt}></div>;
  return (
    <a href={url} target="_blank" rel="noreferrer" title="Open full size">
      <img src={url} alt={alt} className={className} />
    </a>
  );
};

export default AuthImage;
