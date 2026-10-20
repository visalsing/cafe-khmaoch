import React, { useEffect, useState } from "react";
import { assetUrl } from "../../../services/api";

const COLORS = ["bg-amber-500", "bg-emerald-500", "bg-sky-500", "bg-violet-500", "bg-rose-500", "bg-teal-500", "bg-orange-500", "bg-indigo-500"];

export default function Avatar({ user = {}, size = 40 }) {
  const [broken, setBroken] = useState(false);

  const raw = user.avatarThumbnail || user.avatar || "";
  // blob: (a photo just chosen in the form) and data: (old base64 photos) are used as they are
  const src = raw && (raw.startsWith("blob:") || raw.startsWith("data:") ? raw : assetUrl(raw));

  useEffect(() => setBroken(false), [src]);

  const initials =
    (((user.firstName || "").trim()[0] || "") + ((user.lastName || "").trim()[0] || "")).toUpperCase() ||
    (user.email || "?")[0].toUpperCase();
  const color = COLORS[Math.abs(Number(user.id) || (user.email || "").length) % COLORS.length];

  const style = { width: size, height: size, fontSize: Math.round(size * 0.38) };

  if (src && !broken) {
    return (
      <img
        src={src}
        alt=""
        onError={() => setBroken(true)}
        style={style}
        className="rounded-full object-cover shrink-0 bg-slate-200 dark:bg-slate-800"
      />
    );
  }
  return (
    <div style={style} className={`rounded-full ${color} text-white font-bold flex items-center justify-center shrink-0`}>
      {initials}
    </div>
  );
}