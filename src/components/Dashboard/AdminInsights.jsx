import React from "react";
import { KeyRound, ShieldAlert, Star, UserCog } from "lucide-react";
import { dual } from "../../utils/currency";
import { durationText, timeAgo, useNow } from "../../utils/dashboardFormat";

function Card({ icon: Icon, title, subtitle, children }) {
  return (
    <div className="rounded-2xl border border-slate-200/50 bg-white/80 p-6 backdrop-blur-xl dark:border-slate-700/50 dark:bg-slate-900/80">
      <div className="mb-4 flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400">
          <Icon className="h-5 w-5" />
        </span>
        <div>
          <h3 className="text-base font-bold text-slate-800 dark:text-white">{title}</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400">{subtitle}</p>
        </div>
      </div>
      {children}
    </div>
  );
}

const RankList = ({ rows, empty, valueOf, subOf }) =>
  rows.length === 0 ? (
    <p className="py-4 text-center text-sm text-slate-400">{empty}</p>
  ) : (
    <ol className="space-y-2">
      {rows.map((r, i) => {
        const v = dual(valueOf(r));
        return (
          <li key={r.userId} className="flex items-center gap-3 rounded-xl p-2">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
              {i + 1}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-slate-800 dark:text-white">{r.name || "—"}</p>
              <p className="text-xs text-slate-500">{subOf(r)}</p>
            </div>
            <p className="text-sm font-semibold text-slate-800 dark:text-white">{v.riel}</p>
          </li>
        );
      })}
    </ol>
  );

const OTP_ROWS = [
  { key: "email_sent", label: "Codes sent", bad: false },
  { key: "reset_completed", label: "Passwords reset", bad: false },
  { key: "verification_failed", label: "Wrong codes", bad: true },
  { key: "otp_locked", label: "Codes locked", bad: true },
  { key: "email_failed", label: "Emails failed", bad: true },
];

export default function AdminInsights({ admin, range = 7 }) {
  const now = useNow(60000);
  if (!admin) return null;

  const { staff, topCustomers, impersonation, otp24h } = admin;

  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
      <Card icon={UserCog} title="Counter staff" subtitle={`Paid sales taken at the POS · last ${range} days`}>
        <RankList rows={staff} empty="No counter sales in this period." valueOf={(r) => r.sales} subOf={(r) => `${r.orders} order${r.orders === 1 ? "" : "s"}`} />
      </Card>

      <Card icon={Star} title="Top customers" subtitle={`Paid orders by signed-in customers · last ${range} days`}>
        <RankList rows={topCustomers} empty="No customer orders in this period." valueOf={(r) => r.spent} subOf={(r) => `${r.orders} order${r.orders === 1 ? "" : "s"}`} />
      </Card>

      <Card icon={ShieldAlert} title="Security" subtitle="Impersonation and sign-in codes">
        <div className="mb-4 grid grid-cols-5 gap-1.5 xl:grid-cols-5">
          {OTP_ROWS.map((r) => {
            const n = otp24h[r.key] || 0;
            return (
              <div key={r.key} className="rounded-lg bg-slate-50 p-2 text-center dark:bg-slate-800/60">
                <p className={`text-base font-bold ${r.bad && n > 0 ? "text-rose-600" : "text-slate-800 dark:text-white"}`}>{n}</p>
                <p className="text-[10px] leading-tight text-slate-500">{r.label}</p>
              </div>
            );
          })}
        </div>
        <p className="mb-2 text-[11px] text-slate-400">Email codes in the last 24 hours</p>

        <div className="mb-2 flex items-center gap-2">
          <KeyRound className="h-4 w-4 text-slate-400" />
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">Impersonation sessions</p>
          {impersonation.open > 0 && (
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
              {impersonation.open} open
            </span>
          )}
        </div>
        {impersonation.recent.length === 0 ? (
          <p className="py-2 text-sm text-slate-400">None yet.</p>
        ) : (
          <ul className="space-y-1.5">
            {impersonation.recent.map((s) => (
              <li key={s.id} className="text-xs text-slate-600 dark:text-slate-300">
                <span className="font-semibold">{s.adminName}</span> → <span className="font-semibold">{s.targetName}</span>
                <span className="block text-slate-400">
                  {timeAgo(s.startedAt, now)} · {s.endedAt ? durationText(s.startedAt, s.endedAt) : "still open"}
                  {s.endReason ? ` · ${s.endReason}` : ""}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}