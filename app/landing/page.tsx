"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Check,
  ShieldCheck,
  Lock,
  ChevronDown,
  Sparkles,
  Bot,
  User,
  Calendar,
  Wallet,
  ArrowUpRight,
  TrendingDown,
  HelpCircle,
  Clock,
  Layers,
  FileText,
  Mic,
  Zap,
} from "lucide-react";

export default function LandingPage() {
  const [billingCycle, setBillingCycle] = useState<"monthly" | "annual">("annual");
  const [faqOpen, setFaqOpen] = useState<number | null>(0);

  const loopSteps = [
    {
      num: "01",
      title: "أدخل حاجة مرة",
      desc: "اكتب أو اتكلم بأي طريقة طبيعية: «قبضت مرتب 12,000»، «دفعت 150 في السوبرماركت»، أو «سددت قسط الجمعية».",
    },
    {
      num: "02",
      title: "المساعد يفهمها",
      desc: "يفرز الأرقام، يحدد نوع المعاملة (دخل، مصروف، تحويل)، ويربطها بالحساب المناسب في ثانية واحدة وبدون أي تعقيد.",
    },
    {
      num: "03",
      title: "يبني سياقك المالي",
      desc: "لا يتعامل مع المعاملة كرقم منفصل، بل يربطها فوراً بالتزامات الشهر ورصيدك المتاح والأقساط المنتظرة.",
    },
    {
      num: "04",
      title: "يراقب وتيرة التغيير",
      desc: "يتابع حركة سيولتك يوم بيوم بهدوء، ويكتشف إذا كان نمط الصرف أسرع من المتوقع قبل منتصف الشهر.",
    },
    {
      num: "05",
      title: "يسأل لما يكون السؤال مفيد",
      desc: "«تحب أعتبر ده مرتب شهري ولا دخل إضافي؟»، «المبلغ ده نسجله من الكاش ولا المحفظة؟».. أسئلة قليلة وذكية تبني وضوحك.",
    },
    {
      num: "06",
      title: "يفهم عاداتك الحقيقية",
      desc: "يتعرف على بنود الصرف الخفية، وأيام الذروة في الأسبوع، والفروقات بين مصاريفك الأساسية والكمالية.",
    },
    {
      num: "07",
      title: "يساعدك قبل المشكلة",
      desc: "ينبهك قبل ميعاد القسط أو قبل ما الفلوس تخلص، ويقولك متبقي كام آمن تصرفه لحد نهاية الشهر.",
    },
  ];

  const useCases = [
    {
      icon: Wallet,
      tag: "لحظة الدخل",
      title: "نزول المرتب أو الدخل",
      desc: "أول ما الفلوس تنزل، المساعد يفرز التزامات الشهر الثابتة فوراً ويطلعلك «الرصيد الحر الحقيقي» اللي تقدر تتصرف فيه بأمان من غير ما تفاجأ بآخر الشهر.",
    },
    {
      icon: Zap,
      tag: "المصروف اليومي",
      title: "المصاريف اليومية العفوية",
      desc: "رسالة سريعة أو صوتية: «دفعت 150 جنيه بنزين و 40 جنيه سوبرماركت».. المساعد يفصلهم ويخصمهم من محفظتك بدون ما تفتح 5 شاشات وقوائم.",
    },
    {
      icon: Calendar,
      tag: "الالتزامات",
      title: "متابعة الجمعيات والأقساط",
      desc: "تذكير استباقي قبل ميعاد دور الجمعية أو قسط الكارت بأسبوع، مع مراجعة رصيدك المتاح للتأكد إنك جاهز بدون أي ضغط مالي مفاجئ.",
    },
    {
      icon: HelpCircle,
      tag: "القرار قبل الشراء",
      title: "القرارات المالية قبل الشراء",
      desc: "عاوز تشتري حاجة بـ 4,000 جنيه؟ اسأل المساعد: «هل أقدر اشتري ده النهارده؟».. فيحلل التزاماتك المتبقية وميزانية الشهر ويجاوبك بقرار واقعي وصريح.",
    },
    {
      icon: ArrowUpRight,
      tag: "العلاقات المالية",
      title: "فلوسك اللي برة (الديون والتسليفات)",
      desc: "حصر فوري ومحترم لأي مبالغ سلفتها لأصحابك أو ديون عليك مع تواريخ السداد، علشان كل مليم يكون واضح ومحسوب من غير إحراج أو نسيان.",
    },
    {
      icon: Sparkles,
      tag: "الادخار التلقائي",
      title: "أهداف الادخار الحقيقية",
      desc: "حجز جزء صغير من الفائض أسبوعياً لصندوق طوارئ أو هدف حقيقي (سفر، جهاز، صيانة) بدون تضييق على مصاريفك الأساسية.",
    },
  ];

  const faqs = [
    {
      q: "هل المساعد بيطلب بيانات حسابي البنكي أو بطاقتي؟",
      a: "مطلقاً. التطبيق لا يطلب ولا يخزن أي كلمات مرور بنكية، ولا أرقام بطاقات سرية، ولا رموز OTP إطلاقاً. أنت تدخل حركاتك بنفسك أو بصوتك بأمان تام وبدون أي ربط بنكي حساس.",
    },
    {
      q: "مين يقدر يشوف بياناتي ومعاملاتي المالية؟",
      a: "أنت فقط. كل حساب معزول تماماً بتقنية Multi-Tenant مشفرة على خوادم Supabase السحابية مع قواعد أمان صارمة (RLS). لا يمكن لأي مستخدم آخر أو جهة الاطلاع على سجلاتك.",
    },
    {
      q: "هل أقدر أصدر بياناتي أو أحذف حسابي في أي وقت؟",
      a: "نعم، بنسبة 100%. بياناتك ملكك وحدك بالكامل؛ يمكنك تصدير كل سجلاتك بنقرة واحدة، أو طلب حذف حسابك وكل بياناتك المرتبطة به نهائياً وبشكل فوري.",
    },
    {
      q: "هل التطبيق مخصص لطبيعة المعاملات في مصر؟",
      a: "نعم تماماً، مصمم من الصفر ليفهم الجنيه المصري، معاملات انستاباي، المحافظ الإلكترونية (فودافون كاش وأورانج ووي كاش)، الجمعيات الشهرية، والأقساط العادية بدون مصطلحات معقدة.",
    },
    {
      q: "ما الفرق بين النسخة المجانية والاحترافية؟",
      a: "النسخة المجانية تمنحك تحكماً كاملاً لتعرف فلوسك (تسجيل، حسابات، رصيد لحظي، مساعد ذكي). النسخة الاحترافية تجعل المساعد شريكاً استباقياً يبدأ يساعدك في إدارتها عبر الذاكرة المالية الممتدة، التنبؤ بالتدفق النقدي، والتنبيهات المسبقة.",
    },
  ];

  return (
    <div className="relative py-8 md:py-16 space-y-24 md:space-y-36">
      {/* ─────────────────────────────────────────────────────────────
          1. HERO SECTION
          "فلوسك مش محتاجة جدول… محتاجة حد يفهمها."
      ───────────────────────────────────────────────────────────── */}
      <section className="text-center max-w-4xl mx-auto pt-6 md:pt-12 px-4">
        {/* Eyebrow Tag */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold mb-6">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span>مساعدك المالي الشخصي بالذكاء الاصطناعي</span>
        </div>

        {/* Main Human Headline */}
        <h1 className="text-4xl sm:text-5xl md:text-6xl font-black text-[#F8FAFC] tracking-tight leading-[1.25]">
          فلوسك مش محتاجة جدول…
          <span className="block mt-2 text-slate-400 font-extrabold">
            محتاجة حد يفهمها.
          </span>
        </h1>

        {/* Sub-headline */}
        <p className="mt-6 text-base sm:text-lg md:text-xl text-slate-300 max-w-2xl mx-auto leading-relaxed font-normal">
          مساعدك المالي الشخصي اللي يتابع دخلك ومصاريفك، يفهم عاداتك، ويفكّر معاك قبل ما الفلوس تخلص.
        </p>

        {/* Main CTA */}
        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            href="/signup"
            className="btn-pill-primary w-full sm:w-auto px-8 py-4 text-base"
          >
            <span>ابدأ مجانًا</span>
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <Link
            href="/login"
            className="btn-pill-secondary w-full sm:w-auto px-6 py-4 text-sm"
          >
            تسجيل الدخول
          </Link>
        </div>

        {/* Trust Badge */}
        <p className="mt-4 text-xs sm:text-sm text-slate-400 font-medium">
          بدون بطاقة بنكية • بياناتك تحت سيطرتك • ابدأ في أقل من دقيقة
        </p>
      </section>

      {/* ─────────────────────────────────────────────────────────────
          2. LIVE AI CONVERSATION SHOWCASE (أهم شاشة في الصفحة)
          "هنا المستخدم يفهم المنتج في 10 ثواني"
      ───────────────────────────────────────────────────────────── */}
      <section className="max-w-3xl mx-auto px-4">
        <div className="card-fintech overflow-hidden shadow-2xl shadow-black/40 border border-slate-800">
          {/* Top Window Bar (Apple Wallet / Notion minimalist style) */}
          <div className="px-5 py-3.5 border-b border-slate-800/80 bg-[#0C111C]/80 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-slate-700" />
              <span className="w-2.5 h-2.5 rounded-full bg-slate-700" />
              <span className="w-2.5 h-2.5 rounded-full bg-slate-700" />
              <span className="text-xs font-semibold text-slate-400 mr-2">
                محادثة ذكية لحظية
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-[11px] text-emerald-400 font-medium bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>جاهز للاستماع</span>
            </div>
          </div>

          {/* Authentic Real-Life Conversation */}
          <div className="p-6 md:p-8 space-y-5 bg-[#090D16]/95">
            {/* Step 1: User Input */}
            <div className="flex items-start gap-3 justify-end">
              <div className="bubble-user px-4 py-3 max-w-[85%] sm:max-w-[70%] text-sm leading-relaxed">
                <span className="text-slate-100 font-medium">
                  قبضت 12,000 جنيه النهارده
                </span>
                <span className="block text-[10px] text-slate-400 mt-1 text-left">
                  10:14 ص
                </span>
              </div>
              <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center shrink-0 border border-slate-700">
                <User className="w-4 h-4 text-slate-300" />
              </div>
            </div>

            {/* Step 2: Assistant Clarification */}
            <div className="flex items-start gap-3 justify-start">
              <div className="w-8 h-8 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center shrink-0">
                <Bot className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="bubble-assistant px-4 py-3.5 max-w-[88%] sm:max-w-[75%] text-sm leading-relaxed space-y-1">
                <p className="text-slate-200">تمام 👌 سجلت 12,000 جنيه دخل.</p>
                <p className="text-emerald-300 font-medium">
                  تحب أعتبرهم مرتب ولا دخل إضافي؟
                </p>
                <span className="block text-[10px] text-slate-400 mt-1">
                  10:14 ص
                </span>
              </div>
            </div>

            {/* Step 3: User Clarifies */}
            <div className="flex items-start gap-3 justify-end">
              <div className="bubble-user px-4 py-2.5 max-w-[85%] sm:max-w-[70%] text-sm leading-relaxed">
                <span className="text-slate-100 font-medium">مرتب</span>
                <span className="block text-[10px] text-slate-400 mt-1 text-left">
                  10:15 ص
                </span>
              </div>
              <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center shrink-0 border border-slate-700">
                <User className="w-4 h-4 text-slate-300" />
              </div>
            </div>

            {/* Step 4: Assistant Immediate Context & Clarity */}
            <div className="flex items-start gap-3 justify-start">
              <div className="w-8 h-8 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center shrink-0">
                <Bot className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="bubble-assistant px-4 py-3.5 max-w-[92%] sm:max-w-[80%] text-sm leading-relaxed space-y-2">
                <p className="text-slate-200 flex items-center gap-1.5">
                  <span>اتسجل كمرتب</span>
                  <span className="text-emerald-400 font-bold">✅</span>
                </p>
                <p className="text-slate-300">
                  عندك كمان{" "}
                  <strong className="text-white font-semibold">2 التزام</strong> خلال الأسبوع ده بقيمة{" "}
                  <strong className="text-amber-300 font-semibold">780 جنيه</strong>.
                </p>
                <div className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800 text-xs flex items-center justify-between">
                  <span className="text-slate-400">المتوقع يفضل معاك حر:</span>
                  <span className="text-emerald-400 font-black text-sm">
                    4,320 جنيه
                  </span>
                </div>
                <span className="block text-[10px] text-slate-400 mt-1">
                  10:15 ص
                </span>
              </div>
            </div>
          </div>

          {/* Minimalist Financial Status Ribbon */}
          <div className="p-4 bg-[#0A0E1A] border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 text-slate-400">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <span>المساعد يربط تلقائياً بين تدفقك النقدي والتزاماتك الحقيقية</span>
            </div>
            <div className="text-slate-400 font-medium">
              النتيجة: <span className="text-slate-200 font-bold">وضوح كامل في 10 ثواني</span>
            </div>
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────
          3. PRODUCT LOOP: إزاي المساعد بيتابع معاك
          أدخل حاجة مرة ← المساعد يفهمها ← يبني سياق مالي ← يراقب التغيير
          ← يسألني لما يكون السؤال مفيد ← يفهم عادتي ← يساعدني قبل المشكلة
      ───────────────────────────────────────────────────────────── */}
      <section className="max-w-4xl mx-auto px-4">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <span className="tag-emerald mb-3">مسار التجربة اليومية</span>
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-black text-[#F8FAFC] tracking-tight">
            إزاي المساعد بيتابع معاك؟
          </h2>
          <p className="mt-3 text-sm sm:text-base text-slate-400 leading-relaxed">
            مش مجرد شاشة تسجل فيها وتنسى.. بل مسار ذكي يبني فهماً مستمراً لفلوسك من أول يوم:
          </p>
        </div>

        {/* Step-by-Step Elegant Loop Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {loopSteps.map((step, idx) => (
            <div
              key={idx}
              className={`card-fintech p-6 relative ${
                idx === 6 ? "md:col-span-2 border-emerald-500/30 bg-emerald-950/10" : ""
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-mono font-bold text-slate-400 bg-slate-800/60 px-2.5 py-1 rounded-md">
                  {step.num}
                </span>
                {idx === 6 && (
                  <span className="text-xs font-bold text-emerald-400 flex items-center gap-1">
                    <Check className="w-3.5 h-3.5" /> الهدف النهائي
                  </span>
                )}
              </div>
              <h3 className="text-base sm:text-lg font-bold text-white mb-2">
                {step.title}
              </h3>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-normal">
                {step.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────
          4. "مش مجرد سجل مصاريف"
          الفرق بين تطبيق يسجل الماضي ومساعد يمشي معاك للمستقبل
      ───────────────────────────────────────────────────────────── */}
      <section className="max-w-4xl mx-auto px-4">
        <div className="text-center max-w-2xl mx-auto mb-10">
          <span className="tag-emerald mb-3">فارق جوهري</span>
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-black text-[#F8FAFC] tracking-tight">
            مش مجرد سجل مصاريف
          </h2>
          <p className="mt-3 text-sm sm:text-base text-slate-400 leading-relaxed">
            معظم التطبيقات المالية تفشل لأنها تطلب منك أن تصبح مدخل بيانات، ثم تخبرك بما حدث بعد فوات الأوان.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Old Way */}
          <div className="card-fintech p-6 md:p-8 bg-[#0B0F19]/60 border-slate-800/60 opacity-80">
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
              التطبيقات وجداول الإكسيل القديمة
            </div>
            <h3 className="text-lg font-bold text-slate-300 mb-4">
              تسجيل صامت بعد ما الفلوس تخلص
            </h3>
            <ul className="space-y-3 text-xs sm:text-sm text-slate-400">
              <li className="flex items-start gap-2.5">
                <span className="text-rose-400 shrink-0 font-bold">✕</span>
                <span>تفتح التطبيق وتلاقي 40 زرار وتصنيف يصيبك بالملل بعد 3 أيام.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="text-rose-400 shrink-0 font-bold">✕</span>
                <span>يقولك صرفت كام الشهر اللي فات بعد ما الشهر خلص ومفيش حاجة تقدر تغيرها.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="text-rose-400 shrink-0 font-bold">✕</span>
                <span>لا يفهم جمعياتك ولا أقساطك ولا يسألك عن التزاماتك القادمة.</span>
              </li>
            </ul>
          </div>

          {/* New Assistant Way */}
          <div className="card-fintech p-6 md:p-8 border-emerald-500/30 bg-[#0E1526]/90 shadow-xl shadow-emerald-950/20">
            <div className="text-xs font-bold text-emerald-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" /> مساعدك المالي الشخصي
            </div>
            <h3 className="text-lg font-bold text-white mb-4">
              تفكير استباقي يمنع الأزمة قبل وقوعها
            </h3>
            <ul className="space-y-3 text-xs sm:text-sm text-slate-200">
              <li className="flex items-start gap-2.5">
                <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>تتكلم معاه بلهجتك الطبيعية بصوتك أو كتابة كأنه صديق فاهم حساباتك.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>يقولك تقدر تصرف كام النهارده عشان تكفّي التزاماتك لآخر الشهر بأمان.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>يربط بين مصاريفك، أقساطك، رصيدك الحر، ويسألك لما السؤال يكون مفيد.</span>
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────
          5. شوف المساعد بيعمل إيه: 6 حالات استخدام حقيقية
          Real-life financial moments in Egypt
      ───────────────────────────────────────────────────────────── */}
      <section className="max-w-5xl mx-auto px-4">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <span className="tag-emerald mb-3">واقعي وإنساني</span>
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-black text-[#F8FAFC] tracking-tight">
            شوف المساعد بيعمل إيه في يومك الحقيقي
          </h2>
          <p className="mt-3 text-sm sm:text-base text-slate-400 leading-relaxed">
            مهما كانت طبيعة دخلك أو التزاماتك، المساعد جاهز يتعامل مع المواقف المالية الحقيقية:
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
          {useCases.map((uc, idx) => {
            const Icon = uc.icon;
            return (
              <div key={idx} className="card-fintech p-6 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-9 h-9 rounded-xl bg-slate-800/80 border border-slate-700/60 flex items-center justify-center">
                      <Icon className="w-4 h-4 text-emerald-400" />
                    </div>
                    <span className="text-[11px] font-semibold text-slate-400 bg-slate-800/40 px-2 py-0.5 rounded-full">
                      {uc.tag}
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-white mb-2">
                    {uc.title}
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-normal">
                    {uc.desc}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────
          6. FREE vs PRO (The Core Product Philosophy)
          Free = أنا أعرف فلوسي
          Pro = المساعد يبدأ يساعدني في إدارة فلوسي
      ───────────────────────────────────────────────────────────── */}
      <section className="max-w-4xl mx-auto px-4">
        <div className="text-center max-w-2xl mx-auto mb-10">
          <span className="tag-emerald mb-3">فلسفة عادلة وواضحة</span>
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-black text-[#F8FAFC] tracking-tight">
            لا نبيع الميزات الأساسية
          </h2>
          <p className="mt-3 text-sm sm:text-base text-slate-400 leading-relaxed">
            النسخة المجانية تمنحك معرفة تامة بفلوسك بدون قيود مصطنعة. والترقية فقط عندما تريد مساعداً استباقياً يفكر معك.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
          {/* FREE PLAN */}
          <div className="card-fintech p-6 sm:p-8 flex flex-col justify-between border-slate-800 bg-[#0C111C]/80">
            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  الخطة الأساسية
                </span>
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-800 text-slate-300">
                  مجاناً دائماً
                </span>
              </div>
              <h3 className="text-2xl font-black text-white mb-1">FREE</h3>
              <p className="text-sm font-semibold text-emerald-400 mb-6">
                «أنا أعرف فلوسي»
              </p>
              <div className="space-y-3 text-xs sm:text-sm text-slate-300 mb-8">
                <div className="flex items-start gap-2.5">
                  <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span>تسجيل الدخل والمصاريف والتحويلات بلا حدود</span>
                </div>
                <div className="flex items-start gap-2.5">
                  <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span>لوحة تحكم لحظية تعرض رصيد الخزينة واليومية</span>
                </div>
                <div className="flex items-start gap-2.5">
                  <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span>3 حسابات أساسية (كاش، بنك، محفظة إلكترونية)</span>
                </div>
                <div className="flex items-start gap-2.5">
                  <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span>مساعد AI للاستفسارات السريعة بعدد معقول</span>
                </div>
                <div className="flex items-start gap-2.5">
                  <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span>ملخصات وتقارير دورية وتصدير البيانات بالكامل</span>
                </div>
              </div>
            </div>

            <Link
              href="/signup?plan=free"
              className="btn-pill-secondary w-full text-center py-3.5"
            >
              ابدأ مجاناً الآن
            </Link>
          </div>

          {/* PRO PLAN */}
          <div className="card-fintech p-6 sm:p-8 flex flex-col justify-between border-emerald-500/40 bg-gradient-to-b from-[#0F172A] to-[#0A0E1A] shadow-xl relative">
            <div className="absolute top-4 left-4">
              <span className="text-[11px] font-black px-2.5 py-1 rounded-full bg-emerald-500 text-slate-950">
                مساعد استباقي 🔥
              </span>
            </div>
            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">
                  الخطة المتقدمة
                </span>
              </div>
              <h3 className="text-2xl font-black text-white mb-1">PRO</h3>
              <p className="text-sm font-semibold text-emerald-300 mb-6">
                «المساعد يبدأ يساعدني في إدارة فلوسي»
              </p>
              <div className="space-y-3 text-xs sm:text-sm text-slate-200 mb-8">
                <div className="flex items-start gap-2.5">
                  <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span>
                    <strong>ذاكرة مالية ممتدة (AI Memory):</strong> يفهم عاداتك وسياقك عبر الشهور
                  </span>
                </div>
                <div className="flex items-start gap-2.5">
                  <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span>
                    <strong>تنبيهات استباقية ذكية:</strong> تنبيه قبل ميعاد الجمعيات والأقساط
                  </span>
                </div>
                <div className="flex items-start gap-2.5">
                  <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span>
                    <strong>توقع التدفق النقدي:</strong> حساب الرصيد الحر حتى نهاية الشهر
                  </span>
                </div>
                <div className="flex items-start gap-2.5">
                  <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span>
                    <strong>إدخال صوتي غير محدود:</strong> تحدث بحرية بأي وقت ولهجة
                  </span>
                </div>
                <div className="flex items-start gap-2.5">
                  <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span>
                    <strong>فحص الإيصالات والتحويلات:</strong> قراءة إشعارات انستاباي فوراً
                  </span>
                </div>
                <div className="flex items-start gap-2.5">
                  <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span>
                    <strong>أهداف ادخار ذكية:</strong> عزل الفائض الحقيقي تلقائياً
                  </span>
                </div>
              </div>
            </div>

            <Link
              href="/signup?plan=pro"
              className="btn-pill-emerald w-full text-center py-3.5"
            >
              ترقية للاحترافية والذكاء الاستباقي
            </Link>
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────
          7. SECURITY & PRIVACY (أسئلة الأمان والخصوصية)
          No banking passwords, isolated multi-tenant data, instant export
      ───────────────────────────────────────────────────────────── */}
      <section className="max-w-3xl mx-auto px-4">
        <div className="text-center max-w-xl mx-auto mb-10">
          <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-400 mb-2">
            <Lock className="w-3.5 h-3.5 text-emerald-400" />
            <span>الأمان والخصوصية أولاً</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-[#F8FAFC]">
            إجابات واضحة ومباشرة
          </h2>
          <p className="mt-2 text-xs sm:text-sm text-slate-400">
            أمان بياناتك المالية هو الخط الأحمر الذي لا تهاون فيه:
          </p>
        </div>

        <div className="space-y-3">
          {faqs.map((faq, idx) => {
            const isOpen = faqOpen === idx;
            return (
              <div
                key={idx}
                className="card-fintech overflow-hidden border-slate-800/80 transition-all"
              >
                <button
                  onClick={() => setFaqOpen(isOpen ? null : idx)}
                  className="w-full p-4 sm:p-5 text-right flex items-center justify-between gap-4 cursor-pointer hover:bg-slate-800/20"
                >
                  <span className="text-sm sm:text-base font-bold text-slate-200">
                    {faq.q}
                  </span>
                  <ChevronDown
                    className={`w-4 h-4 text-slate-400 shrink-0 transition-transform duration-200 ${
                      isOpen ? "rotate-180 text-emerald-400" : ""
                    }`}
                  />
                </button>
                {isOpen && (
                  <div className="px-4 sm:px-5 pb-5 text-xs sm:text-sm text-slate-300 leading-relaxed border-t border-slate-800/40 pt-3">
                    {faq.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────
          8. FINAL CTA
          "ابدأ تظبط فلوسك مع مساعدك"
      ───────────────────────────────────────────────────────────── */}
      <section className="max-w-4xl mx-auto px-4 text-center">
        <div className="card-fintech p-8 sm:p-14 bg-gradient-to-b from-[#0F1626] to-[#0A0D16] border-slate-800 shadow-2xl relative overflow-hidden">
          <div className="relative z-10 max-w-2xl mx-auto space-y-4">
            <span className="tag-emerald">خطوة واحدة نحو راحة البال المالية</span>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-white tracking-tight">
              ابدأ تظبط فلوسك مع مساعدك
            </h2>
            <p className="text-sm sm:text-base text-slate-300 max-w-lg mx-auto leading-relaxed">
              المساعد جاهز يسمعك من أول رسالة، يفهم وضعك المالي الحقيقي، ويفكر معاك بهدوء.
            </p>
            <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link
                href="/signup"
                className="btn-pill-primary w-full sm:w-auto px-9 py-4 text-base"
              >
                <span>ابدأ مجانًا</span>
                <ArrowLeft className="w-4 h-4" />
              </Link>
              <Link
                href="/login"
                className="btn-pill-secondary w-full sm:w-auto px-7 py-4 text-sm"
              >
                تسجيل الدخول
              </Link>
            </div>
            <p className="text-xs text-slate-400 pt-2 font-medium">
              بدون بطاقة بنكية • إعداد فوري في أقل من دقيقة
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
