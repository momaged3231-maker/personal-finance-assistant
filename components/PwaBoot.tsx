"use client";

import { useEffect, useRef, useState } from "react";
import { useOffline } from "next/offline";
import { Download, WifiOff } from "lucide-react";
import { installOfflineLayer, flushSyncQueue } from "@/lib/offline";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export default function PwaBoot() {
  const isOffline = useOffline();
  const [localOffline, setLocalOffline] = useState(false);
  const [queued, setQueued] = useState(0);
  const [installEvt, setInstallEvt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isStandalone, setIsStandalone] = useState(false);
  const [showInstall, setShowInstall] = useState(false);
  const queuedTimer = useRef<number | null>(null);

  const offlineNow = isOffline || localOffline;

  useEffect(() => {
    installOfflineLayer();

    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js", {
        scope: "/",
        updateViaCache: "none",
      }).catch(() => undefined);
    }

    setIsStandalone(
      window.matchMedia("(display-mode: standalone)").matches ||
        (window.navigator as { standalone?: boolean }).standalone === true
    );

    setLocalOffline(!navigator.onLine);

    const onOnline = () => {
      setLocalOffline(false);
      flushSyncQueue().catch(() => undefined);
    };
    const onOffline = () => {
      setLocalOffline(true);
      import("@/lib/offline")
        .then((m) => m.getQueuedCount())
        .then(setQueued)
        .catch(() => undefined);
    };
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);

    const onStatus = (e: Event) => {
      const detail = (e as CustomEvent<{ offline: boolean; queued: number }>).detail;
      if (detail) {
        if (detail.offline) setLocalOffline(true);
        setQueued(detail.queued);
      }
    };
    window.addEventListener("sahby:offline-status", onStatus);

    const onInstalled = () => setIsStandalone(true);
    window.addEventListener("appinstalled", onInstalled);

    const onBeforeInstall = (e: Event) => {
      e.preventDefault();
      setInstallEvt(e as BeforeInstallPromptEvent);
      setShowInstall(true);
    };
    window.addEventListener("beforeinstallprompt", onBeforeInstall);

    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
      window.removeEventListener("sahby:offline-status", onStatus);
      window.removeEventListener("appinstalled", onInstalled);
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      if (queuedTimer.current) window.clearTimeout(queuedTimer.current);
    };
  }, []);

  useEffect(() => {
    if (isOffline) {
      import("@/lib/offline")
        .then((m) => m.getQueuedCount())
        .then(setQueued)
        .catch(() => undefined);
    }
  }, [isOffline]);

  const handleInstall = async () => {
    if (!installEvt) return;
    await installEvt.prompt();
    const choice = await installEvt.userChoice;
    if (choice.outcome === "accepted") setShowInstall(false);
  };

  return (
    <>
      {(offlineNow || queued > 0) && (
        <div
          role="status"
          className="fixed top-2 left-1/2 -translate-x-1/2 z-[100] flex items-center gap-2 rounded-full border border-amber-500/40 bg-[#1A1206]/95 px-4 py-1.5 text-xs text-amber-200 shadow-lg backdrop-blur"
        >
          <WifiOff className="h-3.5 w-3.5 shrink-0" />
          <span>
            {offlineNow
              ? queued > 0
                ? `أنت أوف لاين — ${queued} تعديل هيتبعت تلقائيًا أول ما ترجع النت`
                : "أنت أوف لاين — البيانات معروضة من نسخة محفوظة"
              : `${queued} تعديل هيتبعت تلقائيًا قريب`}
          </span>
        </div>
      )}

      {showInstall && !isStandalone && (
        <button
          onClick={handleInstall}
          className="fixed bottom-20 left-4 z-[100] flex items-center gap-2 rounded-2xl border border-emerald-500/50 bg-emerald-500/15 px-4 py-2 text-sm font-medium text-emerald-200 shadow-lg backdrop-blur hover:bg-emerald-500/25"
        >
          <Download className="h-4 w-4" />
          ثبّت التطبيق
        </button>
      )}
    </>
  );
}