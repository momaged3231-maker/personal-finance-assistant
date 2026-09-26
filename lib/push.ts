import webpush from "web-push";
import { requireSupabase } from "./supabase";
import { getDueBills } from "./bills";
import { getDebts, getAllGamEyaMeta, computeGamEyaInstallments, formatEgp, updateSetting } from "./finance";

const SUB_KEY = "push_subscription";

type StoredSubscription = { endpoint: string; keys: { p256dh: string; auth: string } };

export function isPushConfigured(): boolean {
  return Boolean(process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY && process.env.VAPID_SUBJECT);
}

function setupVapid(): void {
  if (!webpush?.setVapidDetails) return;
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || "mailto:admin@sahby.app",
    process.env.VAPID_PUBLIC_KEY || "",
    process.env.VAPID_PRIVATE_KEY || ""
  );
}

export async function savePushSubscription(userId: number, subscription: StoredSubscription): Promise<void> {
  await updateSetting(SUB_KEY, JSON.stringify(subscription), userId);
}

export async function getPushSubscription(userId: number): Promise<StoredSubscription | null> {
  const client = requireSupabase();
  const { data } = await client
    .from("settings")
    .select("value")
    .eq("user_id", userId)
    .eq("key", SUB_KEY)
    .maybeSingle();
  if (!data || !(data as { value?: string }).value) return null;
  try {
    return JSON.parse((data as { value: string }).value) as StoredSubscription;
  } catch {
    return null;
  }
}

export async function removePushSubscription(userId: number): Promise<void> {
  const client = requireSupabase();
  await client.from("settings").delete().eq("user_id", userId).eq("key", SUB_KEY);
}

export async function sendPushToUser(userId: number, title: string, body: string, url = "/"): Promise<boolean> {
  if (!isPushConfigured()) return false;
  setupVapid();
  const sub = await getPushSubscription(userId);
  if (!sub) return false;
  try {
    await webpush.sendNotification(
      sub as { endpoint: string; keys: { p256dh: string; auth: string } },
      JSON.stringify({ title, body, url })
    );
    return true;
  } catch (e) {
    const code = (e as { statusCode?: number })?.statusCode;
    if (code === 404 || code === 410) await removePushSubscription(userId);
    return false;
  }
}

/** Push reminders for bills due today or overdue. Returns number of notifications sent. */
export async function sendDueBillsPush(userId: number): Promise<number> {
  if (!isPushConfigured()) return 0;
  const due = await getDueBills(userId);
  if (due.length === 0) return 0;

  const first = due[0];
  const title = due.length === 1 ? "راتب الدفعات… فاتورة مستحقة اليوم" : `${due.length} فواتير مستحقة — راجعها`;
  const statusLabel = first.days_until_due < 0 ? "متأخرة" : "مستحقة اليوم";
  const extra = due.length > 1 ? ` + ${due.length - 1} غيرها` : "";
  const body = `${first.name} — ${formatEgp(first.amount)} (${statusLabel})${extra}`;
  return (await sendPushToUser(userId, title, body, "/bills")) ? 1 : 0;
}

/** Push reminders for gam'eya installments due today or overdue. Returns number of notifications sent. */
export async function sendGamEyaDuePush(userId: number): Promise<number> {
  if (!isPushConfigured()) return 0;

  const metas = await getAllGamEyaMeta(userId);
  const debts = await getDebts(userId);
  if (!metas || !debts.length) return 0;

  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

  const dueNames: string[] = [];
  for (const debt of debts) {
    const meta = metas[Number(debt.id)];
    if (!meta) continue;
    const installments = computeGamEyaInstallments(debt as { paid_amount: number }, meta);
    const due = installments.find((i) => !i.paid && i.dueDate && i.dueDate <= today);
    if (due) {
      const title = (debt as { title?: string }).title || "جمعية";
      dueNames.push(`${title}: ${formatEgp(due.amount)}`);
    }
  }

  if (!dueNames.length) return 0;
  const title = dueNames.length === 1 ? "قسط جمعية مستحق اليوم" : `${dueNames.length} أقساط جمعيات مستحقة`;
  const body = dueNames.slice(0, 3).join(" • ") + (dueNames.length > 3 ? ` +${dueNames.length - 3}` : "");
  return (await sendPushToUser(userId, title, body, "/debts")) ? 1 : 0;
}