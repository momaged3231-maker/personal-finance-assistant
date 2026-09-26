import { WifiOff } from "lucide-react";

export const metadata = {
  title: "أنت أوف لاين — صحبي",
};

export default function OfflinePage() {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full border border-slate-700 bg-slate-900">
        <WifiOff className="h-8 w-8 text-slate-400" />
      </div>
      <div>
        <h1 className="text-lg font-bold text-slate-100">مفيش نت دلوقتي</h1>
        <p className="mt-1 text-sm text-slate-400">
          افتح الصفحة اللي كنت واقف عليها، أو ارجع لما الشبكة ترجع عشان تحمّل الباقي.
        </p>
      </div>
    </div>
  );
}