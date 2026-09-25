import { useEffect, useRef, useState } from 'react';

/**
 * Tracks whether an element is on screen. `inView` follows the element in
 * and out (used to pause looping illustrations nobody can see); `seen` latches
 * on first sight (used for one-shot reveal animations).
 */
export function useInView<T extends Element>(rootMargin = '0px') {
  const ref = useRef<T>(null);
  const [inView, setInView] = useState(false);
  const [seen, setSeen] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    // No observer (old WebViews, jsdom): treat everything as visible rather
    // than leave content paused or hidden forever.
    if (typeof IntersectionObserver === 'undefined') {
      setInView(true);
      setSeen(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        setInView(entry.isIntersecting);
        if (entry.isIntersecting) setSeen(true);
      },
      { rootMargin }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [rootMargin]);

  return { ref, inView, seen };
}
