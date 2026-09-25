"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Check,
  Lock,
  ChevronDown,
  Sparkles,
  Bot,
  User,
  Calendar,
  Wallet,
  ArrowUpRight,
  HelpCircle,
  Layers,
  FileText,
  Mic,
  Zap,
  Target,
  TrendingUp,
  Download,
  ShieldCheck,
  ScanLine,
} from "lucide-react";

export default function LandingPage() {
  const [faqOpen, setFaqOpen] = useState<number | null>(0);

  const loopSteps = [
    {
      num: "١",
      title: "قول اللي حصل",
      desc: "«قبضت 12 ألف.» · «دفعت 150 في السوبرماركت.» · «سددت قسط الجمعية.» · بصوتك أو بكتابتك، بأي كلماتك.",
    },
    {
      num: "٢",
      title: "صحبي يرتب الباقي",
      desc: "يصنّف، يحسب، ويسجّل الدخل والمصاريف والتحويلات — ويحدّث أرصدتك والتزاماتك في نفس اللحظة.",
    },
    {
      num: "٣",
      title: "ويفضل متابع معاك",
      desc: "يعرف إيه اللي اتغيّر وإيه اللي جاي، ويسألك بس لما يبقى السؤال مفيد. مش بيروح غير لما توصّل الصورة.",
    },
  ];

  const followUps = [
    {
      icon: Wallet,
      trigger: "دخل جديد؟",
      action: "يتحدّث وضعك فورًا.",
    },
    {
      icon: TrendingUp,
      trigger: "مصروف كبير؟",
      action: "يعيد حساب المتاح لك.",
    },
    {
      icon: Calendar,
      trigger: "قسط قرب؟",
      action: "ينوّرك قبل الميعاد.",
    },
    {
      icon: Zap,
      trigger: "صرفك زاد؟",
      action: "يلفت انتباهك ليها.",
    },
    {
      icon: Target,
      trigger: "عندك هدف؟",
      action: "يحسب لك المسار.",
    },
  ];

  const realFeatures = [
    {
      icon: Mic,
      tag: "بصوتك",
      title: "إدخال بالعامية المصرية",
      desc: "اتكلم بلهجتك: «دفعت 150 جنيه بنزين»… صحبي يفهم، يفصل، ويسجّل من غير ما تفتح شاشات وقوائم.",
    },
    {
      icon: ScanLine,
      tag: "رسالة البنك",
      title: "اقرأ رسالة انستاباي أو المحفظة",
      desc: "قلّها أو الصقها: صحبي يحلل الأرقام ويصنّف المعاملة (دخل/مصروف/تحويل) ويجهزها للتسجيل.",
    },
    {
      icon: Calendar,
      tag: "الالتزامات",
      title: "الفواتير والجمعيات والأقساط",
      desc: "سجّل التزامًا متكررًا أو قسطًا أو دور جمعية، وصحبي يبقيها قدامك بأنسب مواعيدها القادمة.",
    },
    {
      icon: ShieldCheck,
      tag: "المتاح",
      title: "اعرف «المتاح» بعد الالتزامات",
      desc: "اسأل: «المتاح كام بعد الالتزامات؟»… يحسب رصيدك ويخصم التزامات الشهر المسجلة، ويديك رقم صريح.",
    },
    {
      icon: Target,
      tag: "هدفك",
      title: "أهداف ادخار حقيقية",
      desc: "حدد هدف (سفر، جهاز، صندوق طوارئ) واعرف نسبة إنجازه مع كل إيداع تسجّله.",
    },
    {
      icon: Sparkles,
      tag: "ميزانيات",
      title: "حد شهري لكل تصنيف",
      desc: "حدد سقف شهري للطعام أو المواصلات، وصحبي ينبّهك لما تعدّي 80% قبل ما الأزمة تقع.",
    },
  ];

  const trustPoints = [
    {
      icon: ShieldCheck,
      title: "لا نملك أموالك",
      desc: "صحبي لا يحرّك أموالك ولا ينفّذ تحويلات مالية بأي شكل. هو عينيك على فلوسك، مش صاحب الحساب.",
    },
    {
      icon: Lock,
      title: "لا نطلب بياناتك البنكية",
      desc: "لا كلمات مرور، ولا OTP، ولا PIN، ولا أرقام بطاقات. دخولك للخدمة مالهوش أي علاقة بحسابك البنكي.",
    },
    {
      icon: Download,
      title: "أنت صاحب بياناتك",
      desc: "صدّر نسخة كاملة من بياناتك بضغطة واحدة، أو احذف حسابك وكل ما يرتبط بيه نهائيًا، وقت ما تحب.",
    },
    {
      icon: HelpCircle,
      title: "واضح معاك بيستخدم إيه",
      desc: "كل إجابة مالية من صحبي مبنية على البيانات المسجلة في حسابك فقط — مفيش مصادر خارجية ولا تخمين في الأرقام.",
    },
  ];

  const faqs = [
    {
      q: "هل صحبي بيطلب بيانات حسابي البنكي أو بطاقتي؟",
      a: "مطلقًا. التطبيق لا يطلب ولا يخزن كلمات مرور بنكية ولا أرقام بطاقات ولا رموز OTP. أنت بتسجل حركاتك بنفسك أو بصوتك أو بلصق رسائل البنك اللي بتوصلك، من غير أي ربط بنكي حساس.",
    },
    {
      q: "مين يقدر يشوف بياناتي ومعاملاتي المالية؟",
      a: "أنت فقط. كل حساب معزول تمامًا تقنيًا (Multi-Tenant مع قواعد أمان RLS على خوادم Supabase)، ولا يمكن لأي مستخدم آخر الاطلاع على سجلاتك.",
    },
    {
      q: "هل أقدر أصدر بياناتي أو أحذف حسابي في أي وقت؟",
      a: "نعم، بنسبة 100%. بياناتك ملكك بالكامل: صدّر نسخة JSON شاملة بضغطة واحدة، أو احذف حسابك وكل البيانات المرتبطة به نهائيًا وبشكل فوري.",
    },
    {
      q: "الأرقام اللي بيديهالي صحبي مضمونة ليه؟",
      a: "صحبي بيجاوب بالأرقام المسجلة في حسابك فقط: أرصدتك، حركاتك، والتزاماتك. لو فيه مصاريف لسه متسجلتش، الرقم بيختلف — وده بيقولهولك بنفسه. وبالنسبة للقرارات، بيعرض أثر القرار بالأرقام بدل ما يأمر أو يمنع.",
    },
    {
      q: "هل التطبيق مخصص لطبيعة المعاملات في مصر؟",
      a: "نعم تمامًا، مصمم ليفهم الجنيه المصري، معاملات انستاباي، المحافظ الإلكترونية (فودافون كاش وغيرها)، الجمعيات، الأقساط، والعمولات — بدون مصطلحات معقّدة.",
    },
    {
      q: "ما الفرق بين المجاني و Pro؟",
      a: "المجاني عشان تفهم فلوسك (تسجيل، حسابات، رصيد لحظي، أسئلة AI، ملخصات). Pro لما تحتاج متابعة أعمق: ذاكرة مالية ممتدة، توقعات التدفق النقدي، تنبيهات ذكية، سيناريوهات «ماذا لو؟» وأهداف ادخار متقدمة.",
    },
  ];

  return (
    <div className="relative">
      {/* ── Full-viewport light backdrop + floating glow orbs ── */}
      <div className="lp-bg" aria-hidden="true">
        <span className="lp-orb lp-orb-1" />
        <span className="lp-orb lp-orb-2" />
        <span className="lp-orb lp-orb-3" />
      </div>

      <div className="relative z-10 py-8 md:py-14 space-y-24 md:space-y-32">
        {/* ─────────────────────────────────────────────
            1. HERO — the relationship, not the spreadsheet
        ───────────────────────────────────────────── */}
        <section className="text-center max-w-5xl mx-auto pt-4 md:pt-10 px-4">
          <span className="lp-eyebrow">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            صحبي — مساعدك المالي الشخصي
          </span>

          <h1 className="lp-title mt-7 text-[2.6rem] sm:text-6xl md:text-7xl lg:text-[5.4rem]">
            فلوسك مش محتاجة جدول.
            <span className="block mt-3 bg-gradient-to-l from-emerald-600 via-teal-600 to-blue-700 bg-clip-text text-transparent">
              محتاجة حد يفهمها.
            </span>
          </h1>

          <p className="lp-sub mt-7 text-lg sm:text-xl max-w-2xl mx-auto">
            قول لصحبي اللي حصّل في يومك — وهو يرتّب دخلك ومصاريفك والتزاماتك…
            ويفضل متابع معاك الصورة كاملة.
          </p>

          <div className="mt-9 flex flex-col sm:flex-row items-center justify-center gap-3.5">
            <Link href="/signup" className="lp-btn lp-btn-primary w-full sm:w-auto">
              <span>ابدأ مجانًا</span>
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <Link href="/login" className="lp-btn lp-btn-ghost w-full sm:w-auto">
              تسجيل الدخول
            </Link>
          </div>

          <p className="lp-sub mt-5 text-sm font-medium">
            لا بطاقة بنكية • لا ربط بحسابك البنكي • تحكم كامل في بياناتك
          </p>
        </section>

        {/* ── 3D elevated conversation showcase: "التايع" ── */}
        <section className="max-w-3xl mx-auto px-4 lp-3d-scene">
          <div className="lp-card lp-card-deep lp-3d-card overflow-hidden">
            {/* Window chrome */}
            <div className="px-5 py-3.5 border-b border-slate-100 bg-gradient-to-l from-white to-slate-50/80 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-300" />
                <span className="w-2.5 h-2.5 rounded-full bg-amber-300" />
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                <span className="text-xs font-semibold text-slate-500 mr-2">
                  محادثة مع صحبي
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-[11px] text-emerald-700 font-bold bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                بينصت ويحسب
              </div>
            </div>

            {/* Conversation — المتابعة */}
            <div className="p-6 md:p-8 space-y-5 bg-gradient-to-b from-slate-50/70 to-white">
              <div className="flex items-start gap-3 justify-end">
                <div className="lp-bubble-user px-4 py-3 max-w-[85%] sm:max-w-[70%] text-sm leading-relaxed shadow-sm">
                  <span className="font-semibold">قبضت 12,000 جنيه</span>
                  <span className="block text-[10px] text-slate-400 mt-1 text-left">12:01</span>
                </div>
                <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center shrink-0 border border-slate-300">
                  <User className="w-4 h-4 text-slate-600" />
                </div>
              </div>

              <div className="flex items-start gap-3 justify-start">
                <div className="w-8 h-8 rounded-full bg-emerald-100 border border-emerald-200 flex items-center justify-center shrink-0">
                  <Bot className="w-4 h-4 text-emerald-600" />
                </div>
                <div className="lp-bubble-bot px-4 py-3.5 max-w-[88%] sm:max-w-[75%] text-sm leading-relaxed space-y-1.5 shadow-sm">
                  <p className="flex items-center gap-1.5 font-medium">
                    تمام. سجلتهم كمرتب
                    <Check className="w-4 h-4 text-emerald-600 font-black" />
                  </p>
                  <p className="text-amber-700 font-bold">
                    عندك التزامات مسجلة بـ 2,850 جنيه الشهر ده.
                  </p>
                  <span className="block text-[10px] text-slate-400 mt-1">12:01</span>
                </div>
              </div>

              <div className="flex items-start gap-3 justify-end">
                <div className="lp-bubble-user px-4 py-2.5 max-w-[85%] sm:max-w-[70%] text-sm leading-relaxed shadow-sm">
                  <span className="font-semibold">طب أنا متاح لي كام؟</span>
                  <span className="block text-[10px] text-slate-400 mt-1 text-left">12:03</span>
                </div>
                <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center shrink-0 border border-slate-300">
                  <User className="w-4 h-4 text-slate-600" />
                </div>
              </div>

              <div className="flex items-start gap-3 justify-start">
                <div className="w-8 h-8 rounded-full bg-emerald-100 border border-emerald-200 flex items-center justify-center shrink-0">
                  <Bot className="w-4 h-4 text-emerald-600" />
                </div>
                <div className="lp-bubble-bot px-4 py-3.5 max-w-[92%] sm:max-w-[80%] text-sm leading-relaxed space-y-2 shadow-sm">
                  <p>
                    بعد المصاريف والالتزامات المسجلة، المتاح حاليًا{" "}
                    <strong className="text-emerald-600 font-black">6,920 جنيه</strong>.
                  </p>
                  <div className="inline-flex items-center gap-1.5 text-[11px] font-black text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full">
                    <Sparkles className="w-3 h-3" /> المتاح بعد الالتزامات
                  </div>
                  <span className="block text-[10px] text-slate-400 mt-1">12:03</span>
                </div>
              </div>

              <div className="flex items-start gap-3 justify-end">
                <div className="lp-bubble-user px-4 py-2.5 max-w-[85%] sm:max-w-[70%] text-sm leading-relaxed shadow-sm">
                  <span className="font-semibold">ولو صرفت 1,500 دلوقتي؟</span>
                  <span className="block text-[10px] text-slate-400 mt-1 text-left">12:04</span>
                </div>
                <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center shrink-0 border border-slate-300">
                  <User className="w-4 h-4 text-slate-600" />
                </div>
              </div>

              <div className="flex items-start gap-3 justify-start">
                <div className="w-8 h-8 rounded-full bg-emerald-100 border border-emerald-200 flex items-center justify-center shrink-0">
                  <Bot className="w-4 h-4 text-emerald-600" />
                </div>
                <div className="lp-bubble-bot px-4 py-3.5 max-w-[92%] sm:max-w-[80%] text-sm leading-relaxed space-y-2 shadow-sm">
                  <p>
                    هيبقى المتاح <strong className="text-emerald-600 font-black">5,420 جنيه</strong>
                    ، ولسه عندك قسط <strong className="font-bold">800 جنيه يوم 28</strong>.
                  </p>
                  <div className="inline-flex items-center gap-1.5 text-[11px] font-black text-blue-700 bg-blue-50 border border-blue-200 px-2.5 py-1 rounded-full">
                    <TrendingUp className="w-3 h-3" /> أثر القرار
                  </div>
                  <span className="block text-[10px] text-slate-400 mt-1">12:04</span>
                </div>
              </div>
            </div>

            {/* Status ribbon */}
            <div className="p-4 bg-gradient-to-l from-slate-50 to-emerald-50/60 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2 text-slate-600">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <span>«أنا مش بس بسجّل لك فلوسك… أنا متابع وضعك المالي معاك.»</span>
              </div>
              <div className="text-slate-500 font-medium">
                النتيجة: <span className="text-slate-800 font-black">صورة كاملة في ثواني</span>
              </div>
            </div>
          </div>
        </section>

        {/* ─────────────────────────────────────────────
            2. THE LOOP — 3 steps only
        ───────────────────────────────────────────── */}
        <section className="max-w-5xl mx-auto px-4">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <span className="lp-tag mb-3">إزاي شغال؟</span>
            <h2 className="lp-title text-3xl sm:text-4xl md:text-5xl mt-3">
              قول اللي حصل. وخلّي الباقي عليه.
            </h2>
            <p className="lp-sub mt-4 text-base">
              مش مسار من 7 خطوات تقني — 3 لحظات بس بتحصل كل يوم:
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {loopSteps.map((step, idx) => (
              <div
                key={idx}
                className={`lp-card p-6 sm:p-8 ${
                  idx === 2 ? "md:col-span-3 lg:col-span-1 lp-card-emerald" : ""
                }`}
              >
                <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center mb-4">
                  <span className="text-lg font-black text-blue-700">{step.num}</span>
                </div>
                <h3 className="lp-title text-lg sm:text-xl mb-2">{step.title}</h3>
                <p className="lp-sub text-sm">{step.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ─────────────────────────────────────────────
            3. DECISION MOMENT — before you pay, ask
        ───────────────────────────────────────────── */}
        <section className="max-w-5xl mx-auto px-4">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <span className="lp-tag mb-3">لحظة القرار</span>
            <h2 className="lp-title text-3xl sm:text-4xl md:text-5xl mt-3">
              قبل ما تدفع… اسأل صحبي.
            </h2>
            <p className="lp-sub mt-4 text-base">
              صحبي مش بيقولك «اشترِ» ولا «متشتريش» — بيعرض أثر القرار بالأرقام، والقرار يفضل قرارك:
            </p>
          </div>

          <div className="lp-card lp-card-deep p-6 sm:p-8 md:p-10">
            <div className="flex items-start gap-3 justify-start">
              <div className="w-8 h-8 rounded-full bg-emerald-100 border border-emerald-200 flex items-center justify-center shrink-0">
                <Bot className="w-4 h-4 text-emerald-600" />
              </div>
              <div className="lp-bubble-bot px-4 py-3.5 text-sm leading-relaxed shadow-sm">
                <p>
                  جاهز يا فندم؟ جرب تقولي:{" "}
                  <strong className="font-bold">«لو دفعت 4,000 جنيه النهارده، هيحصلي إيه؟»</strong>
                </p>
              </div>
            </div>

            <div className="mt-6 flex items-start gap-3 justify-end">
              <div className="lp-bubble-user px-4 py-3 text-sm leading-relaxed shadow-sm">
                <span className="font-semibold">لو دفعت 4,000 جنيه النهارده، هيحصلي إيه؟</span>
              </div>
              <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center shrink-0 border border-slate-300">
                <User className="w-4 h-4 text-slate-600" />
              </div>
            </div>

            {/* Impact stat cards */}
            <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-3.5">
              {[
                { label: "رصيدك الآن", value: "9,200", tone: "text-slate-900" },
                { label: "بعد الشراء", value: "5,200", tone: "text-slate-900" },
                { label: "التزامات قادمة", value: "2,800", tone: "text-amber-600" },
                { label: "المتاح بعدها", value: "2,400", tone: "text-emerald-600" },
              ].map((s) => (
                <div
                  key={s.label}
                  className="rounded-2xl bg-white border border-slate-200 p-4 text-center shadow-sm"
                >
                  <div className={`text-xl sm:text-2xl font-black ${s.tone}`}>{s.value}</div>
                  <div className="text-[11px] font-bold text-slate-500 mt-1.5">{s.label}</div>
                </div>
              ))}
            </div>

            <div className="mt-6 flex items-start gap-3 justify-start">
              <div className="w-8 h-8 rounded-full bg-emerald-100 border border-emerald-200 flex items-center justify-center shrink-0">
                <Bot className="w-4 h-4 text-emerald-600" />
              </div>
              <div className="lp-bubble-bot px-4 py-3.5 text-sm leading-relaxed shadow-sm">
                <p>
                  الشراء ممكن وفقًا للبيانات المسجلة، لكن هيقلّل هامش الأمان عندك.
                </p>
                <span className="block text-[11px] text-slate-400 mt-1">
                  (لو عندك مصاريف غير مسجلة، الرقم ممكن يختلف.)
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* ─────────────────────────────────────────────
            4. THE FOLLOW-UP — the core idea
        ───────────────────────────────────────────── */}
        <section className="max-w-4xl mx-auto px-4">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <span className="lp-tag mb-3">الفكرة الأساسية</span>
            <h2 className="lp-title text-3xl sm:text-4xl md:text-5xl mt-3">
              مش بيسألك عن فلوسك كل يوم.
              <span className="block bg-gradient-to-l from-emerald-600 to-teal-600 bg-clip-text text-transparent mt-2">
                هو اللي بيفضل فاكرها معاك.
              </span>
            </h2>
          </div>

          <div className="space-y-4">
            {followUps.map((f, idx) => {
              const Icon = f.icon;
              return (
                <div key={idx} className="lp-card p-5 sm:p-6 flex items-center gap-4 sm:gap-6">
                  <div className="lp-icon-tile shrink-0">
                    <Icon className="w-5 h-5 text-emerald-600" />
                  </div>
                  <div className="flex-1 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1.5">
                    <span className="lp-title text-lg font-black">{f.trigger}</span>
                    <span className="flex items-center gap-2 text-slate-600 text-sm font-semibold">
                      <ArrowUpRight className="w-4 h-4 text-emerald-600" />
                      {f.action}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* ─────────────────────────────────────────────
            5. REAL FEATURES — what exists today, honestly
        ───────────────────────────────────────────── */}
        <section className="max-w-5xl mx-auto px-4">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <span className="lp-tag mb-3">فعلي وشغال</span>
            <h2 className="lp-title text-3xl sm:text-4xl md:text-5xl mt-3">
              اللي صحبي بيعمله النهارده بجد
            </h2>
            <p className="lp-sub mt-4 text-base">
              من أول يوم، من غير وعود إنشاء معهودة:
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {realFeatures.map((uc, idx) => {
              const Icon = uc.icon;
              return (
                <div key={idx} className="lp-card p-6 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <div className="lp-icon-tile">
                        <Icon className="w-5 h-5 text-emerald-600" />
                      </div>
                      <span className="lp-tag">{uc.tag}</span>
                    </div>
                    <h3 className="lp-title text-lg mb-2">{uc.title}</h3>
                    <p className="lp-sub text-sm">{uc.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* ─────────────────────────────────────────────
            6. TRUST — your money is not with us
        ───────────────────────────────────────────── */}
        <section className="max-w-5xl mx-auto px-4">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <span className="lp-tag mb-3">الأمان والخصوصية</span>
            <h2 className="lp-title text-3xl sm:text-4xl md:text-5xl mt-3">
              فلوسك مش عندنا
            </h2>
            <p className="lp-sub mt-4 text-base">
              كل وعودنا في القسم ده مضمونة بنفس طريقة عملنا — من غير أي ربط مالي:
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {trustPoints.map((t, idx) => {
              const Icon = t.icon;
              return (
                <div key={idx} className="lp-card lp-card-deep p-6 sm:p-7">
                  <div className="lp-icon-tile mb-4">
                    <Icon className="w-5 h-5 text-emerald-600" />
                  </div>
                  <h3 className="lp-title text-lg mb-2">{t.title}</h3>
                  <p className="lp-sub text-sm leading-relaxed">{t.desc}</p>
                </div>
              );
            })}
          </div>
        </section>

        {/* ─────────────────────────────────────────────
            7. PRICING — two moments, not a SaaS table
        ───────────────────────────────────────────── */}
        <section className="max-w-3xl mx-auto px-4">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <span className="lp-tag mb-3">بس وبس</span>
            <h2 className="lp-title text-3xl sm:text-4xl md:text-5xl mt-3">
              ابدأ بهدوء. وكمل لما تفهم احتياجك.
            </h2>
            <p className="lp-sub mt-4 text-base">
              مش بنبيعك جدول مقارنة — بنقدملك لحظتين في رحلة العلاقة دي:
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
            <div className="lp-card p-6 sm:p-8 flex flex-col justify-between">
              <div>
                <span className="text-xs font-black uppercase tracking-wider text-slate-500">
                  مجانًا تبدأ بهدوء
                </span>
                <h3 className="lp-title text-4xl mt-3">مجانًا</h3>
                <p className="text-sm font-bold text-slate-500 mt-2 mb-6">
                  استخدم صحبي لتفهم فلوسك يوم بيوم.
                </p>
                <div className="space-y-3.5 text-sm text-slate-600 mb-8">
                  {[
                    "دخل، مصروف، وتحويل",
                    "رصيد لحظي لكل حساب",
                    "أسئلة AI بلا حدود يومية",
                    "ملخصات يومية وشهرية",
                  ].map((f) => (
                    <div key={f} className="flex items-start gap-2.5">
                      <span className="w-5 h-5 rounded-full bg-slate-700 text-white flex items-center justify-center shrink-0">
                        <Check className="w-3.5 h-3.5" />
                      </span>
                      <span>{f}</span>
                    </div>
                  ))}
                </div>
              </div>
              <Link href="/signup?plan=free" className="lp-btn lp-btn-ghost w-full py-3.5">
                ابدأ مجانًا
              </Link>
            </div>

            <div className="lp-card lp-card-emerald p-6 sm:p-8 flex flex-col justify-between">
              <div>
                <span className="text-xs font-black uppercase tracking-wider text-emerald-700">
                  لما تحتاج متابعة أعمق
                </span>
                <h3 className="lp-title text-4xl mt-3">Pro</h3>
                <p className="text-sm font-bold text-emerald-700 mt-2 mb-6">
                  صحبي يفضل متابع معاك.
                </p>
                <div className="space-y-3.5 text-sm text-slate-700 mb-8">
                  {[
                    "ذاكرة مالية أعمق عبر الشهور",
                    "توقعات التدفق النقدي (Cash-flow forecasting)",
                    "تنبيهات ذكية قبل الالتزامات",
                    "تحليل العادات والبنود الخفية",
                    "سيناريوهات «ماذا لو؟»",
                    "أهداف ادخار وإدخال صوتي غير محدود",
                  ].map((f) => (
                    <div key={f} className="flex items-start gap-2.5">
                      <span className="w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center shrink-0">
                        <Check className="w-3.5 h-3.5" />
                      </span>
                      <span>{f}</span>
                    </div>
                  ))}
                </div>
              </div>
              <Link href="/signup?plan=pro" className="lp-btn lp-btn-primary w-full py-3.5 text-base">
                اختار الترقية
              </Link>
            </div>
          </div>
        </section>

        {/* ─────────────────────────────────────────────
            8. FAQ
        ───────────────────────────────────────────── */}
        <section className="max-w-3xl mx-auto px-4">
          <div className="text-center max-w-xl mx-auto mb-10">
            <div className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 mb-2">
              <Lock className="w-3.5 h-3.5 text-emerald-600" />
              <span>أسئلة بتتكرر عند الناس</span>
            </div>
            <h2 className="lp-title text-3xl sm:text-4xl">إجابات واضحة ومباشرة</h2>
          </div>

          <div className="space-y-4">
            {faqs.map((faq, idx) => {
              const isOpen = faqOpen === idx;
              return (
                <div key={idx} className={`lp-card overflow-hidden ${isOpen ? "lp-card-deep" : ""}`}>
                  <button
                    onClick={() => setFaqOpen(isOpen ? null : idx)}
                    className="w-full p-5 text-right flex items-center justify-between gap-4 cursor-pointer hover:bg-slate-50/80 transition-colors"
                    aria-expanded={isOpen}
                  >
                    <span className="lp-title text-base sm:text-lg text-slate-800">{faq.q}</span>
                    <span
                      className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 transition-all duration-200 ${
                        isOpen
                          ? "rotate-180 bg-emerald-500 text-white"
                          : "bg-slate-100 text-slate-500"
                      }`}
                    >
                      <ChevronDown className="w-4 h-4" />
                    </span>
                  </button>
                  {isOpen && (
                    <div className="px-5 pb-5 text-sm text-slate-600 leading-relaxed border-t border-slate-100 pt-4">
                      {faq.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {/* ─────────────────────────────────────────────
            9. FINAL CTA
        ───────────────────────────────────────────── */}
        <section className="max-w-4xl mx-auto px-4 text-center">
          <div className="lp-card lp-card-deep p-8 sm:p-14 relative overflow-hidden bg-gradient-to-br from-white via-white to-emerald-50/70">
            <div className="absolute -top-16 -right-16 w-56 h-56 rounded-full bg-emerald-400/15 blur-3xl pointer-events-none" />
            <div className="absolute -bottom-20 -left-10 w-64 h-64 rounded-full bg-blue-400/15 blur-3xl pointer-events-none" />
            <div className="relative z-10 max-w-2xl mx-auto space-y-5">
              <span className="lp-eyebrow">خطوة واحدة نحو راحة البال المالية</span>
              <h2 className="lp-title text-4xl sm:text-5xl md:text-6xl">
                ابدأ تتكلم مع صحبي.
              </h2>
              <p className="lp-sub text-base sm:text-lg max-w-lg mx-auto">
                قول له أول جملة، وهو ياخد الباقي على دماغه — ويفضل متابع الصورة معاك.
              </p>
              <div className="pt-3 flex flex-col sm:flex-row items-center justify-center gap-3.5">
                <Link href="/signup" className="lp-btn lp-btn-primary w-full sm:w-auto">
                  <span>ابدأ مجانًا</span>
                  <ArrowLeft className="w-4 h-4" />
                </Link>
                <Link href="/login" className="lp-btn lp-btn-ghost w-full sm:w-auto">
                  تسجيل الدخول
                </Link>
              </div>
              <p className="text-xs text-slate-500 font-semibold">
                لا بطاقة بنكية • لا ربط بحسابك البنكي • تحكم كامل في بياناتك
              </p>
            </div>
          </div>
        </section>

        {/* Footer trust strip */}
        <section className="max-w-4xl mx-auto px-4 pb-4">
          <div className="lp-divider mb-6" />
          <div className="flex flex-wrap items-center justify-center gap-x-7 gap-y-3 text-xs font-semibold text-slate-500">
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" /> فلوسك مش عندنا
            </span>
            <span className="flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-emerald-600" /> بياناتك مشفّرة ومعزولة
            </span>
            <span className="flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-blue-600" /> بنية Multi-Tenant آمنة
            </span>
            <span className="flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-emerald-600" /> صدّر بياناتك أو احذفها وقت ما تحب
            </span>
            <span className="flex items-center gap-1.5">
              <Mic className="w-3.5 h-3.5 text-blue-600" /> إدخال صوتي بالعامية المصرية
            </span>
          </div>
        </section>
      </div>
    </div>
  );
}