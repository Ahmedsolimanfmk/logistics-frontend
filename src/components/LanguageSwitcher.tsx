"use client";

import { useEffect, useState } from "react";
import { getStoredLang, setAppLang, type Lang } from "@/src/i18n/lang";

export default function LanguageSwitcher() {
  const [lang, setLang] = useState<Lang>("ar");

  useEffect(() => {
    setLang(getStoredLang());
  }, []);

  const toggle = () => {
    const next: Lang = lang === "ar" ? "en" : "ar";
    setLang(next);
    setAppLang(next); // ✅ ده اللي بيعمل rerender لكل الصفحات
  };

  return (
    <button
      onClick={toggle}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        border: "1px solid #ddd",
        borderRadius: 10,
        padding: "8px 12px",
        cursor: "pointer",
        background: "white",
      }}
      title="Change language"
    >
      <span style={{ fontSize: 18 }}>🌐</span>
      <span>{lang === "ar" ? "عربي" : "English"}</span>
    </button>
  );
}
