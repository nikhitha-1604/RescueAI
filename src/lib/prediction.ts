import type { AnalysisResult, RiskLevel, Signal } from "./types";

export const SCORE_WEIGHTS: Record<Signal, number> = {
  payment_failure: 30,
  customer_hesitation: 20,
  multiple_attempts: 15,
  long_inactivity: 20,
  high_cart_value: 5,
  returning_customer: -10,
};

export function scoreSignals(signals: Signal[]): number {
  return signals.reduce((sum, signal) => sum + SCORE_WEIGHTS[signal], 0);
}

export function riskFromScore(score: number): RiskLevel {
  if (score <= 30) return "LOW";
  if (score <= 60) return "MEDIUM";
  return "HIGH";
}

/** Heuristic mapping — not a scientifically validated model. */
export function probabilityFromScore(score: number): number {
  return Math.min(95, Math.max(8, Math.round(score * 1.17)));
}

export function reasonFromSignals(signals: Signal[]): string {
  if (signals.includes("payment_failure") && signals.includes("customer_hesitation")) {
    return "Payment failure + customer hesitation";
  }
  if (signals.includes("payment_failure")) return "Payment failure";
  if (signals.includes("long_inactivity")) return "Inactivity";
  if (signals.includes("customer_hesitation")) return "Customer hesitation";
  return "Low risk";
}

export function analyzeSignals(signals: Signal[]): AnalysisResult {
  const unique = [...new Set(signals)];
  const score = scoreSignals(unique);
  return {
    score,
    probability: probabilityFromScore(score),
    riskLevel: riskFromScore(score),
    likelyReason: reasonFromSignals(unique),
    signals: unique,
    usedFallback: true,
  };
}

export function signalsForScenario(
  scenario: "normal" | "payment_failure" | "hesitation" | "abandonment",
  amount: number,
  returning: boolean,
  eventTypes?: Set<string>
): Signal[] {
  const signals: Signal[] = [];
  if (amount >= 25000) signals.push("high_cart_value");
  if (returning) signals.push("returning_customer");

  const hasEvent = (eventType: string) => eventTypes?.has(eventType) ?? false;
  if (hasEvent("payment_failure") || scenario === "payment_failure") {
    signals.push("payment_failure", "customer_hesitation", "multiple_attempts");
  } else if (hasEvent("customer_hesitation") || scenario === "hesitation") {
    signals.push("customer_hesitation", "long_inactivity");
  } else if (hasEvent("inactivity") || scenario === "abandonment") {
    signals.push("long_inactivity", "customer_hesitation", "multiple_attempts");
  }

  return signals;
}
