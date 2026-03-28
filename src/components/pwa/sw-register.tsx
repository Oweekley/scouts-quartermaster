"use client";

import { useEffect } from "react";

export function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;

    let cancelled = false;

    async function register() {
      try {
        const reg = await navigator.serviceWorker.register("/sw.js");
        if (cancelled) return;

        // Keep the app fresh on updates.
        reg.addEventListener("updatefound", () => {
          const installing = reg.installing;
          if (!installing) return;
          installing.addEventListener("statechange", () => {
            if (installing.state === "installed") {
              // New SW installed; future navigations use it automatically.
            }
          });
        });
      } catch {
        // ignore: SW may be blocked in some environments
      }
    }

    void register();

    return () => {
      cancelled = true;
    };
  }, []);

  return null;
}

