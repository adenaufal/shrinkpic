import { useEffect, useRef, useState } from 'react';
import { useReducedMotion } from './useReducedMotion';

const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

/**
 * Tweens a number towards `target` whenever it changes, starting from the
 * value currently on screen — so a figure that moves from 40% to 55% counts
 * up from 40, not from zero. Jumps straight to the target under reduced motion.
 */
export function useCountUp(target: number, duration = 800): number {
  const reduced = useReducedMotion();
  const [value, setValue] = useState(() => (reduced ? target : 0));

  // The on-screen value, read by the effect below without making it a
  // dependency (which would restart the tween on every frame).
  const valueRef = useRef(value);
  useEffect(() => {
    valueRef.current = value;
  });

  useEffect(() => {
    if (reduced) {
      setValue(target);
      return;
    }

    const from = valueRef.current;
    if (from === target) return;

    let frame = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const progress = Math.min(1, (now - start) / duration);
      setValue(from + (target - from) * easeOutCubic(progress));
      if (progress < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target, duration, reduced]);

  return value;
}
