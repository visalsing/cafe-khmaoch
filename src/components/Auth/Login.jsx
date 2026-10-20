import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

export default function Login() {
  const { currentUser, login, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  // If already logged in, redirect away from /login
  useEffect(() => {
    if (!loading && currentUser) {
      const destination = currentUser.role === "customer" ? "/" : location.state?.from || "/dashboard";
      navigate(destination, { replace: true });
    }
  }, [currentUser, loading, navigate, location]);

  // Show nothing or a loader while checking authentication status to prevent flashing
  if (loading || currentUser) {
    return (
      <div className="min-h-screen bg-stone-50 dark:bg-stone-950 flex items-center justify-center text-stone-500">
        <p>Loading...</p>
      </div>
    );
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (busy) return;
    setError("");

    // read the inputs directly as well, so browser autofill always works (the inputs have a `name`)
    const data = new FormData(e.currentTarget);
    const typedEmail = String(data.get("email") || email).trim();
    const typedPassword = String(data.get("password") || password);

    setBusy(true);
    try {
      const res = await login(typedEmail, typedPassword);
      if (!res || !res.ok) {
        setError(res?.error || "Sign in failed. Please try again.");
        return;
      }
      // customers go back to the website; everyone else to the page they came from, or the dashboard
      navigate(res.user.role === "customer" ? "/" : location.state?.from || "/dashboard", { replace: true });
    } catch {
      setError("Cannot reach the server. Please try again later.");
    } finally {
      setBusy(false);
    }
  };

  const inputCls =
    "w-full px-4 py-2.5 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-950 text-stone-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500 text-sm";

  return (
    <div className="min-h-screen bg-stone-50 dark:bg-stone-950 text-stone-900 dark:text-stone-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white dark:bg-stone-900 rounded-3xl border border-stone-200 dark:border-stone-800 shadow-sm p-8 space-y-6">
        <div className="text-center space-y-1">
          <div className="text-4xl mb-1">☕</div>
          <h1 className="text-2xl font-extrabold tracking-tight">Café ខ្មោច</h1>
          <p className="text-sm text-stone-500">Sign in to your account</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium mb-1">Email</label>
            <input
              id="email"
              name="email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setError("");
              }}
              className={inputCls}
            />
          </div>
          <div>
            <label htmlFor="password" className="block text-sm font-medium mb-1">Password</label>
            <input
              id="password"
              name="password"
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setError("");
              }}
              className={inputCls}
            />
          </div>

          {error && (
            <p role="alert" className="text-xs text-rose-500 font-medium">
              {error}
            </p>
          )}

          <button
            disabled={busy}
            className="w-full py-3 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white font-semibold rounded-xl shadow-md text-sm cursor-pointer"
          >
            {busy ? "Signing in..." : "Sign In"}
          </button>
        </form>
      </div>
    </div>
  );
}