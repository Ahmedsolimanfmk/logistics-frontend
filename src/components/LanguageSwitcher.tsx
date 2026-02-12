"use client";

import React, { useEffect, useState } from "react";
import { getStoredLang, setAppLang, type Lang } from "@/src/i18n/lang";
import { useT } from "@/src/i18n/useT";

export default function LanguageSwitcher() {
  const t = useT();

  const [lang, setLang] = useState<Lang>(() => getStoredLang());

  useEffect(() => {
    const sync = () => setLang(getStoredLang());

    window.addEventListener("app_lang_change", sync as any);
    window.addEventListener("storage", sync);

    return () => {
      window.removeEventListener("app_lang_change", sync as any);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const toggle = () => {
    const next: Lang = lang === "ar" ? "en" : "ar";
    setLang(next);
    setAppLang(next);
  };

  const isAr = lang === "ar";

  return (
    <button
      type="button"
      onClick={toggle}
      title={t("language.switch")}
      className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/90 px-3 py-2 text-sm text-slate-900 hover:bg-white active:scale-[0.99] transition"
    >
      <span className="text-base">🌐</span>
      <span className="font-medium">
        {isAr ? t("language.ar") : t("language.en")}
      </span>
    </button>
  );
}
