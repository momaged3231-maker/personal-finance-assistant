"use client";

import { useCallback, useEffect, useState } from "react";
import { Bell, BellOff, Loader2 } from "lucide-react";

type NotifState = "loading" | "off" | "enabled" | "unsupported";

function base64UrlToUint8Array(input: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (input.length % 4)) % 4);
  const base64 = (input + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

export default function PushToggle() {
  const [state, setState] = useState<NotifState>("loading");
  const [configured, setConfigured] = useState(false);

  const syncState = useCallback(async () => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator) || !("PushManager" in window)) {
      setState("unsupported");
      return;
    }
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription().catch(() => null);
    setState(sub ? "enabled" : "off");
  }, []);

  useEffect(() => {
    fetch("/api/push/subscribe", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d && typeof d.configured === "boolean") setConfigured(d.configured);
      })
      .catch(() => undefined);
    syncState().catch(() => undefined);
  }, [syncState]);

  const requestPermission = async () => {
    if (state === "loading") return;
    try {
      let permission = "default";
      if (Notification.permission === "granted") permission = "granted";
      else if (Notification.permission !== "denied") {
        permission = await Notification.requestPermission();
      }
      if (permission !== "granted") {
        alert("السماح بالإشعارات ضروري علشان تقدر تستقبل تنبيهات الفواتير والجمعيات.");
        return;
      }

      const reg = await navigator.serviceWorker.ready;
      let sub = await reg.pushManager.getSubscription();
      if (!sub) {
        const keyRes = await fetch("/api/push/vapid", { cache: "no-store" });
        const keyData = await keyRes.json();
        if (!keyData?.publicKey) {
          alert("السيرفر لسه مش مهيّأ للإشعارات — جرب بعد شوية.");
          return;
        }
        sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: base64UrlToUint8Array(keyData.publicKey),
        });
      }
      const json = sub.toJSON();
      const res = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subscription: { endpoint: json.endpoint, keys: json.keys },
        }),
      });
      if (res.ok) setState("enabled");
    } catch {
      alert("حصلت مشكلة في تفعيل الإشعارات — حاول تاني.");
    }
  };

  const disableNotifications = async () => {
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) await sub.unsubscribe();
      await fetch("/api/push/subscribe", { method: "DELETE" });
      setState("off");
    } catch {
      /* ignore */
    }
  };

  if (state === "loading") {
    return (
      <button className="flex items-center gap-2 text-slate-400 text-sm" disabled>
        <Loader2 className="h-4 w-4 animate-spin" />
        بفحص الإشعارات…
      </button>
    );
  }

  if (state === "unsupported") {
    return <span className="text-sm text-slate-500">الإشعارات غير مدعومة على المتصفح ده</span>;
  }

  if (state === "enabled") {
    return (
      <button
        onClick={disableNotifications}
        className="flex items-center gap-2 rounded-xl border border-slate-700/80 bg-slate-900/80 px-4 py-2.5 text-sm text-slate-200 hover:border-rose-500/50 hover:text-rose-300 transition"
      >
        <BellOff className="h-4 w-4" />
        إيقاف الإشعارات
      </button>
    );
  }

  return (
    <button
      onClick={requestPermission}
      className="flex items-center gap-2 rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-2.5 text-sm text-emerald-200 hover:bg-emerald-500/20 transition"
    >
      <Bell className="h-4 w-4" />
      تفعيل الإشعارات
      {!configured && <span className="text-xs text-slate-500">(بانتظار ضبط السيرفر)</span>}
    </button>
  );
}