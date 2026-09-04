export type RiskLevel = "LOW" | "MEDIUM" | "HIGH";

export type CheckoutStatus =
  | "started"
  | "payment_attempted"
  | "payment_failed"
  | "analyzing"
  | "recovering"
  | "rescued"
  | "abandoned"
  | "completed"
  | "blocked";

export type RecoveryActionType =
  | "ALTERNATIVE_PAYMENT"
  | "CHECKOUT_ASSISTANCE"
  | "REMINDER"
  | "NO_ACTION";

export type Signal =
  | "payment_failure"
  | "customer_hesitation"
  | "multiple_attempts"
  | "long_inactivity"
  | "high_cart_value"
  | "returning_customer";

export type GuardrailCheck = {
  id: string;
  label: string;
  passed: boolean;
};

export type AnalysisResult = {
  score: number;
  probability: number;
  riskLevel: RiskLevel;
  likelyReason: string;
  signals: Signal[];
  usedFallback: boolean;
  aiNotice?: string;
};

export type RecoveryDecision = {
  action: RecoveryActionType;
  title: string;
  reason: string;
  usedFallback: boolean;
  aiNotice?: string;
};
