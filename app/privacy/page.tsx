import Link from "next/link";
import { ArrowRight, ShieldCheck, Lock, Trash2, Download, Eye } from "lucide-react";

const sections = [
  {
    icon: Eye,
    title: "إيه اللي بنجمعه منك؟",
    body: "عند تسجيل الدخول نعرف اسمك وبريدك الإلكتروني وخيارات الاشتراك التي تختارها. عند إرسال قايمة الانتظار نعرف اسمك وبريدك وهدفك المالي الذي تكتبه طوعاً. كل هذا بموافقتك الصريحة.",
  },
  {
    icon: Lock,
    title: "بنخزن إزاي؟ وبأمان إزاي؟",
    body: "حسابك معزول تماماً عن أي حساب آخر (بنية Multi-Tenant مع قواعد أمان RLS على Supabase). كلمات المرور مُشفّرة بمعيار scrypt ولا تُخزَّن كنص. جلسة الدخول كوكي موقّع رقمياً (HMAC) لا يمكن تزويره من المتصفح.",
  },
  {
    icon: ShieldCheck,
    title: "إيه اللي مش بنطلبه أبداً؟",
    body: "لا نطلب كلمات مرور بنكية، ولا أرقام بطاقات، ولا رموز OTP، ولا أي ربط مالي بحسابك البنكي. صحبي يرى فقط ما تسجّله أنت بنفسك.",
  },
  {
    icon: Download,
    title: "بياناتك ملكك",
    body: "بأي وقت تصدّر نسخة كاملة من بياناتك بصيغة JSON بضغطة واحدة من صفحة الإعدادات، أو تحذف حسابك وجميع البيانات المرتبطة به نهائياً وفورياً.",
  },
  {
    icon: Trash2,
    title: "قايمة الانتظار والتسويق",
    body: "بيانات قايمة الانتظار تُستخدم فقط لإعلامك بفتح التسجيل الفعلي، وأبداً لا تُباع ولا تُؤجَّر لأي طرف. يمكنك إلغاء اشتراكك في أي وقت.",
  },
];

export default function PrivacyPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <Link
        href="/"
        className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-400 hover:text-white transition-colors mb-8"
      >
        <ArrowRight className="w-3.5 h-3.5 rotate-180" />
        العودة للرئيسية
      </Link>

      <div className="space-y-2 mb-10">
        <h1 className="text-3xl font-black text-white">سياسة الخصوصية</h1>
        <p className="text-sm text-slate-400 leading-relaxed">
          آخر تحديث: سبتمبر 2026 — الخلاصة قبل أي تفصيلة: <span className="text-emerald-400 font-bold">فلوسك وبياناتك مش عندنا، ومحدش هيشوفها غيرك.</span>
        </p>
      </div>

      <div className="space-y-4">
        {sections.map((s, idx) => {
          const Icon = s.icon;
          return (
            <div key={idx} className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 sm:p-6">
              <div className="flex items-center gap-3 mb-2.5">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/15 border border-emerald-500/25 flex items-center justify-center">
                  <Icon className="w-4 h-4 text-emerald-400" />
                </div>
                <h2 className="text-sm font-black text-slate-100">{s.title}</h2>
              </div>
              <p className="text-sm text-slate-300 leading-relaxed">{s.body}</p>
            </div>
          );
        })}
      </div>

      <p className="text-xs text-slate-500 mt-8 leading-relaxed">
        لأي استفسار عن خصوصيتك راسلنا، وتقدر في أي وقت تراجع{" "}
        <Link href="/terms" className="text-blue-400 font-bold hover:text-blue-300">
          شروط الاستخدام
        </Link>
        .
      </p>
    </div>
  );
}