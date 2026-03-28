"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";

type ScannerControls = {
  stop: () => void;
  switchTorch?: () => Promise<void> | void;
};

type ResolveResult =
  | { kind: "equipment"; id: string }
  | { kind: "bundle"; id: string };

export function QrScanner({
  onStop,
  onResolved,
  offlineResolve,
}: {
  onStop: () => void;
  onResolved?: (result: ResolveResult, rawValue: string) => void;
  offlineResolve?: (rawValue: string) => Promise<ResolveResult | null> | ResolveResult | null;
}) {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const lastValueRef = useRef<string>("");
  const controlsRef = useRef<ScannerControls | null>(null);
  const stopRequestedRef = useRef(false);
  const resolveCacheRef = useRef<Map<string, ResolveResult>>(new Map());

  const [status, setStatus] = useState<"starting" | "scanning" | "stopped" | "error">("starting");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [torchSupported, setTorchSupported] = useState(false);
  const [torchOn, setTorchOn] = useState(false);

  const readerRef = useRef<unknown>(null);

  function stopCamera() {
    stopRequestedRef.current = true;
    try {
      controlsRef.current?.stop();
    } catch {
      // ignore
    }
    controlsRef.current = null;
    const video = videoRef.current;
    const stream = video?.srcObject;
    if (stream && typeof (stream as MediaStream).getTracks === "function") {
      for (const t of (stream as MediaStream).getTracks()) t.stop();
    }
    if (video) video.srcObject = null;
  }

  function tryHaptic() {
    try {
      navigator.vibrate?.(50);
    } catch {
      // ignore
    }
  }

  function beep() {
    try {
      const AudioContext =
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (window as any).AudioContext || (window as any).webkitAudioContext;
      if (!AudioContext) return;
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = 880;
      gain.gain.value = 0.05;
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      setTimeout(() => {
        osc.stop();
        void ctx.close();
      }, 90);
    } catch {
      // ignore
    }
  }

  async function resolveAndGo(value: string) {
    const v = value.trim();
    if (!v) return;
    if (stopRequestedRef.current) return;
    if (busy) return;
    setBusy(true);
    try {
      if (offlineResolve && typeof navigator !== "undefined" && navigator.onLine === false) {
        const offline = await offlineResolve(v);
        if (offline) {
          if (onResolved) onResolved(offline, v);
          else router.push(offline.kind === "bundle" ? `/checkouts/new?bundleId=${encodeURIComponent(offline.id)}` : `/equipment/${offline.id}`);
          return;
        }
      }

      const cached = resolveCacheRef.current.get(v);
      if (cached) {
        if (onResolved) onResolved(cached, v);
        else router.push(cached.kind === "bundle" ? `/checkouts/new?bundleId=${encodeURIComponent(cached.id)}` : `/equipment/${cached.id}`);
        return;
      }

      const res = await fetch(`/api/qr/resolve?value=${encodeURIComponent(v)}`, { method: "GET" });
      if (!res.ok) throw new Error("No matching item.");
      const data = (await res.json()) as Partial<ResolveResult> & { id?: string };
      const kind = data.kind === "bundle" ? "bundle" : "equipment";
      const id = String(data.id ?? "");
      if (!id) throw new Error("Could not resolve QR code.");

      const resolved = { kind, id } as ResolveResult;
      resolveCacheRef.current.set(v, resolved);
      if (onResolved) onResolved(resolved, v);
      else router.push(kind === "bundle" ? `/checkouts/new?bundleId=${encodeURIComponent(id)}` : `/equipment/${id}`);
    } catch (e) {
      if (offlineResolve) {
        try {
          const offline = await offlineResolve(v);
          if (offline) {
            if (onResolved) onResolved(offline, v);
            else router.push(offline.kind === "bundle" ? `/checkouts/new?bundleId=${encodeURIComponent(offline.id)}` : `/equipment/${offline.id}`);
            return;
          }
        } catch {
          // ignore offline resolver errors
        }
      }
      setError(e instanceof Error ? e.message : "Could not resolve QR code.");
      setStatus("error");
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    let stopped = false;

    async function start() {
      stopRequestedRef.current = false;
      lastValueRef.current = "";
      setTorchSupported(false);
      setTorchOn(false);
      setStatus("starting");
      setError(null);
      const video = videoRef.current;
      if (!video) return;

      try {
        if (!readerRef.current) {
          const mod = await import("@zxing/browser");
          readerRef.current = new mod.BrowserMultiFormatReader();
        }

        setStatus("scanning");

        const onResult = (result: unknown, err: unknown) => {
          if (stopped) return;
          if (stopRequestedRef.current) return;
          if (result && typeof (result as { getText?: unknown }).getText === "function") {
            const text = String((result as { getText: () => string }).getText() ?? "").trim();
            if (!text) return;
            if (text === lastValueRef.current) return;
            lastValueRef.current = text;
            stopCamera();
            tryHaptic();
            beep();
            void resolveAndGo(text);
            return;
          }

          const errName = (err as { name?: string } | null)?.name;
          if (err && errName !== "NotFoundException") {
            const message = (err as { message?: string } | null)?.message ?? "Camera scan error.";
            setError(message);
          }
        };

        const reader = readerRef.current as {
          decodeFromConstraints: (...args: unknown[]) => Promise<unknown>;
          decodeFromVideoDevice: (...args: unknown[]) => Promise<unknown>;
        };

        controlsRef.current = (await reader.decodeFromConstraints(
          { video: { facingMode: { ideal: "environment" } } },
          video,
          onResult,
        )) as unknown as ScannerControls;
        setTorchSupported(typeof controlsRef.current?.switchTorch === "function");
      } catch {
        try {
          const mod = await import("@zxing/browser");
          const devices = await mod.BrowserMultiFormatReader.listVideoInputDevices();
          const preferred =
            devices.find((d) => /back|rear|environment/i.test(d.label))?.deviceId ??
            devices[0]?.deviceId;

          if (!preferred) {
            setStatus("error");
            if (typeof window !== "undefined" && !window.isSecureContext) {
              setError("Camera access requires HTTPS (or localhost).");
              return;
            }
            setError("No camera found (or camera permission not granted).");
            return;
          }

          setStatus("scanning");
          const reader = readerRef.current as {
            decodeFromConstraints: (...args: unknown[]) => Promise<unknown>;
            decodeFromVideoDevice: (...args: unknown[]) => Promise<unknown>;
          };
          controlsRef.current = (await reader.decodeFromVideoDevice(preferred, video, (result: unknown, err: unknown) => {
            if (stopped) return;
            if (result && typeof (result as { getText?: unknown }).getText === "function") {
              const text = String((result as { getText: () => string }).getText() ?? "").trim();
              if (!text) return;
              if (text === lastValueRef.current) return;
              lastValueRef.current = text;
              stopCamera();
              tryHaptic();
              beep();
              void resolveAndGo(text);
              return;
            }

            const errName = (err as { name?: string } | null)?.name;
            if (err && errName !== "NotFoundException") {
              const message = (err as { message?: string } | null)?.message ?? "Camera scan error.";
              setError(message);
            }
          })) as unknown as ScannerControls;
          setTorchSupported(typeof controlsRef.current?.switchTorch === "function");
        } catch (e2) {
          const name = (e2 as { name?: string } | null)?.name;
          const message =
            name === "NotAllowedError"
              ? "Camera permission denied. Allow camera access and try again."
              : name === "NotFoundError"
                ? "No camera device available."
                : typeof window !== "undefined" && !window.isSecureContext
                  ? "Camera access requires HTTPS (or localhost)."
                  : e2 instanceof Error
                    ? e2.message
                    : "Could not start camera.";
          setStatus("error");
          setError(message);
        }
      }
    }

    void start();

    return () => {
      stopped = true;
      stopCamera();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="font-medium text-slate-900">Camera scan</div>
          <div className="mt-1 text-sm text-slate-600">Point the camera at a QR code label.</div>
        </div>
        <div className="flex items-center gap-2">
          {torchSupported ? (
            <Button
              type="button"
              variant="secondary"
              onClick={async () => {
                try {
                  await controlsRef.current?.switchTorch?.();
                  setTorchOn((v) => !v);
                } catch {
                  // ignore
                }
              }}
              disabled={status !== "scanning"}
            >
              Torch {torchOn ? "On" : "Off"}
            </Button>
          ) : null}
          <Button
            type="button"
            variant="secondary"
            onClick={() => {
              stopCamera();
              setStatus("stopped");
              setError(null);
              onStop();
            }}
          >
            Stop
          </Button>
        </div>
      </div>

      <div className="mt-4 overflow-hidden rounded-lg border border-slate-100 bg-black">
        <div className="relative">
          <video ref={videoRef} className="h-[360px] w-full object-cover" playsInline muted />
          <div className="pointer-events-none absolute inset-0 grid place-items-center">
            <div className="h-[220px] w-[220px] rounded-xl border-2 border-white/70 shadow-[0_0_0_9999px_rgba(0,0,0,0.35)]" />
          </div>
        </div>
      </div>

      <div className="mt-3 text-xs text-slate-600">
        Status:{" "}
        {status === "starting"
          ? "Starting camera…"
          : status === "scanning"
            ? "Scanning"
            : status === "stopped"
              ? "Stopped"
              : "Error"}
      </div>
      {error ? (
        <div className="mt-2 rounded-md border border-red-200 bg-red-50 p-2 text-sm text-red-700">
          {error}
        </div>
      ) : null}
    </div>
  );
}
