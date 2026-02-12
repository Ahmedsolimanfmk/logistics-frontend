// src/i18n/useT.ts
"use client";

import ar from "@/src/messages/ar.json";
import en from "@/src/messages/en.json";
import { useLang } from "@/src/i18n/lang";

const dict = { ar, en } as const;

function get(obj: any, path: string) {
  return path.split(".").reduce((acc, k) => acc?.[k], obj);
}

export function useT() {
  const lang = useLang();

  return (key: string, vars?: Record<string, any>) => {
    let text = get(dict[lang], key);

    // fallback: return key if missing
    if (text == null) return key;

    // If not string, return as-is
    if (typeof text !== "string") return String(text);

    // Replace {var} placeholders
    if (vars) {
      for (const [k, v] of Object.entries(vars)) {
        text = text.replace(new RegExp(`\\{${k}\\}`, "g"), String(v));
      }
    }

    return text;
  };
}
