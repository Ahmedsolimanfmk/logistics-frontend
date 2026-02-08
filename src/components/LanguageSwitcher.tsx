"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "app_lang";
type Lang = "ar" | "en";

function applyLang(lang: Lang) {
  const html = document.documentElement;
  html.lang = lang;
  html.dir = lang === "ar" ? "rtl" : "ltr";
}

export default function LanguageSwitcher() {
  const [lang, setLang] = useState<Lang>("ar");

  useEffect(() => {
    const saved = (localStorage.getItem(STORAGE_KEY) as Lang | null) || "ar";
    setLang(saved);
  }, []);

  const toggle = () => {
    const next: Lang = lang === "ar" ? "en" : "ar";
    setLang(next);
    localStorage.setItem(STORAGE_KEY, next);
    applyLang(next);
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
