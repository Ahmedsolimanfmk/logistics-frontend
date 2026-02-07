// src/components/Toast.tsx
import React from "react";

export function Toast({
  open,
  message,
  type = "success",
  onClose,
}: {
  open: boolean;
  message: string;
  type?: "success" | "error";
  onClose: () => void;
}) {
  if (!open) return null;

  return (
    <div
      style={{
        position: "fixed",
        bottom: 16,
        right: 16,
        padding: "12px 14px",
        borderRadius: 10,
        background: type === "success" ? "#16a34a" : "#dc2626",
        color: "white",
        boxShadow: "0 10px 25px rgba(0,0,0,0.2)",
        zIndex: 9999,
        maxWidth: 360,
      }}
      onClick={onClose}
      role="alert"
    >
      {message}
      <div style={{ opacity: 0.85, fontSize: 12, marginTop: 4 }}>اضغط لإغلاق</div>
    </div>
  );
}
