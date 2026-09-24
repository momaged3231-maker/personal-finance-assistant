import type { Metadata } from "next";
import "./globals.css";
import Navbar from "@/components/Navbar";

export const metadata: Metadata = {
  title: "المساعد المالي اليومي | المنظومة المالية الذكية",
  description: "تطبيق إدارة المصروفات والدخل الشخصي الذكي بالعامية المصرية والذكاء الاصطناعي",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ar" dir="rtl" className="dark h-full">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Alexandria:wght@300;400;500;600;700;800;900&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="font-sans bg-[#090D16] text-[#F8FAFC] min-h-screen flex flex-col antialiased selection:bg-emerald-500/30 selection:text-emerald-200 relative">
        {/* 2px signature top accent line */}
        <div className="top-accent" />

        {/* Global calm ambient background gradient */}
        <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
          <div className="absolute top-[-15%] left-[20%] w-[650px] h-[500px] bg-emerald-500/[0.03] rounded-full blur-[150px]" />
          <div className="absolute top-[-10%] right-[15%] w-[600px] h-[450px] bg-sky-500/[0.02] rounded-full blur-[150px]" />
        </div>

        {/* Main Content Area */}
        <div className="relative z-10 flex-1 flex flex-col max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pb-24 md:pb-12 pt-3">
          <Navbar />
          <main className="flex-1 mt-3">{children}</main>
        </div>
      </body>
    </html>
  );
}
