import React from "react";
import { statusTone, statusLabel } from "../utils/format";

const toneClasses = {
  moss: "text-moss-700 before:bg-moss-500",
  brick: "text-brick-700 before:bg-brick-500",
  ochre: "text-ochre-700 before:bg-ochre-500",
  ink: "text-ink-500 before:bg-ink-300",
};

// A dot + label rather than a filled badge — quieter, and lets the same
// color language (dot color) carry meaning consistently across the whole
// app without turning every table into a wall of colored chips.
const StatusTag = ({ status }) => {
  const tone = toneClasses[statusTone(status)] || toneClasses.ink;
  return (
    <span
      className={`relative inline-flex items-center gap-1.5 text-sm before:h-1.5 before:w-1.5 before:rounded-full before:content-[''] ${tone}`}
    >
      {statusLabel(status)}
    </span>
  );
};

export default StatusTag;
