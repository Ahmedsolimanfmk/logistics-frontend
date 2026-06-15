"use client";

import React from "react";
import { Card } from "@/src/components/ui/Card";
import { useAuth } from "@/src/store/auth";
import { Truck, Wallet, QrCode } from "lucide-react";
import Link from "next/link";

export default function DriverDashboard() {
  const { user } = useAuth();

  return (
    <div className="space-y-6 max-w-md mx-auto mt-4">
      <div className="px-2">
        <h2 className="text-2xl font-bold text-gray-800">مرحباً، {user?.full_name?.split(' ')[0]} 👋</h2>
        <p className="text-gray-500">جاهز لرحلتك القادمة؟</p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Link href="/mobile/driver/trips">
          <Card className="p-4 flex flex-col items-center justify-center bg-indigo-50 border-indigo-100 shadow-sm rounded-2xl hover:bg-indigo-100 transition-colors">
            <Truck className="w-10 h-10 text-indigo-600 mb-2" />
            <span className="font-bold text-indigo-900">رحلاتي</span>
          </Card>
        </Link>
        <Link href="/mobile/driver/expenses">
          <Card className="p-4 flex flex-col items-center justify-center bg-amber-50 border-amber-100 shadow-sm rounded-2xl hover:bg-amber-100 transition-colors">
            <Wallet className="w-10 h-10 text-amber-600 mb-2" />
            <span className="font-bold text-amber-900">العهدة والمصروفات</span>
          </Card>
        </Link>
        <Link href="/mobile/driver/fuel" className="col-span-2">
          <Card className="p-6 flex items-center justify-between bg-emerald-600 text-white shadow-md rounded-2xl hover:bg-emerald-700 transition-colors relative overflow-hidden">
            <div className="absolute top-0 left-0 w-24 h-24 bg-white opacity-10 rounded-full -ml-8 -mt-8"></div>
            <div>
              <h3 className="font-bold text-xl mb-1">مسح كود التفويل (QR)</h3>
              <p className="text-emerald-100 text-sm">ادفع لمحطة الوقود من محفظة الشركة</p>
            </div>
            <div className="bg-white/20 p-3 rounded-full">
              <QrCode className="w-8 h-8 text-white" />
            </div>
          </Card>
        </Link>
      </div>

      <div className="mt-8">
        <h3 className="font-bold text-lg px-2 mb-3">آخر التحديثات</h3>
        <Card className="p-4 rounded-xl border border-gray-100 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
            <div>
              <p className="font-bold text-sm">تم تسوية العهدة بنجاح</p>
              <p className="text-xs text-gray-500">منذ ساعتين</p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
