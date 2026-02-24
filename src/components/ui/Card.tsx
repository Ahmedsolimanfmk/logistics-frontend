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
        "rounded-2xl border border-gray-200 bg-white overflow-hidden shadow-sm",
        className,
      ].join(" ")}
    >
      {title ? (
        <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between gap-3">
          <div className="font-semibold text-gray-900">{title}</div>
          {right ? <div className="flex items-center gap-2">{right}</div> : null}
        </div>
      ) : null}

      <div className="p-4">{children}</div>
    </div>
  );
}