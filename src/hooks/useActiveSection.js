import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";

// the home-page sections that have a link in the menus (the order here does not matter)
export const HOME_SECTIONS = ["hero", "shop", "about", "contact"];

export default function useActiveSection(ids = HOME_SECTIONS) {
  const { pathname } = useLocation();
  const [active, setActive] = useState(ids[0]);
  const key = ids.join(","); // a new array with the same ids must not restart the effect

  useEffect(() => {
    if (pathname !== "/") return undefined;
    const list = key.split(",");

    const update = () => {
      // only the sections that exist right now, sorted by their real position
      const found = list
        .map((id) => {
          const el = document.getElementById(id);
          return el ? { id, top: el.getBoundingClientRect().top + window.scrollY } : null;
        })
        .filter(Boolean)
        .sort((a, b) => a.top - b.top);
      if (!found.length) return;

      // at the very bottom the page cannot scroll further, so the LAST section wins
      const atBottom = window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 5;
      if (atBottom) return setActive(found[found.length - 1].id);

      // ← changed: a section becomes active when its top passes a line about 1/3 down the screen
      const line = window.scrollY + Math.max(120, window.innerHeight * 0.35);
      let current = found[0].id;
      for (const section of found) if (section.top <= line) current = section.id;
      setActive(current);
    };

    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    // sections that load later (the contact map comes from the API) change the page height
    const observer = typeof ResizeObserver !== "undefined" ? new ResizeObserver(update) : null;
    observer?.observe(document.body);
    update();

    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
      observer?.disconnect();
    };
  }, [pathname, key]);

  return active;
}