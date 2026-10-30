import React, { useMemo } from "react";
import { hourLabel } from "../../utils/dashboardFormat.js";
import ChartCard from "./ChartCard.jsx";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export default function HeatmapCard({ cells = [], range = 7 }) {
  const { grid, max, best } = useMemo(() => {
    const g = Array.from({ length: 7 }, () => Array(24).fill(0));
    cells.forEach((c) => {
      if (c.dow >= 1 && c.dow <= 7 && c.hour >= 0 && c.hour <= 23) g[c.dow - 1][c.hour] = c.orders;
    });
    let top = 0;
    let where = null;
    g.forEach((row, d) =>
      row.forEach((v, h) => {
        if (v > top) {
          top = v;
          where = { d, h, v };
        }
      }),
    );
    return { grid: g, max: top, best: where };
  }, [cells]);

  return (
    <ChartCard
      title="Busy Times"
      subtitle={
        best
          ? `Busiest slot: ${DAYS[best.d]} ${hourLabel(best.h)} (${best.v} orders in ${range} days)${range < 30 ? " · pick 30 or 90 days for a clearer picture" : ""}`
          : `Which weekday and hour is busiest · last ${range} days`
      }
    >
      {max === 0 ? (
        <div className="flex h-40 items-center justify-center text-sm text-slate-400">No orders in this period</div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <div className="min-w-[600px]">
              <div className="grid gap-1" style={{ gridTemplateColumns: "36px repeat(24, minmax(0, 1fr))" }}>
                <span />
                {Array.from({ length: 24 }, (_, h) => (
                  <span key={h} className="text-center text-[10px] text-slate-400">
                    {h % 3 === 0 ? String(h).padStart(2, "0") : ""}
                  </span>
                ))}

                {grid.map((row, d) => (
                  <React.Fragment key={DAYS[d]}>
                    <span className="pr-1 text-right text-[11px] leading-6 text-slate-500">{DAYS[d]}</span>
                    {row.map((v, h) => (
                      <span
                        key={h}
                        title={`${DAYS[d]} ${hourLabel(h)} · ${v} order${v === 1 ? "" : "s"}`}
                        className="h-6 rounded-[4px] bg-slate-100 dark:bg-slate-800"
                        style={v > 0 ? { backgroundColor: `rgba(245, 158, 11, ${0.15 + 0.85 * (v / max)})` } : undefined}
                      />
                    ))}
                  </React.Fragment>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-3 flex items-center justify-end gap-2 text-[11px] text-slate-400">
            <span>Quiet</span>
            {[0.15, 0.4, 0.65, 0.9, 1].map((a) => (
              <span key={a} className="h-3 w-5 rounded-[3px]" style={{ backgroundColor: `rgba(245, 158, 11, ${a})` }} />
            ))}
            <span>Busy</span>
          </div>
        </>
      )}
    </ChartCard>
  );
}