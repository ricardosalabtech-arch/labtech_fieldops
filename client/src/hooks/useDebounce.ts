import { useEffect, useState } from "react";

/**
 * Returns a debounced copy of the given value that only updates
 * after the specified delay has elapsed without further changes.
 */
export function useDebounce<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debounced;
}
