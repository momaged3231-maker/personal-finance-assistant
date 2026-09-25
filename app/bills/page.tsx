import { BillsManager } from "@/components/dashboard/BillsManager";

export default function BillsPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 pb-24 md:pb-12" dir="rtl">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <BillsManager />
      </div>
    </div>
  );
}