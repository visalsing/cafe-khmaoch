import React from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { Lock } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { PERMISSIONS } from "../../utils/access";
import LoadingScreen from "../Loading/Loading";

// const Loading = () => (
//   <div className="min-h-screen flex items-center justify-center text-slate-500">Loading...</div>
// );
const Loading = () => <LoadingScreen />;

export function AccessDenied({ message = "You don't have permission to open this page." }) {
  const navigate = useNavigate();
  const { can, logout } = useAuth();
  const first = PERMISSIONS.find((p) => can(p.key));

  return (
    <div className="min-h-[60vh] flex items-center justify-center p-6">
      <div className="max-w-sm text-center space-y-4">
        <div className="mx-auto w-14 h-14 rounded-full bg-rose-100 dark:bg-rose-900/30 flex items-center justify-center">
          <Lock className="w-6 h-6 text-rose-500" />
        </div>
        <h2 className="text-xl font-bold">Access denied</h2>
        <p className="text-sm text-slate-500">{message}</p>
        <div className="flex flex-wrap justify-center gap-2">
          {first && (
            <button
              onClick={() => navigate(first.path)}
              className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-sm font-semibold"
            >
              Go to {first.label}
            </button>
          )}
          <button
            onClick={() => navigate("/")}
            className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-sm font-semibold"
          >
            Back to website
          </button>
          <button
            onClick={logout}
            className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-sm font-semibold"
          >
            Sign out
          </button>
        </div>
      </div>
    </div>
  );
}

// Wraps the whole /dashboard area
export function RequireDashboard({ children }) {
  const { loading, currentUser, canEnterDashboard } = useAuth();
  const location = useLocation();
  if (loading) return <Loading />;
  if (!currentUser) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  if (!canEnterDashboard) return <AccessDenied message="Your account does not have access to the dashboard." />;
  return children;
}

// Any signed-in user (customers too) can open their profile
export function RequireProfile({ children }) {
  const { loading, currentUser, canEnterProfile } = useAuth();
  const location = useLocation();
  if (loading) return <Loading />;
  if (!currentUser) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  if (canEnterProfile === false) return <AccessDenied message="Your account does not have access to the profile." />;
  return children;
}

// Wraps one page. Use permission="pos" or adminOnly
export function Guard({ permission, adminOnly, children }) {
  const { currentUser, can } = useAuth();
  const isAdmin = currentUser?.role_id === 1 || currentUser?.role_code === "admin";
  const ok = adminOnly ? isAdmin : (isAdmin || can(permission));
  return ok ? children : <AccessDenied />;
}

// /dashboard home: if the user cannot see it, send them to the first page they can open
export function HomeGuard({ children }) {
  const { can } = useAuth();
  if (can("dashboard")) return children;
  const first = PERMISSIONS.find((p) => can(p.key));
  return first ? <Navigate to={first.path} replace /> : <AccessDenied />;
}