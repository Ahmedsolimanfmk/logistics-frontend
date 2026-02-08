"use client";

import ar from "@/src/messages/ar.json";
import en from "@/src/messages/en.json";

const dict = { ar, en } as const;

function getLang(): "ar" | "en" {
  if (typeof window === "undefined") return "ar";
  return (localStorage.getItem("app_lang") as any) === "en" ? "en" : "ar";
}

function get(obj: any, path: string) {
  return path.split(".").reduce((acc, k) => acc?.[k], obj);
}

export function useT() {
  const lang = getLang();
  return (key: string) => get(dict[lang], key) ?? key;
}
