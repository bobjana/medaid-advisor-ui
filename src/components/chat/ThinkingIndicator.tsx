'use client';

import { useEffect, useState } from 'react';

/** How long before the wording switches to a "still working" reassurance. */
const SLOW_AFTER_MS = 8000;

/**
 * Shown inside an empty assistant bubble while the agent works. Retrieval and
 * pricing turns can take a while, and an empty bubble reads as "nothing
 * happened"; animated dots plus wording make the in-progress state obvious.
 */
export function ThinkingIndicator() {
  const [slow, setSlow] = useState(false);

  useEffect(() => {
    const id = setTimeout(() => setSlow(true), SLOW_AFTER_MS);
    return () => clearTimeout(id);
  }, []);

  return (
    <span role="status" aria-live="polite" className="inline-flex items-center gap-2 text-sm">
      <span className="flex items-center gap-1" aria-hidden="true">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="investigating-dot h-1.5 w-1.5 rounded-full bg-primary/70"
            style={{ animationDelay: `${i * 0.15}s` }}
          />
        ))}
      </span>
      <span className="investigating-label font-medium">
        {slow ? 'Still investigating' : 'Investigating'}…
      </span>
    </span>
  );
}
