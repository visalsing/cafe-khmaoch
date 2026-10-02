



// src/components/Auth/Login.jsx

import React, { useState } from "react";

import { useNavigate } from "react-router-dom";



export default function Login() {

  const [username, setUsername] = useState("");

  const [password, setPassword] = useState("");

  const navigate = useNavigate();



  const handleLogin = (e) => {

    e.preventDefault();

    // Frontend-only mock login: simply navigate to the homepage/dashboard on submit

    if (username && password) {

      navigate("/dashboard");

    } else {

      alert("Please enter username and password");

    }

  };



  return (

    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 px-4">

      <div className="max-w-md w-full bg-white dark:bg-slate-800 rounded-2xl shadow-xl p-8 space-y-6 border border-slate-100 dark:border-slate-700">

       

        {/* Header */}

        <div className="text-center space-y-2">

          <h2 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">

            Welcome Back

          </h2>

          <p className="text-sm text-slate-500 dark:text-slate-400">

            Sign in to access your dashboard & order management

          </p>

        </div>



        {/* Form */}

        <form onSubmit={handleLogin} className="space-y-4">

          <div>

            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">

              Username

            </label>

            <input

              type="text"

              required

              value={username}

              onChange={(e) => setUsername(e.target.value)}

              placeholder="Enter your username"

              className="w-full px-4 py-2.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"

            />

          </div>



          <div>

            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">

              Password

            </label>

            <input

              type="password"

              required

              value={password}

              onChange={(e) => setPassword(e.target.value)}

              placeholder="••••••••"

              className="w-full px-4 py-2.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"

            />

          </div>



          <button

            type="submit"

            className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg shadow-md hover:shadow-lg transition-all duration-200"

          >

            Sign In

          </button>

        </form>



      </div>

    </div>

  );

} // Login.jsx

