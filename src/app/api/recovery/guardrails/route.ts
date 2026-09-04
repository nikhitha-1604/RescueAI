import { NextResponse } from "next/server";
import { evaluateGuardrails } from "@/lib/guardrails";
import { addEvent, getDb, nowIso } from "@/lib/db";
import type { RecoveryActionType } from "@/lib/types";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const body = (await request.json()) as {
    checkoutId?: number;
    action?: RecoveryActionType;
    interventionShown?: boolean;
    startedAt?: number;
  };

  if (!body.checkoutId || !body.action) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const db = getDb();
  const session = db
    .prepare(
      `SELECT s.amount, s.status, s.created_at, s.intervention_count, c.opted_out
       FROM checkout_sessions s
       JOIN customers c ON c.id = s.customer_id
       WHERE s.id = ?`
    )
    .get(body.checkoutId) as
    | { amount: number; status: string; created_at: string; intervention_count: number; opted_out: number }
    | undefined;

  if (!session) {
    return NextResponse.json({ error: "Checkout not found" }, { status: 404 });
  }

  const paid = db
    .prepare("SELECT id FROM payments WHERE checkout_id = ? AND status = 'success'")
    .get(body.checkoutId);

  const result = evaluateGuardrails({
    optedOut: Boolean(session.opted_out),
    paymentSucceeded: Boolean(paid) || session.status === "rescued",
    interventionShown: Boolean(body.interventionShown),
    interventionCount: session.intervention_count,
    startedAt: body.startedAt ?? new Date(session.created_at).getTime(),
    amount: session.amount,
    action: body.action,
  });

  if (result.passed) {
    db.prepare("UPDATE checkout_sessions SET status = ?, intervention_count = intervention_count + 1 WHERE id = ?").run(
      "recovering",
      body.checkoutId
    );
    db.prepare(
      "INSERT INTO recovery_actions (checkout_id, action, status, created_at) VALUES (?, ?, ?, ?)"
    ).run(body.checkoutId, body.action, "passed", nowIso());
    addEvent(body.checkoutId, "guardrails_passed", {
      action: body.action,
      result: "PASSED",
    });
    addEvent(body.checkoutId, "recovery_intervention_executed", {
      action: body.action,
      result: "EXECUTED",
      reason: "Guardrails passed and intervention is allowed.",
    });
  } else {
    const failedCheck = result.checks.find((check) => !check.passed);
    const stopping =
      result.blockedReason === "Payment already succeeded. Recovery stopped." ||
      failedCheck?.id === "window" ||
      failedCheck?.id === "limit" ||
      session.intervention_count >= 2;
    const reason =
      failedCheck?.id === "opt_out"
        ? "Customer opted out."
        : result.blockedReason ?? (stopping ? "Recovery limit reached." : "Recovery action blocked by policy.");
    result.blockedReason = reason;
    db.prepare("UPDATE checkout_sessions SET status = ?, stop_reason = ? WHERE id = ?").run(stopping ? "stopped" : "blocked", reason, body.checkoutId);
    db.prepare(
      "INSERT INTO recovery_actions (checkout_id, action, status, created_at) VALUES (?, ?, ?, ?)"
    ).run(body.checkoutId, body.action, "blocked", nowIso());
    addEvent(body.checkoutId, "guardrails_blocked", { result: "BLOCKED", reason });
    addEvent(body.checkoutId, stopping ? "recovery_stopped" : "recovery_blocked", {
      result: stopping ? "STOPPED" : "BLOCKED",
      reason,
    });
  }

  return NextResponse.json(result);
}
