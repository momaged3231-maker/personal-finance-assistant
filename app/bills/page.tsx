import { BillsManager } from "@/components/dashboard/BillsManager";

export default function BillsPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <BillsManager />
      </div>
    </div>
  );
}