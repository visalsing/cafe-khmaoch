import React from "react";
import {
  BookOpen,
  Search,
  FileText,
  Layers,
  ArrowRight,
  Sparkles,
} from "lucide-react";

export default function HomePage() {
  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-12">
      {/* Hero Section */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-blue-600 via-indigo-600 to-slate-900 p-8 sm:p-12 text-white shadow-xl">
        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-xs font-medium mb-4">
            <Sparkles className="w-3.5 h-3.5 text-yellow-300" />
            <span>Documentation Hub</span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight leading-tight">
            Welcome to DTT/DCode Docs
          </h1>
          <p className="mt-4 text-base sm:text-lg text-slate-200 leading-relaxed">
            Your central knowledge base for system guides, stock lookups, order management, and operational workflows.
          </p>

          <div className="mt-8 flex flex-wrap gap-4">
            <a
              href="#guides"
              className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-white text-blue-600 font-semibold hover:bg-slate-100 transition-colors shadow-sm"
            >
              Explore Guides <ArrowRight className="w-4 h-4" />
            </a>
          </div>
        </div>

        {/* Decorative background blur shapes */}
        <div className="absolute -right-12 -bottom-12 w-64 h-64 bg-blue-400/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -left-12 -top-12 w-64 h-64 bg-indigo-400/20 rounded-full blur-3xl pointer-events-none" />
      </div>

      {/* Quick Access Grid */}
      <div id="guides" className="space-y-6">
        <div className="border-b border-slate-200 dark:border-slate-800 pb-4">
          <h2 className="text-xl sm:text-2xl font-bold text-slate-800 dark:text-white">
            Quick Navigation
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Select a module below to start learning or troubleshooting.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Card 1 */}
          <div className="group p-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-all hover:border-blue-500/50">
            <div className="w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <BookOpen className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-semibold text-slate-800 dark:text-white mb-2">
              User Guides
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed mb-4">
              Step-by-step instructions on checking SKU prices, outlet stock, and daily tasks.
            </p>
          </div>

          {/* Card 2 */}
          <div className="group p-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-all hover:border-indigo-500/50">
            <div className="w-12 h-12 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <Layers className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-semibold text-slate-800 dark:text-white mb-2">
              Order Management
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed mb-4">
              Learn how to edit orders, review credit/debts (មើលបុងជំពាក់), and manage stock modules.
            </p>
          </div>

          {/* Card 3 */}
          <div className="group p-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-all hover:border-emerald-500/50">
            <div className="w-12 h-12 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <FileText className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-semibold text-slate-800 dark:text-white mb-2">
              System References
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed mb-4">
              Detailed descriptions of system modules, codes, and operational guidelines.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}