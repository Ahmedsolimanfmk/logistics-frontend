"use client";

import ar from "@/src/messages/ar.json";
import en from "@/src/messages/en.json";
import { useLang } from "@/src/i18n/lang";

const dict = { ar, en } as const;

function get(obj: any, path: string) {
  return path.split(".").reduce((acc, k) => acc?.[k], obj);
}

export function useT() {
  const lang = useLang(); // ✅ الآن الصفحة هتعمل rerender عند تغيير اللغة
  return (key: string) => get(dict[lang], key) ?? key;
}
