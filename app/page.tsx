import { cookies } from "next/headers";
import { verifyValue } from "@/lib/cookie-sign";
import DashboardPage from "./_home/dashboard";
import LandingPage from "./landing/page";

export default async function HomePage() {
  const cookieStore = await cookies();
  const userIdCookie = cookieStore.get("finance_user_id")?.value;
  const impersonateCookie = cookieStore.get("finance_impersonate_user_id")?.value;
  const isAuthenticated = Boolean(verifyValue(userIdCookie) || verifyValue(impersonateCookie));

  return isAuthenticated ? <DashboardPage /> : <LandingPage />;
}