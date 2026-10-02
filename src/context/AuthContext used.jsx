import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { authService } from "../services/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [permissions, setPermissions] = useState([]);
  const [loading, setLoading] = useState(true);

  const applySession = (data) => {
    setCurrentUser(data?.user || null);
    setPermissions(data?.permissions || []);
  };

  const refresh = useCallback(async () => {
    try {
      applySession(await authService.me());
    } catch (err) {
      if (err.status === 401) applySession(null); // network errors keep the current state
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // re-check when you come back to the tab: blocked users and changed permissions take effect
  useEffect(() => {
    window.addEventListener("focus", refresh);
    return () => window.removeEventListener("focus", refresh);
  }, [refresh]);

  const login = async (email, password) => {
    try {
      const data = await authService.login(email, password);
      applySession(data);
      return { ok: true, user: data.user };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  };

  const register = async (form) => {
    try {
      const data = await authService.register(form);
      applySession(data);
      return { ok: true, user: data.user };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  };

  const logout = async () => {
    try {
      await authService.logout();
    } finally {
      applySession(null);
    }
  };

  const can = useCallback((key) => permissions.includes(key), [permissions]);
  const canEnterDashboard = !!currentUser && permissions.length > 0;

  return (
    <AuthContext.Provider value={{ currentUser, permissions, loading, can, canEnterDashboard, login, register, logout, refresh }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
};