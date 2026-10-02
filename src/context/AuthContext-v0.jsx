import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { userService, accessService } from "../services/api";
import { ALL_KEYS, PERMISSIONS, DEFAULT_ACCESS } from "../utils/access";

const SESSION_KEY = "bb_session_v1";
const ADMIN_ONLY = PERMISSIONS.filter((p) => p.adminOnly).map((p) => p.key);
const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [users, setUsers] = useState([]);
  const [access, setAccess] = useState(DEFAULT_ACCESS);
  const [sessionId, setSessionId] = useState(() => Number(localStorage.getItem(SESSION_KEY)) || null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const [u, a] = await Promise.all([userService.list(), accessService.get()]);
      setUsers(u);
      setAccess(a);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // keep other tabs in sync (permission changes, blocking a user, logout)
  useEffect(() => {
    const onStorage = (e) => {
      if (e.key === "bb_users_v1" || e.key === "bb_access_v1") refresh();
      if (e.key === SESSION_KEY) setSessionId(Number(e.newValue) || null);
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [refresh]);

  // a blocked or deleted user is treated as signed out immediately
  const currentUser = users.find((u) => u.id === sessionId && u.status === "active") || null;

  const permissionsFor = useCallback(
    (role) => {
      if (role === "admin") return ALL_KEYS;
      if (role === "staff") return (access.staff || []).filter((k) => !ADMIN_ONLY.includes(k));
      return []; // customers never enter the dashboard
    },
    [access]
  );

  const can = useCallback(
    (key) => !!currentUser && permissionsFor(currentUser.role).includes(key),
    [currentUser, permissionsFor]
  );
  const canEnterDashboard = !!currentUser && permissionsFor(currentUser.role).length > 0;

  // ---- session ----
  const login = async (email) => {
    const user = users.find((u) => u.email.toLowerCase() === String(email).trim().toLowerCase());
    if (!user) return { ok: false, error: "No account with that email." };
    if (user.status !== "active") return { ok: false, error: "This account is blocked. Please contact an admin." };
    localStorage.setItem(SESSION_KEY, String(user.id));
    setSessionId(user.id);
    const updated = await userService.update(user.id, { lastLoginAt: new Date().toISOString() });
    setUsers((prev) => prev.map((u) => (u.id === user.id ? updated : u)));
    return { ok: true, user: updated };
  };
  const logout = () => {
    localStorage.removeItem(SESSION_KEY);
    setSessionId(null);
  };

  // ---- users ----
  const addUser = async (data) => {
    const user = await userService.create(data);
    setUsers((prev) => [user, ...prev]);
    return user;
  };
  const updateUser = async (id, changes) => {
    const updated = await userService.update(id, changes);
    setUsers((prev) => prev.map((u) => (u.id === id ? updated : u)));
    return updated;
  };
  const removeUser = async (id) => {
    await userService.remove(id);
    setUsers((prev) => prev.filter((u) => u.id !== id));
    if (id === sessionId) logout();
  };

  // ---- role permissions (only staff is editable) ----
  const setRolePermission = async (role, key, enabled) => {
    if (role !== "staff" || ADMIN_ONLY.includes(key)) return;
    const current = access.staff || [];
    const staff = enabled ? Array.from(new Set([...current, key])) : current.filter((k) => k !== key);
    const next = { ...access, staff };
    setAccess(next);
    await accessService.save(next);
  };
  const resetAccess = async () => setAccess(await accessService.reset());

  return (
    <AuthContext.Provider
      value={{
        users, loading, currentUser, can, canEnterDashboard, permissionsFor,
        login, logout, addUser, updateUser, removeUser, setRolePermission, resetAccess,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
};