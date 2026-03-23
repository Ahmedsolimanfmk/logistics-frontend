import { useState } from "react";

export function useToastState() {
  const [toastOpen, setToastOpen] = useState(false);
  const [toastMsg, setToastMsg] = useState("");
  const [toastType, setToastType] = useState<"success" | "error">("success");

  function showToast(type: "success" | "error", msg: string) {
    setToastType(type);
    setToastMsg(msg);
    setToastOpen(true);
  }

  return {
    toastOpen,
    toastMsg,
    toastType,
    setToastOpen,
    showToast,
  };
}