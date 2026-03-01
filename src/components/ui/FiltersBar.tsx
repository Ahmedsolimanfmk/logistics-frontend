import React from "react";

export function FiltersBar({
  left,
  right,
  className = "",
}: {
  left: React.ReactNode;
  right?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={["flex flex-wrap items-center gap-2", className].join(" ")}>
      <div className="flex-1 min-w-[240px]">{left}</div>
      {right ? <div className="ms-auto flex items-center gap-2">{right}</div> : null}
    </div>
  );
}