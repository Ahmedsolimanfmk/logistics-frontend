"use client";

import React, { useState, useEffect } from "react";
import { Card } from "@/src/components/ui/Card";
import { Button } from "@/src/components/ui/Button";
import { api } from "@/src/lib/api";
import { MapPin, Clock, CheckCircle } from "lucide-react";

export default function DriverTripsPage() {
  const [trips, setTrips] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTrips = async () => {
    try {
      setLoading(true);
      // Fetch trips assigned to this driver. Currently using generic trips endpoint.
      // In real backend, filter by driver_id or assignments.
      const res = await api.get("/trips");
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

  const updateStatus = async (id: string, newStatus: string) => {
    try {
      await api.patch(`/trips/${id}/status`, { status: newStatus });
      alert("تم التحديث بنجاح");
      fetchTrips();
    } catch (e) {
      alert("خطأ في تحديث الحالة");
    }
  };

  return (
    <div className="space-y-6 max-w-md mx-auto mt-4">
      <h2 className="font-bold text-2xl text-gray-800 px-2">رحلاتي الحالية</h2>
      
      <div className="space-y-4">
        {loading ? (
          <div className="text-center p-8 text-gray-500">جاري التحميل...</div>
        ) : trips.length === 0 ? (
          <div className="text-center p-8 text-gray-500 bg-white rounded-2xl border border-dashed">لا توجد رحلات حالية</div>
        ) : (
          trips.map(trip => (
            <Card key={trip.id} className="p-5 shadow-sm rounded-2xl border border-gray-100 relative overflow-hidden">
              <div className={`absolute top-0 left-0 w-2 h-full ${trip.status === 'DRAFT' ? 'bg-yellow-400' : trip.status === 'STARTED' ? 'bg-indigo-500' : 'bg-emerald-500'}`}></div>
              <div className="flex justify-between items-start mb-4 pl-4">
                <div>
                  <h3 className="font-bold text-lg">{trip.trip_code}</h3>
                  <p className="text-sm text-gray-500">{trip.client?.name || 'عميل غير محدد'}</p>
                </div>
                <span className={`text-xs px-2 py-1 rounded-full font-bold ${trip.status === 'DRAFT' ? 'bg-yellow-100 text-yellow-800' : trip.status === 'STARTED' ? 'bg-indigo-100 text-indigo-800' : 'bg-emerald-100 text-emerald-800'}`}>
                  {trip.status === 'DRAFT' ? 'بانتظار التحرك' : trip.status === 'STARTED' ? 'قيد التنفيذ' : trip.status}
                </span>
              </div>

              <div className="space-y-2 mb-6">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <MapPin className="w-4 h-4 text-gray-400" />
                  <span>من: {trip.origin || trip.site?.name || 'غير محدد'}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <MapPin className="w-4 h-4 text-emerald-500" />
                  <span>إلى: {trip.destination || 'غير محدد'}</span>
                </div>
                {trip.scheduled_at && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Clock className="w-4 h-4 text-blue-400" />
                    <span>الموعد: {new Date(trip.scheduled_at).toLocaleTimeString('ar-EG')}</span>
                  </div>
                )}
              </div>

              <div className="flex gap-2">
                {trip.status === 'DRAFT' && (
                  <Button variant="primary" className="flex-1 rounded-xl bg-indigo-600 hover:bg-indigo-700" onClick={() => updateStatus(trip.id, 'STARTED')}>
                    بدء الرحلة
                  </Button>
                )}
                {trip.status === 'STARTED' && (
                  <Button variant="primary" className="flex-1 rounded-xl bg-emerald-600 hover:bg-emerald-700 flex items-center justify-center gap-2" onClick={() => updateStatus(trip.id, 'COMPLETED')}>
                    <CheckCircle className="w-4 h-4" /> إنهاء الرحلة
                  </Button>
                )}
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
