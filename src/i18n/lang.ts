"use client";

import { useEffect, useState } from "react";

export type Lang = "ar" | "en";
export const STORAGE_KEY = "app_lang";
const EVT = "app_lang_change";

export function getStoredLang(): Lang {
  if (typeof window === "undefined") return "ar";
  const v = localStorage.getItem(STORAGE_KEY);
  return v === "en" ? "en" : "ar";
}

export function applyLangToHtml(lang: Lang) {
  const html = document.documentElement;
  html.lang = lang;
  html.dir = lang === "ar" ? "rtl" : "ltr";
}

export function setAppLang(lang: Lang) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, lang);
  applyLangToHtml(lang);
  window.dispatchEvent(new CustomEvent(EVT, { detail: lang }));
}

/** Hook يديك lang + rerender تلقائي عند تغيير اللغة */
export function useLang() {
  const [lang, setLang] = useState<Lang>(() => getStoredLang());

  useEffect(() => {
    // ✅ كل مرة lang تتغير طبّقها على html
    applyLangToHtml(lang);
  }, [lang]);

  useEffect(() => {
    const onChange = (e: any) => {
      const next = (e?.detail as Lang) || getStoredLang();
      setLang(next);
    };

    const onStorage = () => setLang(getStoredLang());

    window.addEventListener(EVT, onChange as any);
    window.addEventListener("storage", onStorage);

    return () => {
      window.removeEventListener(EVT, onChange as any);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  return lang;
}
