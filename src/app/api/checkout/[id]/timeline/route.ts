import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export const runtime = "nodejs";

const LABELS: Record<string, string> = {
  checkout_started: "Checkout started",
  payment_attempted: "Payment attempted",
  payment_failure: "Payment failure detected",
  customer_hesitation: "Customer hesitation detected",
  inactivity: "Inactivity detected",
  friction_identified: "Likely friction identified",
  recovery_action_selected: "Recovery action selected",
  guardrails_passed: "Guardrails passed",
  guardrails_blocked: "Guardrails blocked",
  recovery_stopped: "Recovery stopped",
  recovery_blocked: "Recovery blocked",
  recovery_completed: "Recovery completed",
  payment_success: "Customer completed payment",
  rescued: "Revenue rescued",
};

export function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  return context.params.then((params) => {
    const checkoutId = Number(params.id);
    const db = getDb();
    const rows = db
      .prepare(
        "SELECT event_type, created_at FROM checkout_events WHERE checkout_id = ? ORDER BY id ASC"
      )
      .all(checkoutId) as { event_type: string; created_at: string }[];

    const session = db
      .prepare("SELECT amount, abandonment_probability FROM checkout_sessions WHERE id = ?")
      .get(checkoutId) as { amount: number; abandonment_probability: number | null } | undefined;

    const events = rows.map((row) => {
      if (row.event_type.startsWith("abandonment_risk_")) {
        const p = row.event_type.replace("abandonment_risk_", "");
        return {
          label: `Abandonment risk calculated: ${p}%`,
          at: row.created_at,
        };
      }
      if (row.event_type === "rescued" && session) {
        return {
          label: `₹${session.amount.toLocaleString("en-IN")} rescued`,
          at: row.created_at,
        };
      }
      return {
        label: LABELS[row.event_type] ?? row.event_type,
        at: row.created_at,
      };
    });

    return NextResponse.json({ events, probability: session?.abandonment_probability ?? null });
  });
}
