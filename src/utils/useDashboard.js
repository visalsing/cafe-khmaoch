import { useCallback, useEffect, useRef, useState } from "react";
import { dashboardService } from "../services/api";

const POLL_MS = 20000;

// one request for the whole page; refreshes by itself while the tab is visible
export function useDashboard(range = 7) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const ticket = useRef(0); // only the newest answer is used

  const load = useCallback(
    async ({ silent = false, manual = false } = {}) => {
      const mine = ++ticket.current;
      if (manual) setRefreshing(true);
      else if (!silent) setLoading(true);
      try {
        const result = await dashboardService.get(range);
        if (mine !== ticket.current) return;
        setData(result);
        setError("");
      } catch (err) {
        if (mine !== ticket.current) return;
        setError(err.message || "Could not load the dashboard.");
      } finally {
        if (mine === ticket.current) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    },
    [range],
  );

  useEffect(() => {
    load();
    const id = setInterval(() => {
      if (!document.hidden) load({ silent: true });
    }, POLL_MS);
    const onVisible = () => {
      if (!document.hidden) load({ silent: true });
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [load]);

  return {
    data,
    loading,
    refreshing,
    error,
    reload: () => load({ manual: true }),
    silentReload: () => load({ silent: true }),
  };
}