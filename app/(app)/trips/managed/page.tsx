"use client";

import { useEffect, useState } from "react";
import { api } from "@/src/lib/api";
import { useAuth } from "@/src/store/auth";

function unwrap(res: any) {
  return res?.data ?? res;
}

export default function TripsManagedPage() {

  const token = useAuth((s) => s.token);

  const [trips, setTrips] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  async function loadTrips() {
    setLoading(true);

    try {
      const res = await api.get("/trips", {
        params: { page: 1, pageSize: 25 },
      });

      const data = unwrap(res);

      setTrips(Array.isArray(data?.items) ? data.items : []);
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

      <h2 className="text-xl font-bold mb-4">
        Managed Trips
      </h2>

      <div className="border rounded-xl overflow-hidden">

        {loading && <div className="p-4">Loading...</div>}

        {!loading &&
          trips.map((tr: any) => (
            <div
              key={tr.id}
              className="border-b px-4 py-3 flex justify-between"
            >
              <div>
                {tr.clients?.name} — {tr.sites?.name}
              </div>

              <div>
                {tr.status}
              </div>
            </div>
          ))}

      </div>
    </div>
  );
}