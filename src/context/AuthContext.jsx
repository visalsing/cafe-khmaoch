
import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from "react";

import {
  authService,
  impersonationService,
} from "../services/api";

const AuthContext = createContext(null);

const isImpersonationSession = (data) =>
  Boolean(
    data?.isImpersonating ??
    data?.impersonation?.active ??
    false
  );

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [permissions, setPermissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isImpersonating, setIsImpersonating] = useState(false);

  const applySession = useCallback((data) => {
    setCurrentUser(data?.user || null);
    setPermissions(
      Array.isArray(data?.permissions)
        ? data.permissions
        : []
    );
    setIsImpersonating(isImpersonationSession(data));
  }, []);

  // Always ask the server which account is currently authenticated.
const refresh = useCallback(async () => {
  try {
    const [session, impersonation] = await Promise.all([
      authService.me(),
      impersonationService.status(),
    ]);

    applySession({
      ...session,
      isImpersonating: impersonation.impersonating,
    });

    return session;
  } catch (err) {
    if (err.status === 401 || err.status === 403) {
      applySession(null);
    } else {
      console.error("Failed to refresh session:", err);
    }

    throw err;
  } finally {
    setLoading(false);
  }
}, [applySession]);

  useEffect(() => {
    refresh().catch(() => {});
  }, [refresh]);

  useEffect(() => {
    const handleFocus = () => {
      refresh().catch(() => {});
    };

    window.addEventListener("focus", handleFocus);

    return () => {
      window.removeEventListener("focus", handleFocus);
    };
  }, [refresh]);

  const login = async (email, password) => {
    try {
      const data = await authService.login(email, password);
      applySession(data);

      return { ok: true, user: data.user };
    } catch (err) {
      return {
        ok: false,
        error: err.message || "Cannot reach the server.",
      };
    }
  };

  const register = async (form) => {
    try {
      const data = await authService.register(form);
      applySession(data);

      return { ok: true, user: data.user };
    } catch (err) {
      return {
        ok: false,
        error: err.message || "Registration failed.",
      };
    }
  };

  const logout = async () => {
    try {
      await authService.logout();
    } finally {
      applySession(null);
    }
  };

  // Start impersonation of a selected user.
  const startImpersonation = async (userId) => {
    if (!userId) {
      throw new Error("A target user ID is required.");
    }

    if (isImpersonating) {
      throw new Error("An impersonation session is already active.");
    }

    // The backend must enforce admin authorization.
    await impersonationService.start(userId);

    // Confirm the identity and status using the newly issued cookie.
    const session = await authService.me();

    if (!session?.user || !isImpersonationSession(session)) {
      throw new Error(
        "The server did not confirm an active impersonation session."
      );
    }

    applySession(session);
    return session.user;
  };

  // Restore the original administrator session.
  const stopImpersonation = async () => {
    if (!isImpersonating) {
      throw new Error("No active impersonation session.");
    }

    // The backend must restore the original admin cookie.
    await impersonationService.stop();

    // Verify the restored identity with the backend.
    const session = await authService.me();

    if (!session?.user || isImpersonationSession(session)) {
      throw new Error(
        "The server did not confirm that impersonation has ended."
      );
    }

    applySession(session);
    return session.user;
  };

  const isAdmin = Boolean(
    currentUser &&
      (
        Number(currentUser.role_id ?? currentUser.roleId) === 1 ||
        currentUser.role_code === "admin" ||
        currentUser.role === "admin"
      )
  );

  const can = useCallback(
    (key) => {
      if (isAdmin) return true;
      return permissions.includes(key);
    },
    [isAdmin, permissions]
  );

  const canEnterDashboard =
    Boolean(currentUser) &&
    (
      isAdmin ||
      can("view_dashboard") ||
      can("dashboard") ||
      permissions.length > 0
    );

  const canEnterProfile = Boolean(currentUser);

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        permissions,
        loading,
        isAdmin,
        isImpersonating,
        can,
        canEnterDashboard,
        canEnterProfile,
        login,
        register,
        logout,
        refresh,
        startImpersonation,
        stopImpersonation,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);

  if (!ctx) {
    throw new Error(
      "useAuth must be used inside <AuthProvider>"
    );
  }

  return ctx;
};
