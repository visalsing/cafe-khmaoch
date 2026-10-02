import React, { useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { Lock } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { PERMISSIONS, ROLE_INFO, fullName } from "../../utils/access";
import Avatar from "../Dashboard/Users/Avatar";

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
            <button onClick={() => navigate(first.path)} className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-sm font-semibold">
              Go to {first.label}
            </button>
          )}
          <button onClick={() => navigate("/")} className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-sm font-semibold">
            Back to website
          </button>
          <button onClick={logout} className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-sm font-semibold">
            Sign out
          </button>
        </div>
      </div>
    </div>
  );
}

// // Demo sign-in. Replace with your Login page + a real password check on the server later.
// function SignInGate() {
//   const { users, login } = useAuth();
//   const [email, setEmail] = useState("");
//   const [error, setError] = useState("");

//   const submit = async (e, value = email) => {
//     e?.preventDefault();
//     const res = await login(value);
//     if (!res.ok) setError(res.error);
//   };

//   return (
//     <div className="min-h-screen bg-stone-50 dark:bg-stone-950 text-stone-900 dark:text-stone-100 flex items-center justify-center p-4">
//       <div className="w-full max-w-md bg-white dark:bg-stone-900 rounded-3xl border border-stone-200 dark:border-stone-800 shadow-sm p-8 space-y-5">
//         <div className="text-center space-y-1">
//           <div className="text-4xl">☕</div>
//           <h1 className="text-2xl font-extrabold">Bean & Blossom Dashboard</h1>
//           <p className="text-sm text-stone-500">Sign in to continue (demo: email only)</p>
//         </div>

//         <form onSubmit={submit} className="space-y-3">
//           <input
//             type="email"
//             value={email}
//             onChange={(e) => { setEmail(e.target.value); setError(""); }}
//             placeholder="Email"
//             className="w-full px-4 py-2.5 text-sm rounded-xl bg-stone-50 dark:bg-stone-950 border border-stone-200 dark:border-stone-800 focus:outline-none focus:border-amber-500"
//           />
//           {error && <p className="text-xs text-rose-500">{error}</p>}
//           <button className="w-full py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-semibold">Sign in</button>
//         </form>

//         <div className="space-y-2">
//           <p className="text-xs font-semibold text-stone-500">Quick sign in (demo accounts)</p>
//           {users
//             .filter((u) => u.role !== "customer")
//             .map((u) => (
//               <button
//                 key={u.id}
//                 onClick={() => submit(null, u.email)}
//                 disabled={u.status !== "active"}
//                 className="w-full flex items-center gap-3 p-2.5 rounded-xl border border-stone-200 dark:border-stone-800 hover:border-amber-500 disabled:opacity-40 text-left"
//               >
//                 <Avatar user={u} size={36} />
//                 <span className="flex-1 min-w-0">
//                   <span className="block text-sm font-semibold truncate">{fullName(u)}</span>
//                   <span className="block text-xs text-stone-500 truncate">{u.email}</span>
//                 </span>
//                 <span className="text-xs font-semibold text-amber-600">{ROLE_INFO[u.role].label}</span>
//               </button>
//             ))}
//         </div>
//       </div>
//     </div>
//   );
// }

// // Wraps the whole /dashboard area
// export function RequireDashboard({ children }) {
//   const { loading, currentUser, canEnterDashboard } = useAuth();
//   if (loading) return <div className="min-h-screen flex items-center justify-center text-slate-500">Loading...</div>;
//   if (!currentUser) return <SignInGate />;
//   if (!canEnterDashboard) return <AccessDenied message="Your account does not have access to the dashboard." />;
//   return children;
// }

export function RequireDashboard({ children }) {
  const { loading, currentUser, canEnterDashboard } = useAuth();
  const location = useLocation();
  if (loading) return <div className="min-h-screen flex items-center justify-center text-slate-500">Loading...</div>;
  if (!currentUser) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  if (!canEnterDashboard) return <AccessDenied message="Your account does not have access to the dashboard." />;
  return children;
}

// Wraps one page. Use permission="pos" or adminOnly
export function Guard({ permission, adminOnly, children }) {
  const { currentUser, can } = useAuth();
  const ok = adminOnly ? currentUser?.role === "admin" : can(permission);
  return ok ? children : <AccessDenied />;
}

// /dashboard home: if staff cannot see it, send them to the first page they can open
export function HomeGuard({ children }) {
  const { can } = useAuth();
  if (can("dashboard")) return children;
  const first = PERMISSIONS.find((p) => can(p.key));
  return first ? <Navigate to={first.path} replace /> : <AccessDenied />;
}