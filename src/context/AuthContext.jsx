import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from "react";
import { authService } from "../services/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [permissions, setPermissions] = useState([]);
  const [loading, setLoading] = useState(true);

  const applySession = (data) => {
    setCurrentUser(data?.user || null);
    setPermissions(
      Array.isArray(data?.permissions) ? data.permissions : []
    );
  };

  const refresh = useCallback(async () => {
    try {
      // Check if emergency local bypass user is already stored.
      const localAdmin = localStorage.getItem("bb_emergency_admin");

      if (localAdmin) {
        applySession(JSON.parse(localAdmin));
        setLoading(false);
        return;
      }

      const data = await authService.me();
      applySession(data);
    } catch (err) {
      if (err.status === 401) {
        applySession(null);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    window.addEventListener("focus", refresh);

    return () => {
      window.removeEventListener("focus", refresh);
    };
  }, [refresh]);

  const login = async (email, password) => {
    // Emergency bypass for local testing only.
    if (
      email.trim() === "sovisalsing55@gmail.com" &&
      password === "visal-sing.55$"
    ) {
      const adminSession = {
        user: {
          id: 999,
          firstName: "Visalsing",
          lastName: "Admin",
          email: "sovisalsing55@gmail.com",
          role_id: 1, // Updated to match database role_id schema
          role_code: "admin",
        },
        permissions: [
          "dashboard",
          "pos",
          "orders",
          "menu",
          "reports",
          "pages",
          "users",
          "roles",
        ],
      };

      localStorage.setItem(
        "bb_emergency_admin",
        JSON.stringify(adminSession)
      );

      applySession(adminSession);

      return { ok: true, user: adminSession.user };
    }

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
      localStorage.removeItem("bb_emergency_admin");
      await authService.logout();
    } finally {
      applySession(null);
    }
  };

  // Helper check: Is the user an Admin based on database role_id (1) or role_code ('admin')?
  const isAdmin = Boolean(
    currentUser &&
      (Number(currentUser.role_id) === 1 ||
        currentUser.role_code === "admin" ||
        currentUser.role === "admin")
  );

  // Check whether the current user has a specific permission. Admins get all permissions.
  const can = useCallback(
    (key) => {
      if (isAdmin) return true;
      return permissions.includes(key);
    },
    [isAdmin, permissions]
  );

  // Allow Dashboard access if user is Admin, or has permissions assigned via role_permissions
  const canEnterDashboard =
    !!currentUser &&
    (isAdmin ||
      can("view_dashboard") ||
      can("dashboard") ||
      permissions.length > 0);

  // Any authenticated user can access their own profile.
  const canEnterProfile = !!currentUser;

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        permissions,
        loading,
        isAdmin,
        can,
        canEnterDashboard,
        canEnterProfile,
        login,
        register,
        logout,
        refresh,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);

  if (!ctx) {
    throw new Error("useAuth must be used inside <AuthProvider>");
  }

  return ctx;
};