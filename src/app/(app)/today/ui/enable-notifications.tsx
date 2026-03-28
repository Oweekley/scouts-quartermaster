"use client";

import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";

export function EnableNotifications() {
  const [status, setStatus] = useState<"unsupported" | "default" | "granted" | "denied">("default");

  useEffect(() => {
    if (typeof Notification === "undefined") setStatus("unsupported");
    else setStatus(Notification.permission as "default" | "granted" | "denied");
  }, []);

  if (status === "unsupported") return null;
  if (status === "granted") {
    return (
      <div className="text-xs text-slate-600">
        Notifications enabled
      </div>
    );
  }

  return (
    <Button
      type="button"
      variant="secondary"
      onClick={async () => {
        try {
          const res = await Notification.requestPermission();
          setStatus(res as "default" | "granted" | "denied");
        } catch {
          // ignore
        }
      }}
    >
      Enable notifications
    </Button>
  );
}

