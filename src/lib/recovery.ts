import type { RecoveryDecision, Signal } from "./types";

export function recommendAction(signals: Signal[], riskLevel: string): RecoveryDecision {
  if (riskLevel === "LOW") {
    return {
      action: "NO_ACTION",
      title: "No action",
      reason: "Abandonment risk is low. Interrupting checkout would add friction without a clear benefit.",
      usedFallback: true,
    };
  }

  if (signals.includes("payment_failure")) {
    return {
      action: "ALTERNATIVE_PAYMENT",
      title: "Offer alternative payment method",
      reason:
        "The customer experienced a payment failure and appears hesitant. Offering another payment method is a low-friction recovery action.",
      usedFallback: true,
    };
  }

  if (signals.includes("long_inactivity") && !signals.includes("customer_hesitation")) {
    return {
      action: "REMINDER",
      title: "Send a gentle reminder",
      reason: "The customer went inactive during checkout. A timely reminder can bring them back without changing price or charging automatically.",
      usedFallback: true,
    };
  }

  if (signals.includes("customer_hesitation") || signals.includes("long_inactivity")) {
    return {
      action: "CHECKOUT_ASSISTANCE",
      title: "Checkout assistance",
      reason: "The customer is hesitating at payment. Offering help and keeping the order available is a safer recovery than a discount or auto-charge.",
      usedFallback: true,
    };
  }

  return {
    action: "NO_ACTION",
    title: "No action",
    reason: "No high-confidence friction signal was found.",
    usedFallback: true,
  };
}
