import { NextResponse } from "next/server";
import { addEvent, getDb } from "@/lib/db";
import { analyzeSignals, signalsForScenario } from "@/lib/prediction";
import { maybePolishReason } from "@/lib/ai";
import { recommendAction } from "@/lib/recovery";
import { nowIso } from "@/lib/db";

export const runtime = "nodejs";

const SCENARIOS = ["normal", "payment_failure", "hesitation", "abandonment"] as const;

export async function POST(request: Request) {
  const body = (await request.json()) as {
    checkoutId?: number;
    scenario?: (typeof SCENARIOS)[number];
  };

  const checkoutId = body.checkoutId;
  const scenario = body.scenario;
  if (!checkoutId || !scenario || !SCENARIOS.includes(scenario)) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const db = getDb();
  const session = db
    .prepare(
      `SELECT s.*, c.is_returning, c.opted_out
       FROM checkout_sessions s
       JOIN customers c ON c.id = s.customer_id
       WHERE s.id = ?`
    )
    .get(checkoutId) as
    | {
        id: number;
        amount: number;
        status: string;
        is_returning: number;
        opted_out: number;
        created_at: string;
      }
    | undefined;

  if (!session) {
    return NextResponse.json({ error: "Checkout not found" }, { status: 404 });
  }

  if (session.status === "rescued" || session.status === "completed") {
    return NextResponse.json({ error: "Payment already succeeded. Recovery stopped." }, { status: 409 });
  }

  if (scenario === "payment_failure") {
    addEvent(checkoutId, "payment_failure");
  } else if (scenario === "hesitation") {
    addEvent(checkoutId, "customer_hesitation");
  } else if (scenario === "abandonment") {
    addEvent(checkoutId, "inactivity");
  } else {
    addEvent(checkoutId, "payment_attempted");
  }

  const eventRows = db
    .prepare("SELECT event_type FROM checkout_events WHERE checkout_id = ? ORDER BY id ASC")
    .all(checkoutId) as { event_type: string }[];
  const eventTypes = new Set(eventRows.map((row) => row.event_type));
  const signals = signalsForScenario(
    scenario,
    session.amount,
    Boolean(session.is_returning),
    eventTypes
  );
  const analysis = analyzeSignals(signals);
  let decision = recommendAction(signals, analysis.riskLevel);
  decision = await maybePolishReason(signals, analysis.riskLevel, decision);

  db.prepare(
    `UPDATE checkout_sessions
     SET status = ?, abandonment_probability = ?, risk_level = ?, likely_reason = ?
     WHERE id = ?`
  ).run(
    analysis.riskLevel === "LOW" ? "started" : "analyzing",
    analysis.probability,
    analysis.riskLevel,
    analysis.likelyReason,
    checkoutId
  );

  addEvent(checkoutId, `abandonment_risk_${analysis.probability}`);
  addEvent(checkoutId, "friction_identified");
  addEvent(checkoutId, "recovery_action_selected");

  db.prepare(
    "INSERT INTO recovery_actions (checkout_id, action, status, created_at) VALUES (?, ?, ?, ?)"
  ).run(checkoutId, decision.action, "recommended", nowIso());

  return NextResponse.json({
    analysis,
    decision,
    optedOut: Boolean(session.opted_out),
    startedAt: new Date(session.created_at).getTime(),
  });
}
