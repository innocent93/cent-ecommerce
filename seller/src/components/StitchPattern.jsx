import React from "react";

// A quiet running-stitch line — a nod to the textile trade these sellers
// work in, used as a low-opacity accent on hero panels rather than a stock
// gradient or blob. Absolutely positioned; parent needs `relative overflow-hidden`.
const StitchPattern = ({ className = "" }) => (
  <svg
    className={`pointer-events-none absolute ${className}`}
    width="100%"
    height="100%"
    preserveAspectRatio="none"
    aria-hidden="true"
  >
    <defs>
      <pattern id="stitch" width="22" height="22" patternUnits="userSpaceOnUse" patternTransform="rotate(35)">
        <line x1="0" y1="11" x2="22" y2="11" stroke="currentColor" strokeWidth="1" strokeDasharray="3 5" />
      </pattern>
    </defs>
    <rect width="100%" height="100%" fill="url(#stitch)" />
  </svg>
);

export default StitchPattern;
