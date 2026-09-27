import { NextRequest, NextResponse } from "next/server";
import { getActiveUserId, isCurrentUserAdmin } from "@/lib/auth";
import { isRateLimited } from "@/lib/rate-limit";
import {
  ingestKnowledgeDoc,
  listKnowledgeDocs,
  deleteKnowledgeDoc,
} from "@/lib/knowledge";

export async function GET() {
  try {
    if (!(await isCurrentUserAdmin())) {
      return NextResponse.json({ error: "هذا الإجراء متاح للإدارة فقط" }, { status: 403 });
    }
    const docs = await listKnowledgeDocs();
    return NextResponse.json({ docs });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "تعذر تحميل قاعدة المعرفة";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const userId = await getActiveUserId();
    if (!userId) {
      return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
    }
    if (!(await isCurrentUserAdmin())) {
      return NextResponse.json({ error: "هذا الإجراء متاح للإدارة فقط" }, { status: 403 });
    }
    if (isRateLimited(`knowledge:${userId}`, 20, 60 * 1000)) {
      return NextResponse.json({ error: "طلبات كثيرة جداً. حاول بعد قليل." }, { status: 429 });
    }

    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "بيانات غير صالحة" }, { status: 400 });
    }

    const title = String(body.title || "").trim().slice(0, 200);
    const content = String(body.content || "").trim().slice(0, 60_000);
    const source = String(body.source || "").trim().slice(0, 200) || null;

    if (!title || !content) {
      return NextResponse.json({ error: "العنوان والمحتوى مطلوبان" }, { status: 400 });
    }

    const { docId, chunksCount } = await ingestKnowledgeDoc(title, content, source, userId);
    return NextResponse.json({ success: true, docId, chunksCount });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "تعذر حفظ المستند";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    if (!(await isCurrentUserAdmin())) {
      return NextResponse.json({ error: "هذا الإجراء متاح للإدارة فقط" }, { status: 403 });
    }
    const id = Number(new URL(req.url).searchParams.get("id"));
    if (!id || isNaN(Number(id))) {
      return NextResponse.json({ error: "معرّف المستند مطلوب" }, { status: 400 });
    }
    await deleteKnowledgeDoc(id);
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "تعذر حذف المستند";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}