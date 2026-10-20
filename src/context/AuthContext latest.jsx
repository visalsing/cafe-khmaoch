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
      // Check if emergency local bypass user is already stored
      const localAdmin = localStorage.getItem("bb_emergency_admin");
      if (localAdmin) {
        applySession(JSON.parse(localAdmin));
        setLoading(false);
        return;
      }

      applySession(await authService.me());
    } catch (err) {
      if (err.status === 401) applySession(null); 
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    window.addEventListener("focus", refresh);
    return () => window.removeEventListener("focus", refresh);
  }, [refresh]);

  const login = async (email, password) => {
    // --- EMERGENCY BYPASS FOR LOCAL TESTING ---
    if (email.trim() === "sovisalsing55@gmail.com" && password === "visal-sing.55$") {
      const adminSession = {
        user: {
          id: 999,
          firstName: "Visalsing",
          lastName: "Admin",
          email: "sovisalsing55@gmail.com",
          role: "admin"
        },
        permissions: ["manage_menu", "manage_orders", "manage_users", "manage_hero", "view_dashboard"]
      };
      localStorage.setItem("bb_emergency_admin", JSON.stringify(adminSession));
      applySession(adminSession);
      return { ok: true, user: adminSession.user };
    }
    // ------------------------------------------

    try {
      const data = await authService.login(email, password);
      applySession(data);
      return { ok: true, user: data.user };
    } catch (err) {
      return { ok: false, error: err.message || "Cannot reach the server." };
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
      localStorage.removeItem("bb_emergency_admin");
      await authService.logout();
    } finally {
      applySession(null);
    }
  };

  const can = useCallback((key) => permissions.includes(key), [permissions]);
  const canEnterDashboard = !!currentUser && permissions.length > 0;
  const canEnterProfile = !!currentUser && permissions.length > 0;

  return (
    <AuthContext.Provider value={{ currentUser, permissions, loading, can, canEnterDashboard, canEnterProfile, login, register, logout, refresh }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
};