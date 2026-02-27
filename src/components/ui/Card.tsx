import React from "react";

export function Card({
  title,
  right,
  children,
  className = "",
}: {
  title?: React.ReactNode;
  right?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={[
        // ✅ Theme-aware container
        "rounded-2xl border border-black/10 bg-[rgba(var(--trex-surface),0.92)] backdrop-blur-xl overflow-hidden",
        "shadow-[0_10px_30px_rgba(0,0,0,0.06)]",
        className,
      ].join(" ")}
    >
      {title ? (
        <div className="px-4 py-3 border-b border-black/10 flex items-center justify-between gap-3">
          <div className="font-semibold text-[rgb(var(--trex-fg))]">{title}</div>
          {right ? <div className="flex items-center gap-2">{right}</div> : null}
        </div>
      ) : null}

      <div className="p-4 text-[rgb(var(--trex-fg))]">{children}</div>
    </div>
  );
}