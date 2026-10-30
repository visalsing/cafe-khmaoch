
import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";

const PageLoadingContext = createContext(null);

export function PageLoadingProvider({ children }) {
  const [pending, setPending] = useState(new Set());

  const registerLoading = useCallback((key) => {
    setPending((previous) => new Set(previous).add(key));
  }, []);

  const finishLoading = useCallback((key) => {
    setPending((previous) => {
      const next = new Set(previous);
      next.delete(key);
      return next;
    });
  }, []);

  const value = useMemo(
    () => ({
      isPageLoading: pending.size > 0,
      registerLoading,
      finishLoading,
    }),
    [pending, registerLoading, finishLoading]
  );

  return (
    <PageLoadingContext.Provider value={value}>
      {children}
    </PageLoadingContext.Provider>
  );
}

export function usePageLoading() {
  const context = useContext(PageLoadingContext);

  if (!context) {
    throw new Error(
      "usePageLoading must be used inside PageLoadingProvider"
    );
  }

  return context;
}
