import { NextRequest, NextResponse } from "next/server";
import { isCurrentUserAdmin } from "@/lib/auth";
import {
  getAdminUsers,
  updateUserSubscription,
  toggleBlockUser,
  getBlockedDevices,
  blockDevice,
  unblockDevice,
  getLiveVisitors,
  recordLiveVisitor,
  getSystemSettings,
  updateSystemSetting,
  resetUserPassword,
  toggleUserAdmin,
} from "@/lib/finance";

export async function GET() {
  try {
    if (!(await isCurrentUserAdmin())) {
      return NextResponse.json({ error: "هذا الإجراء متاح للإدارة فقط" }, { status: 403 });
    }

    const users = await getAdminUsers();
    const blockedDevices = await getBlockedDevices();
    const liveVisitors = await getLiveVisitors();
    const systemSettings = await getSystemSettings();

    const activeSubscriptions = (users as Array<{ status: string }>).filter((u) => u.status === "active").length;
    const paidSubscriptions = (users as Array<{ plan: string }>).filter((u) => u.plan !== "free").length;

    return NextResponse.json({
      users,
      blockedDevices,
      liveVisitors,
      systemSettings,
      stats: {
        totalUsers: users.length,
        activeSubscriptions,
        paidSubscriptions,
        blockedDevicesCount: blockedDevices.length,
        liveGuestsCount: liveVisitors.length,
      },
    });
  } catch (error: unknown) {
    console.error("Admin GET Error:", error);
    const msg = error instanceof Error ? error.message : "Error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    if (!(await isCurrentUserAdmin())) {
      return NextResponse.json({ error: "هذا الإجراء متاح للإدارة فقط" }, { status: 403 });
    }

    const body = await req.json();
    const { action } = body;

    if (action === "update_subscription") {
      const { userId, plan, status, expiresAt } = body;
      await updateUserSubscription(Number(userId), { plan, status, expiresAt });
      return NextResponse.json({ success: true });
    }

    if (action === "quick_grant_plan") {
      const { userId, plan, days } = body;
      const now = new Date();
      const expiresAt = new Date(now.getTime() + Number(days) * 24 * 60 * 60 * 1000).toISOString();
      await updateUserSubscription(Number(userId), { plan, status: "active", expiresAt });
      return NextResponse.json({ success: true, expiresAt });
    }

    if (action === "reset_password") {
      const { userId, newPassword } = body;
      await resetUserPassword(Number(userId), newPassword || "123456");
      return NextResponse.json({ success: true });
    }

    if (action === "toggle_admin") {
      const { userId, isAdmin } = body;
      await toggleUserAdmin(Number(userId), Boolean(isAdmin));
      return NextResponse.json({ success: true });
    }

    if (action === "update_system_setting") {
      const { key, value, description } = body;
      await updateSystemSetting(key, String(value), description);
      return NextResponse.json({ success: true });
    }

    if (action === "toggle_block_user") {
      const { userId, isBlocked, reason } = body;
      await toggleBlockUser(Number(userId), Boolean(isBlocked), reason);
      return NextResponse.json({ success: true });
    }

    if (action === "block_device") {
      const { deviceId, ipAddress, reason } = body;
      await blockDevice({ deviceId, ipAddress, reason });
      return NextResponse.json({ success: true });
    }

    if (action === "unblock_device") {
      const { deviceId } = body;
      await unblockDevice(deviceId);
      return NextResponse.json({ success: true });
    }

    if (action === "ping_live") {
      const { sessionId, ip, deviceInfo, page } = body;
      await recordLiveVisitor({ sessionId, ip, deviceInfo, page });
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Invalid admin action" }, { status: 400 });
  } catch (error: unknown) {
    console.error("Admin POST Error:", error);
    const msg = error instanceof Error ? error.message : "Error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}