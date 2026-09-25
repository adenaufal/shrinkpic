import React, { useEffect, useMemo, useState } from 'react';
import { useReducedMotion } from '../../hooks/useReducedMotion';

type PieceStyle = React.CSSProperties & Record<'--dx' | '--dy' | '--rot', string>;

const COLORS = ['#3B82F6', '#8B5CF6', '#60A5FA', '#A78BFA', '#F472B6', '#FBBF24', '#34D399'];
const PIECES = 26;
const LIFETIME_MS = 1400;

interface PixelBurstProps {
  /** Bump this number to fire a burst. 0 never fires. */
  trigger: number;
}

/**
 * Square "pixel" confetti that bursts from the centre of its positioned
 * parent — played when a batch finishes. Skipped entirely under reduced
 * motion. The pieces unmount once the animation is over.
 */
export const PixelBurst: React.FC<PixelBurstProps> = ({ trigger }) => {
  const reduced = useReducedMotion();
  const [active, setActive] = useState(0);

  useEffect(() => {
    if (trigger === 0 || reduced) return;
    setActive(trigger);
    const timer = window.setTimeout(() => setActive(0), LIFETIME_MS);
    return () => window.clearTimeout(timer);
  }, [trigger, reduced]);

  const pieces = useMemo(() => {
    if (!active) return [];
    return Array.from({ length: PIECES }, (_, index) => {
      const angle = (index / PIECES) * Math.PI * 2 + (Math.random() - 0.5) * 0.5;
      const distance = 40 + Math.random() * 56;
      return {
        dx: Math.cos(angle) * distance,
        dy: Math.sin(angle) * distance,
        rot: (Math.random() - 0.5) * 540,
        size: 5 + Math.round(Math.random() * 5),
        color: COLORS[index % COLORS.length],
        delay: Math.random() * 80,
      };
    });
  }, [active]);

  if (!active) return null;

  return (
    <span aria-hidden="true" className="pointer-events-none absolute left-1/2 top-1/2 z-10">
      {pieces.map((piece, index) => (
        <span
          key={`${active}-${index}`}
          className="pixel-piece"
          style={
            {
              width: piece.size,
              height: piece.size,
              background: piece.color,
              animationDelay: `${piece.delay}ms`,
              '--dx': `${piece.dx}px`,
              '--dy': `${piece.dy}px`,
              '--rot': `${piece.rot}deg`,
            } as PieceStyle
          }
        />
      ))}
    </span>
  );
};
