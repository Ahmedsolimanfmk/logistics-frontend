"use client";

import React, { useState, useEffect } from "react";
import { Card } from "@/src/components/ui/Card";
import { Button } from "@/src/components/ui/Button";
import { api } from "@/src/lib/api";
import { MapPin, User, CheckCircle } from "lucide-react";

export default function SupervisorTripsPage() {
  const [trips, setTrips] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTrips = async () => {
    try {
      setLoading(true);
      const res = await api.get("/trips");
      // Filter for active or pending trips
      setTrips(res.data?.items?.filter((t: any) => t.status !== 'COMPLETED') || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTrips();
  }, []);

  const approveTrip = async (id: string) => {
    try {
      await api.patch(`/trips/${id}/status`, { status: 'STARTED' });
      alert("تم اعتماد بدء الرحلة بنجاح");
      fetchTrips();
    } catch (e) {
      alert("خطأ في التحديث");
    }
  };

  return (
    <div className="space-y-6 max-w-md mx-auto mt-4">
      <h2 className="font-bold text-2xl text-gray-800 px-2">متابعة الرحلات</h2>
      
      <div className="space-y-4">
        {loading ? (
          <div className="text-center p-8 text-gray-500">جاري التحميل...</div>
        ) : trips.length === 0 ? (
          <div className="text-center p-8 text-gray-500 bg-white rounded-2xl border border-dashed">لا توجد رحلات حالية</div>
        ) : (
          trips.map(trip => (
            <Card key={trip.id} className="p-5 shadow-sm rounded-2xl border border-gray-100">
              <div className="flex justify-between items-start mb-4 border-b border-gray-100 pb-3">
                <div>
                  <h3 className="font-bold text-lg">{trip.trip_code}</h3>
                  <p className="text-sm text-gray-500">{trip.client?.name || 'عميل غير محدد'}</p>
                </div>
                <span className={`text-xs px-2 py-1 rounded-full font-bold ${trip.status === 'DRAFT' ? 'bg-yellow-100 text-yellow-800' : 'bg-indigo-100 text-indigo-800'}`}>
                  {trip.status === 'DRAFT' ? 'بانتظار الاعتماد' : 'قيد التنفيذ'}
                </span>
              </div>

              <div className="space-y-3 mb-4">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <MapPin className="w-4 h-4 text-emerald-500" />
                  <span>خط السير: {trip.origin || 'غير محدد'} ➔ {trip.destination || 'غير محدد'}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600 bg-gray-50 p-2 rounded-lg">
                  <User className="w-4 h-4 text-gray-500" />
                  <span>السائق: {trip.driver?.full_name || <span className="text-red-500 font-bold">لم يتم تعيين سائق</span>}</span>
                </div>
              </div>

              {trip.status === 'DRAFT' && trip.driver && (
                <Button variant="primary" className="w-full rounded-xl bg-emerald-600 hover:bg-emerald-700 flex items-center justify-center gap-2" onClick={() => approveTrip(trip.id)}>
                  <CheckCircle className="w-4 h-4" /> اعتماد بدء الرحلة للسائق
                </Button>
              )}
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
