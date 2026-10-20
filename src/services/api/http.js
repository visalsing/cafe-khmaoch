// If VITE_API_URL is NOT set, API_BASE is "" and requests go to "/api/..."
// on the same domain (Vite proxy locally, vercel.json rewrite online).
export const API_BASE = (import.meta.env.VITE_API_URL || "").replace(/\/+$/, "");

// the one function every service uses to talk to the backend
export async function http(path, { method = "GET", body } = {}) {
  const isForm = typeof FormData !== "undefined" && body instanceof FormData;
  let res;
  try {
    res = await fetch(`${API_BASE}/api${path}`, {
      method,
      credentials: "include",
      headers: body && !isForm ? { "Content-Type": "application/json" } : undefined,
      body: body ? (isForm ? body : JSON.stringify(body)) : undefined,
    });
  } catch {
    const err = new Error("Cannot reach the server. Please try again.");
    err.status = 0;
    throw err;
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.error || `Request failed (HTTP ${res.status}).`);
    err.status = res.status;
    throw err;
  }
  return data;
}

// "/api/uploads/images/x.webp" -> full URL (also works when the API is on another domain)
export const assetUrl = (p) => (p && p.startsWith("/") ? `${API_BASE}${p}` : p || "");