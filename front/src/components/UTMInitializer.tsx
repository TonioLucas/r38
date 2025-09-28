"use client";

import { useEffect } from "react";
import { initUTMTracking } from "@/lib/utm";

export function UTMInitializer() {
  useEffect(() => {
    initUTMTracking();
  }, []);

  return null;
}