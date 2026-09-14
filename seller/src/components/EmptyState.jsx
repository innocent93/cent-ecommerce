import React from "react";

const EmptyState = ({ title, hint, action }) => (
  <div className="flex flex-col items-center justify-center rounded border border-dashed border-ink-100 px-6 py-16 text-center">
    <p className="font-display text-lg text-ink-500">{title}</p>
    {hint && <p className="mt-1.5 max-w-sm text-sm text-muted">{hint}</p>}
    {action && <div className="mt-5">{action}</div>}
  </div>
);

export default EmptyState;
