import { Suspense } from "react";
import ChatBox from "@/components/assistant/ChatBox";
import { Loader2 } from "lucide-react";

export const metadata = {
  title: "المساعد المالي الذكي | Chat AI",
  description: "تحدث مع المساعد المالي الشخصي وسجل مصاريفك باللهجة المصرية",
};

export default function AssistantPage() {
  return (
    <div className="space-y-4 animate-in fade-in duration-300">
      <Suspense
        fallback={
          <div className="flex flex-col items-center justify-center min-h-[50vh] gap-3 text-slate-400">
            <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
            <span className="text-sm">جاري فتح المساعد الذكي...</span>
          </div>
        }
      >
        <ChatBox />
      </Suspense>
    </div>
  );
}
