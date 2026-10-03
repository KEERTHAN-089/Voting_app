import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import api from './api';

const AuthContext = createContext(null);

// Holds the signed-in user for the whole app, so pages do not each refetch the profile
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(Boolean(localStorage.getItem('token')));

  useEffect(() => {
    if (!localStorage.getItem('token')) return undefined;

    let cancelled = false;
    api.get('/auth/me')
      .then((response) => {
        if (!cancelled) setUser(response.data);
      })
      .catch(() => {
        // An expired token is cleared by the api interceptor
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const onExpired = () => setUser(null);
    window.addEventListener('auth:expired', onExpired);
    return () => window.removeEventListener('auth:expired', onExpired);
  }, []);

  const signIn = useCallback((token, signedInUser) => {
    localStorage.setItem('token', token);
    setUser(signedInUser);
  }, []);

  const signOut = useCallback(() => {
    localStorage.removeItem('token');
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signOut, setUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
