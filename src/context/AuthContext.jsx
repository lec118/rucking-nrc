import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { authAPI } from '../services/auth';
import { useLogger } from '../hooks/useLogger';

const REFRESH_THRESHOLD_MS = 60 * 1000; // refresh 60s before expiry
const MIN_REFRESH_DELAY_MS = 5 * 1000;

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

function computeDelay(expiresAt) {
  const now = Date.now();
  const timeUntilExpiry = expiresAt - now;
  if (timeUntilExpiry <= REFRESH_THRESHOLD_MS) {
    return MIN_REFRESH_DELAY_MS;
  }
  return Math.max(timeUntilExpiry - REFRESH_THRESHOLD_MS, MIN_REFRESH_DELAY_MS);
}

export default function AuthProvider({ children }) {
  const [accessToken, setAccessToken] = useState(null);
  const [user, setUser] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const refreshTokenRef = useRef(null);
  const expiryRef = useRef(null);
  const refreshTimerRef = useRef(null);
  const csrfTokenRef = useRef(null);
  const silentRefreshRef = useRef(null);

  const { logInfo, logError } = useLogger('auth');

  const clearRefreshTimer = useCallback(() => {
    if (refreshTimerRef.current) {
      clearTimeout(refreshTimerRef.current);
      refreshTimerRef.current = null;
    }
  }, []);

  const issueCsrfToken = useCallback(async () => {
    try {
      const response = await authAPI.csrfToken();
      if (response?.csrfToken) {
        csrfTokenRef.current = response.csrfToken;
        logInfo('CSRF token refreshed');
      }
    } catch (error) {
      logError('Failed to fetch CSRF token', error);
    }
  }, [logError, logInfo]);

  const scheduleSilentRefresh = useCallback((expiresAt) => {
    clearRefreshTimer();
    const delay = computeDelay(expiresAt);
    refreshTimerRef.current = setTimeout(() => {
      if (silentRefreshRef.current) {
        silentRefreshRef.current();
      }
    }, delay);
  }, [clearRefreshTimer]);

  const applySession = useCallback((session) => {
    if (!session || !session.accessToken) {
      return;
    }

    setAccessToken(session.accessToken);
    setUser(session.user ?? null);

    if (session.refreshToken) {
      refreshTokenRef.current = session.refreshToken;
    }
    if (session.csrfToken) {
      csrfTokenRef.current = session.csrfToken;
    } else {
      issueCsrfToken();
    }

    const expiresIn = session.expiresIn ?? 900; // default 15 minutes
    const expiresAt = Date.now() + expiresIn * 1000;
    expiryRef.current = expiresAt;

    scheduleSilentRefresh(expiresAt);
  }, [issueCsrfToken, scheduleSilentRefresh, setAccessToken, setUser]);

  const resetSession = useCallback(() => {
    clearRefreshTimer();
    setAccessToken(null);
    setUser(null);
    refreshTokenRef.current = null;
    expiryRef.current = null;
    csrfTokenRef.current = null;
  }, [clearRefreshTimer]);

  const silentRefresh = useCallback(async () => {
    if (!refreshTokenRef.current) {
      return;
    }
    if (isRefreshing) {
      return;
    }

    try {
      setIsRefreshing(true);
      const response = await authAPI.refreshToken(refreshTokenRef.current);
      logInfo('Silent refresh succeeded');
      applySession(response);
      await issueCsrfToken();
    } catch (error) {
      logError('Silent refresh failed', error);
      resetSession();
    } finally {
      setIsRefreshing(false);
    }
  }, [applySession, isRefreshing, issueCsrfToken, logError, logInfo, resetSession]);

  const login = useCallback(async (credentials) => {
    const response = await authAPI.login(credentials);
    logInfo('User logged in', { userId: response.user?.id });
    applySession(response);
    return response;
  }, [applySession, logInfo]);

  const logout = useCallback(async () => {
    try {
      if (refreshTokenRef.current) {
        await authAPI.logout(refreshTokenRef.current);
      }
    } catch (error) {
      logError('Logout request failed', error);
    } finally {
      resetSession();
      logInfo('User logged out');
    }
  }, [logError, logInfo, resetSession]);

  useEffect(() => {
    silentRefreshRef.current = silentRefresh;
    return () => {
      silentRefreshRef.current = null;
    };
  }, [silentRefresh]);

  useEffect(() => {
    return () => {
      clearRefreshTimer();
    };
  }, [clearRefreshTimer]);

  const value = useMemo(() => ({
    accessToken,
    user,
    isAuthenticated: Boolean(accessToken),
    isRefreshing,
    login,
    logout,
    silentRefresh,
    setSession: applySession,
    clearSession: resetSession,
    csrfToken: csrfTokenRef.current,
    refreshCsrfToken: issueCsrfToken
  }), [accessToken, applySession, isRefreshing, issueCsrfToken, login, logout, resetSession, silentRefresh, user]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
