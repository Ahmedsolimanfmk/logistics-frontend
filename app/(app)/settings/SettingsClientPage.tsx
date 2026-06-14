"use client";

import React, { useEffect, useState } from "react";
import { PageHeader } from "@/src/components/ui/PageHeader";
import { Card } from "@/src/components/ui/Card";
import { Button } from "@/src/components/ui/Button";
import { Toast } from "@/src/components/Toast";
import { settingsService } from "@/src/services/settings.service";
import { Building, Settings, Truck } from "lucide-react";

export default function SettingsClientPage() {
  const [activeTab, setActiveTab] = useState("company");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [toast, setToast] = useState<{
    open: boolean;
    message: string;
    type?: "success" | "error";
  }>({
    open: false,
    message: "",
    type: "success",
  });

  // Data states
  const [companyData, setCompanyData] = useState<any>({});
  
  // App Settings
  const [currency, setCurrency] = useState("SAR");
  const [vatRate, setVatRate] = useState("15");

  // Driver Settings
  const [defaultCommission, setDefaultCommission] = useState("0");
  const [requireCustody, setRequireCustody] = useState("true");

  async function loadData() {
    setLoading(true);
    try {
      // 1. Load Company
      const company = await settingsService.getCurrentCompany();
      setCompanyData(company || {});

      // 2. Load Settings
      const settingsList = await settingsService.listSettings();
      
      const findVal = (key: string, def: string) => {
        const item = settingsList.find((s: any) => s.setting_key === key);
        return item ? item.setting_value : def;
      };

      setCurrency(findVal("system.currency", "SAR"));
      setVatRate(findVal("system.vat_rate", "15"));
      
      setDefaultCommission(findVal("driver.default_commission", "0"));
      setRequireCustody(findVal("driver.require_custody", "true"));

    } catch (e: any) {
      setToast({
        open: true,
        message: e?.message || "فشل تحميل البيانات",
        type: "error",
      });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  async function saveCompanyData() {
    setSaving(true);
    try {
      await settingsService.updateCurrentCompany({
        name: companyData.name,
        code: companyData.code,
        tax_no: companyData.tax_no,
      });
      setToast({ open: true, message: "تم حفظ بيانات الشركة", type: "success" });
    } catch (e: any) {
      setToast({ open: true, message: "فشل حفظ بيانات الشركة", type: "error" });
    } finally {
      setSaving(false);
    }
  }

  async function saveSystemSettings() {
    setSaving(true);
    try {
      await settingsService.upsertSetting("system.currency", currency);
      await settingsService.upsertSetting("system.vat_rate", vatRate);
      setToast({ open: true, message: "تم حفظ إعدادات النظام", type: "success" });
    } catch (e: any) {
      setToast({ open: true, message: "فشل حفظ إعدادات النظام", type: "error" });
    } finally {
      setSaving(false);
    }
  }

  async function saveDriverSettings() {
    setSaving(true);
    try {
      await settingsService.upsertSetting("driver.default_commission", defaultCommission);
      await settingsService.upsertSetting("driver.require_custody", requireCustody);
      setToast({ open: true, message: "تم حفظ إعدادات السائقين", type: "success" });
    } catch (e: any) {
      setToast({ open: true, message: "فشل حفظ إعدادات السائقين", type: "error" });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="الإعدادات الشاملة"
        subtitle="إدارة بيانات الشركة، خيارات النظام الأساسية، وإعدادات السائقين."
      />

      <div className="flex border-b border-black/10">
        <button
          className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors ${
            activeTab === "company"
              ? "border-b-2 border-slate-900 text-slate-900"
              : "text-slate-500 hover:text-slate-700"
          }`}
          onClick={() => setActiveTab("company")}
        >
          <Building className="h-4 w-4" />
          بيانات الشركة
        </button>

        <button
          className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors ${
            activeTab === "system"
              ? "border-b-2 border-slate-900 text-slate-900"
              : "text-slate-500 hover:text-slate-700"
          }`}
          onClick={() => setActiveTab("system")}
        >
          <Settings className="h-4 w-4" />
          إعدادات النظام
        </button>

        <button
          className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors ${
            activeTab === "drivers"
              ? "border-b-2 border-slate-900 text-slate-900"
              : "text-slate-500 hover:text-slate-700"
          }`}
          onClick={() => setActiveTab("drivers")}
        >
          <Truck className="h-4 w-4" />
          إعدادات السائقين
        </button>
      </div>

      {loading ? (
        <Card>
          <div className="p-4 text-center text-sm text-slate-500">جاري تحميل البيانات...</div>
        </Card>
      ) : (
        <>
          {/* Company Tab */}
          {activeTab === "company" && (
            <Card title="بيانات الشركة">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">
                    اسم الشركة
                  </label>
                  <input
                    type="text"
                    className="trex-input w-full px-3 py-2 text-sm"
                    value={companyData.name || ""}
                    onChange={(e) => setCompanyData({ ...companyData, name: e.target.value })}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">
                    رمز الشركة (كود)
                  </label>
                  <input
                    type="text"
                    className="trex-input w-full px-3 py-2 text-sm"
                    value={companyData.code || ""}
                    onChange={(e) => setCompanyData({ ...companyData, code: e.target.value })}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">
                    الرقم الضريبي (Tax No)
                  </label>
                  <input
                    type="text"
                    className="trex-input w-full px-3 py-2 text-sm"
                    value={companyData.tax_no || ""}
                    onChange={(e) => setCompanyData({ ...companyData, tax_no: e.target.value })}
                  />
                </div>
              </div>
              <div className="mt-4 flex justify-end">
                <Button onClick={saveCompanyData} isLoading={saving} variant="primary">
                  حفظ البيانات
                </Button>
              </div>
            </Card>
          )}

          {/* System Settings Tab */}
          {activeTab === "system" && (
            <Card title="إعدادات النظام">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">
                    العملة الافتراضية
                  </label>
                  <select
                    className="trex-input w-full px-3 py-2 text-sm"
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value)}
                  >
                    <option value="SAR">ريال سعودي (SAR)</option>
                    <option value="EGP">جنيه مصري (EGP)</option>
                    <option value="USD">دولار أمريكي (USD)</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">
                    نسبة الضريبة الافتراضية (%)
                  </label>
                  <input
                    type="number"
                    className="trex-input w-full px-3 py-2 text-sm"
                    value={vatRate}
                    onChange={(e) => setVatRate(e.target.value)}
                  />
                </div>
              </div>
              <div className="mt-4 flex justify-end">
                <Button onClick={saveSystemSettings} isLoading={saving} variant="primary">
                  حفظ الإعدادات
                </Button>
              </div>
            </Card>
          )}

          {/* Driver Settings Tab */}
          {activeTab === "drivers" && (
            <Card title="إعدادات السائقين">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">
                    عمولة السائق الافتراضية (%)
                  </label>
                  <input
                    type="number"
                    className="trex-input w-full px-3 py-2 text-sm"
                    value={defaultCommission}
                    onChange={(e) => setDefaultCommission(e.target.value)}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">
                    التحقق من العهدة النقدية
                  </label>
                  <select
                    className="trex-input w-full px-3 py-2 text-sm"
                    value={requireCustody}
                    onChange={(e) => setRequireCustody(e.target.value)}
                  >
                    <option value="true">مطلوب تسوية العهدة</option>
                    <option value="false">تجاهل العهدة المفتوحة</option>
                  </select>
                </div>
              </div>
              <div className="mt-4 flex justify-end">
                <Button onClick={saveDriverSettings} isLoading={saving} variant="primary">
                  حفظ إعدادات السائقين
                </Button>
              </div>
            </Card>
          )}
        </>
      )}

      <Toast
        open={toast.open}
        message={toast.message}
        type={toast.type}
        onClose={() => setToast((x) => ({ ...x, open: false }))}
      />
    </div>
  );
}
