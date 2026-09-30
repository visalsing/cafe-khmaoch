import React from "react";

export default function About() {
  return (
    <section
      id="about"
      className="bg-white dark:bg-slate-900 rounded-3xl p-8 sm:p-12 border border-slate-200 dark:border-slate-800 shadow-sm grid grid-cols-1 lg:grid-cols-2 gap-8 items-center"
    >
      <div className="space-y-4">
        {/* <span className="text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">SM Solar Plus Technology</span>
        <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">Engineered for Extreme Weather & Maximum Output</h2>
        <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
          Every SM Solar Plus device incorporates advanced thermal regulation, smart IoT power balancing modules, and weatherproof encasing to deliver consistent energy generation under any climate condition.
        </p> */}
        <span className="text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
          Our Story
        </span>
        <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
          Ethically Sourced Beans, Roasted with Love
        </h2>
        <p className="text-stone-600 dark:text-stone-400 leading-relaxed">
          Every cup at Bean & Blossom starts with single-origin beans from small
          farms, roasted in small batches and brewed by baristas who care. Pair
          it with a pastry baked fresh each morning.
        </p>
        <div className="flex gap-4 pt-2">
          <div className="border-l-4 border-blue-600 pl-4">
            <h4 className="font-bold text-lg">7 AM</h4>
            <p className="text-xs text-stone-500">Fresh Pastries Daily</p>
          </div>
        </div>
        {/* <div className="flex gap-4 pt-2">
          <div className="border-l-4 border-blue-600 pl-4">
            <h4 className="font-bold text-lg">100%</h4>
            <p className="text-xs text-stone-500">Ethically Sourced Beans</p>
          </div>
          <div className="border-l-4 border-indigo-600 pl-4">
            <h4 className="font-bold text-lg">98.6%</h4>
            <p className="text-xs text-slate-500">Inverter Peak Conversion</p>
          </div>
        </div> */}
      </div>
      <div className="relative h-64 sm:h-80 rounded-2xl overflow-hidden shadow-inner">
        <img
          // src="https://images.unsplash.com/photo-1513836279014-a89f7a76ae86?auto=format&fit=crop&w=800&q=80"
          // alt="Solar Panels Farm"
          // className="w-full h-full object-cover"
          src="https://images.unsplash.com/photo-1554118811-1e0d58224f24?auto=format&fit=crop&w=800&q=80"
          alt="Café interior"
        />
      </div>
    </section>
  );
}
