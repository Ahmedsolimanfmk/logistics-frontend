"use client";

import React, { useEffect, useState } from "react";
import { getStoredLang, setAppLang, type Lang } from "@/src/i18n/lang";

export default function LanguageSwitcher() {
  // ✅ ابدأ بالقيمة من localStorage لتجنب "فلاش" لغة غلط
  const [lang, setLang] = useState<Lang>(() => getStoredLang());

  // ✅ اتزامن لو اللغة اتغيرت من مكان تاني (event) أو من تبويب آخر (storage)
  useEffect(() => {
    const sync = () => setLang(getStoredLang());

    // custom event من setAppLang
    window.addEventListener("app_lang_change", sync as any);
    // تغييرات localStorage من تبويب آخر
    window.addEventListener("storage", sync);

    return () => {
      window.removeEventListener("app_lang_change", sync as any);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const toggle = () => {
    const next: Lang = lang === "ar" ? "en" : "ar";
    setLang(next);
    setAppLang(next); // ✅ يحدّث html dir/lang + dispatch event
  };

  const isAr = lang === "ar";

  return (
    <button
      type="button"
      onClick={toggle}
      title={isAr ? "Switch to English" : "التبديل للعربية"}
      className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/90 px-3 py-2 text-sm text-slate-900 hover:bg-white active:scale-[0.99] transition"
    >
      <span className="text-base">🌐</span>
      <span className="font-medium">{isAr ? "عربي" : "English"}</span>
    </button>
  );
}
