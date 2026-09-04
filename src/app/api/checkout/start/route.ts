import { NextResponse } from "next/server";
import { addEvent, getDb, nowIso } from "@/lib/db";

export const runtime = "nodejs";

export function POST() {
  const db = getDb();
  const customer = db
    .prepare("SELECT id, name, email, opted_out, is_returning FROM customers WHERE id = 1")
    .get() as {
    id: number;
    name: string;
    email: string;
    opted_out: number;
    is_returning: number;
  };

  const existing = db
    .prepare("SELECT id FROM checkout_sessions WHERE customer_id = ? ORDER BY id ASC LIMIT 1")
    .get(customer.id) as { id: number } | undefined;
  const checkoutId = existing?.id;
  if (!checkoutId) {
    const created = db
      .prepare(
        `INSERT INTO checkout_sessions (customer_id, amount, product, status, created_at)
         VALUES (?, ?, ?, ?, ?)`
      )
      .run(customer.id, 69999, "Premium Laptop", "started", nowIso());
    return finishStart(Number(created.lastInsertRowid), customer);
  }
  db.prepare("DELETE FROM payments WHERE checkout_id = ?").run(checkoutId);
  db.prepare("DELETE FROM recovery_actions WHERE checkout_id = ?").run(checkoutId);
  db.prepare("DELETE FROM checkout_events WHERE checkout_id = ?").run(checkoutId);
  db.prepare(
    "UPDATE checkout_sessions SET amount = 69999, product = 'Premium Laptop', status = 'started', abandonment_probability = NULL, risk_level = NULL, likely_reason = NULL, intervention_count = 0, stop_reason = NULL, revenue_recovered = 0, created_at = ? WHERE id = ?"
  ).run(nowIso(), checkoutId);
  return finishStart(checkoutId, customer);
}

function finishStart(checkoutId: number, customer: { id: number; name: string; email: string; opted_out: number; is_returning: number }) {
  addEvent(checkoutId, "checkout_started");
  return NextResponse.json({
    checkoutId,
    product: "Premium Laptop",
    amount: 69999,
    customer,
  });
}
