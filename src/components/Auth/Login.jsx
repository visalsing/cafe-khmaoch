import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  //   const handleSubmit = async (e) => {
  //     e.preventDefault();
  //     setError("");
  //     setBusy(true);

  //     try {
  //       // 1. Check for your custom fallback account first
  //       if (email === "sovisalsing55@gmail.com" && password === "visal-sing.55$") {
  //         navigate(location.state?.from || "/dashboard", { replace: true });
  //         return;
  //       }

  //       // 2. Normal Database Login flow via AuthContext
  //       const res = await login(email, password);

  //       if (!res || !res.ok) {
  //         setError(res?.error || "Request failed.");
  //         setBusy(false);
  //         return;
  //       }

  //       // Staff and admins go to the dashboard, customers back to the website
  //       navigate(
  //         res.user.role === "customer" ? "/" : location.state?.from || "/dashboard",
  //         { replace: true }
  //       );
  //     } catch (err) {
  //       // 3. If server is down/offline, still allow your custom fallback login!
  //       if (email === "sovisalsing55@gmail.com" && password === "visal-sing.55$") {
  //         navigate(location.state?.from || "/dashboard", { replace: true });
  //       } else {
  //         setError("Cannot reach the server. Please try again later.");
  //       }
  //     } finally {
  //       setBusy(false);
  //     }
  //   };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    // Grab values directly from the form inputs so autofill always works!
    const formData = new FormData(e.currentTarget);
    const typedEmail = formData.get("email") || email;
    const typedPassword = formData.get("password") || password;

    // 1. Force-check your emergency login credentials
    if (typedEmail.trim() === "sovisalsing55@gmail.com" && typedPassword === "visal-sing.55$") {
      navigate(location.state?.from || "/dashboard", { replace: true });
      return;
    }

    setBusy(true);

    try {
      const res = await login(typedEmail, typedPassword);
      
      if (!res || !res.ok) {
        setError(res?.error || "Request failed.");
        setBusy(false);
        return;
      }

      navigate(
        res.user.role === "customer" ? "/" : location.state?.from || "/dashboard",
        { replace: true }
      );
    } catch (err) {
      if (typedEmail.trim() === "sovisalsing55@gmail.com" && typedPassword === "visal-sing.55$") {
        navigate(location.state?.from || "/dashboard", { replace: true });
      } else {
        setError("Cannot reach the server. Please try again later.");
        setBusy(false);
      }
    }
  };

//   const handleSubmit = async (e) => {
//     e.preventDefault();
//     setError("");
//     setBusy(true);

//     try {
//       // 1. Check if it's your custom credentials
//       if (
//         email.trim() === "sovisalsing55@gmail.com" &&
//         password === "visal-sing.55$"
//       ) {
//         // Create a mock user object matching your seed user structure
//         const adminUser = {
//           id: 1,
//           firstName: "Visalsing",
//           lastName: "Admin",
//           email: "sovisalsing55@gmail.com",
//           role: "admin",
//           status: "active",
//         };

//         // If your AuthContext exposes a way to set user state directly, use it here,
//         // or we can store it in localStorage so your app recognizes you are logged in:
//         localStorage.setItem("bb_user", JSON.stringify(adminUser));

//         // Force a small reload or navigate to dashboard
//         setBusy(false);
//         navigate(location.state?.from || "/dashboard", { replace: true });
//         return;
//       }

//       // 2. Normal Database Login flow
//       const res = await login(email, password);

//       if (!res || !res.ok) {
//         setError(res?.error || "Request failed.");
//         setBusy(false);
//         return;
//       }

//       navigate(
//         res.user.role === "customer"
//           ? "/"
//           : location.state?.from || "/dashboard",
//         { replace: true },
//       );
//     } catch (err) {
//       setError("Cannot reach the server. Please try again later.");
//     } finally {
//       setBusy(false);
//     }
//   };

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
            <label className="block text-sm font-medium mb-1">Email</label>
            <input
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
            <label className="block text-sm font-medium mb-1">Password</label>
            <input
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
            <p className="text-xs text-rose-500 font-medium">{error}</p>
          )}
          <button
            disabled={busy}
            className="w-full py-3 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white font-semibold rounded-xl shadow-md text-sm"
          >
            {busy ? "Signing in..." : "Sign In"}
          </button>
        </form>
      </div>
    </div>
  );
}
