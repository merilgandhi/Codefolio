import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { api } from '../lib/api.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError('');
    api('/auth/me', { signal: controller.signal })
      .then((result) => {
        if (!controller.signal.aborted) setUser(result.user);
      })
      .catch((failure) => {
        if (controller.signal.aborted) return;
        setUser(null);
        if (failure.status !== 401) setError(failure.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [attempt]);

  const login = async (values) => {
    const result = await api('/auth/login', { body: values });
    setUser(result.user);
    setError('');
  };
  const logout = async () => {
    await api('/auth/logout', { body: {} });
    setUser(null);
    setError('');
  };
  const updateName = useCallback(
    (name) => setUser((current) => (current ? { ...current, name } : null)),
    [],
  );
  const updateTemplate = useCallback(
    (templateId) => setUser((current) => (current ? { ...current, templateId } : null)),
    [],
  );
  const sessionExpired = useCallback(() => {
    setUser(null);
    setError('');
  }, []);
  const updateTier = useCallback((tier) => {
    if (['free', 'pro'].includes(tier))
      setUser((current) => (current ? { ...current, tier } : null));
  }, []);
  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        error,
        login,
        logout,
        updateName,
        updateTemplate,
        updateTier,
        sessionExpired,
        retry: () => setAttempt((value) => value + 1),
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
