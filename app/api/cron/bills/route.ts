import { NextRequest, NextResponse } from "next/server";
import { requireSupabase } from "@/lib/supabase";
import { processDailyBills } from "@/lib/bills";
import { sendDueBillsPush, sendGamEyaDuePush } from "@/lib/push";

/**
 * Daily billing cron — invoked by Vercel Cron (vercel.json) at 06:00 UTC.
 * Guarded by the project's CRON_SECRET env (Vercel sends it automatically),
 * with `x-vercel-cron` accepted as a fallback when no secret is configured.
 */
export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization") || "";
  const cronHeader = req.headers.get("x-vercel-cron");
  const secret = process.env.CRON_SECRET;
  const authorized = secret ? auth === `Bearer ${secret}` : cronHeader === "1";

  if (!authorized) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
  }

  try {
    const client = requireSupabase();
    const { data: users } = await client.from("users").select("id");
    const ids = (users ?? []) as Array<{ id: number }>;

    const result = { advanced: 0, autoPaid: 0, pushBills: 0, pushGamEya: 0, errors: [] as string[] };

    for (const u of ids) {
      try {
        const r = await processDailyBills(u.id);
        result.advanced += r.advanced;
        result.autoPaid += r.autoPaid;
        result.errors.push(...r.errors);

        result.pushBills += await sendDueBillsPush(u.id);
        result.pushGamEya += await sendGamEyaDuePush(u.id);
      } catch (e) {
        result.errors.push(`user ${u.id}: ${e instanceof Error ? e.message : "خطأ"}`);
      }
    }

    return NextResponse.json({ success: true, ...result });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Cron error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}