import { useEffect, useState } from "react";
import { orderService } from "../../services/api";

export function useOrders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = () => orderService.list().then(setOrders).finally(() => setLoading(false));
    load();
    // a new online order placed in another tab shows up here
    const onStorage = (e) => e.key === "bb_orders_v1" && load();
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  return { orders, loading };
}