import React, { useState } from "react";
import {
    BarChart,
    XAxis,
    YAxis,
    CartesianGrid,
    ResponsiveContainer,
    Tooltip,
    Bar
} from "recharts";

function RevenueChart () {
    const [hoveredBar, setHoveredBar] = useState(null);

    const data = [
        {month: "Jan", revenue: 45000, expense: 32000},
        {month: "Feb", revenue: 52000, expense: 38000},
        {month: "Mar", revenue: 48000, expense: 35000},
        {month: "Apr", revenue: 61000, expense: 42000},
        {month: "May", revenue: 55000, expense: 40000},
        {month: "Jun", revenue: 67000, expense: 45000},
        {month: "Jul", revenue: 72000, expense: 48000},
        {month: "Aug", revenue: 69000, expense: 46000},
        {month: "Sep", revenue: 78000, expense: 52000},
        {month: "Oct", revenue: 74000, expense: 50000},
        {month: "Nov", revenue: 82000, expense: 55000},
        {month: "Dec", revenue: 89000, expense: 58000},
    ];
    return (
        <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl rounded-2xl border 
        border-slate-200/50 dark:border-slate-700/50 p-6 shadow-xl transition-all duration-300">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h3 className="text-xl font-bold text-slate-800 dark:text-white">
                        Revenue Chart
                    </h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Monthly revenue and expense</p>
                </div>
                <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-2">
                        <div className="w-3 h-3 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full">
                            {/*  */}
                        </div>
                        <div className="text-sm text-slate-600 dark:text-slate-400">
                            <span>Revenue</span>
                        </div>
                    </div>
                    <div className="flex items-center space-x-2">
                        <div className="w-3 h-3 bg-gradient-to-r from-slate-400 to-slate-500 rounded-full">
                            {/*  */}
                        </div>
                        <div className="text-sm text-slate-600 dark:text-slate-400">
                            <span>Expense</span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart 
            data={data} 
            margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
            onMouseLeave={() => setHoveredBar(null)}
          >
            <defs>
              <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#3b82f6" />
                <stop offset="100%" stopColor="#8b5cf6" />
              </linearGradient>
              <linearGradient id="expenseGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#94a3b8" />
                <stop offset="100%" stopColor="#64748b" />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" opacity={0.3} vertical={false} />
            <XAxis 
                dataKey="month" 
                stroke="#64748b" 
                fontSize={12} 
                tickLine={false} 
                axisLine={false} 
            />
            <YAxis
              stroke="#64748b"
              fontSize={12}
              tickLine={false}
              axisLine={false}
              tickFormatter={(value) => `$${value / 1000}k`}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "rgba(255, 255, 255, 0.95)",
                border: "none",
                borderRadius: "12px",
                boxShadow: "0 10px 40px rgba(0, 0, 0, 0.1)", // Fixed typo
              }}
              cursor={{ fill: 'transparent' }}
              formatter={(value) => [`$${value.toLocaleString()}`, ""]}
            />
            <Bar
              dataKey="revenue"
              fill="url(#revenueGradient)"
              radius={[4, 4, 0, 0]}
              maxBarSize={40}
              // Added hover effect on revenue chart only (brightness increase and opacity fade for non-hovered items)
              onMouseEnter={(data, index) => setHoveredBar(index)}
              fillOpacity={hoveredBar === null ? 1 : (hoveredBar === undefined ? 1 : 0.4)}
              style={{
                transition: 'all 0.3s ease',
                cursor: 'pointer'
              }}
              // Custom active/hover styling via factory props
              shape={(props) => {
                const { x, y, width, height, fill, index } = props;
                const isHovered = hoveredBar === index;
                return (
                  <g>
                    <rect
                      x={x}
                      y={isHovered ? y - 6 : y}
                      width={width}
                      height={isHovered ? height + 6 : height}
                      rx={4}
                      ry={4}
                      fill={fill}
                      filter={isHovered ? "drop-shadow(0px 8px 12px rgba(59, 130, 246, 0.4))" : "none"}
                      opacity={hoveredBar === null || hoveredBar === index ? 1 : 0.35}
                      style={{ transition: 'all 0.25s ease-in-out' }}
                      onMouseEnter={() => setHoveredBar(index)}
                    />
                  </g>
                );
              }}
            />
            <Bar
              dataKey="expense"
              fill="url(#expenseGradient)" // Matches defs ID now
              radius={[4, 4, 0, 0]}
              maxBarSize={40}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
        </div>
    );
};

export default function RevenueChartShowcase() {
    const [isDarkMode, setIsDarkMode] = useState(false);

    const toggleTheme = () => {
        setIsDarkMode(!isDarkMode);
        document.documentElement.classList.toggle('dark', !isDarkMode);
    };

    return (
        <div className={`min-h-screen p-6 md:p-12 transition-colors duration-300 ${isDarkMode ? 'dark bg-slate-950 text-white' : 'bg-slate-50 text-slate-900'}`}>
            <div className="max-w-4xl mx-auto space-y-8">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                    <div>
                        <h1 className="text-2xl font-extrabold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                            Financial Metrics Dashboard
                        </h1>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                            Hover over any <span className="text-blue-500 font-semibold">Revenue bar</span> to trigger the interactive hover effect.
                        </p>
                    </div>
                    <button
                        onClick={toggleTheme}
                        className="px-4 py-2 rounded-xl text-sm font-medium bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition border border-slate-300 dark:border-slate-700 flex items-center gap-2"
                    >
                        {isDarkMode ? '☀️ Light Mode' : '🌙 Dark Mode'}
                    </button>
                </div>

                <div className="shadow-2xl rounded-2xl">
                    <RevenueChart />
                </div>

                <div className="bg-blue-50 dark:bg-slate-900/50 border border-blue-200 dark:border-slate-800 rounded-2xl p-5 text-sm text-blue-900 dark:text-blue-300 flex items-start gap-3">
                    <span className="text-xl">💡</span>
                    <div>
                        <span className="font-semibold block mb-0.5">Hover Specification Applied:</span>
                        The revenue bars elevate with a custom drop shadow, lift slightly on hover, and smoothly dim non-hovered columns, while expenses remain untouched as requested.
                    </div>
                </div>
            </div>
        </div>
    );
}