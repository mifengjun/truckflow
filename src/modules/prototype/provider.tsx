"use client";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  createInitialState,
  type PrototypeState,
  type InquiryDraft,
} from "./model";
import { loadState, STORAGE_KEY } from "./storage";
import type { Scenario } from "./mock-adapter";
type Context = {
  state: PrototypeState;
  setState: (fn: (s: PrototypeState) => PrototypeState) => PrototypeState;
  updateDraft: (draft: InquiryDraft) => void;
  scenario: Scenario;
  setScenario: (s: Scenario) => void;
  reset: () => void;
  storageError: boolean;
};
const PrototypeContext = createContext<Context | null>(null);
export function PrototypeProvider({ children }: { children: ReactNode }) {
  const [state, renderState] = useState(createInitialState);
  const currentState = useRef(state);
  const setState = useCallback(
    (change: (s: PrototypeState) => PrototypeState) => {
      const next = change(currentState.current);
      currentState.current = next;
      renderState(next);
      return next;
    },
    [],
  );
  const [ready, setReady] = useState(false);
  const [storageError, setStorageError] = useState(false);
  const [scenario, setScenario] = useState<Scenario>("default");
  const [client] = useState(() => new QueryClient());
  const skipWrite = useRef(true);
  // These effects hydrate and report failures from browser-only persistence.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    try {
      // Hydrate once after mount: the server cannot access this external store.
      setState(() => loadState(localStorage.getItem(STORAGE_KEY)));
    } catch {
      setStorageError(true);
    }
    setReady(true);
  }, [setState]);
  useEffect(() => {
    if (!ready) return;
    if (skipWrite.current) {
      skipWrite.current = false;
      return;
    }
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // Reflect a browser storage exception in the persistent warning.
      setStorageError(true);
    }
  }, [state, ready]);
  /* eslint-enable react-hooks/set-state-in-effect */
  const updateDraft = useCallback(
    (draft: InquiryDraft) => {
      setState((s) => ({
        ...s,
        draft: { ...draft, revision: s.draft.revision + 1 },
      }));
    },
    [setState],
  );
  function reset() {
    setState(createInitialState);
    setScenario("default");
    client.clear();
  }
  if (!ready)
    return (
      <div className="boot" role="status">
        正在恢复示例工作区…
      </div>
    );
  return (
    <QueryClientProvider client={client}>
      <PrototypeContext
        value={{
          state,
          setState,
          updateDraft,
          scenario,
          setScenario,
          reset,
          storageError,
        }}
      >
        {children}
      </PrototypeContext>
    </QueryClientProvider>
  );
}
export function usePrototype() {
  const context = useContext(PrototypeContext);
  if (!context) throw new Error("PrototypeProvider missing");
  return context;
}
