import { useEffect, useRef } from 'react';

// Calls fn every `ms` milliseconds while enabled. Skips ticks while the tab is
// in the background, so idle phones do not keep hitting the server.
const usePolling = (fn, ms, enabled = true) => {
  const saved = useRef(fn);

  useEffect(() => {
    saved.current = fn;
  });

  useEffect(() => {
    if (!enabled) return undefined;
    const timer = setInterval(() => {
      if (!document.hidden) saved.current();
    }, ms);
    return () => clearInterval(timer);
  }, [ms, enabled]);
};

export default usePolling;
