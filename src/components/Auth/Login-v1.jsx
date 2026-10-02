import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Lock } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { ROLE_INFO, fullName } from "../../utils/access";
import Avatar from "../Dashboard/Users/Avatar";

export default function Login() {
  const { users, login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (e, targetEmail = email) => {
    e?.preventDefault();
    setError("");

    const res = await login(targetEmail, password);
    if (res?.ok) {
      navigate("/dashboard");
    } else {
      setError(res?.error || "Invalid credentials or sign-in failed.");
    }
  };

  return (
    <div className="min-h-screen bg-stone-50 dark:bg-stone-950 text-stone-900 dark:text-stone-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white dark:bg-stone-900 rounded-3xl border border-stone-200 dark:border-stone-800 shadow-sm p-8 space-y-6">
        
        {/* Header */}
        <div className="text-center space-y-1">
          <div className="text-4xl mb-1">☕</div>
          <h1 className="text-2xl font-extrabold tracking-tight">Café ខ្មោច Dashboard</h1>
          <p className="text-sm text-stone-500">Sign in to access your dashboard & order management</p>
        </div>

        {/* Form */}
        <form onSubmit={(e) => handleSubmit(e)} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1">
              Email Address
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => { setEmail(e.target.value); setError(""); }}
              placeholder="Enter your email"
              className="w-full px-4 py-2.5 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-950 text-stone-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500 transition-all text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1">
              Password <span className="text-xs text-stone-400 font-normal">(optional for demo)</span>
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => { setPassword(e.target.value); setError(""); }}
              placeholder="••••••••"
              className="w-full px-4 py-2.5 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-950 text-stone-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500 transition-all text-sm"
            />
          </div>

          {error && <p className="text-xs text-rose-500 font-medium">{error}</p>}

          <button
            type="submit"
            className="w-full py-3 px-4 bg-amber-600 hover:bg-amber-700 text-white font-semibold rounded-xl shadow-md transition-all duration-200 text-sm"
          >
            Sign In
          </button>
        </form>

        {/* Quick Demo Sign-in Accounts */}
        {users && users.length > 0 && (
          <div className="space-y-2 pt-2 border-t border-stone-100 dark:border-stone-800">
            <p className="text-xs font-semibold text-stone-500">Quick sign in (demo accounts)</p>
            <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
              {users
                .filter((u) => u.role !== "customer")
                .map((u) => (
                  <button
                    key={u.id}
                    type="button"
                    onClick={(e) => handleSubmit(e, u.email)}
                    disabled={u.status !== "active"}
                    className="w-full flex items-center gap-3 p-2 rounded-xl border border-stone-200 dark:border-stone-800 hover:border-amber-500 disabled:opacity-40 text-left transition-all"
                  >
                    <Avatar user={u} size={32} />
                    <span className="flex-1 min-w-0">
                      <span className="block text-xs font-semibold truncate">{fullName(u)}</span>
                      <span className="block text-[10px] text-stone-500 truncate">{u.email}</span>
                    </span>
                    <span className="text-[10px] font-semibold text-amber-600 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded-md">
                      {ROLE_INFO[u.role]?.label || u.role}
                    </span>
                  </button>
                ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}