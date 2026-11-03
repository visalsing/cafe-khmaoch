import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { nameOrderService } from "../services/api";

/* One place that decides how a person's name is written, for EVERY page.
   - "firstLast" = Sok Dara      - "lastFirst" = Dara Sok (the family name first)
   - the Latin name and the native name each have their own order
   The value lives in the database (store_settings), so all admins, staff and devices see the same.
   A copy is kept in this browser only so the first paint is right while the server answers. */

const CACHE_KEY = "name_order_v1";

export const NAME_ORDER_CHOICES = [
  { value: "firstLast", label: "First + Last" },
  { value: "lastFirst", label: "Last + First" },
];
const DEFAULT_ORDER = { latin: "lastFirst", native: "lastFirst" };
const isValid = (v) => NAME_ORDER_CHOICES.some((c) => c.value === v);

// anything -> two valid choices
const sanitize = (d) => ({
  latin: isValid(d?.latin) ? d.latin : DEFAULT_ORDER.latin,
  native: isValid(d?.native) ? d.native : DEFAULT_ORDER.native,
});

function readCache() {
  try {
    return sanitize(JSON.parse(localStorage.getItem(CACHE_KEY) || "null"));
  } catch {
    return DEFAULT_ORDER;
  }
}
function writeCache(order) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(order));
  } catch {
    /* private mode: no cache, the server value is still used */
  }
}

// first value found among several key spellings (camelCase from the page, snake_case from the API)
const pick = (o, ...keys) => {
  for (const k of keys)
    if (o?.[k] !== undefined && o?.[k] !== null) return o[k];
  return undefined;
};

export function joinName(first, last, order) {
  const a = String(first ?? "").trim();
  const b = String(last ?? "").trim();
  return (order === "firstLast" ? `${a} ${b}` : `${b} ${a}`).trim();
}

// plain functions, usable anywhere (also outside React)
export function formatFullName(u, order = DEFAULT_ORDER.latin) {
  if (!u) return "";
  return joinName(
    pick(u, "firstName", "first_name"),
    pick(u, "lastName", "last_name"),
    order,
  );
}
export function formatNativeName(u, order = DEFAULT_ORDER.native) {
  if (!u) return "";
  return joinName(
    pick(u, "firstNameNative", "first_name_native"),
    pick(u, "lastNameNative", "last_name_native"),
    order,
  );
}

const NameOrderContext = createContext(null);

export function NameOrderProvider({ children }) {
  const [order, setOrderState] = useState(readCache);
  const orderRef = useRef(order);
  orderRef.current = order;

  // load the saved value from the database (a failed read just keeps the cached / default one)
  useEffect(() => {
    let cancelled = false;
    nameOrderService
      .get()
      .then((data) => {
        if (cancelled) return;
        const next = sanitize(data);
        setOrderState(next);
        writeCache(next);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  // another tab of this browser changed the cached copy: follow it
  useEffect(() => {
    const onStorage = (e) => {
      if (e.key === CACHE_KEY) setOrderState(readCache());
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  // key = "latin" | "native", value = "firstLast" | "lastFirst"
  // Changes the screen at once, then saves. Resolves { ok: true } or { ok: false, error }.
  // Only admins can save: for anyone else the change is undone and the error says why.
  const setOrder = useCallback(async (key, value) => {
    if (!isValid(value) || (key !== "latin" && key !== "native"))
      return { ok: false, error: "That choice is not valid." };

    const previous = orderRef.current;
    const optimistic = { ...previous, [key]: value };
    setOrderState(optimistic);
    writeCache(optimistic);

    try {
      const saved = sanitize(await nameOrderService.save({ [key]: value }));
      setOrderState(saved);
      writeCache(saved);
      return { ok: true };
    } catch (err) {
      setOrderState(previous);
      writeCache(previous);
      return { ok: false, error: err.message || "Could not save the name order." };
    }
  }, []);

  const value = useMemo(
    () => ({
      order,
      setOrder,
      fullName: (u) => formatFullName(u, order.latin),
      nativeName: (u) => formatNativeName(u, order.native),
    }),
    [order, setOrder],
  );

  return (
    <NameOrderContext.Provider value={value}>
      {children}
    </NameOrderContext.Provider>
  );
}

// used when a page is rendered outside the provider: the default order, nothing breaks
const FALLBACK = {
  order: DEFAULT_ORDER,
  setOrder: async () => ({ ok: false, error: "Name order is not available here." }),
  fullName: (u) => formatFullName(u, DEFAULT_ORDER.latin),
  nativeName: (u) => formatNativeName(u, DEFAULT_ORDER.native),
};

export function useNameOrder() {
  return useContext(NameOrderContext) ?? FALLBACK;
}