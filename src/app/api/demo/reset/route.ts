import { NextResponse } from "next/server";
import { ensureBatch, getDb } from "@/lib/db";

export const runtime = "nodejs";

/** Restores the deterministic demo dataset so the script can be replayed. */
export function POST() {
  const db = getDb();
  db.prepare(
    "DELETE FROM payments WHERE checkout_id IN (SELECT id FROM checkout_sessions WHERE id > 3)"
  ).run();
  db.prepare(
    "DELETE FROM recovery_actions WHERE checkout_id IN (SELECT id FROM checkout_sessions WHERE id > 3)"
  ).run();
  db.prepare(
    "DELETE FROM checkout_events WHERE checkout_id IN (SELECT id FROM checkout_sessions WHERE id > 3)"
  ).run();
  db.prepare(
    "DELETE FROM audit_logs WHERE checkout_id IN (SELECT id FROM checkout_sessions WHERE id > 3)"
  ).run();
  db.prepare("DELETE FROM checkout_sessions WHERE id > 3").run();
  db.prepare(
    "UPDATE metrics SET revenue_at_risk = ?, revenue_rescued = ?, active_checkouts = ?, successful_interventions = ? WHERE id = 1"
  ).run(842500, 518750, 127, 84);
  db.prepare("DELETE FROM audit_logs WHERE checkout_id = 1").run();
  db.prepare("UPDATE checkout_sessions SET status = 'recovering', abandonment_probability = 82, risk_level = 'HIGH', likely_reason = 'Payment failure', intervention_count = 1, stop_reason = NULL, revenue_recovered = 0 WHERE id = 1").run();
  ensureBatch(db);
  return NextResponse.json({ ok: true });
}
