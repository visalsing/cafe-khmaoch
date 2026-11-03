import { useEffect, useState } from "react";
import { aboutService } from "../services/api";

let cache = null; // the last answer: showing it first avoids a flash when you come back to the page

export const clearAboutCache = () => {
  cache = null;
};

export default function useAboutPage() {
  const [state, setState] = useState({ data: cache, loading: !cache, failed: false });

  useEffect(() => {
    let alive = true;
    aboutService
      .get()
      .then((data) => {
        cache = data;
        if (alive) setState({ data, loading: false, failed: false });
      })
      .catch(() => {
        // on a failure the page falls back to its built-in text
        if (alive) setState((s) => ({ ...s, loading: false, failed: !s.data }));
      });
    return () => {
      alive = false;
    };
  }, []);

  return state;
}