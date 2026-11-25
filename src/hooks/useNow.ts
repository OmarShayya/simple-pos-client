import { useEffect, useState } from "react";

/**
 * The current time (ms), re-rendering every `intervalMs` while `enabled`. Use it for live clocks
 * (running session timers and costs) instead of a page-wide "force update" interval.
 */
export function useNow(intervalMs = 1000, enabled = true): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!enabled) return;
    setNow(Date.now());
    const id = window.setInterval(() => setNow(Date.now()), intervalMs);
    return () => window.clearInterval(id);
  }, [intervalMs, enabled]);
  return now;
}

export default useNow;
