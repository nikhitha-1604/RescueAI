import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export const runtime = "nodejs";

export function GET() {
  const db = getDb();
  const metrics = db
    .prepare(
      "SELECT revenue_at_risk, revenue_rescued, active_checkouts, successful_interventions FROM metrics WHERE id = 1"
    )
    .get() as {
    revenue_at_risk: number;
    revenue_rescued: number;
    active_checkouts: number;
    successful_interventions: number;
  };

  const pct = (metrics.revenue_rescued / metrics.revenue_at_risk) * 100;
  const rate = metrics.revenue_at_risk === 0 ? 0 : Math.round(pct * 10) / 10;
  const batch = db.prepare(
    `SELECT COUNT(*) AS analyzed,
      SUM(CASE WHEN risk_level = 'HIGH' THEN 1 ELSE 0 END) AS high_risk,
      SUM(CASE WHEN intervention_count > 0 THEN 1 ELSE 0 END) AS interventions,
      SUM(CASE WHEN status = 'rescued' THEN 1 ELSE 0 END) AS recovered,
      COALESCE(SUM(CASE WHEN risk_level = 'HIGH' THEN amount ELSE 0 END), 0) AS batch_at_risk,
      COALESCE(SUM(revenue_recovered), 0) AS batch_recovered
     FROM checkout_sessions`
  ).get() as {
    analyzed: number;
    high_risk: number;
    interventions: number;
    recovered: number;
    batch_at_risk: number;
    batch_recovered: number;
  };
  const recentAudit = db.prepare(
    "SELECT id, checkout_id, customer, event_type, result, reason, created_at FROM audit_logs ORDER BY id DESC LIMIT 8"
  ).all();

  return NextResponse.json({
    demo: true,
    revenueAtRisk: metrics.revenue_at_risk,
    revenueRescued: metrics.revenue_rescued,
    rescueRate: Math.min(100, rate),
    activeCheckouts: metrics.active_checkouts,
    successfulInterventions: metrics.successful_interventions,
    performance: {
      analyzed: batch.analyzed,
      highRisk: batch.high_risk,
      interventions: batch.interventions,
      recovered: batch.recovered,
      revenueAtRisk: batch.batch_at_risk,
      revenueRecovered: batch.batch_recovered,
      recoveryRate: batch.batch_at_risk === 0 ? 0 : Math.min(100, Math.round((batch.batch_recovered / batch.batch_at_risk) * 1000) / 10),
      interventionSuccessRate: batch.interventions === 0 ? 0 : Math.round((batch.recovered / batch.interventions) * 1000) / 10,
    },
    recentAudit,
  });
}
