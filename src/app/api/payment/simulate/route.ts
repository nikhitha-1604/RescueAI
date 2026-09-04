import { NextResponse } from "next/server";
import { addEvent, getDb, nowIso } from "@/lib/db";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const body = (await request.json()) as {
    checkoutId?: number;
    success?: boolean;
    method?: string;
  };

  if (!body.checkoutId) {
    return NextResponse.json({ error: "checkoutId required" }, { status: 400 });
  }

  const db = getDb();
  const session = db
    .prepare("SELECT amount, status FROM checkout_sessions WHERE id = ?")
    .get(body.checkoutId) as { amount: number; status: string } | undefined;

  if (!session) {
    return NextResponse.json({ error: "Checkout not found" }, { status: 404 });
  }

  if (!body.success) {
    addEvent(body.checkoutId, "payment_retry", {
      action: body.method ?? "upi",
      result: "ATTEMPTED",
    });
    db.prepare(
      "INSERT INTO payments (checkout_id, amount, status, method, created_at) VALUES (?, ?, ?, ?, ?)"
    ).run(body.checkoutId, session.amount, "failed", body.method ?? "upi", nowIso());
    const count = db.prepare("SELECT intervention_count FROM checkout_sessions WHERE id = ?").get(body.checkoutId) as { intervention_count: number };
    if (count.intervention_count >= 2) {
      db.prepare("UPDATE checkout_sessions SET status = 'stopped', stop_reason = ? WHERE id = ?").run("Maximum intervention limit reached.", body.checkoutId);
      db.prepare("UPDATE recovery_actions SET status = 'failed' WHERE checkout_id = ? AND status IN ('passed', 'recommended')").run(body.checkoutId);
      addEvent(body.checkoutId, "recovery_stopped");
    } else {
      db.prepare("UPDATE checkout_sessions SET status = 'payment_failed' WHERE id = ?").run(body.checkoutId);
    }
    addEvent(body.checkoutId, "payment_failure", {
      result: "FAILED",
      reason: "Payment simulator returned an unsuccessful payment.",
    });
    return NextResponse.json({
      success: false,
      message: "Payment unsuccessful. Checkout remains available.",
    });
  }

  if (session.status === "rescued") {
    return NextResponse.json({ success: true, alreadyRescued: true, amount: session.amount });
  }

  db.prepare(
    "INSERT INTO payments (checkout_id, amount, status, method, created_at) VALUES (?, ?, ?, ?, ?)"
  ).run(body.checkoutId, session.amount, "success", body.method ?? "upi", nowIso());
  addEvent(body.checkoutId, "payment_retry", {
    action: body.method ?? "upi",
    result: "ATTEMPTED",
  });
  db.prepare("UPDATE checkout_sessions SET status = ? WHERE id = ?").run("rescued", body.checkoutId);
  db.prepare("UPDATE checkout_sessions SET revenue_recovered = ? WHERE id = ?").run(session.amount, body.checkoutId);
  db.prepare("UPDATE recovery_actions SET status = 'completed' WHERE checkout_id = ? AND status IN ('passed', 'recommended')").run(body.checkoutId);
  db.prepare(
    "UPDATE metrics SET revenue_rescued = revenue_rescued + ?, active_checkouts = MAX(active_checkouts - 1, 0), successful_interventions = successful_interventions + 1 WHERE id = 1"
  ).run(session.amount);
  addEvent(body.checkoutId, "payment_success");
  addEvent(body.checkoutId, "recovery_completed", { result: "COMPLETED" });
  addEvent(body.checkoutId, "rescued");

  return NextResponse.json({ success: true, amount: session.amount });
}
