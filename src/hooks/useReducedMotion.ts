import { useEffect, useState } from 'react';

const QUERY = '(prefers-reduced-motion: reduce)';

const matches = (): boolean => {
  try {
    return window.matchMedia(QUERY).matches;
  } catch {
    // matchMedia is missing in jsdom and some very old WebViews.
    return false;
  }
};

/**
 * Live view of the OS "reduce motion" setting. CSS animations are already
 * neutralised by the media query in index.css; this hook is for the motion
 * that JavaScript drives (count-ups, the pixel burst), which CSS cannot reach.
 */
export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(matches);

  useEffect(() => {
    let query: MediaQueryList;
    try {
      query = window.matchMedia(QUERY);
    } catch {
      return;
    }
    const onChange = () => setReduced(query.matches);
    query.addEventListener?.('change', onChange);
    return () => query.removeEventListener?.('change', onChange);
  }, []);

  return reduced;
}
