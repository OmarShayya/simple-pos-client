import { useEffect, useState } from "react";

/** The value, updated only after it stopped changing for `delay` ms (search boxes, filters). */
export function useDebouncedValue<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = window.setTimeout(() => setDebounced(value), delay);
    return () => window.clearTimeout(id);
  }, [value, delay]);
  return debounced;
}

export default useDebouncedValue;
