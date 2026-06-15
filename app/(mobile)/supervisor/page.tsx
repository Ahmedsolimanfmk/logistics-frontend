"use client";

import React from "react";
import { Card } from "@/src/components/ui/Card";
import { useAuth } from "@/src/store/auth";
import { Truck, Wallet, PenTool, CheckSquare } from "lucide-react";
import Link from "next/link";

export default function SupervisorDashboard() {
  const { user } = useAuth();

  return (
    <div className="space-y-6 max-w-md mx-auto mt-4">
      <div className="px-2">
        <h2 className="text-2xl font-bold text-gray-800">مرحباً، المشرف الميداني 👋</h2>
        <p className="text-gray-500">{user?.full_name}</p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Link href="/mobile/supervisor/trips" className="col-span-2">
          <Card className="p-6 flex items-center justify-between bg-indigo-600 text-white shadow-md rounded-3xl hover:bg-indigo-700 transition-colors relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white opacity-10 rounded-full -mr-16 -mt-16"></div>
            <div>
              <h3 className="font-bold text-xl mb-1">الرحلات وحالة السيارات</h3>
              <p className="text-indigo-100 text-sm">إدارة الرحلات وتعيين السائقين</p>
            </div>
            <div className="bg-white/20 p-4 rounded-2xl">
              <Truck className="w-8 h-8 text-white" />
            </div>
          </Card>
        </Link>
        <Link href="/mobile/supervisor/custody">
          <Card className="p-5 flex flex-col items-center justify-center bg-white border border-gray-100 shadow-sm rounded-3xl hover:bg-amber-50 transition-colors">
            <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center mb-3">
              <Wallet className="w-6 h-6 text-amber-600" />
            </div>
            <span className="font-bold text-gray-800">إدارة العهد</span>
          </Card>
        </Link>
        <Link href="/mobile/supervisor/maintenance">
          <Card className="p-5 flex flex-col items-center justify-center bg-white border border-gray-100 shadow-sm rounded-3xl hover:bg-rose-50 transition-colors">
            <div className="w-12 h-12 bg-rose-100 rounded-full flex items-center justify-center mb-3">
              <PenTool className="w-6 h-6 text-rose-600" />
            </div>
            <span className="font-bold text-gray-800">طلبات الصيانة</span>
          </Card>
        </Link>
      </div>

      <div className="mt-8">
        <div className="flex justify-between items-center px-2 mb-4">
          <h3 className="font-bold text-lg">مهام معلقة (للاعتماد)</h3>
          <span className="text-xs font-bold bg-rose-100 text-rose-600 px-2 py-1 rounded-full">3 مهام</span>
        </div>
        <div className="space-y-3">
          <Card className="p-4 rounded-2xl border border-gray-100 shadow-sm flex items-start gap-3">
             <div className="bg-yellow-100 p-2 rounded-lg mt-1">
               <CheckSquare className="w-5 h-5 text-yellow-600" />
             </div>
             <div>
               <p className="font-bold text-sm">اعتماد تسوية سائق (محمد أحمد)</p>
               <p className="text-xs text-gray-500 mt-1">رحلة #TRP-102 • كارتة وبنزين • 450 ج.م</p>
             </div>
          </Card>
          <Card className="p-4 rounded-2xl border border-gray-100 shadow-sm flex items-start gap-3">
             <div className="bg-indigo-100 p-2 rounded-lg mt-1">
               <Truck className="w-5 h-5 text-indigo-600" />
             </div>
             <div>
               <p className="font-bold text-sm">تعيين سائق للرحلة #TRP-105</p>
               <p className="text-xs text-gray-500 mt-1">العميل: شركة المراعي • الإقلاع: اليوم 4:00م</p>
             </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
