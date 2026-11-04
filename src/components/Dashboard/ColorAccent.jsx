import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Crown, LoaderCircle, Pencil, RotateCcw, X } from "lucide-react";
import { accentService } from "../../services/api";
import { useLanguage } from "../../context/LanguageContext.jsx";
import { localize } from "../../hooks/useLocalized";
import { Alert } from "./UiBits";
import { inputCls } from "./Shared.jsx";

const FALLBACK_LANGS = [
  { code: "en", nativeLabel: "English" },
  { code: "km", nativeLabel: "ខ្មែរ" },
  { code: "zh", nativeLabel: "中文" },
  { code: "lo", nativeLabel: "ລາວ" },
  { code: "ja", nativeLabel: "日本語" },
  { code: "vi", nativeLabel: "Tiếng Việt" },
];

const HEX_RE = /^#[0-9A-Fa-f]{6}$/;

// { en: " Amber ", km: "" } -> { en: "Amber" }
const clean = (obj) =>
  Object.fromEntries(
    Object.entries(obj || {})
      .map(([k, v]) => [k, String(v ?? "").trim()])
      .filter(([, v]) => v)
      .sort(([a], [b]) => a.localeCompare(b)),
  );

// the exact thing that is sent to the server; also used to notice "nothing changed"
const shape = (v) => ({
  name: clean(v.name),
  swatch: String(v.swatch || "").trim().toLowerCase(),
  sort_num: Number.parseInt(v.sort_num, 10) || 0,
  status: Number(v.status) === 0 ? 0 : 1,
});

function Switch({ on, disabled, onClick, label, title }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      title={title}
      disabled={disabled}
      onClick={onClick}
      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition disabled:cursor-not-allowed disabled:opacity-50 ${
        on ? "bg-emerald-500" : "bg-slate-300 dark:bg-slate-600"
      }`}
    >
      <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition ${on ? "translate-x-5" : "translate-x-0.5"}`} />
    </button>
  );
}

/* ---------- edit one accent ---------- */
function AccentModal({ accent, languages, onClose, onSaved }) {
  const [lang, setLang] = useState("en");
  const [name, setName] = useState(accent.name || {});
  const [swatch, setSwatch] = useState(accent.swatch || "#888888");
  const [sortNum, setSortNum] = useState(String(accent.sort_num ?? 0));
  const [status, setStatus] = useState(Number(accent.status) === 0 ? 0 : 1);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(null); // { type: "error" | "info", text }

  const isDefault = Number(accent.is_selected) === 1;
  const initial = useMemo(() => JSON.stringify(shape(accent)), [accent]);
  const validSwatch = HEX_RE.test(swatch.trim());

  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && !busy && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [busy, onClose]);

  const submit = async (e) => {
    e.preventDefault();
    const current = shape({ name, swatch, sort_num: sortNum, status });

    if (!current.name.en) {
      setLang("en");
      return setMessage({ type: "error", text: "The English name is required." });
    }
    if (!HEX_RE.test(current.swatch)) {
      return setMessage({ type: "error", text: "The color must be a hex code like #e27200." });
    }
    if (JSON.stringify(current) === initial) return setMessage({ type: "info", text: "No changes to save." });

    setBusy(true);
    setMessage(null);
    try {
      onSaved(await accentService.update(accent.id, current)); // the page closes this window
    } catch (err) {
      setMessage({ type: "error", text: err.message || "Could not save the accent." });
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onMouseDown={(e) => e.target === e.currentTarget && !busy && onClose()}>
      <form
        onSubmit={submit}
        role="dialog"
        aria-modal="true"
        aria-label="Edit accent color"
        className="max-h-[92vh] w-full max-w-2xl space-y-5 overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-900"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-lg font-bold text-slate-800 dark:text-white">Edit accent color</h3>
            <p className="text-sm text-slate-500">
              Code: <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs dark:bg-slate-800">{accent.code}</code> (fixed: it must match a <code>[data-accent]</code> block in the CSS)
            </p>
          </div>
          <button type="button" onClick={onClose} disabled={busy} aria-label="Close">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* language tabs */}
        <div className="flex flex-wrap gap-2" role="tablist" aria-label="Language">
          {languages.map(({ code, nativeLabel, label }) => (
            <button
              key={code}
              type="button"
              role="tab"
              aria-selected={lang === code}
              onClick={() => setLang(code)}
              className={`inline-flex items-center gap-2 rounded-xl px-3 py-1.5 text-sm font-semibold transition-colors ${
                lang === code ? "bg-accent-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300"
              }`}
            >
              <span className={`h-2 w-2 rounded-full ${String(name[code] || "").trim() ? "bg-emerald-400" : "bg-slate-300"}`} />
              {nativeLabel || label || code}
            </button>
          ))}
        </div>

        <label className="block">
          <span className="mb-1.5 flex items-baseline justify-between text-sm font-semibold text-slate-700 dark:text-slate-300">
            <span>
              Name {lang === "en" && <span className="text-rose-500">*</span>}
            </span>
            <span className="text-xs font-normal text-slate-400">{(name[lang] || "").length}/120</span>
          </span>
          <input
            value={name[lang] || ""}
            onChange={(e) => setName({ ...name, [lang]: e.target.value })}
            maxLength={120}
            placeholder={lang !== "en" && name.en ? `English: ${name.en}` : ""}
            className={inputCls}
          />
        </label>

        {/* swatch color */}
        <div>
          <span className="mb-1.5 block text-sm font-semibold text-slate-700 dark:text-slate-300">
            Swatch color <span className="text-rose-500">*</span>
          </span>
          <div className="flex items-center gap-3">
            <input
              type="color"
              value={validSwatch ? swatch.trim().toLowerCase() : "#888888"}
              onChange={(e) => setSwatch(e.target.value)}
              aria-label="Pick a color"
              className="h-10 w-14 cursor-pointer rounded-lg border border-slate-300 bg-transparent p-1 dark:border-slate-700"
            />
            <input
              value={swatch}
              onChange={(e) => setSwatch(e.target.value)}
              maxLength={7}
              placeholder="#e27200"
              spellCheck={false}
              className={`${inputCls} max-w-[9rem] font-mono`}
            />
            {!validSwatch && <span className="text-xs text-rose-500">Use a hex code like #e27200</span>}
          </div>
          <span className="mt-1 block text-xs text-slate-400">
            This is only the preview dot on the Settings cards. The real accent shades come from the CSS.
          </span>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1.5 block text-sm font-semibold text-slate-700 dark:text-slate-300">Order</span>
            <input type="number" value={sortNum} onChange={(e) => setSortNum(e.target.value)} className={inputCls} />
            <span className="mt-1 block text-xs text-slate-400">Smaller numbers come first on the Settings pages.</span>
          </label>

          <div>
            <span className="mb-1.5 block text-sm font-semibold text-slate-700 dark:text-slate-300">Visible on the Settings pages</span>
            <div className="flex items-center gap-3 pt-1">
              <Switch
                on={status === 1}
                disabled={isDefault}
                label="Visible"
                title={isDefault ? "The default accent must stay visible." : undefined}
                onClick={() => setStatus(status === 1 ? 0 : 1)}
              />
              <span className="text-sm text-slate-600 dark:text-slate-300">{status === 1 ? "Visible" : "Hidden"}</span>
            </div>
            {isDefault && <span className="mt-1 block text-xs text-slate-400">The default accent must stay visible.</span>}
          </div>
        </div>

        {/* how it will look */}
        <div>
          <span className="mb-1.5 block text-sm font-semibold text-slate-700 dark:text-slate-300">Preview (as on the Settings page)</span>
          <div className="max-w-[10rem] rounded-xl border border-slate-300 p-4 dark:border-slate-700">
            <span
              className="mb-3 block h-7 w-7 rounded-full"
              style={{ background: validSwatch ? swatch.trim() : "#888888" }}
            />
            <p className="text-sm font-semibold text-slate-800 dark:text-white">{name[lang] || name.en || "—"}</p>
          </div>
        </div>

        {message && (
          <p role="alert" className={`text-sm ${message.type === "error" ? "text-rose-500" : "text-slate-500"}`}>
            {message.text}
          </p>
        )}

        <div className="flex justify-end gap-3">
          <button type="button" onClick={onClose} disabled={busy} className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold hover:border-accent-500 disabled:opacity-60 dark:border-slate-700">
            Cancel
          </button>
          <button type="submit" disabled={busy} className="inline-flex items-center gap-2 rounded-xl bg-accent-600 px-5 py-2 text-sm font-semibold text-white hover:bg-accent-700 disabled:opacity-60">
            {busy && <LoaderCircle className="h-4 w-4 animate-spin" />}
            {busy ? "Saving..." : "Save"}
          </button>
        </div>
      </form>
    </div>
  );
}

/* ---------- the page ---------- */
export default function ColorAccent() {
  const { language, languages } = useLanguage();
  const langs = languages?.length ? languages : FALLBACK_LANGS;

  const [accents, setAccents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const [notice, setNotice] = useState(null);

  const notify = (type, title, message) => setNotice({ id: Date.now(), type, title, message });

  const load = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setLoading(true);
    try {
      const rows = await accentService.listAll();
      setAccents(Array.isArray(rows) ? rows : []);
      setError("");
      return true;
    } catch (err) {
      setError(err.message || "Could not load the accent colors.");
      return false;
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!notice || notice.type === "error") return undefined;
    const timer = setTimeout(() => setNotice(null), 5000);
    return () => clearTimeout(timer);
  }, [notice]);

  const replace = (row) =>
    setAccents((prev) => prev.map((a) => (a.id === row.id ? row : a)).sort((a, b) => a.sort_num - b.sort_num || a.id - b.id));

  const toggle = async (ac) => {
    setBusyId(ac.id);
    try {
      replace(await accentService.setStatus(ac.id, Number(ac.status) === 1 ? 0 : 1));
    } catch (err) {
      notify("error", "Could not change the visibility", err.message || "Please try again.");
    } finally {
      setBusyId(null);
    }
  };

  const makeDefault = async (ac) => {
    const label = localize(ac.name, language) || ac.code;
    if (!window.confirm(`Make “${label}” the default accent color? Visitors who have not chosen one will see it first.`)) return;
    setBusyId(ac.id);
    try {
      await accentService.select(ac.id);
      await load({ silent: true }); // the old default changes too
      notify("success", "Default accent changed", `“${label}” is now the default.`);
    } catch (err) {
      notify("error", "Could not change the default", err.message || "Please try again.");
    } finally {
      setBusyId(null);
    }
  };

  const refresh = async () => {
    setRefreshing(true);
    try {
      if (await load({ silent: true })) notify("success", "Accent colors refreshed", "The accent colors were reloaded from the database.");
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-800 dark:text-white">Accent Colors</h1>
          <p className="text-sm text-slate-500">The highlight colors offered on the Settings pages.</p>
        </div>
        <button
          onClick={refresh}
          disabled={refreshing}
          className="flex items-center gap-2 self-start rounded-xl border border-slate-300 px-3 py-2 text-sm transition-colors hover:border-accent-500 disabled:opacity-60 dark:border-slate-700"
        >
          <RotateCcw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} /> Refresh
        </button>
      </div>

      {notice && (
        <Alert key={notice.id} type={notice.type} title={notice.title} onClose={() => setNotice(null)}>
          {notice.message}
        </Alert>
      )}
      {error && (
        <Alert
          type="error"
          title="Could not load the accent colors"
          action={
            <button onClick={() => load()} className="ml-2 font-semibold underline">
              Retry
            </button>
          }
        >
          {error}
        </Alert>
      )}

      {loading ? (
        <p className="py-12 text-center text-slate-400">Loading...</p>
      ) : (
        <ul className="space-y-3">
          {accents.length === 0 && !error && <li className="rounded-2xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-400 dark:border-slate-700">No accent colors yet. Run npm run db:setup to create them.</li>}

          {accents.map((ac) => {
            const isDefault = Number(ac.is_selected) === 1;
            const visible = Number(ac.status) === 1;
            const name = localize(ac.name, language) || ac.code;
            const busy = busyId === ac.id;

            return (
              <li
                key={ac.id}
                className={`flex flex-wrap items-center gap-4 rounded-2xl border bg-white p-5 shadow-sm dark:bg-slate-900 ${
                  visible ? "border-slate-200 dark:border-slate-800" : "border-dashed border-slate-300 opacity-70 dark:border-slate-700"
                }`}
              >
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-slate-50 dark:bg-slate-800">
                  <span className="block h-7 w-7 rounded-full shadow-sm" style={{ background: ac.swatch }} />
                </span>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-bold text-slate-800 dark:text-white">{name}</h3>
                    <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs text-slate-500 dark:bg-slate-800">{ac.code}</code>
                    <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs text-slate-500 dark:bg-slate-800">{ac.swatch}</code>
                    {isDefault && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
                        <Crown className="h-3 w-3" /> Default
                      </span>
                    )}
                    {!visible && <span className="rounded-full bg-slate-200 px-2 py-0.5 text-xs font-semibold text-slate-600 dark:bg-slate-700 dark:text-slate-300">Hidden</span>}
                  </div>
                  <p className="mt-0.5 text-xs text-slate-400">Order {ac.sort_num}</p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <Switch
                    on={visible}
                    disabled={busy || isDefault}
                    label={`Show ${name}`}
                    title={isDefault ? "The default accent can't be hidden. Make another accent the default first." : visible ? "Hide it" : "Show it"}
                    onClick={() => toggle(ac)}
                  />
                  {!isDefault && (
                    <button
                      type="button"
                      onClick={() => makeDefault(ac)}
                      disabled={busy || !visible}
                      title={!visible ? "Show the accent first" : undefined}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold transition-colors hover:border-accent-500 disabled:opacity-50 dark:border-slate-700"
                    >
                      <Crown className="h-3.5 w-3.5" /> Make default
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setEditing(ac)}
                    disabled={busy}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-accent-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-accent-700 disabled:opacity-50"
                  >
                    <Pencil className="h-3.5 w-3.5" /> Edit
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 text-sm text-slate-600 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-400">
        <p className="mb-2 font-semibold text-slate-700 dark:text-slate-200">How it works</p>
        <ul className="list-disc space-y-1 pl-5">
          <li><b>Code</b> (amber, cherry, ...) is built into the app's styling through <code>[data-accent]</code> in the CSS, so it cannot be changed, and there is no Add or Delete here. A brand-new accent needs a new CSS block first.</li>
          <li><b>Swatch</b> is only the preview dot on the Settings cards. Changing it does not change the real accent shades.</li>
          <li><b>Visible</b> accents are offered on the Settings pages. Hidden ones are not.</li>
          <li><b>Default</b> is what a visitor sees before choosing. A signed-in visitor's own choice is saved on their account.</li>
        </ul>
      </div>

      {editing && (
        <AccentModal
          accent={editing}
          languages={langs}
          onClose={() => setEditing(null)}
          onSaved={(row) => {
            replace(row);
            setEditing(null);
            notify("success", "Accent color saved", `“${localize(row.name, language) || row.code}” was updated.`);
          }}
        />
      )}
    </div>
  );
}