"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/src/store/auth";
import { tripsService } from "@/src/services/trips.service";
import type { Trip } from "@/src/types/trips.types";

export default function TripsManagedPage() {
  const token = useAuth((s) => s.token);

  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(false);

  async function loadTrips() {
    setLoading(true);

    try {
      const res = await tripsService.list({ page: 1, pageSize: 25 });
      setTrips(res.items);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!token) return;
    loadTrips();
  }, [token]);

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-4">Managed Trips</h2>

      <div className="border rounded-xl overflow-hidden">
        {loading && <div className="p-4">Loading...</div>}

        {!loading &&
          trips.map((tr) => (
            <div key={tr.id} className="border-b px-4 py-3 flex justify-between">
              <div>
                {tr.clients?.name} — {tr.sites?.name}
              </div>

              <div>{tr.status}</div>
            </div>
          ))}
      </div>
    </div>
  );
}