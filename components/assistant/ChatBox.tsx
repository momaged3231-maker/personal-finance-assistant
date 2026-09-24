"use client";

import { useState, useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import {
  Bot,
  Send,
  User,
  Sparkles,
  Loader2,
  CheckCircle2,
  XCircle,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
} from "lucide-react";
import { ParsedAction, formatEgp } from "@/lib/types";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  action?: ParsedAction;
  actionStatus?: "pending" | "confirmed" | "cancelled";
  createdAt: string;
}

export default function ChatBox() {
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get("q");

  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome-1",
      role: "assistant",
      content:
        "أهلاً بيك يا فندم! 🤖 أنا المساعد المالي الشخصي بتاعك.\n\nتقدر تسألني أي سؤال عن فلوسك، أو تطلب مني أسجل لك مصاريفك أو إيراداتك مباشرة بالكلام العادي (كتابة أو بالصوت 🎙️)، زي:\n• «صرفت كام النهارده؟»\n• «سجل 75 جنيه سجائر»\n• «دخلت 600 عمولة»\n• «معايا كام في البنك؟»\n• «أكتر حاجة بصرف عليها إيه؟»",
      createdAt: new Date().toLocaleTimeString("ar-EG", {
        hour: "2-digit",
        minute: "2-digit",
      }),
    },
  ]);

  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Voice recognition and speech synthesis state
  const [isListening, setIsListening] = useState(false);
  const [autoSpeak, setAutoSpeak] = useState(false);
  const [speakingId, setSpeakingId] = useState<string | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null);

  // Initialize Speech Recognition (Web Speech API)
  useEffect(() => {
    if (typeof window !== "undefined") {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = true;
        recognition.lang = "ar-EG"; // Arabic (Egypt)

        recognition.onstart = () => {
          setIsListening(true);
        };

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        recognition.onresult = (event: any) => {
          let transcript = "";
          for (let i = 0; i < event.results.length; i++) {
            transcript += event.results[i][0].transcript;
          }
          setInput(transcript);
        };

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        recognition.onerror = (event: any) => {
          console.error("Speech recognition error:", event.error);
          setIsListening(false);
        };

        recognition.onend = () => {
          setIsListening(false);
        };

        recognitionRef.current = recognition;
      }
    }
  }, []);

  function toggleListening() {
    if (!recognitionRef.current) {
      alert("خاصية التعرف على الصوت متاحة بشكل ممتاز على متصفحات Google Chrome و Microsoft Edge.");
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      try {
        recognitionRef.current.start();
      } catch (err) {
        console.error("Failed to start speech recognition", err);
      }
    }
  }

  // Text to Speech
  function speakText(text: string, msgId?: string) {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;

    if (speakingId) {
      window.speechSynthesis.cancel();
      setSpeakingId(null);
      if (speakingId === msgId) return;
    }

    const clean = text
      .replace(/[*_#•]/g, "")
      .replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, "")
      .trim();

    const utterance = new SpeechSynthesisUtterance(clean);
    utterance.lang = "ar-SA";
    utterance.rate = 1.0;

    if (msgId) setSpeakingId(msgId);

    utterance.onend = () => {
      setSpeakingId(null);
    };

    utterance.onerror = () => {
      setSpeakingId(null);
    };

    window.speechSynthesis.speak(utterance);
  }

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  // Handle initial query from dashboard teaser
  useEffect(() => {
    if (initialQuery && initialQuery.trim()) {
      sendMessage(initialQuery.trim());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialQuery]);

  async function sendMessage(textToSend?: string) {
    const text = (textToSend || input).trim();
    if (!text || loading) return;

    // Stop listening if active
    if (isListening && recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
    }

    const userMessage: Message = {
      id: "u-" + Date.now(),
      role: "user",
      content: text,
      createdAt: new Date().toLocaleTimeString("ar-EG", {
        hour: "2-digit",
        minute: "2-digit",
      }),
    };

    setMessages((prev) => [...prev, userMessage]);
    if (!textToSend) setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "خطأ في الاتصال بالمساعد");

      const botMsgId = "a-" + Date.now();
      const botMessage: Message = {
        id: botMsgId,
        role: "assistant",
        content: data.text || "تمام يا باشا!",
        action: data.action,
        actionStatus: data.action ? "pending" : undefined,
        createdAt: new Date().toLocaleTimeString("ar-EG", {
          hour: "2-digit",
          minute: "2-digit",
        }),
      };

      setMessages((prev) => [...prev, botMessage]);

      // If auto-speak enabled, speak the answer
      if (autoSpeak) {
        speakText(botMessage.content, botMsgId);
      }
    } catch (e: unknown) {
      const errMsg = e instanceof Error ? e.message : "حدث خطأ غير متوقع";
      setMessages((prev) => [
        ...prev,
        {
          id: "err-" + Date.now(),
          role: "assistant",
          content: `عذراً، حدث خطأ: ${errMsg}`,
          createdAt: new Date().toLocaleTimeString("ar-EG", {
            hour: "2-digit",
            minute: "2-digit",
          }),
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  // Handle Action Confirmation
  async function handleConfirmAction(messageId: string, action: ParsedAction) {
    setConfirmingId(messageId);
    try {
      const res = await fetch("/api/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmAction: action }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "فشل تنفيذ العملية");

      const replyText = `تم حفظ العملية بنجاح! ✅\nتم تحديث الأرصدة وإحصائيات اليوم فوراً.`;

      // Update message state to confirmed
      setMessages((prev) =>
        prev.map((m) =>
          m.id === messageId
            ? {
                ...m,
                actionStatus: "confirmed",
                content: `${m.content}\n\n✅ ${data.text || replyText}`,
              }
            : m
        )
      );

      if (autoSpeak) {
        speakText("تم حفظ العملية بنجاح وتحديث رصيدك فوراً");
      }
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "فشل الحفظ");
    } finally {
      setConfirmingId(null);
    }
  }

  function handleCancelAction(messageId: string) {
    setMessages((prev) =>
      prev.map((m) =>
        m.id === messageId
          ? {
              ...m,
              actionStatus: "cancelled",
              content: `${m.content}\n\n❌ تم إلغاء العملية بناءً على طلبك.`,
            }
          : m
      )
    );
  }

  const quickChips = [
    "صرفت كام النهارده؟",
    "معايا كام؟",
    "رصيدي في البنك كام؟",
    "سجل 75 جنيه سجائر",
    "دخلت 600 عمولة",
    "أكتر حاجة بصرف عليها إيه؟",
    "حولت 500 للبنك",
  ];

  return (
    <div className="flex flex-col h-[75vh] glass-card rounded-3xl overflow-hidden border border-slate-800 shadow-2xl">
      {/* Assistant Header */}
      <div className="p-4 border-b border-slate-800/80 bg-slate-900/60 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-500 to-blue-500 flex items-center justify-center text-white shadow-lg shadow-indigo-500/20">
            <Bot className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              المساعد المالي الشخصي
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            </h2>
            <span className="text-[11px] text-slate-400">
              يدعم المحادثة الصوتية والكتابية • بالعامية المصرية
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Toggle Auto Voice Readout */}
          <button
            onClick={() => setAutoSpeak(!autoSpeak)}
            title={autoSpeak ? "إيقاف الرد الصوتي التلقائي" : "تشغيل الرد الصوتي التلقائي"}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all ${
              autoSpeak
                ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-300"
                : "bg-slate-800/80 border-slate-700/60 text-slate-400 hover:text-slate-200"
            }`}
          >
            {autoSpeak ? (
              <>
                <Volume2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">صوت تلقائي مُفعل</span>
              </>
            ) : (
              <>
                <VolumeX className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">صوت تلقائي</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((m) => {
          const isUser = m.role === "user";
          return (
            <div
              key={m.id}
              className={`flex items-start gap-2.5 ${
                isUser ? "flex-row-reverse" : "flex-row"
              }`}
            >
              {/* Avatar */}
              <div
                className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs shrink-0 ${
                  isUser
                    ? "bg-blue-600 text-white"
                    : "bg-indigo-600/30 text-indigo-300 border border-indigo-500/30"
                }`}
              >
                {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
              </div>

              {/* Message Bubble */}
              <div
                className={`max-w-[85%] sm:max-w-[75%] rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap relative group ${
                  isUser
                    ? "bg-blue-600 text-white rounded-tl-sm shadow-md shadow-blue-600/20"
                    : "glass-panel bg-slate-900/90 text-slate-200 rounded-tr-sm border-slate-800"
                }`}
              >
                <div>{m.content}</div>

                {/* Speaker icon for assistant message */}
                {!isUser && (
                  <button
                    onClick={() => speakText(m.content, m.id)}
                    className="absolute -bottom-2 -left-2 p-1 rounded-lg bg-slate-800 text-slate-400 hover:text-blue-400 hover:bg-slate-700 opacity-80 group-hover:opacity-100 transition-opacity"
                    title="استمع للرسالة بصوت مسموع"
                  >
                    <Volume2
                      className={`w-3.5 h-3.5 ${
                        speakingId === m.id ? "text-emerald-400 animate-pulse" : ""
                      }`}
                    />
                  </button>
                )}

                {/* Parsed Action Card (For Confirmation) */}
                {m.action && m.actionStatus === "pending" && (
                  <div className="mt-3 p-3.5 rounded-2xl bg-slate-950/80 border border-indigo-500/40 space-y-3">
                    <div className="flex items-center justify-between text-xs pb-2 border-b border-slate-800">
                      <span className="font-bold text-indigo-300 flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5" />
                        طلب تسجيل عملية مالية
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-md font-bold text-[10px] ${
                          m.action.type === "expense"
                            ? "bg-rose-500/20 text-rose-400"
                            : m.action.type === "income"
                            ? "bg-emerald-500/20 text-emerald-400"
                            : "bg-blue-500/20 text-blue-400"
                        }`}
                      >
                        {m.action.type === "expense"
                          ? "مصروف"
                          : m.action.type === "income"
                          ? "دخل"
                          : "تحويل"}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-slate-400 block text-[10px]">المبلغ:</span>
                        <span className="font-black text-white text-base">
                          {formatEgp(m.action.amount)}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px]">الوصف:</span>
                        <span className="font-bold text-slate-200">
                          {m.action.description}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px]">الحساب:</span>
                        <span className="font-semibold text-slate-300">
                          {m.action.type === "transfer"
                            ? `${m.action.accountName} ➔ ${m.action.toAccountName}`
                            : m.action.accountName}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px]">التصنيف:</span>
                        <span className="font-semibold text-slate-300">
                          {m.action.category}
                        </span>
                      </div>
                    </div>

                    {/* Action Confirmation Buttons */}
                    <div className="flex items-center gap-2 pt-1">
                      <button
                        onClick={() => handleConfirmAction(m.id, m.action!)}
                        disabled={confirmingId === m.id}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md shadow-emerald-600/20 transition-all disabled:opacity-50"
                      >
                        {confirmingId === m.id ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <CheckCircle2 className="w-3.5 h-3.5" />
                        )}
                        <span>تأكيد وتسجيل الآن</span>
                      </button>

                      <button
                        onClick={() => handleCancelAction(m.id)}
                        disabled={confirmingId === m.id}
                        className="flex items-center justify-center gap-1 py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs border border-slate-700 transition-colors"
                      >
                        <XCircle className="w-3.5 h-3.5" />
                        <span>إلغاء</span>
                      </button>
                    </div>
                  </div>
                )}

                <div
                  className={`text-[10px] mt-1.5 ${
                    isUser ? "text-blue-200" : "text-slate-500"
                  }`}
                >
                  {m.createdAt}
                </div>
              </div>
            </div>
          );
        })}

        {loading && (
          <div className="flex items-center gap-2 text-slate-400 text-xs p-2">
            <Loader2 className="w-4 h-4 animate-spin text-blue-400" />
            <span>المساعد يفكر ويقرأ حساباتك...</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Voice Listening Banner */}
      {isListening && (
        <div className="px-4 py-2 bg-rose-500/20 border-t border-rose-500/40 flex items-center justify-between text-xs text-rose-300 animate-pulse">
          <div className="flex items-center gap-2 font-bold">
            <Mic className="w-4 h-4 text-rose-400" />
            <span>جاري الاستماع لصوتك الآن... تكلّم بالعامية المصرية (مثال: «سجل 50 جنيه بنزين»)</span>
          </div>
          <button
            onClick={toggleListening}
            className="px-2 py-0.5 rounded-lg bg-rose-600 text-white text-[11px] font-bold"
          >
            إيقاف
          </button>
        </div>
      )}

      {/* Quick Suggestion Chips */}
      <div className="px-4 py-2 border-t border-slate-800/60 bg-slate-950/40 flex items-center gap-2 overflow-x-auto no-scrollbar">
        {quickChips.map((chip, i) => (
          <button
            key={i}
            onClick={() => sendMessage(chip)}
            className="text-[11px] px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 shrink-0 transition-colors"
          >
            {chip}
          </button>
        ))}
      </div>

      {/* Input Box */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          sendMessage();
        }}
        className="p-3.5 border-t border-slate-800 bg-slate-900/80 flex items-center gap-2"
      >
        {/* Voice Input Microphone Button */}
        <button
          type="button"
          onClick={toggleListening}
          title={isListening ? "إيقاف الاستماع" : "التحدث صوتياً للمساعد"}
          className={`w-11 h-11 rounded-2xl flex items-center justify-center transition-all shrink-0 ${
            isListening
              ? "bg-rose-600 text-white shadow-lg shadow-rose-600/50 animate-bounce"
              : "bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700"
          }`}
        >
          {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5 text-blue-400" />}
        </button>

        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={isListening ? "جاري الاستماع لصوتك..." : "اكتب سؤالك أو اضغط على المايك للتحدث صوتياً..."}
          className="flex-1 px-4 py-2.5 bg-slate-950 border border-slate-700 rounded-2xl text-white text-sm placeholder-slate-500 focus:outline-none focus:border-blue-500"
        />

        <button
          type="submit"
          disabled={!input.trim() || loading}
          className="w-11 h-11 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white flex items-center justify-center transition-all disabled:opacity-40 disabled:hover:bg-blue-600 shadow-md shadow-blue-600/30 shrink-0"
        >
          <Send className="w-4 h-4 rotate-180" />
        </button>
      </form>
    </div>
  );
}
