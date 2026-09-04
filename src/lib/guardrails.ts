import type { GuardrailCheck, RecoveryActionType } from "./types";

const RECOVERY_WINDOW_MS = 30 * 60 * 1000;
export const MAX_INTERVENTIONS = 2;
const HUMAN_REVIEW_AMOUNT = 200_000;
const ALLOWED: RecoveryActionType[] = [
  "ALTERNATIVE_PAYMENT",
  "CHECKOUT_ASSISTANCE",
  "REMINDER",
  "NO_ACTION",
];

export type GuardrailInput = {
  optedOut: boolean;
  paymentSucceeded: boolean;
  interventionShown: boolean;
  interventionCount?: number;
  startedAt: number;
  amount: number;
  action: RecoveryActionType;
  changeAmountAttempt?: boolean;
  autoChargeAttempt?: boolean;
};

export function evaluateGuardrails(input: GuardrailInput): {
  checks: GuardrailCheck[];
  passed: boolean;
  blockedReason?: string;
  humanReview: boolean;
  stopRecovery: boolean;
} {
  if (input.paymentSucceeded) {
    return {
      checks: [],
      passed: false,
      stopRecovery: true,
      humanReview: false,
      blockedReason: "Payment already succeeded. Recovery stopped.",
    };
  }

  if (input.optedOut) {
    return {
      checks: [
        {
          id: "opt_out",
          label: "Customer has not opted out",
          passed: false,
        },
      ],
      passed: false,
      stopRecovery: true,
      humanReview: false,
      blockedReason: "Recovery action blocked by policy. No customer action taken.",
    };
  }

  const windowActive = Date.now() - input.startedAt <= RECOVERY_WINDOW_MS;
  const interventionLimitActive =
    (input.interventionCount ?? (input.interventionShown ? 1 : 0)) < MAX_INTERVENTIONS;
  const actionAllowed =
    ALLOWED.includes(input.action) &&
    !input.changeAmountAttempt &&
    !input.autoChargeAttempt &&
    input.action !== "NO_ACTION";

  const checks: GuardrailCheck[] = [
    { id: "opt_out", label: "Customer has not opted out", passed: !input.optedOut },
    { id: "window", label: "Recovery window active", passed: windowActive },
    {
      id: "limit",
      label: "Intervention limit not exceeded",
      passed: interventionLimitActive,
    },
    { id: "policy", label: "Action allowed by policy", passed: actionAllowed },
    { id: "no_charge", label: "No automatic charge", passed: !input.autoChargeAttempt },
    { id: "amount", label: "Amount immutable", passed: !input.changeAmountAttempt },
  ];

  const humanReview = input.amount >= HUMAN_REVIEW_AMOUNT;
  if (humanReview) {
    return {
      checks,
      passed: false,
      humanReview: true,
      stopRecovery: true,
      blockedReason: "High-value transaction requires human review. Recovery action blocked by policy.",
    };
  }

  const passed = checks.every((c) => c.passed);
  return {
    checks,
    passed,
    humanReview: false,
    stopRecovery: !passed,
    blockedReason: passed
      ? undefined
      : "Recovery action blocked by policy. No customer action taken.",
  };
}
