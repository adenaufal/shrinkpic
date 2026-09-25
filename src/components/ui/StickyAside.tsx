import React, { useEffect, useRef, useState } from 'react';

/** Matches `lg:top-20` below, plus a little breathing room at the bottom. */
const TOP_OFFSET_PX = 80;
const BOTTOM_GAP_PX = 16;

interface StickyAsideProps {
  children: React.ReactNode;
  className?: string;
  'aria-label': string;
}

/**
 * A sidebar that follows the page while a long queue scrolls — but only
 * while all of it fits on screen. A sticky element taller than the viewport
 * hides its own bottom edge until the page ends, which is exactly where the
 * sidebar's settings disclosure opens. So its height is measured (it
 * changes as the disclosure opens and results arrive) against the window,
 * and it falls back to scrolling with the page when it does not fit.
 */
export const StickyAside: React.FC<StickyAsideProps> = ({ children, className = '', ...rest }) => {
  const ref = useRef<HTMLElement>(null);
  const [fits, setFits] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    const check = () =>
      setFits(node.offsetHeight + TOP_OFFSET_PX + BOTTOM_GAP_PX <= window.innerHeight);
    check();

    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(check);
    observer?.observe(node);
    window.addEventListener('resize', check);
    return () => {
      observer?.disconnect();
      window.removeEventListener('resize', check);
    };
  }, []);

  return (
    <aside ref={ref} className={`${fits ? 'lg:sticky lg:top-20' : ''} ${className}`} {...rest}>
      {children}
    </aside>
  );
};
