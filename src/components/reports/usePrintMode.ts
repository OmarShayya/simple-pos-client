import { useCallback, useEffect, useState } from "react";
import { flushSync } from "react-dom";

/**
 * Print support without html2pdf: while the browser prints (our Print button or Ctrl+P) the report
 * renders with the light theme on white paper, and the app shell + buttons are hidden by print CSS.
 */
export function usePrintMode() {
  const [printing, setPrinting] = useState(false);
  useEffect(() => {
    // flushSync so the light theme is on screen before the browser takes its print snapshot
    const before = () => flushSync(() => setPrinting(true));
    const after = () => setPrinting(false);
    window.addEventListener("beforeprint", before);
    window.addEventListener("afterprint", after);
    return () => {
      window.removeEventListener("beforeprint", before);
      window.removeEventListener("afterprint", after);
    };
  }, []);
  const print = useCallback(() => {
    flushSync(() => setPrinting(true));
    // Give the charts one frame to re-measure at paper width
    window.requestAnimationFrame(() => window.setTimeout(() => window.print(), 50));
  }, []);
  return { printing, print };
}
