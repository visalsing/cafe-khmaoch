import React, { useEffect, useRef } from "react";
import { useBackgroundStyle } from "../../utils/background.js";

const rand = (min, max) => Math.random() * (max - min) + min;

// type:      "none" | "particles" | "bubbles" | "rain" | "stars" |
//            "lightning" | "ghosts" | "bats" (defaults to the saved setting)
// contained: true = small preview inside a card, false = full-page fixed background
export default function BackgroundEffect({ type, contained = false }) {
  const canvasRef = useRef(null);
  const [stored] = useBackgroundStyle();
  const style = type ?? stored;
  console.log("BackgroundEffect:", { type, stored, style });

  useEffect(() => {
    if (style === "none") return undefined;

    const canvas = canvasRef.current;
    if (!canvas) return undefined;

    const ctx = canvas.getContext("2d");
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    const scale = contained ? 0.35 : 1; // sizes
    const speed = contained ? 0.5 : 1; // movement
    const sz = Math.max(scale, 0.45); // sizes for ghosts / bats

    // Probe element so the effect always uses the current accent color
    const probe = document.createElement("span");
    probe.className = "text-accent-500";
    probe.style.cssText =
      "position:fixed;visibility:hidden;pointer-events:none";
    document.body.appendChild(probe);

    let color = "#e11d48";
    let boost = 1;
    const refreshTheme = () => {
      color = getComputedStyle(probe).color || color;
      //   const dark =
      //     contained || document.documentElement.classList.contains("dark");
      const dark = document.documentElement.classList.contains("dark");
      boost = dark ? 1 : 1.5; // a bit stronger on light backgrounds
    };
    const a = (v) => Math.min(1, v * boost);

    let w = 0;
    let h = 0;
    let items = [];
    let bolts = []; // lightning
    let nextBolt = 0; // frames until the next lightning strike
    let shooting = null; // shooting star
    let raf = 0;
    let frame = 0;

    const count = () => {
      const area = w * h;
      if (contained) {
        const c = {
          particles: 24,
          bubbles: 6,
          rain: 14,
          stars: 22,
          ghosts: 2,
          bats: 3,
          lightning: 0,
          skulls: 2,
          "jack-o-lantern": 2,
          halloween: 12,
          cats: 10,
          moons: 8,
        };
        return c[style] ?? 0;
      }
      switch (style) {
        case "particles":
          return Math.min(90, Math.round(area / 18000));
        case "bubbles":
          return Math.min(26, Math.round(area / 70000));
        case "rain":
          return Math.min(120, Math.round(area / 14000));
        case "stars":
          return Math.min(140, Math.round(area / 9000));
        case "ghosts":
          return Math.min(8, Math.max(3, Math.round(area / 180000)));
        case "bats":
          return Math.min(8, Math.max(3, Math.round(area / 160000)));
        case "skulls":
          return Math.min(18, Math.max(5, Math.round(area / 65000)));
        case "jack-o-lantern":
          return Math.min(16, Math.max(4, Math.round(area / 75000)));
        case "halloween":
          return Math.min(32, Math.max(12, Math.round(area / 45000)));
        case "cats":
          return Math.min(24, Math.max(10, Math.round(area / 55000)));
        case "moons":
          return Math.min(20, Math.max(8, Math.round(area / 75000)));
        default:
          return 0;
      }
    };

    // Jagged path used by lightning bolts and their branches
    const makePath = (x, y, length, jitter, step) => {
      const pts = [{ x, y }];
      let cx = x;
      let cy = y;
      while (cy - y < length) {
        cy += rand(step * 0.6, step * 1.4);
        cx += rand(-1, 1) * jitter;
        pts.push({ x: cx, y: cy });
      }
      return pts;
    };

    const createBolt = (life = 1) => {
      const jitter = Math.max(w * 0.035, 6);
      const step = Math.max(h * 0.07, 6);
      const x = rand(w * 0.15, w * 0.85);
      const main = makePath(x, 0, rand(h * 0.55, h * 0.95), jitter, step);
      const from = main[Math.floor(main.length / 2)];
      const branch = makePath(
        from.x,
        from.y,
        rand(h * 0.15, h * 0.35),
        jitter * 0.8,
        step * 0.8,
      );
      return { paths: [main, branch], life };
    };

    const createHalloweenItem = (initial = true) => {
      const types = [
        "ghost",
        "ghost",
        "bat",
        "bat",
        "rain",
        "rain",
        "rain",
        "pumpkin",
        "skull",
        "cat",
        "moons",
      ];

      const type = types[Math.floor(Math.random() * types.length)];
      const s = rand(18, 36) * sz;

      const item = {
        type,
        x: rand(0, w),
        y: rand(0, h),
        s,
        phase: rand(0, 360),
        rotation: rand(-0.15, 0.15),
        vr: rand(-0.001, 0.001),
        vx: rand(-0.35, 0.35) * speed,
        vy: rand(-0.35, 0.35) * speed,
        alpha: rand(0.4, 0.8),
      };

      if (type === "ghost") {
        item.vy = rand(0.15, 0.5) * speed;
        item.sway = rand(0.2, 0.6);
      }

      if (type === "bat") {
        const dir = Math.random() < 0.5 ? 1 : -1;

        item.x = initial ? rand(0, w) : dir === 1 ? -s * 3 : w + s * 3;

        item.vx = dir * rand(0.8, 2) * speed;
        item.flap = rand(0.25, 0.4);
      }

      if (type === "moon") {
        const phaseTypes = ["crescent", "half", "gibbous", "full"];

        item.phaseType = phaseTypes[Math.floor(rand(0, phaseTypes.length))];

        item.illumination = {
          crescent: rand(0.15, 0.3),
          half: 0.5,
          gibbous: rand(0.7, 0.88),
          full: 1,
        }[item.phaseType];

        item.waxing = Math.random() < 0.5;
        item.size = s * 0.5;
        item.glow = rand(5, 14);
      }

      // if (type === "rain") {
      //   item.len = rand(18, 38) * Math.max(scale, 0.7);
      //   item.vy = rand(7, 13) * speed;
      //   item.vx = rand(-1.8, -1.2) * speed;
      //   item.alpha = rand(0.65, 0.95);
      //   item.width = rand(1, 1.6);
      //   item.y = initial ? rand(0, h) : -item.len;
      // }
      if (type === "rain") {
        item.len = rand(18, 38) * Math.max(scale, 0.7);
        item.vy = rand(7, 13) * speed;
        item.vx = rand(-1.8, -1.2) * speed;
        item.alpha = rand(0.65, 0.95);
        item.width = rand(1, 1.6);
        item.y = initial ? rand(0, h) : -item.len;
      }

      return item;
    };

    const create = (initial) => {
      switch (style) {
        case "particles":
          return {
            x: rand(0, w),
            y: rand(0, h),
            vx: rand(-0.3, 0.3) * speed,
            vy: rand(-0.3, 0.3) * speed,
            r: rand(1, 2.2) * Math.max(scale, 0.6),
          };
        case "bubbles": {
          const r = rand(8, 44) * scale;
          return {
            x: rand(0, w),
            y: initial ? rand(0, h) : h + r + 2,
            r,
            vy: rand(0.2, 0.7) * speed,
            sway: rand(0.1, 0.4),
            phase: rand(0, 360),
          };
        }
        case "stars":
          return {
            x: rand(0, w),
            y: rand(0, h),
            r: rand(0.6, 1.8) * Math.max(scale, 0.6),
            phase: rand(0, 6.28),
            tw: rand(0.015, 0.05),
            sparkle: Math.random() < 0.18,
          };
        case "ghosts": {
          const s = rand(18, 38) * sz;
          return {
            x: rand(0, w),
            y: initial ? rand(0, h) : h + s * 2,
            s,
            vy: rand(0.15, 0.5) * speed,
            sway: rand(0.2, 0.6),
            phase: rand(0, 360),
          };
        }
        case "bats": {
          const s = rand(14, 26) * sz;
          const dir = Math.random() < 0.5 ? 1 : -1;
          return {
            x: initial ? rand(0, w) : dir === 1 ? -s * 3 : w + s * 3,
            y: rand(h * 0.1, h * 0.8),
            s,
            vx: dir * rand(0.8, 2) * speed,
            flap: rand(0.25, 0.4),
            phase: rand(0, 6.28),
          };
        }
        case "skulls": {
          const s = rand(20, 38) * sz;

          return {
            x: rand(0, w),
            y: rand(0, h),
            s,
            vx: rand(-0.3, 0.3) * speed,
            vy: rand(-0.35, 0.35) * speed,
            rotation: rand(-0.15, 0.15),
            vr: rand(-0.0015, 0.0015),
            phase: rand(0, 360),
            alpha: rand(0.35, 0.7),
          };
        }
        case "jack-o-lantern": {
          const s = rand(22, 38) * sz;

          return {
            x: rand(0, w),
            y: rand(0, h),
            s,
            vx: rand(-0.3, 0.3) * speed,
            vy: rand(-0.35, 0.35) * speed,
            rotation: rand(-0.12, 0.12),
            vr: rand(-0.0015, 0.0015),
            phase: rand(0, 360),
            alpha: rand(0.5, 0.85),
          };
        }
        case "halloween":
          return createHalloweenItem(initial);
        case "cats":
          return {
            x: rand(0, w),
            y: rand(0, h),
            // size: rand(13, 23) * scale,
            size: rand(18, 26) * Math.max(scale, 0.75),
            vx: rand(-0.35, 0.35) * speed,
            vy: rand(-0.25, 0.25) * speed,
            phase: rand(0, Math.PI * 2),
            tailPhase: rand(0, Math.PI * 2),
            rotation: rand(-0.12, 0.12),
            alpha: rand(0.7, 1),
            color: ["#F5B971", "#F2D6B3", "#B9B9C5", "#E8A0A0", "#FFFFFF"][
              Math.floor(rand(0, 5))
            ],
          };
        case "moons": {
          const phaseTypes = ["crescent", "half", "gibbous", "full"];

          const phase = phaseTypes[Math.floor(rand(0, phaseTypes.length))];

          const illumination = {
            crescent: rand(0.15, 0.3),
            half: 0.5,
            gibbous: rand(0.7, 0.88),
            full: 1,
          }[phase];

          return {
            x: rand(0, w),
            y: rand(0, h),
            size: rand(15, 29) * Math.max(scale, 0.75),
            vx: rand(-0.18, 0.18) * speed,
            vy: rand(-0.12, 0.12) * speed,
            phase,
            illumination,
            waxing: Math.random() < 0.5,
            rotation: rand(-0.15, 0.15),
            alpha: rand(0.55, 0.9),
            glow: rand(5, 14),
          };
        }
        default: {
          // rain
          const len = rand(12, 26) * Math.max(scale, 0.5);
          return {
            x: rand(0, w),
            y: initial ? rand(0, h) : -len,
            len,
            vy: rand(5, 11) * speed,
            vx: -1.2 * speed,
          };
        }
      }
    };

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      w = rect.width;
      h = rect.height;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      items = Array.from({ length: count() }, () => create(true));
      bolts = [];
      nextBolt = contained ? 20 : rand(60, 180);
    };

    const drawGhost = (g) => {
      const { x, y, s } = g;
      ctx.beginPath();
      ctx.moveTo(x - s, y);
      ctx.arc(x, y, s, Math.PI, 0);
      ctx.lineTo(x + s, y + s * 1.4);
      const seg = (2 * s) / 3;
      for (let i = 0; i < 3; i++) {
        const endX = x + s - (i + 1) * seg;
        const ctrlX = x + s - (i + 0.5) * seg;
        const ctrlY = y + s * 1.4 + (i % 2 === 0 ? s * 0.35 : -s * 0.35);
        ctx.quadraticCurveTo(ctrlX, ctrlY, endX, y + s * 1.4);
      }
      ctx.closePath();
      ctx.globalAlpha = a(0.1);
      ctx.fill();
      ctx.globalAlpha = a(0.4);
      ctx.lineWidth = contained ? 1 : 1.5;
      ctx.stroke();

      // eyes
      ctx.globalAlpha = a(0.7);
      ctx.beginPath();
      ctx.arc(x - s * 0.35, y - s * 0.1, s * 0.12, 0, Math.PI * 2);
      ctx.arc(x + s * 0.35, y - s * 0.1, s * 0.12, 0, Math.PI * 2);
      ctx.fill();
    };

    const drawBat = (b) => {
      const flap = Math.sin(frame * b.flap + b.phase); // -1 .. 1
      const s = b.s;

      ctx.save();
      ctx.translate(b.x, b.y);
      ctx.globalAlpha = a(0.5);

      [-1, 1].forEach((side) => {
        ctx.beginPath();
        ctx.moveTo(0, -s * 0.1);
        ctx.quadraticCurveTo(
          side * s * 0.5,
          -s * 0.6 - flap * s * 0.4,
          side * s,
          -flap * s * 0.5,
        );
        ctx.quadraticCurveTo(
          side * s * 0.75,
          s * 0.1 - flap * s * 0.2,
          side * s * 0.5,
          s * 0.15,
        );
        ctx.quadraticCurveTo(side * s * 0.3, 0, 0, s * 0.25);
        ctx.closePath();
        ctx.fill();
      });

      // body + ears
      ctx.beginPath();
      ctx.ellipse(0, s * 0.05, s * 0.12, s * 0.22, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(-s * 0.1, -s * 0.12);
      ctx.lineTo(-s * 0.07, -s * 0.34);
      ctx.lineTo(-s * 0.01, -s * 0.16);
      ctx.moveTo(s * 0.1, -s * 0.12);
      ctx.lineTo(s * 0.07, -s * 0.34);
      ctx.lineTo(s * 0.01, -s * 0.16);
      ctx.fill();

      ctx.restore();
    };

    const drawSkull = (skulls) => {
      const { s } = skulls;

      ctx.save();
      ctx.translate(skulls.x, skulls.y);
      ctx.rotate(skulls.rotation);

      ctx.globalAlpha = a(skulls.alpha);
      ctx.fillStyle = color;
      ctx.strokeStyle = color;

      // Main jagged skulls silhouette
      ctx.beginPath();
      ctx.moveTo(-s * 0.48, -s * 0.12);
      ctx.lineTo(-s * 0.46, -s * 0.42);
      ctx.lineTo(-s * 0.32, -s * 0.52);
      ctx.lineTo(-s * 0.22, -s * 0.43);
      ctx.lineTo(-s * 0.12, -s * 0.65);
      ctx.lineTo(0, -s * 0.48);
      ctx.lineTo(s * 0.12, -s * 0.65);
      ctx.lineTo(s * 0.22, -s * 0.43);
      ctx.lineTo(s * 0.34, -s * 0.52);
      ctx.lineTo(s * 0.46, -s * 0.35);
      ctx.lineTo(s * 0.48, -s * 0.05);
      ctx.lineTo(s * 0.4, s * 0.3);
      ctx.lineTo(s * 0.3, s * 0.4);
      ctx.lineTo(s * 0.24, s * 0.68);
      ctx.lineTo(s * 0.12, s * 0.55);
      ctx.lineTo(0, s * 0.72);
      ctx.lineTo(-s * 0.12, s * 0.55);
      ctx.lineTo(-s * 0.24, s * 0.68);
      ctx.lineTo(-s * 0.3, s * 0.4);
      ctx.lineTo(-s * 0.4, s * 0.3);
      ctx.closePath();

      ctx.fill();

      // Eye sockets
      ctx.globalCompositeOperation = "destination-out";
      ctx.beginPath();

      ctx.moveTo(-s * 0.4, -s * 0.12);
      ctx.lineTo(-s * 0.15, -s * 0.04);
      ctx.lineTo(-s * 0.19, s * 0.19);
      ctx.lineTo(-s * 0.39, s * 0.14);
      ctx.closePath();

      ctx.moveTo(s * 0.4, -s * 0.12);
      ctx.lineTo(s * 0.15, -s * 0.04);
      ctx.lineTo(s * 0.19, s * 0.19);
      ctx.lineTo(s * 0.39, s * 0.14);
      ctx.closePath();

      // Nose cavity
      ctx.moveTo(0, s * 0.12);
      ctx.lineTo(-s * 0.09, s * 0.3);
      ctx.lineTo(s * 0.09, s * 0.3);
      ctx.closePath();

      ctx.fill();

      // Restore accent color for teeth details
      ctx.globalCompositeOperation = "source-over";
      ctx.globalAlpha = a(skulls.alpha);
      ctx.strokeStyle = color;
      ctx.lineWidth = Math.max(0.8, s * 0.035);

      // Jaw and teeth
      ctx.beginPath();
      ctx.moveTo(-s * 0.3, s * 0.4);
      ctx.lineTo(-s * 0.25, s * 0.55);
      ctx.lineTo(-s * 0.12, s * 0.48);
      ctx.lineTo(0, s * 0.62);
      ctx.lineTo(s * 0.12, s * 0.48);
      ctx.lineTo(s * 0.25, s * 0.55);
      ctx.lineTo(s * 0.3, s * 0.4);

      ctx.stroke();

      for (let i = -2; i <= 2; i++) {
        ctx.beginPath();
        ctx.moveTo(i * s * 0.1, s * 0.46);
        ctx.lineTo(i * s * 0.1, s * 0.59);
        ctx.stroke();
      }

      ctx.restore();
    };

    const drawPumpkin = (p) => {
      const { s } = p;

      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rotation);

      ctx.globalAlpha = a(p.alpha);
      ctx.fillStyle = color;
      ctx.strokeStyle = color;

      // Stem
      ctx.beginPath();
      ctx.moveTo(-s * 0.12, -s * 0.38);
      ctx.lineTo(-s * 0.1, -s * 0.65);
      ctx.lineTo(s * 0.08, -s * 0.72);
      ctx.lineTo(s * 0.13, -s * 0.38);
      ctx.closePath();
      ctx.fill();

      // Pumpkin body
      ctx.beginPath();
      ctx.moveTo(0, -s * 0.42);

      ctx.bezierCurveTo(
        -s * 0.35,
        -s * 0.62,
        -s * 0.65,
        -s * 0.35,
        -s * 0.62,
        0,
      );

      ctx.bezierCurveTo(-s * 0.7, s * 0.42, -s * 0.25, s * 0.62, 0, s * 0.52);

      ctx.bezierCurveTo(s * 0.25, s * 0.62, s * 0.7, s * 0.42, s * 0.62, 0);

      ctx.bezierCurveTo(s * 0.65, -s * 0.35, s * 0.35, -s * 0.62, 0, -s * 0.42);

      ctx.closePath();
      ctx.fill();

      // Carved face
      ctx.globalCompositeOperation = "destination-out";

      // Left eye
      ctx.beginPath();
      ctx.moveTo(-s * 0.42, -s * 0.18);
      ctx.lineTo(-s * 0.12, -s * 0.12);
      ctx.lineTo(-s * 0.32, s * 0.08);
      ctx.closePath();

      // Right eye
      ctx.moveTo(s * 0.42, -s * 0.18);
      ctx.lineTo(s * 0.12, -s * 0.12);
      ctx.lineTo(s * 0.32, s * 0.08);
      ctx.closePath();

      // Nose
      ctx.moveTo(0, -s * 0.02);
      ctx.lineTo(-s * 0.09, s * 0.16);
      ctx.lineTo(s * 0.09, s * 0.16);
      ctx.closePath();

      // Jagged spooky smile
      ctx.moveTo(-s * 0.4, s * 0.2);
      ctx.lineTo(-s * 0.2, s * 0.26);
      ctx.lineTo(-s * 0.12, s * 0.18);
      ctx.lineTo(0, s * 0.32);
      ctx.lineTo(s * 0.12, s * 0.18);
      ctx.lineTo(s * 0.22, s * 0.27);
      ctx.lineTo(s * 0.4, s * 0.2);
      ctx.lineTo(s * 0.3, s * 0.42);
      ctx.lineTo(0, s * 0.38);
      ctx.lineTo(-s * 0.3, s * 0.42);
      ctx.closePath();

      ctx.fill();

      ctx.restore();
    };

    const drawCat = (cat) => {
      const { x, y, s } = cat;

      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(cat.rotation);

      ctx.fillStyle = color;
      ctx.globalAlpha = a(cat.alpha);

      // Body
      ctx.beginPath();
      ctx.ellipse(0, s * 0.12, s * 0.34, s * 0.2, 0, 0, Math.PI * 2);
      ctx.fill();

      // Head
      ctx.beginPath();
      ctx.arc(0, -s * 0.16, s * 0.2, 0, Math.PI * 2);
      ctx.fill();

      // Pointed ears
      ctx.beginPath();
      ctx.moveTo(-s * 0.16, -s * 0.27);
      ctx.lineTo(-s * 0.22, -s * 0.52);
      ctx.lineTo(-s * 0.02, -s * 0.35);

      ctx.moveTo(s * 0.16, -s * 0.27);
      ctx.lineTo(s * 0.22, -s * 0.52);
      ctx.lineTo(s * 0.02, -s * 0.35);
      ctx.fill();

      // Curved tail
      ctx.beginPath();
      ctx.lineWidth = Math.max(1.5, s * 0.1);
      ctx.lineCap = "round";
      ctx.moveTo(s * 0.25, s * 0.15);
      ctx.bezierCurveTo(
        s * 0.65,
        s * 0.12,
        s * 0.5,
        -s * 0.35,
        s * 0.7,
        -s * 0.4,
      );
      ctx.stroke();

      // Eyes
      ctx.globalCompositeOperation = "destination-out";
      ctx.beginPath();
      ctx.ellipse(
        -s * 0.075,
        -s * 0.17,
        s * 0.025,
        s * 0.06,
        0,
        0,
        Math.PI * 2,
      );
      ctx.ellipse(s * 0.075, -s * 0.17, s * 0.025, s * 0.06, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    };

    // const drawCuteCat = (ctx, item, time) => {
    //   const s = item.size;
    //   const tailWag = Math.sin(time * 0.002 + item.tailPhase) * 0.35;
    //   const blink = Math.sin(time * 0.0015 + item.phase) > 0.985;
    const drawCuteCat = (ctx, item, frame) => {
      const s = item.size;
      const tailWag = Math.sin(frame * 0.04 + item.tailPhase) * 0.35;
      const blink = Math.sin(frame * 0.025 + item.phase) > 0.985;

      ctx.save();
      ctx.translate(item.x, item.y);
      // ctx.rotate(item.rotation + Math.sin(time * 0.0008 + item.phase) * 0.04);
      ctx.rotate(item.rotation + Math.sin(frame * 0.016 + item.phase) * 0.04);

      ctx.globalAlpha = item.alpha;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";

      // Tail
      ctx.save();
      ctx.strokeStyle = item.color;
      ctx.lineWidth = s * 0.17;
      ctx.beginPath();
      ctx.moveTo(s * 0.48, s * 0.35);
      ctx.bezierCurveTo(
        s * 0.9,
        s * 0.2,
        s * 0.85,
        -s * 0.35 + tailWag * s,
        s * 0.55,
        -s * 0.48 + tailWag * s,
      );
      ctx.stroke();
      ctx.restore();

      // Ears
      ctx.fillStyle = item.color;

      ctx.beginPath();
      ctx.moveTo(-s * 0.48, -s * 0.2);
      ctx.lineTo(-s * 0.42, -s * 0.85);
      ctx.lineTo(-s * 0.02, -s * 0.52);
      ctx.closePath();
      ctx.fill();

      ctx.beginPath();
      ctx.moveTo(s * 0.48, -s * 0.2);
      ctx.lineTo(s * 0.42, -s * 0.85);
      ctx.lineTo(s * 0.02, -s * 0.52);
      ctx.closePath();
      ctx.fill();

      // Inner ears
      ctx.fillStyle = "#EFA6A6";

      ctx.beginPath();
      ctx.moveTo(-s * 0.39, -s * 0.37);
      ctx.lineTo(-s * 0.38, -s * 0.68);
      ctx.lineTo(-s * 0.18, -s * 0.49);
      ctx.closePath();
      ctx.fill();

      ctx.beginPath();
      ctx.moveTo(s * 0.39, -s * 0.37);
      ctx.lineTo(s * 0.38, -s * 0.68);
      ctx.lineTo(s * 0.18, -s * 0.49);
      ctx.closePath();
      ctx.fill();

      // Face
      ctx.fillStyle = item.color;
      ctx.beginPath();
      ctx.ellipse(0, 0, s * 0.58, s * 0.52, 0, 0, Math.PI * 2);
      ctx.fill();

      // Eyes
      ctx.fillStyle = "#35313A";

      [-1, 1].forEach((side) => {
        ctx.beginPath();

        if (blink) {
          ctx.lineWidth = s * 0.065;
          ctx.moveTo(side * s * 0.22 - s * 0.055, -s * 0.08);
          ctx.lineTo(side * s * 0.22 + s * 0.055, -s * 0.08);
          ctx.stroke();
        } else {
          ctx.ellipse(
            side * s * 0.22,
            -s * 0.08,
            s * 0.045,
            s * 0.075,
            0,
            0,
            Math.PI * 2,
          );
          ctx.fill();
        }
      });

      // Nose
      ctx.fillStyle = "#E98D9B";
      ctx.beginPath();
      ctx.moveTo(-s * 0.07, s * 0.08);
      ctx.lineTo(s * 0.07, s * 0.08);
      ctx.lineTo(0, s * 0.16);
      ctx.closePath();
      ctx.fill();

      // Mouth
      ctx.strokeStyle = "#65535A";
      ctx.lineWidth = s * 0.025;

      ctx.beginPath();
      ctx.moveTo(0, s * 0.16);
      ctx.lineTo(0, s * 0.22);
      ctx.moveTo(0, s * 0.22);
      ctx.quadraticCurveTo(-s * 0.1, s * 0.3, -s * 0.15, s * 0.22);
      ctx.moveTo(0, s * 0.22);
      ctx.quadraticCurveTo(s * 0.1, s * 0.3, s * 0.15, s * 0.22);
      ctx.stroke();

      // Whiskers
      ctx.lineWidth = s * 0.018;
      ctx.strokeStyle = "#8D7D7D";

      [-1, 1].forEach((side) => {
        for (let i = 0; i < 2; i++) {
          ctx.beginPath();
          ctx.moveTo(side * s * 0.32, s * (0.12 + i * 0.09));
          ctx.lineTo(side * s * 0.65, s * (0.08 + i * 0.16));
          ctx.stroke();
        }
      });

      // Cheeks
      ctx.fillStyle = "rgba(239, 140, 155, 0.45)";

      [-1, 1].forEach((side) => {
        ctx.beginPath();
        ctx.arc(side * s * 0.34, s * 0.18, s * 0.075, 0, Math.PI * 2);
        ctx.fill();
      });

      ctx.restore();
    };

    const drawMoon = (moon) => {
      const { x, y } = moon;
      const s = moon.size ?? moon.s;

      if (!s) return;

      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(moon.rotation ?? 0);

      ctx.globalAlpha = a(moon.alpha ?? 0.8);
      ctx.fillStyle = color;

      // Main crescent
      ctx.beginPath();
      ctx.arc(0, 0, s * 0.5, 0, Math.PI * 2);
      ctx.fill();

      // Inner cutout
      ctx.globalCompositeOperation = "destination-out";

      ctx.beginPath();
      ctx.arc(s * 0.24, -s * 0.17, s * 0.43, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    };

    const draw = (animate) => {
      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = color;
      ctx.strokeStyle = color;

      if (style === "particles") {
        const link = contained ? 45 : 130;

        items.forEach((p) => {
          if (animate) {
            p.x += p.vx;
            p.y += p.vy;
            if (p.x < 0 || p.x > w) p.vx *= -1;
            if (p.y < 0 || p.y > h) p.vy *= -1;
          }
          ctx.globalAlpha = a(0.7);
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
          ctx.fill();
        });

        ctx.lineWidth = 1;
        for (let i = 0; i < items.length; i++) {
          for (let j = i + 1; j < items.length; j++) {
            const dx = items[i].x - items[j].x;
            const dy = items[i].y - items[j].y;
            const d = Math.hypot(dx, dy);
            if (d < link) {
              ctx.globalAlpha = a((1 - d / link) * 0.25);
              ctx.beginPath();
              ctx.moveTo(items[i].x, items[i].y);
              ctx.lineTo(items[j].x, items[j].y);
              ctx.stroke();
            }
          }
        }
      } else if (style === "bubbles") {
        items.forEach((b, i) => {
          if (animate) {
            b.y -= b.vy;
            b.x += Math.sin((frame + b.phase) / 60) * b.sway;
            if (b.y + b.r < 0) items[i] = create(false);
          }
          ctx.lineWidth = contained ? 1 : 1.5;
          ctx.globalAlpha = a(0.08);
          ctx.beginPath();
          ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
          ctx.fill();
          ctx.globalAlpha = a(0.35);
          ctx.stroke();
        });
      } else if (style === "stars") {
        items.forEach((st) => {
          const tw = 0.5 + 0.5 * Math.sin(frame * st.tw + st.phase);
          ctx.globalAlpha = a(0.25 + 0.6 * tw);
          ctx.beginPath();
          ctx.arc(st.x, st.y, st.r, 0, Math.PI * 2);
          ctx.fill();

          if (st.sparkle) {
            const l = st.r * (3 + tw * 2);
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(st.x - l, st.y);
            ctx.lineTo(st.x + l, st.y);
            ctx.moveTo(st.x, st.y - l);
            ctx.lineTo(st.x, st.y + l);
            ctx.stroke();
          }
        });

        // occasional shooting star
        if (
          animate &&
          !shooting &&
          Math.random() < (contained ? 0.004 : 0.003)
        ) {
          shooting = {
            x: rand(w * 0.2, w),
            y: rand(0, h * 0.4),
            vx: -rand(5, 8) * speed,
            vy: rand(2.5, 4) * speed,
            life: 1,
          };
        }
        if (shooting) {
          const sh = shooting;
          if (animate) {
            sh.x += sh.vx;
            sh.y += sh.vy;
            sh.life -= 0.02;
          }
          ctx.lineWidth = contained ? 1 : 1.5;
          ctx.globalAlpha = a(Math.max(sh.life, 0) * 0.7);
          ctx.beginPath();
          ctx.moveTo(sh.x, sh.y);
          ctx.lineTo(sh.x - sh.vx * 6, sh.y - sh.vy * 6);
          ctx.stroke();
          if (sh.life <= 0) shooting = null;
        }
      } else if (style === "lightning") {
        if (animate) {
          nextBolt -= 1;
          if (nextBolt <= 0) {
            bolts.push(createBolt());
            nextBolt = contained ? rand(50, 100) : rand(120, 380);
          }
        } else if (bolts.length === 0) {
          bolts.push(createBolt(0.7)); // reduced motion: one still bolt
        }

        bolts.forEach((bolt) => {
          const strong = animate && frame % 4 < 2 ? 1 : 0.75; // flicker

          // faint flash over the whole area
          ctx.globalAlpha = a(bolt.life * 0.06);
          ctx.fillRect(0, 0, w, h);

          ctx.lineJoin = "round";
          ctx.shadowColor = color;
          ctx.shadowBlur = contained ? 4 : 14;
          bolt.paths.forEach((pts, idx) => {
            ctx.lineWidth = (idx === 0 ? 2.2 : 1.2) * Math.max(scale, 0.6);
            ctx.globalAlpha = a(bolt.life * 0.9 * strong);
            ctx.beginPath();
            ctx.moveTo(pts[0].x, pts[0].y);
            for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
            ctx.stroke();
          });
          ctx.shadowBlur = 0;

          if (animate) bolt.life -= 0.035;
        });
        if (animate) bolts = bolts.filter((b) => b.life > 0);
      } else if (style === "ghosts") {
        items.forEach((g, i) => {
          if (animate) {
            g.y -= g.vy;
            g.x += Math.sin((frame + g.phase) / 50) * g.sway;
            if (g.y + g.s * 1.8 < 0) items[i] = create(false);
          }
          drawGhost(g);
        });
      } else if (style === "bats") {
        items.forEach((b, i) => {
          if (animate) {
            b.x += b.vx;
            b.y += Math.sin((frame + b.phase * 10) / 30) * 0.5;
            if (b.x < -b.s * 4 || b.x > w + b.s * 4) items[i] = create(false);
          }
          drawBat(b);
        });
      } else if (style === "rain") {
        ctx.lineWidth = 1;
        ctx.globalAlpha = a(0.35);

        items.forEach((d, i) => {
          if (animate) {
            d.y += d.vy;
            d.x += d.vx;

            if (d.y > h) items[i] = create(false);
          }

          ctx.beginPath();
          ctx.moveTo(d.x, d.y);
          ctx.lineTo(d.x + d.vx * 2, d.y + d.len);
          ctx.stroke();
        });
      } else if (style === "skulls") {
        items.forEach((skulls) => {
          if (animate) {
            skulls.x += skulls.vx;
            skulls.y += skulls.vy;
            skulls.rotation += skulls.vr;

            skulls.y += Math.sin((frame + skulls.phase) / 50) * 0.12;

            if (skulls.x < -skulls.s) skulls.x = w + skulls.s;
            if (skulls.x > w + skulls.s) skulls.x = -skulls.s;

            if (skulls.y < -skulls.s) skulls.y = h + skulls.s;
            if (skulls.y > h + skulls.s) skulls.y = -skulls.s;
          }

          drawSkull(skulls);
        });
      } else if (style === "jack-o-lantern") {
        items.forEach((p) => {
          if (animate) {
            p.x += p.vx;
            p.y += p.vy;

            p.rotation += p.vr;

            p.y += Math.sin((frame + p.phase) / 50) * 0.12;

            if (p.x < -p.s) p.x = w + p.s;
            if (p.x > w + p.s) p.x = -p.s;

            if (p.y < -p.s) p.y = h + p.s;
            if (p.y > h + p.s) p.y = -p.s;
          }

          drawPumpkin(p);
        });
      } else if (style === "halloween") {
        items.forEach((item, i) => {
          if (animate) {
            item.rotation += item.vr;

            switch (item.type) {
              case "ghost":
                item.y -= item.vy;
                item.x += Math.sin((frame + item.phase) / 50) * item.sway;

                if (item.y + item.s * 1.8 < 0) {
                  items[i] = createHalloweenItem(false);
                }
                break;

              case "bat":
                item.x += item.vx;
                item.y += Math.sin((frame + item.phase * 10) / 30) * 0.5;

                if (item.x < -item.s * 4 || item.x > w + item.s * 4) {
                  items[i] = createHalloweenItem(false);
                }
                break;

              case "rain":
                item.y += item.vy;
                item.x += item.vx;

                if (item.y > h) {
                  items[i] = createHalloweenItem(false);
                }
                break;

              default:
                item.x += item.vx;
                item.y += item.vy;

                if (item.x < -item.s) item.x = w + item.s;
                if (item.x > w + item.s) item.x = -item.s;
                if (item.y < -item.s) item.y = h + item.s;
                if (item.y > h + item.s) item.y = -item.s;
            }
          }

          switch (item.type) {
            case "ghost":
              drawGhost(item);
              break;

            case "bat":
              drawBat(item);
              break;

            case "rain":
              // ctx.globalAlpha = a(0.35);
              ctx.globalAlpha = a(0.75);
              // ctx.lineWidth = 1;
              ctx.lineWidth = contained ? 1.2 : 1.5;
              ctx.beginPath();
              ctx.moveTo(item.x, item.y);
              ctx.lineTo(item.x + item.vx * 2, item.y + item.len);
              ctx.stroke();
              break;

            case "pumpkin":
              drawPumpkin(item);
              break;

            case "skull":
              drawSkull(item);
              break;

            case "cat":
              drawCat(item);
              break;

            case "moon":
              drawMoon(item, frame);
              break;
          }
        });

        // Occasional lightning
        if (animate) {
          nextBolt--;

          if (nextBolt <= 0) {
            bolts.push(createBolt());
            nextBolt = rand(180, 360);
          }
        } else if (bolts.length === 0) {
          bolts.push(createBolt(0.7));
        }

        bolts.forEach((bolt) => {
          ctx.globalAlpha = a(bolt.life * 0.9);
          ctx.shadowColor = color;
          ctx.shadowBlur = contained ? 4 : 12;
          ctx.lineJoin = "round";

          bolt.paths.forEach((pts, idx) => {
            ctx.lineWidth = idx === 0 ? 2 : 1.2;
            ctx.beginPath();
            ctx.moveTo(pts[0].x, pts[0].y);

            for (let i = 1; i < pts.length; i++) {
              ctx.lineTo(pts[i].x, pts[i].y);
            }

            ctx.stroke();
          });

          ctx.shadowBlur = 0;

          if (animate) bolt.life -= 0.035;
        });

        if (animate) {
          bolts = bolts.filter((bolt) => bolt.life > 0);
        }
      } else if (style === "cats") {
        items.forEach((item) => {
          if (animate) {
            item.x += item.vx;
            item.y += item.vy;

            item.x += Math.sin(frame * 0.07 + item.phase) * 0.12;

            if (item.x < -40) item.x = w + 40;
            if (item.x > w + 40) item.x = -40;
            if (item.y < -40) item.y = h + 40;
            if (item.y > h + 40) item.y = -40;
          }

          drawCuteCat(ctx, item, frame);
        });
      } else if (style === "moons") {
        items.forEach((item) => {
          if (animate) {
            item.x += item.vx;
            item.y += item.vy;

            if (item.x < -50) item.x = w + 50;
            if (item.x > w + 50) item.x = -50;
            if (item.y < -50) item.y = h + 50;
            if (item.y > h + 50) item.y = -50;
          }

          drawMoon(item, frame);
        });
      }

      ctx.globalAlpha = 1;
    };

    const loop = () => {
      frame += 1;
      if (frame % 90 === 1) refreshTheme(); // picks up theme/accent changes
      draw(!reduceMotion);
      if (!reduceMotion) raf = requestAnimationFrame(loop);
    };

    refreshTheme();
    resize();
    loop();

    const observer = new ResizeObserver(() => {
      resize();
      if (reduceMotion) draw(false);
    });
    observer.observe(canvas);

    return () => {
      cancelAnimationFrame(raf);
      observer.disconnect();
      probe.remove();
    };
  }, [style, contained]);

  const canvas =
    style === "none" ? null : (
      <canvas
        ref={canvasRef}
        aria-hidden="true"
        className={
          contained
            ? "absolute inset-0 w-full h-full"
            : "fixed inset-0 w-full h-full pointer-events-none z-0"
        }
      />
    );

  //   if (contained) {
  //     return <div className="absolute inset-0 bg-slate-900">{canvas}</div>;
  //   }
  if (contained) {
    return (
      <div className="absolute inset-0 bg-neutral-100 dark:bg-neutral-900 transition-colors">
        {canvas}
      </div>
    );
  }

  return canvas;
}
