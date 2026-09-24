import { NextResponse } from "next/server";
import { getSupabaseClient, isSupabaseConfigured } from "@/lib/supabase";

export async function GET() {
  try {
    const configured = isSupabaseConfigured();
    if (!configured) {
      return NextResponse.json({
        configured: false,
        message: "لم يتم ضبط متغيرات Supabase في ملف .env.local بعد",
        envHelp: {
          SUPABASE_URL: process.env.SUPABASE_URL ? "موجود" : "غير متوفر",
          SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY ? "موجود" : "غير متوفر",
        },
      });
    }

    const client = getSupabaseClient();
    if (!client) {
      return NextResponse.json({ configured: false, error: "تعذر إنشاء اتصال Supabase" });
    }

    // Ping accounts table
    const { data, error } = await client.from("accounts").select("id, name").limit(5);

    if (error) {
      return NextResponse.json({
        configured: true,
        connected: false,
        error: error.message,
        hint: "تأكد من تشغيل ملف supabase_schema.sql في محرر SQL في موقع Supabase أولاً لإنشاء الجداول",
      });
    }

    return NextResponse.json({
      configured: true,
      connected: true,
      message: "تم الاتصال بنجاح بقاعدة بيانات Supabase السحابية!",
      accountsFound: data?.length || 0,
      accounts: data,
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "خطأ غير متوقع";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}