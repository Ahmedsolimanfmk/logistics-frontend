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
  raw?: any;
};

type EntityContext = {
  primary_entity?: Entity | null;
  last_entities?: Entity[];
  selected_index?: number | null;
  selected_entity_type?: string | null;
  history_refs?: Record<string, any>;
};

type Props = {
  snapshot?: any;
  onAsk?: (question: string) => void;
};

function cn(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}

function entityTypeLabel(type?: string | null) {
  const map: Record<string, string> = {
    client: "عميل",
    vehicle: "مركبة",
    trip: "رحلة",
    site: "موقع",
    work_order: "أمر عمل",
  };

  return map[String(type || "")] || "كيان";
}

function entityTypeIcon(type?: string | null) {
  const map: Record<string, string> = {
    client: "👤",
    vehicle: "🚚",
    trip: "🧾",
    site: "📍",
    work_order: "🛠️",
  };

  return map[String(type || "")] || "🧠";
}

function ordinalByIndex(index: number) {
  return ["الأول", "الثاني", "الثالث", "الرابع", "الخامس"][index] || String(index + 1);
}

function followUpsByType(type?: string | null) {
  if (type === "client") {
    return ["رحلاته", "مديونيته", "مصروفاته"];
  }

  if (type === "vehicle") {
    return ["رحلاتها", "صيانتها", "مصروفاتها"];
  }

  if (type === "trip") {
    return ["هل الرحلة مربحة؟", "ربحها كام؟", "مصروفاتها كام؟", "اعرض التفاصيل"];
  }

  if (type === "site") {
    return ["رحلاته", "أعلى العملاء في الموقع", "أعلى المركبات في الموقع"];
  }

  if (type === "work_order") {
    return ["اعرض التفاصيل", "تكلفته كام؟", "حالة أمر العمل؟"];
  }

  return ["اعرض التفاصيل"];
}

function getEntityContext(snapshot: any): EntityContext {
  if (!snapshot || typeof snapshot !== "object") return {};

  const ctx = snapshot.entity_context;
  if (!ctx || typeof ctx !== "object") return {};

  return ctx;
}

function getEntityLabel(entity?: Entity | null) {
  if (!entity) return "عنصر غير محدد";

  return (
    entity.label ||
    entity.raw?.client_name ||
    entity.raw?.display_name ||
    entity.raw?.fleet_no ||
    entity.raw?.plate_no ||
    entity.raw?.trip_code ||
    entity.raw?.site_name ||
    entity.raw?.name ||
    entity.id ||
    "عنصر"
  );
}

function getEntitySubLabel(entity?: Entity | null) {
  if (!entity) return null;

  const parts = [
    entityTypeLabel(entity.type),
    typeof entity.index === "number" ? ordinalByIndex(entity.index) : null,
    entity.id ? `ID: ${String(entity.id).slice(0, 8)}…` : null,
  ].filter(Boolean);

  return parts.join(" • ");
}

function HistoryRefRow({
  label,
  value,
}: {
  label: string;
  value: any;
}) {
  if (!value) return null;

  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl border border-black/10 bg-white px-3 py-2 text-xs">
      <span className="font-semibold text-slate-500">{label}</span>
      <span className="truncate text-slate-800">{value.label || value.id || "—"}</span>
    </div>
  );
}

export function DashboardEntityPanel({ snapshot, onAsk }: Props) {
  const ctx = getEntityContext(snapshot);
  const primaryEntity: Entity | null = ctx.primary_entity || null;
  const lastEntities: Entity[] = Array.isArray(ctx.last_entities)
    ? ctx.last_entities
    : [];

  const hasMemory = Boolean(primaryEntity) || lastEntities.length > 0;

  return (
    <Card title="ذاكرة المساعد">
      <div className="space-y-4">
        <div
          className={cn(
            "rounded-3xl border p-4",
            primaryEntity
              ? "border-blue-200 bg-blue-50"
              : "border-black/10 bg-slate-50"
          )}
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-xs font-semibold text-slate-500">
                المحدد حاليًا
              </div>

              {primaryEntity ? (
                <>
                  <div className="mt-2 flex items-center gap-2">
                    <span className="text-lg">{entityTypeIcon(primaryEntity.type)}</span>
                    <div className="min-w-0">
                      <div className="truncate text-sm font-bold text-[rgb(var(--trex-fg))]">
                        {entityTypeLabel(primaryEntity.type)}: {getEntityLabel(primaryEntity)}
                      </div>
                      <div className="mt-1 text-xs text-slate-500">
                        {getEntitySubLabel(primaryEntity)}
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <div className="mt-2 text-sm leading-6 text-slate-500">
                  لم يتم اختيار عنصر بعد. اسأل عن قائمة، ثم اختر الأول أو الثاني.
                </div>
              )}
            </div>

            {hasMemory ? (
              <button
                type="button"
                onClick={() => onAsk?.("محادثة جديدة")}
                className="rounded-full border border-black/10 bg-white px-3 py-1 text-xs font-semibold text-slate-600 transition hover:bg-slate-100"
              >
                مسح
              </button>
            ) : null}
          </div>

          {primaryEntity ? (
            <div className="mt-4 flex flex-wrap gap-2">
              {followUpsByType(primaryEntity.type).map((q) => (
                <button
                  key={q}
                  type="button"
                  onClick={() => onAsk?.(q)}
                  className="rounded-full border border-blue-100 bg-white px-3 py-1.5 text-xs font-medium text-blue-700 transition hover:bg-blue-100"
                >
                  {q}
                </button>
              ))}
            </div>
          ) : null}
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between gap-3">
            <div className="text-sm font-semibold text-[rgb(var(--trex-fg))]">
              آخر نتائج قابلة للاختيار
            </div>

            {lastEntities.length > 0 ? (
              <span className="rounded-full bg-slate-100 px-2 py-1 text-[11px] font-semibold text-slate-600">
                {lastEntities.length}
              </span>
            ) : null}
          </div>

          {!lastEntities.length ? (
            <div className="rounded-2xl border border-dashed border-black/10 bg-black/[0.02] p-4 text-sm leading-6 text-slate-500">
              لا توجد نتائج محفوظة بعد. جرّب سؤال مثل: اعرض أعلى 5 رحلات ربحًا.
            </div>
          ) : (
            <div className="space-y-2">
              {lastEntities.slice(0, 5).map((entity, idx) => (
                <button
                  key={`${entity.type || "entity"}-${entity.id || idx}-${idx}`}
                  type="button"
                  onClick={() => onAsk?.(ordinalByIndex(idx))}
                  className={cn(
                    "w-full rounded-2xl border px-4 py-3 text-right transition",
                    primaryEntity?.id && primaryEntity.id === entity.id
                      ? "border-blue-200 bg-blue-50"
                      : "border-black/10 bg-white hover:border-blue-200 hover:bg-blue-50"
                  )}
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="rounded-full bg-slate-100 px-2 py-1 text-[11px] font-semibold text-slate-600">
                      {ordinalByIndex(idx)}
                    </span>

                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-semibold text-slate-900">
                        {entityTypeIcon(entity.type)} {getEntityLabel(entity)}
                      </div>
                      <div className="mt-0.5 text-xs text-slate-500">
                        {entityTypeLabel(entity.type)}
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {ctx.history_refs ? (
          <div className="space-y-2">
            <div className="text-sm font-semibold text-[rgb(var(--trex-fg))]">
              مراجع محفوظة
            </div>

            <div className="space-y-2">
              <HistoryRefRow label="عميل" value={ctx.history_refs.client} />
              <HistoryRefRow label="مركبة" value={ctx.history_refs.vehicle} />
              <HistoryRefRow label="رحلة" value={ctx.history_refs.trip} />
              <HistoryRefRow label="موقع" value={ctx.history_refs.site} />
              <HistoryRefRow label="أمر عمل" value={ctx.history_refs.work_order} />
            </div>
          </div>
        ) : null}

        <div className="rounded-2xl border border-black/10 bg-slate-50 p-3 text-xs leading-6 text-slate-500">
          تلميح: بعد ظهور قائمة نتائج، يمكنك الضغط على أي عنصر هنا أو كتابة "الأول"، "الثاني"، "هو"، أو "نفس العميل".
        </div>

        {lastEntities.length > 0 ? (
          <Button variant="secondary" onClick={() => onAsk?.("الأول")}>
            اختار الأول من آخر نتيجة
          </Button>
        ) : null}
      </div>
    </Card>
  );
}
