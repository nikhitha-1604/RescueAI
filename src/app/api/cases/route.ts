import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export const runtime = "nodejs";

export function GET() {
  const db = getDb();
  const rows = db
    .prepare(
      `SELECT s.id, c.name, s.amount, s.abandonment_probability, s.likely_reason, s.status
       FROM checkout_sessions s
       JOIN customers c ON c.id = s.customer_id
       ORDER BY s.id DESC
       LIMIT 8`
    )
    .all() as {
    id: number;
    name: string;
    amount: number;
    abandonment_probability: number | null;
    likely_reason: string | null;
    status: string;
  }[];

  const cases = rows.map((row) => ({
    id: row.id,
    name: row.name,
    amount: row.amount,
    risk: row.abandonment_probability ?? 0,
    reason: row.likely_reason ?? "—",
    status: statusLabel(row.status),
  }));

  return NextResponse.json({ demo: true, cases });
}

function statusLabel(status: string) {
  if (status === "rescued") return "Recovered";
  if (status === "recovering" || status === "payment_failed" || status === "analyzing") {
    return "Recovering";
  }
  if (status === "blocked") return "Blocked";
  if (status === "abandoned") return "Abandoned";
  if (status === "completed") return "Completed";
  return "No action";
}
