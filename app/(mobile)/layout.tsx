"use client";

import React, { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Home, Truck, Wallet, CheckCircle, PenTool, QrCode } from "lucide-react";
import { useAuth } from "@/src/store/auth";
import Link from "next/link";
import { usePushNotifications } from "@/src/hooks/usePushNotifications";

export default function MobileLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, hasHydrated } = useAuth();
  const [mounted, setMounted] = useState(false);

  // Initialize Push Notifications (only runs on Native Android/iOS if user exists)
  usePushNotifications(mounted && !!user);

  useEffect(() => {
    setMounted(true);
    if (hasHydrated && !user) {
      router.push("/login?redirect=" + encodeURIComponent(pathname));
    }
  }, [user, hasHydrated, router, pathname]);

  if (!mounted || !hasHydrated) return <div className="h-screen w-screen flex items-center justify-center">جاري التحميل...</div>;

  if (!user) {
    return null;
  }

  const role = user.role;

  // Define navigation based on role
  let navItems: any[] = [];
  
  if (role === "DRIVER") {
    navItems = [
      { label: "الرئيسية", icon: Home, href: "/mobile/driver" },
      { label: "رحلاتي", icon: Truck, href: "/mobile/driver/trips" },
      { label: "العهدة والمصروفات", icon: Wallet, href: "/mobile/driver/expenses" },
      { label: "التفويل", icon: QrCode, href: "/mobile/driver/fuel" },
    ];
  } else if (role === "FIELD_SUPERVISOR" || role === "SUPERVISOR") {
    navItems = [
      { label: "الرئيسية", icon: Home, href: "/mobile/supervisor" },
      { label: "الرحلات", icon: Truck, href: "/mobile/supervisor/trips" },
      { label: "العهدة", icon: Wallet, href: "/mobile/supervisor/custody" },
      { label: "الصيانة", icon: PenTool, href: "/mobile/supervisor/maintenance" },
    ];
  } else if (role === "STATION_WORKER") {
    navItems = [
      { label: "الرئيسية", icon: Home, href: "/mobile/station" },
      { label: "إنشاء QR", icon: QrCode, href: "/mobile/station/qr" },
      { label: "سجل التفويل", icon: CheckCircle, href: "/mobile/station/transactions" },
    ];
  }

  return (
    <div className="flex flex-col h-screen w-full bg-gray-50 overflow-hidden text-right" dir="rtl">
      {/* Header */}
      <header className="bg-emerald-600 text-white p-4 flex justify-between items-center shadow-md z-10 shrink-0">
        <h1 className="font-bold text-lg">تطبيق {role === 'DRIVER' ? 'السائق' : role === 'STATION_WORKER' ? 'المحطة' : 'المشرف'}</h1>
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">{user.full_name}</span>
          <div className="w-8 h-8 rounded-full bg-emerald-800 flex items-center justify-center text-xs font-bold border border-emerald-400 cursor-pointer" onClick={() => router.push('/login')}>
            خروج
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto p-4 pb-24">
        {children}
      </main>

      {/* Bottom Navigation */}
      {navItems.length > 0 && (
        <nav className="absolute bottom-0 left-0 right-0 bg-white border-t border-gray-200 flex justify-around shadow-[0_-2px_10px_rgba(0,0,0,0.05)] pb-safe shrink-0">
          {navItems.map((item) => {
            const isActive = pathname === item.href || (pathname?.startsWith(item.href) && item.href !== "/mobile/driver" && item.href !== "/mobile/supervisor" && item.href !== "/mobile/station");
            return (
              <Link 
                key={item.href} 
                href={item.href}
                className={`flex flex-col items-center justify-center py-3 px-2 flex-1 transition-colors ${isActive ? 'text-emerald-600 border-t-2 border-emerald-600' : 'text-gray-500 hover:bg-gray-50'}`}
              >
                <item.icon className={`w-6 h-6 mb-1 ${isActive ? 'fill-emerald-100' : ''}`} strokeWidth={isActive ? 2.5 : 2} />
                <span className="text-[10px] font-bold">{item.label}</span>
              </Link>
            )
          })}
        </nav>
      )}
    </div>
  );
}
