import React from 'react';

/**
 * Page-top ambience: a dot grid that fades out towards the edges, and three
 * soft colour fields drifting slowly behind it. Radial gradients rather than
 * `filter: blur()`, and only `transform` animates, so the whole layer stays
 * on the compositor.
 */
export const Backdrop: React.FC = () => (
  <div
    aria-hidden="true"
    className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[46rem] overflow-hidden"
  >
    <div className="aurora aurora-a" />
    <div className="aurora aurora-b" />
    <div className="aurora aurora-c" />
    <div className="backdrop-grid absolute inset-0" />
  </div>
);
