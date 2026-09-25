import Link from "next/link";
import { ArrowRight, CheckCircle2, AlertTriangle, Lock, Scale, Trash2 } from "lucide-react";

const sections = [
  {
    icon: Lock,
    title: "الخدمة والوصول",
    body: "تسجيل الدخول يمنحك الوصول لمساحتك المالية الشخصية حصراً. أنت مسؤول عن سرية بيانات دخولك، وكل نشاط يحدث من حسابك يُنسب إليك.",
  },
  {
    icon: CheckCircle2,
    title: "حساباتك الافتراضية",
    body: "عند إنشاء الحساب نجهّز لك حسابات وتصنيفات افتراضية لتنطلق صورتك المالية فوراً. يمكنك تعديلها أو حذفها في أي وقت من صفحة الإعدادات، وحذفها لا يعني حذف الحساب.",
  },
  {
    icon: AlertTriangle,
    title: "المعلومات والمساعد الذكي",
    body: "صحبي يحسب من الأرقام المسجلة في حسابك فقط. أي إجابة مالية ناتجة عن بياناتك قد تكون غير دقيقة إن كانت هناك مصاريف لم تسجلها بعد. نحن لسنا مستشاراً مالياً مرخصاً، والقرارات المالية قرارك أنت.",
  },
  {
    icon: Scale,
    title: "إساءة الاستخدام والحظر",
    body: "نحتفظ بحق تعليق أو حظر أي حساب يُساء استخدامه أو يُستخدم لأغراض مخالفة، مع إشعار مسبق حيثما أمكن.",
  },
  {
    icon: Trash2,
    title: "الإنهاء والبيانات",
    body: "الخدمة تمنحك تصدير بياناتك وحذف حسابك نهائياً في أي وقت من صفحة الإعدادات. الحذف فوري ولا يمكن التراجع عنه.",
  },
];

export default function TermsPage() {
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
        <h1 className="text-3xl font-black text-white">شروط الاستخدام</h1>
        <p className="text-sm text-slate-400 leading-relaxed">
          آخر تحديث: سبتمبر 2026 — باستخدامك «صحبي» فأنت توافق على هذه الشروط.
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
        لحماية بياناتك راجع{" "}
        <Link href="/privacy" className="text-blue-400 font-bold hover:text-blue-300">
          سياسة الخصوصية
        </Link>
        ، ولأي استفسار راسلنا.
      </p>
    </div>
  );
}