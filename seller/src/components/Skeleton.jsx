import React from "react";

// A quiet pulsing bar rather than a spinner — matches the ledger's flat,
// hairline-divider language instead of introducing a foreign spinner motif.
export const SkeletonLine = ({ width = "100%", height = 14 }) => (
  <div
    className="animate-pulse rounded bg-ink-100/70"
    style={{ width, height }}
  />
);

export const SkeletonRow = ({ cols = 4 }) => (
  <div className="flex items-center gap-4 border-b border-ink-100 py-3 last:border-b-0">
    {Array.from({ length: cols }).map((_, i) => (
      <SkeletonLine key={i} width={i === 0 ? "40%" : "15%"} />
    ))}
  </div>
);

export const SkeletonRows = ({ rows = 4, cols = 4 }) => (
  <div>
    {Array.from({ length: rows }).map((_, i) => (
      <SkeletonRow key={i} cols={cols} />
    ))}
  </div>
);
