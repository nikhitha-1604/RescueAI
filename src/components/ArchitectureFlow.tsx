"use client";

import {
  AlertCircle,
  CheckCircle2,
  Zap,
  Brain,
  Shield,
  CreditCard,
  Database,
  Gauge,
  Clock,
  ArrowDown,
} from "lucide-react";

interface StageCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  details?: string[];
  accent?: "teal" | "blue" | "amber" | "emerald";
}

function StageCard({ icon, title, description, details, accent = "teal" }: StageCardProps) {
  const accentColors = {
    teal: "border-teal-200 bg-teal-50",
    blue: "border-blue-200 bg-blue-50",
    amber: "border-amber-200 bg-amber-50",
    emerald: "border-emerald-200 bg-emerald-50",
  };

  const iconColors = {
    teal: "text-teal-600",
    blue: "text-blue-600",
    amber: "text-amber-600",
    emerald: "text-emerald-600",
  };

  return (
    <div className={`rounded-2xl border ${accentColors[accent]} p-5 transition hover:shadow-md`}>
      <div className={`mb-3 inline-flex h-10 w-10 items-center justify-center rounded-lg ${accentColors[accent]}`}>
        <div className={iconColors[accent]}>{icon}</div>
      </div>
      <h3 className="font-semibold text-foreground">{title}</h3>
      <p className="mt-2 text-sm text-muted">{description}</p>
      {details && (
        <ul className="mt-3 space-y-1">
          {details.map((detail, i) => (
            <li key={i} className="text-xs text-muted">
              • {detail}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function PhaseLabel({ label, color }: { label: string; color: string }) {
  const colors = {
    detect: "bg-teal-100 text-teal-700",
    diagnose: "bg-blue-100 text-blue-700",
    decide: "bg-amber-100 text-amber-700",
    guard: "bg-rose-100 text-rose-700",
    act: "bg-purple-100 text-purple-700",
    measure: "bg-emerald-100 text-emerald-700",
    audit: "bg-indigo-100 text-indigo-700",
    stop: "bg-slate-100 text-slate-700",
  };

  return (
    <span className={`inline-block rounded-full px-3 py-1 text-xs font-semibold ${colors[color as keyof typeof colors] || colors.detect}`}>
      {label}
    </span>
  );
}

export default function ArchitectureFlow() {
  return (
    <section className="mt-16 border-t border-line pt-12">
      {/* Title and subtitle */}
      <div className="mb-12">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-teal-700">How it works</p>
        <h2 className="mt-2 text-2xl font-semibold tracking-tight">RescueAI Architecture</h2>
        <p className="mt-3 max-w-2xl text-sm text-muted">
          An intelligent, bounded recovery workflow that turns revenue at risk into recovered revenue.
        </p>
      </div>

      {/* Quick phase summary */}
      <div className="mb-12 flex flex-wrap gap-2">
        <PhaseLabel label="DETECT" color="detect" />
        <span className="text-muted">→</span>
        <PhaseLabel label="DIAGNOSE" color="diagnose" />
        <span className="text-muted">→</span>
        <PhaseLabel label="DECIDE" color="decide" />
        <span className="text-muted">→</span>
        <PhaseLabel label="GUARD" color="guard" />
        <span className="text-muted">→</span>
        <PhaseLabel label="ACT" color="act" />
        <span className="text-muted">→</span>
        <PhaseLabel label="MEASURE" color="measure" />
        <span className="text-muted">→</span>
        <PhaseLabel label="AUDIT" color="audit" />
        <span className="text-muted">→</span>
        <PhaseLabel label="STOP" color="stop" />
      </div>

      {/* Main flow diagram */}
      <div className="space-y-4">
        {/* Stage 1: Checkout Events */}
        <div className="flex flex-col items-center gap-4 md:gap-2">
          <StageCard
            icon={<Clock className="h-5 w-5" />}
            title="1. Checkout Events"
            description="Captures payment attempts, failures, hesitation, inactivity and checkout behavior."
            details={["Payment failure", "Customer hesitation", "Inactivity timeout", "Multiple attempts"]}
            accent="teal"
          />
          <div className="hidden text-muted md:block">
            <ArrowDown className="h-5 w-5" />
          </div>
        </div>

        {/* Stage 2: AI Risk Engine */}
        <div className="flex flex-col items-center gap-4 md:gap-2">
          <StageCard
            icon={<Brain className="h-5 w-5" />}
            title="2. AI Risk Engine"
            description="Analyzes checkout signals and calculates abandonment risk."
            details={["Risk Score calculated", "LOW / MEDIUM / HIGH classification", "Deterministic analysis", "Fallback logic available"]}
            accent="blue"
          />
          <div className="hidden text-muted md:block">
            <ArrowDown className="h-5 w-5" />
          </div>
        </div>

        {/* Stage 3: Diagnose Friction */}
        <div className="flex flex-col items-center gap-4 md:gap-2">
          <StageCard
            icon={<AlertCircle className="h-5 w-5" />}
            title="3. Diagnose Friction"
            description="Identifies the likely reason behind the abandonment risk."
            details={["Payment Failure", "Customer Hesitation", "Inactivity", "Friction Signal Analysis"]}
            accent="blue"
          />
          <div className="hidden text-muted md:block">
            <ArrowDown className="h-5 w-5" />
          </div>
        </div>

        {/* Stage 4: Recovery Decision */}
        <div className="flex flex-col items-center gap-4 md:gap-2">
          <StageCard
            icon={<Zap className="h-5 w-5" />}
            title="4. Recovery Decision"
            description="Selects the most appropriate recovery action based on detected friction."
            details={[
              "Alternative Payment Method",
              "Checkout Assistance",
              "Reminder",
              "No Action (if low risk)",
            ]}
            accent="amber"
          />
          <div className="hidden text-muted md:block">
            <ArrowDown className="h-5 w-5" />
          </div>
        </div>

        {/* Stage 5: Guardrails Validation */}
        <div className="flex flex-col items-center gap-4 md:gap-2">
          <StageCard
            icon={<Shield className="h-5 w-5" />}
            title="5. Guardrails"
            description="Validates whether the recovery action is safe and allowed."
            details={[
              "✓ Customer opted in",
              "✓ Recovery window active",
              "✓ Intervention limit available",
              "✓ Merchant policy allows action",
              "✓ No automatic charge",
              "✓ Cart amount unchanged",
            ]}
            accent="teal"
          />
          <div className="hidden text-muted md:block">
            <ArrowDown className="h-5 w-5" />
          </div>
        </div>

        {/* Stage 6: Recovery Action */}
        <div className="flex flex-col items-center gap-4 md:gap-2">
          <StageCard
            icon={<Zap className="h-5 w-5" />}
            title="6. Recovery Action"
            description="Executes the approved intervention."
            details={["Offer alternative payment method", "Provide checkout assistance", "Send gentle reminder", "Transparent & bounded"]}
            accent="blue"
          />
          <div className="hidden text-muted md:block">
            <ArrowDown className="h-5 w-5" />
          </div>
        </div>

        {/* Stage 7: Payment Retry */}
        <div className="flex flex-col items-center gap-4 md:gap-2">
          <StageCard
            icon={<CreditCard className="h-5 w-5" />}
            title="7. Payment Retry"
            description="Customer retries payment through an available payment method."
            details={["Multiple payment options", "UPI, Cards, Wallets", "Frictionless experience"]}
            accent="teal"
          />
          <div className="hidden text-muted md:block">
            <ArrowDown className="h-5 w-5" />
          </div>
        </div>

        {/* Stage 8: Outcome (split paths) */}
        <div className="grid gap-4 md:grid-cols-2">
          <StageCard
            icon={<CheckCircle2 className="h-5 w-5" />}
            title="8a. Success"
            description="Payment successful and revenue is recovered."
            details={["Order confirmed", "Revenue at risk → Revenue recovered", "Customer satisfied"]}
            accent="emerald"
          />
          <StageCard
            icon={<AlertCircle className="h-5 w-5" />}
            title="8b. Stopped"
            description="Recovery failed or stopped by guardrails."
            details={["Stopping rules applied", "No harm to customer", "Respects policy & consent"]}
            accent="amber"
          />
        </div>

        {/* Stage 9: Audit Trail */}
        <div className="flex flex-col items-center gap-4 md:gap-2">
          <StageCard
            icon={<Database className="h-5 w-5" />}
            title="9. Audit Trail"
            description="Records the agent's decisions, actions and outcomes for full transparency."
            details={["Decision log", "Action history", "Outcome tracking", "Compliance ready"]}
            accent="blue"
          />
          <div className="hidden text-muted md:block">
            <ArrowDown className="h-5 w-5" />
          </div>
        </div>

        {/* Stage 10: Merchant Dashboard */}
        <div className="flex flex-col items-center gap-4 md:gap-2">
          <StageCard
            icon={<Gauge className="h-5 w-5" />}
            title="10. Merchant Dashboard"
            description="Measures revenue at risk, revenue recovered, recovery rate and batch performance."
            details={["Real-time metrics", "Recovery rate %", "Revenue impact", "Batch analytics"]}
            accent="emerald"
          />
        </div>
      </div>

      {/* Key Principles */}
      <div className="mt-8 rounded-2xl border border-emerald-200 bg-emerald-50 p-6">
        <h3 className="font-semibold text-foreground">Core Principles</h3>
        <ul className="mt-3 space-y-2 text-sm text-muted">
          <li>✓ <strong>Bounded:</strong> Guardrails prevent harmful or unauthorized actions.</li>
          <li>✓ <strong>Transparent:</strong> Every decision is logged and auditable.</li>
          <li>✓ <strong>Respectful:</strong> Honors customer consent and merchant policy.</li>
          <li>✓ <strong>Measured:</strong> Impact is tracked and reported in real time.</li>
          <li>✓ <strong>Intelligent:</strong> Risk-aware, friction-aware decision making.</li>
        </ul>
      </div>
    </section>
  );
}
