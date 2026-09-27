import { requireSupabase } from "./supabase";

// Knowledge base for the assistant (RAG-style retrieval using Postgres
// full-text search — free, no external embedding API needed).
// The admin ingests documents; every assistant message retrieves the most
// relevant chunks and injects them into the system prompt as context.

export interface KnowledgeDoc {
  id: number;
  title: string;
  source: string | null;
  chunks_count?: number;
  created_at: string;
}

const CHUNK_SIZE = 500;

// Split content into chunks on paragraph boundaries (~CHUNK_SIZE chars each)
export function splitIntoChunks(content: string): string[] {
  const paragraphs = content
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);
  const chunks: string[] = [];
  let current = "";
  for (const para of paragraphs) {
    if ((current + "\n\n" + para).length > CHUNK_SIZE && current) {
      chunks.push(current);
      current = para;
    } else {
      current = current ? current + "\n\n" + para : para;
    }
    // A single oversized paragraph gets hard-split
    while (current.length > CHUNK_SIZE * 2) {
      chunks.push(current.slice(0, CHUNK_SIZE));
      current = current.slice(CHUNK_SIZE);
    }
  }
  if (current) chunks.push(current);
  return chunks;
}

// Ingest a document: insert the doc row + its chunks
export async function ingestKnowledgeDoc(
  title: string,
  content: string,
  source: string | null,
  createdBy: number
): Promise<{ docId: number; chunksCount: number }> {
  const client = requireSupabase();
  const chunks = splitIntoChunks(content);
  if (chunks.length === 0) {
    throw new Error("المحتوى فاضي — اكتب نصاً قبل الحفظ");
  }
  const { data: doc, error: docErr } = await client
    .from("knowledge_docs")
    .insert({ title, source, created_by: createdBy })
    .select("id")
    .single();
  if (docErr || !doc) throw docErr || new Error("فشل إنشاء المستند");
  const docId = Number((doc as { id: number }).id);
  const rows = chunks.map((c) => ({ doc_id: docId, content: c }));
  const { error: chunkErr } = await client.from("knowledge_chunks").insert(rows);
  if (chunkErr) throw chunkErr;
  return { docId, chunksCount: chunks.length };
}

// Arabic filler words that would break AND-matching in real questions
const AR_STOPWORDS = new Set([
  "في", "من", "على", "عن", "إلى", "الى", "مع", "هو", "هي", "هما", "انا", "أنا", "انت", "أنت",
  "و", "أو", "او", "يا", "هل", "ما", "ماذا", "مش", "لا", "لم", "لن", "كل", "بعد", "قبل", "عند",
  "كام", "إيه", "ايه", "إزاي", "ازاي", "اللي", "التى", "التي", "ده", "دي", "دا", "هذا", "هذه",
  "بالظبط", "بالتفصيل", "رجاء", "لو", "عشان", "بتاع", "بتاعت", "عندي", "عندى", "معايا", "فندم",
]);

// Retrieve the most relevant chunks for a query.
// OR-semantics over meaningful tokens: real questions are full of filler
// words, so plain (AND) matching would fail almost every time.
export async function searchKnowledge(
  query: string,
  limit = 4
): Promise<Array<{ title: string; content: string }>> {
  const clean = query.trim();
  if (!clean) return [];
  const tokens = Array.from(
    new Set(
      clean
        .split(/[^\p{L}\p{N}]+/u)
        .map((w) => w.trim())
        .filter((w) => w.length >= 2 && !AR_STOPWORDS.has(w))
    )
  ).slice(0, 12);
  if (tokens.length === 0) return [];
  const client = requireSupabase();
  const { data, error } = await client
    .from("knowledge_chunks")
    .select("content, knowledge_docs(title)")
    .textSearch("content_tsv", tokens.join(" | "), { config: "simple" })
    .limit(limit);
  if (error) return [];
  return (data || []).map((row: Record<string, unknown>) => {
    const doc = row.knowledge_docs as { title?: string } | null;
    return {
      title: doc?.title || "قاعدة المعرفة",
      content: String(row.content || ""),
    };
  });
}

// List all documents (with chunk counts) for the admin UI
export async function listKnowledgeDocs(): Promise<KnowledgeDoc[]> {
  const client = requireSupabase();
  const { data, error } = await client
    .from("knowledge_docs")
    .select("id, title, source, created_at, knowledge_chunks(count)");
  if (error) throw error;
  return (data || []).map((row: Record<string, unknown>) => {
    const counts = row.knowledge_chunks as Array<{ count?: number }> | null;
    return {
      id: Number(row.id),
      title: String(row.title || ""),
      source: (row.source as string | null) || null,
      chunks_count: counts?.[0]?.count ?? 0,
      created_at: String(row.created_at || ""),
    };
  });
}

// Delete a document (chunks cascade)
export async function deleteKnowledgeDoc(id: number): Promise<void> {
  const client = requireSupabase();
  const { error } = await client.from("knowledge_docs").delete().eq("id", id);
  if (error) throw error;
}