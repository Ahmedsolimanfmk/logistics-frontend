"use client";

import React from "react";
import { Card } from "@/src/components/ui/Card";
import { Button } from "@/src/components/ui/Button";

type EntityType = "client" | "vehicle" | "trip" | "site" | "work_order" | string;

type Entity = {
  type?: EntityType;
  id?: string | null;
  label?: string | null;
  index?: number | null;
};

function entityTypeLabel(type?: string) {
  const map: Record<string, string> = {
    client: "عميل",
    vehicle: "مركبة",
    trip: "رحلة",
    site: "موقع",
    work_order: "أمر عمل",
  };

  return map[String(type || "")] || "كيان";
}

function followUpsByType(type?: string) {
  if (type === "client") return ["رحلاته", "مديونيته", "مصروفاته"];
  if (type === "vehicle") return ["رحلاتها", "صيانتها", "مصروفاتها"];
  if (type === "trip") return ["هل الرحلة مربحة؟", "ربحها كام؟", "مصروفاتها كام؟", "اعرض التفاصيل"];
  if (type === "site") return ["رحلاته"];
  return ["اعرض التفاصيل"];
}

function ordinalByIndex(index: number) {
  return ["الأول", "الثاني", "الثالث", "الرابع", "الخامس"][index] || String(index + 1);
}

export function DashboardEntityPanel({
  snapshot,
  onAsk,
}: {
  snapshot?: any;
  onAsk?: (question: string) => void;
}) {
  const ctx = snapshot?.entity_context || {};
  const primaryEntity: Entity | null = ctx?.primary_entity || null;
  const lastEntities: Entity[] = Array.isArray(ctx?.last_entities)
    ? ctx.last_entities
    : [];

  return (
    <Card title="ذاكرة المساعد">
      <div className="space-y-4">
        <div className="rounded-3xl border border-black/10 bg-slate-50 p-4">
          <div className="text-xs font-semibold text-slate-500">
            المحدد حاليًا
          </div>

          {primaryEntity ? (
            <div className="mt-2">
              <div className="text-sm font-bold text-[rgb(var(--trex-fg))]">
                {entityTypeLabel(primaryEntity.type)}:{" "}
                {primaryEntity.label || primaryEntity.id}
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                {followUpsByType(primaryEntity.type).map((q) => (
                  <button
                    key={q}
                    type="button"
                    onClick={() => onAsk?.(q)}
                    className="rounded-full border border-blue-100 bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-700 hover:bg-blue-100"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="mt-2 text-sm text-slate-500">
              لم يتم اختيار عنصر بعد. اسأل عن قائمة، ثم اختر الأول أو الثاني.
            </div>
          )}
        </div>

        <div>
          <div className="mb-2 text-sm font-semibold text-[rgb(var(--trex-fg))]">
            آخر نتائج قابلة للاختيار
          </div>

          {!lastEntities.length ? (
            <div className="rounded-2xl border border-dashed border-black/10 p-4 text-sm text-slate-500">
              لا توجد نتائج محفوظة بعد.
            </div>
          ) : (
            <div className="space-y-2">
              {lastEntities.slice(0, 5).map((entity, idx) => (
                <button
                  key={`${entity.type}-${entity.id}-${idx}`}
                  type="button"
                  onClick={() => onAsk?.(ordinalByIndex(idx))}
                  className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-right transition hover:border-blue-200 hover:bg-blue-50"
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="rounded-full bg-slate-100 px-2 py-1 text-[11px] font-semibold text-slate-600">
                      {ordinalByIndex(idx)}
                    </span>

                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-semibold text-slate-900">
                        {entity.label || entity.id || "عنصر"}
                      </div>
                      <div className="text-xs text-slate-500">
                        {entityTypeLabel(entity.type)}
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        <Button variant="secondary" onClick={() => onAsk?.("الأول")}>
          اختار الأول من آخر نتيجة
        </Button>
      </div>
    </Card>
  );
}