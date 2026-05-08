"use client";

import { useEffect } from "react";
import { useAuth } from "@/src/store/auth";

export default function AuthHydrator() {
  const hydrate = useAuth((s) => s.hydrate);

  useEffect(() => {
    hydrate();
  }, []);

  return null;
}