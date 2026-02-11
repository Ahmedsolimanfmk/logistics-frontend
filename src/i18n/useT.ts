"use client";

import ar from "@/src/messages/ar.json";
import en from "@/src/messages/en.json";
import { useLang } from "@/src/i18n/lang";

const dict = { ar, en } as const;

function get(obj: any, path: string) {
  return path.split(".").reduce((acc, k) => acc?.[k], obj);
}

function format(template: string, params?: Record<string, any>) {
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (_, k) =>
    params[k] === undefined || params[k] === null ? `{${k}}` : String(params[k])
  );
}

export function useT() {
  const lang = useLang();
  return (key: string, params?: Record<string, any>) => {
    const v = get(dict[lang], key);
    if (typeof v === "string") return format(v, params);
    return key;
  };
}
