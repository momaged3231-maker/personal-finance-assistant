// Fully-free AI providers (OpenAI-compatible endpoints) + OpenAI as the paid option.
// Source: github.com/ShaikhWarsi/free-ai-tools#fully-free-providers
// Shared by the settings Providers tab and the AI assistant tab.
export interface AiProvider {
  id: string;
  label: string;
  desc: string;
  baseUrl: string;
  model: string;
  keyHint: string;
  placeholder: string;
  group: "free" | "paid";
  color: string;
  letter: string;
}

export const AI_PROVIDERS: AiProvider[] = [
  {
    id: "openrouter",
    label: "OpenRouter",
    desc: "29 موديل مجاني — الأشهر والأوسع",
    baseUrl: "https://openrouter.ai/api/v1",
    model: "meta-llama/llama-3.3-70b-instruct:free",
    keyHint: "انسخ مفتاحك من openrouter.ai/keys (تنسيق sk-or-...). الموديلات المجانية تعمل حتى بدون مفتاح.",
    placeholder: "sk-or-...",
    group: "free",
    color: "#6B7FE7",
    letter: "OR",
  },
  {
    id: "groq",
    label: "Groq",
    desc: "الأسرع — حتى 14.4K طلب/يوم",
    baseUrl: "https://api.groq.com/openai/v1",
    model: "llama-3.3-70b-versatile",
    keyHint: "أنشئ مفتاحك من console.groq.com/keys (مجاني، بدون بطاقة).",
    placeholder: "gsk_...",
    group: "free",
    color: "#F55036",
    letter: "G",
  },
  {
    id: "google",
    label: "Google AI Studio",
    desc: "Gemini — حتى 1,500 طلب/يوم",
    baseUrl: "https://generativelanguage.googleapis.com/v1beta/openai",
    model: "gemini-2.0-flash",
    keyHint: "أنشئ مفتاحك من aistudio.google.com/apikey (مجاني، بدون بطاقة).",
    placeholder: "AIza...",
    group: "free",
    color: "#4285F4",
    letter: "G",
  },
  {
    id: "nvidia",
    label: "NVIDIA NIM",
    desc: "46+ موديل — 40 طلب/دقيقة",
    baseUrl: "https://integrate.api.nvidia.com/v1",
    model: "meta/llama-3.3-70b-instruct",
    keyHint: "أنشئ مفتاحك من build.nvidia.com (يتطلب تحقق برقم الهاتف).",
    placeholder: "nvapi-...",
    group: "free",
    color: "#76B900",
    letter: "N",
  },
  {
    id: "mistral",
    label: "Mistral",
    desc: "1B توكن/شهر مجاناً",
    baseUrl: "https://api.mistral.ai/v1",
    model: "mistral-small-latest",
    keyHint: "أنشئ مفتاحك من console.mistral.ai (يتطلب موافقة على تدريب البيانات).",
    placeholder: "مفتاحك...",
    group: "free",
    color: "#FF7000",
    letter: "M",
  },
  {
    id: "cerebras",
    label: "Cerebras",
    desc: "الأسرع عالمياً — 1M توكن/يوم",
    baseUrl: "https://api.cerebras.ai/v1",
    model: "llama-3.3-70b",
    keyHint: "أنشئ مفتاحك من cloud.cerebras.ai (مجاني، بدون بطاقة).",
    placeholder: "csk-...",
    group: "free",
    color: "#F2D024",
    letter: "C",
  },
  {
    id: "zai",
    label: "ZAI (GLM)",
    desc: "GLM-4.7-Flash مجاني — 200K سياق",
    baseUrl: "https://api.z.ai/api/paas/v4",
    model: "glm-4.7-flash",
    keyHint: "أنشئ مفتاحك من z.ai (ZAI_API_KEY — حصة مجانية كريمة).",
    placeholder: "مفتاحك...",
    group: "free",
    color: "#3E5BFF",
    letter: "Z",
  },
  {
    id: "siliconflow",
    label: "SiliconFlow",
    desc: "1K RPM — موديلات Qwen",
    baseUrl: "https://api.siliconflow.cn/v1",
    model: "Qwen/Qwen2.5-7B-Instruct",
    keyHint: "أنشئ مفتاحك من cloud.siliconflow.cn (مجاني).",
    placeholder: "sk-...",
    group: "free",
    color: "#6E56F8",
    letter: "S",
  },
  {
    id: "deepinfra",
    label: "DeepInfra",
    desc: "200 طلب متوازٍ مجاناً",
    baseUrl: "https://api.deepinfra.com/v1/openai",
    model: "meta-llama/Llama-3.3-70B-Instruct",
    keyHint: "أنشئ مفتاحك من deepinfra.com (مجاني).",
    placeholder: "مفتاحك...",
    group: "free",
    color: "#14B8A6",
    letter: "D",
  },
  {
    id: "openai",
    label: "OpenAI",
    desc: "المدفوع — GPT-4o/5",
    baseUrl: "https://api.openai.com/v1",
    model: "gpt-4o-mini",
    keyHint: "انسخ مفتاحك من platform.openai.com/api-keys (يتطلب رصيد).",
    placeholder: "sk-proj-...",
    group: "paid",
    color: "#10A37F",
    letter: "AI",
  },
];
