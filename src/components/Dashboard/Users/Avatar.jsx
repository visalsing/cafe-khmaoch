import React from "react";
import { fullName } from "../../../utils/access";

const PALETTE = ["bg-amber-500", "bg-emerald-500", "bg-sky-500", "bg-violet-500", "bg-rose-500", "bg-teal-500"];

export default function Avatar({ user, size = 40, className = "" }) {
  const name = fullName(user) || "?";
  const letters =
    `${user.firstName?.[0] || ""}${user.lastName?.[0] || ""}`.toUpperCase() || name[0].toUpperCase();
  const color = PALETTE[[...name].reduce((s, c) => s + c.charCodeAt(0), 0) % PALETTE.length];

  if (user.avatar) {
    return (
      <img
        src={user.avatar}
        alt={name}
        style={{ width: size, height: size }}
        className={`rounded-full object-cover shrink-0 ${className}`}
      />
    );
  }
  return (
    <div
      style={{ width: size, height: size, fontSize: size * 0.4 }}
      className={`rounded-full ${color} text-white font-bold flex items-center justify-center shrink-0 ${className}`}
    >
      {letters}
    </div>
  );
}