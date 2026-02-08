"use client";

import { useEffect } from "react";

const STORAGE_KEY = "app_lang";
type Lang = "ar" | "en";

function applyLang(lang: Lang) {
  const html = document.documentElement;
  html.lang = lang;
  html.dir = lang === "ar" ? "rtl" : "ltr";
}

export default function LanguageInit() {
  useEffect(() => {
    const saved = (localStorage.getItem(STORAGE_KEY) as Lang | null) || "ar";
    applyLang(saved);
  }, []);

  return null;
}
