"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Check,
  CreditCard,
  Landmark,
  LoaderCircle,
  Smartphone,
  X,
} from "lucide-react";
import { AppNav } from "@/components/AppNav";
import { inr } from "@/lib/format";
import { saveLastSession } from "@/lib/session-store";
import type { AnalysisResult, GuardrailCheck, RecoveryDecision } from "@/lib/types";

type Method = "upi" | "card" | "netbanking";
type Scenario = "normal" | "payment_failure" | "hesitation" | "abandonment";

const ANALYSIS_STEPS = [
  "Analyzing checkout...",
  "Detecting payment friction...",
  "Estimating abandonment risk...",
  "Selecting recovery action...",
];

export default function CheckoutPage() {
  const [checkoutId, setCheckoutId] = useState<number | null>(null);
  const [method, setMethod] = useState<Method>("upi");
  const [phase, setPhase] = useState<
    | "idle"
    | "failed"
    | "analyzing"
    | "ready"
    | "blocked"
    | "intervention"
    | "paying"
    | "rescued"
  >("idle");
  const [failReason, setFailReason] = useState<string | null>(null);
  const [analysisStep, setAnalysisStep] = useState(0);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [decision, setDecision] = useState<RecoveryDecision | null>(null);
  const [guardrails, setGuardrails] = useState<GuardrailCheck[]>([]);
  const [guardrailMsg, setGuardrailMsg] = useState<string | null>(null);
  const [interventionShown, setInterventionShown] = useState(false);
  const [payError, setPayError] = useState<string | null>(null);
  const [paySuccess, setPaySuccess] = useState(false);
  const [razorpay, setRazorpay] = useState<{ mode: string; keyId: string | null } | null>(null);

  useEffect(() => {
    fetch("/api/checkout/start", { method: "POST" })
      .then((r) => r.json())
      .then((data) => setCheckoutId(data.checkoutId));
    fetch("/api/payment/config")
      .then((r) => r.json())
      .then(setRazorpay);
  }, []);

  useEffect(() => {
    if (phase !== "analyzing") return;
    const id = setInterval(() => {
      setAnalysisStep((s) => Math.min(s + 1, ANALYSIS_STEPS.length - 1));
    }, 700);
    return () => clearInterval(id);
  }, [phase]);

  const persist = (
    nextAnalysis: AnalysisResult,
    nextDecision: RecoveryDecision,
    extra?: { rescued?: boolean; guardrailsPassed?: boolean }
  ) => {
    if (!checkoutId) return;
    saveLastSession({
      checkoutId,
      amount: 69999,
      customerName: "Rahul Sharma",
      analysis: {
        probability: nextAnalysis.probability,
        riskLevel: nextAnalysis.riskLevel,
        likelyReason: nextAnalysis.likelyReason,
        usedFallback: nextAnalysis.usedFallback,
        aiNotice: nextAnalysis.aiNotice,
      },
      decision: nextDecision,
      guardrailsPassed: extra?.guardrailsPassed,
      rescued: extra?.rescued,
    });
  };

  async function runScenario(scenario: Scenario) {
    if (!checkoutId) return;
    setPayError(null);
    setGuardrailMsg(null);
    if (scenario === "payment_failure") {
      setFailReason("Temporary network issue");
      setPhase("failed");
      await new Promise((r) => setTimeout(r, 700));
    } else {
      setFailReason(null);
    }
    setAnalysisStep(0);
    setPhase("analyzing");
    const res = await fetch("/api/checkout/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ checkoutId, scenario }),
    });
    const data = (await res.json()) as {
      analysis?: AnalysisResult;
      decision?: RecoveryDecision;
      error?: string;
      startedAt?: number;
    };
    if (!res.ok || !data.analysis || !data.decision) {
      setPayError(data.error ?? "AI analysis could not be completed. Please try again.");
      setPhase("ready");
      return;
    }
    await new Promise((r) => setTimeout(r, 2200));
    setAnalysis(data.analysis);
    setDecision(data.decision);
    persist(data.analysis, data.decision);
    if (data.analysis?.riskLevel === "LOW" || data.decision?.action === "NO_ACTION") {
      setPhase("ready");
      setGuardrails([]);
      return;
    }
    const g = await fetch("/api/recovery/guardrails", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        checkoutId,
        action: data.decision.action,
        interventionShown,
        startedAt: data.startedAt,
      }),
    }).then((r) => r.json());
    setGuardrails(g.checks ?? []);
    if (!g.passed) {
      setGuardrailMsg(g.blockedReason ?? "Recovery action blocked by policy. No customer action taken.");
      setPhase("blocked");
      persist(data.analysis, data.decision, { guardrailsPassed: false });
      return;
    }
    setPhase("ready");
    persist(data.analysis, data.decision, { guardrailsPassed: true });
  }

  function showIntervention() {
    setInterventionShown(true);
    setPhase("intervention");
  }

  async function simulatePay(success: boolean) {
    if (!checkoutId) return;
    const res = await fetch("/api/payment/simulate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ checkoutId, success, method }),
    }).then((r) => r.json());
    if (!success) {
      setPayError(res.message ?? "Payment unsuccessful. Checkout remains available.");
      return;
    }
    setPaySuccess(true);
    await new Promise((r) => setTimeout(r, 1400));
    setPaySuccess(false);
    setPhase("rescued");
    if (analysis && decision) persist(analysis, decision, { rescued: true, guardrailsPassed: true });
  }

  async function payRazorpay() {
    if (!checkoutId) return;
    const order = await fetch("/api/payment/create-order", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ checkoutId }),
    }).then((r) => r.json());
    if (order.mode === "demo") {
      setPhase("paying");
      return;
    }
    await loadRazorpay();
    const RazorpayCtor = (window as unknown as { Razorpay: new (opts: object) => { open: () => void } }).Razorpay;
    const rzp = new RazorpayCtor({
      key: order.keyId,
      amount: order.amount,
      currency: order.currency,
      name: "RescueAI Checkout",
      description: "Premium Laptop",
      order_id: order.orderId,
      handler: async (response: {
        razorpay_order_id: string;
        razorpay_payment_id: string;
        razorpay_signature: string;
      }) => {
        await fetch("/api/payment/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ checkoutId, ...response }),
        });
        setPhase("rescued");
        if (analysis && decision) persist(analysis, decision, { rescued: true, guardrailsPassed: true });
      },
    });
    rzp.open();
  }

  const riskTone = useMemo(() => {
    if (!analysis) return "";
    if (analysis.riskLevel === "HIGH") return "text-rose-600";
    if (analysis.riskLevel === "MEDIUM") return "text-amber-600";
    return "text-emerald-600";
  }, [analysis]);

  return (
    <div className="min-h-screen">
      <AppNav />
      <main className="mx-auto grid max-w-6xl gap-6 px-4 py-8 lg:grid-cols-[1.1fr_0.9fr]">
        <section className="rounded-2xl border bg-white p-6 shadow-sm">
          <ol className="mb-6 flex gap-4 text-sm text-[#5b6b82]">
            <li className="flex items-center gap-1 text-emerald-700">
              <Check className="h-4 w-4" /> Cart
            </li>
            <li className="flex items-center gap-1 text-emerald-700">
              <Check className="h-4 w-4" /> Address
            </li>
            <li className="font-semibold text-[#0b1b33]">→ Payment</li>
          </ol>

          <h1 className="text-xl font-semibold">Checkout</h1>
          <dl className="mt-4 grid gap-3 rounded-xl bg-slate-50 p-4 text-sm sm:grid-cols-3">
            <div>
              <dt className="text-[#5b6b82]">Product</dt>
              <dd className="font-medium">Premium Laptop</dd>
            </div>
            <div>
              <dt className="text-[#5b6b82]">Price</dt>
              <dd className="font-medium">{inr(69999)}</dd>
            </div>
            <div>
              <dt className="text-[#5b6b82]">Customer</dt>
              <dd className="font-medium">Rahul Sharma</dd>
            </div>
          </dl>

          {failReason ? (
            <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm">
              <p className="font-semibold text-rose-700">Payment failed</p>
              <p className="mt-1 text-rose-700">Reason: {failReason}</p>
            </div>
          ) : null}

          <p className="mt-6 text-sm font-medium">Payment options</p>
          <div className="mt-3 grid gap-2">
            <PayOption
              selected={method === "upi"}
              onClick={() => setMethod("upi")}
              icon={<Smartphone className="h-4 w-4" />}
              label="UPI"
            />
            <PayOption
              selected={method === "card"}
              onClick={() => setMethod("card")}
              icon={<CreditCard className="h-4 w-4" />}
              label="Card"
            />
            <PayOption
              selected={method === "netbanking"}
              onClick={() => setMethod("netbanking")}
              icon={<Landmark className="h-4 w-4" />}
              label="Net Banking"
            />
          </div>

          <button
            className="mt-6 w-full rounded-xl bg-[#07111f] py-3 text-sm font-semibold text-white hover:bg-black"
            onClick={() => setPhase("paying")}
          >
            Pay {inr(69999)}
          </button>

          <div className="mt-8 rounded-xl border border-dashed p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-[#5b6b82]">
              Demo controls
            </p>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              <DemoBtn onClick={() => runScenario("normal")}>Simulate Normal Checkout</DemoBtn>
              <DemoBtn onClick={() => runScenario("payment_failure")}>Simulate Payment Failure</DemoBtn>
              <DemoBtn onClick={() => runScenario("hesitation")}>Simulate Customer Hesitation</DemoBtn>
              <DemoBtn onClick={() => runScenario("abandonment")}>Simulate Abandonment</DemoBtn>
            </div>
          </div>
        </section>

        <aside className="space-y-4">
          {phase === "analyzing" ? (
            <div className="rounded-2xl border bg-white p-6 shadow-sm">
              <div className="flex items-center gap-2 text-sm font-medium">
                <LoaderCircle className="h-4 w-4 animate-spin text-teal-600" />
                AI Checkout Analysis
              </div>
              <ul className="mt-4 space-y-2 text-sm">
                {ANALYSIS_STEPS.map((step, i) => (
                  <li
                    key={step}
                    className={i <= analysisStep ? "text-[#0b1b33]" : "text-slate-400"}
                  >
                    {step}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {analysis && phase !== "analyzing" ? (
            <div className="animate-rise rounded-2xl border bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold">AI Checkout Analysis</h2>
              {analysis.aiNotice || decision?.aiNotice ? (
                <p className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
                  {analysis.aiNotice || decision?.aiNotice}
                </p>
              ) : (
                <p className="mt-1 text-xs text-[#5b6b82]">
                  Heuristic score — not a scientifically validated prediction model.
                </p>
              )}
              <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                <Stat label="Abandonment Probability" value={`${analysis.probability}%`} className={riskTone} />
                <Stat label="Risk Level" value={analysis.riskLevel} className={riskTone} />
                <Stat label="Revenue at Risk" value={inr(69999)} />
                <Stat label="Likely Reason" value={analysis.likelyReason} />
              </div>
              <p className="mt-3 text-sm">
                Predicted abandonment probability:{" "}
                <strong>{analysis.probability}%</strong>
              </p>
            </div>
          ) : null}

          {decision && phase !== "analyzing" ? (
            <div className="animate-rise rounded-2xl border bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold">AI Recommended Action</h2>
              <p className="mt-2 font-medium">{decision.title}</p>
              <blockquote className="mt-2 border-l-2 border-teal-500 pl-3 text-sm text-[#5b6b82]">
                {decision.reason}
              </blockquote>
            </div>
          ) : null}

          {guardrails.length > 0 && phase !== "analyzing" ? (
            <div className="animate-rise rounded-2xl border bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold">Recovery Guardrails</h2>
              <ul className="mt-3 space-y-2 text-sm">
                {guardrails.map((item) => (
                  <li key={item.id} className="flex items-center gap-2">
                    {item.passed ? (
                      <Check className="h-4 w-4 text-emerald-600" />
                    ) : (
                      <X className="h-4 w-4 text-rose-600" />
                    )}
                    {item.label}
                  </li>
                ))}
              </ul>
              {phase === "blocked" ? (
                <p className="mt-3 rounded-lg bg-rose-50 p-3 text-sm text-rose-700">
                  {guardrailMsg}
                </p>
              ) : (
                <p className="mt-3 font-semibold text-emerald-700">Guardrails Passed ✓</p>
              )}
              {phase === "ready" && decision?.action !== "NO_ACTION" ? (
                <button
                  onClick={showIntervention}
                  className="mt-4 w-full rounded-xl bg-teal-600 py-2.5 text-sm font-semibold text-white hover:bg-teal-700"
                >
                  Show recovery intervention
                </button>
              ) : null}
            </div>
          ) : null}

          {phase === "intervention" ? (
            <div className="animate-rise rounded-2xl border border-teal-200 bg-teal-50/70 p-6 shadow-sm">
              <p className="font-semibold">Having trouble completing your payment?</p>
              <p className="mt-2 text-sm text-[#5b6b82]">Try another payment method:</p>
              <div className="mt-3 flex gap-2">
                <button
                  className="rounded-full bg-white px-4 py-2 text-sm font-medium shadow-sm"
                  onClick={() => {
                    setMethod("upi");
                    setPhase("paying");
                  }}
                >
                  UPI
                </button>
                <button
                  className="rounded-full bg-white px-4 py-2 text-sm font-medium shadow-sm"
                  onClick={() => {
                    setMethod("card");
                    setPhase("paying");
                  }}
                >
                  CARD
                </button>
              </div>
              <p className="mt-3 text-xs text-[#5b6b82]">
                Your order will remain available for a limited time.
              </p>
              <button
                className="mt-4 w-full rounded-xl bg-[#07111f] py-2.5 text-sm font-semibold text-white"
                onClick={() => setPhase("paying")}
              >
                Continue Payment
              </button>
            </div>
          ) : null}

          {phase === "rescued" ? (
            <div className="animate-rise rounded-2xl border border-emerald-200 bg-emerald-50 p-6 text-center shadow-sm">
              <p className="text-3xl">🎉</p>
              <h2 className="mt-2 text-2xl font-semibold">CHECKOUT RESCUED</h2>
              <p className="mt-1 font-medium">{inr(69999)} Revenue Recovered</p>
              <dl className="mt-4 space-y-1 text-left text-sm">
                <div>Abandonment Risk: {analysis?.probability}%</div>
                <div>Intervention: Alternative Payment</div>
                <div>Result: Payment Successful</div>
                <div>Revenue Rescued: {inr(69999)}</div>
              </dl>
              <Link
                href="/dashboard"
                className="mt-4 inline-block text-sm font-semibold text-teal-800 underline"
              >
                View updated dashboard
              </Link>
            </div>
          ) : null}
        </aside>
      </main>

      {phase === "paying" ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            {paySuccess ? (
              <div className="animate-rise py-8 text-center">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-3xl text-emerald-700">
                  ✓
                </div>
                <p className="mt-4 text-xl font-semibold">Payment Successful</p>
                <p className="mt-1 text-[#5b6b82]">Order Confirmed</p>
                <p className="mt-2 text-2xl font-semibold">{inr(69999)}</p>
              </div>
            ) : (
              <>
            <h3 className="text-lg font-semibold">Payment</h3>
            <p className="mt-2 text-sm">Premium Laptop</p>
            <p className="font-semibold">{inr(69999)}</p>
            <p className="mt-3 text-sm text-[#5b6b82]">
              Payment Method: {method === "upi" ? "UPI" : method === "card" ? "Card" : "Net Banking"}
            </p>
            {payError ? (
              <p className="mt-3 rounded-lg bg-rose-50 p-3 text-sm text-rose-700">{payError}</p>
            ) : null}
            <div className="mt-5 grid gap-2">
              <button
                className="rounded-xl bg-emerald-600 py-2.5 text-sm font-semibold text-white"
                onClick={() => simulatePay(true)}
              >
                Simulate Successful Payment
              </button>
              <button
                className="rounded-xl border py-2.5 text-sm font-semibold"
                onClick={() => simulatePay(false)}
              >
                Simulate Failed Payment
              </button>
              {razorpay?.mode === "razorpay" ? (
                <button
                  className="rounded-xl bg-[#07111f] py-2.5 text-sm font-semibold text-white"
                  onClick={payRazorpay}
                >
                  Pay with Razorpay Test
                </button>
              ) : (
                <p className="text-center text-xs text-[#5b6b82]">
                  Demo payment simulator (Razorpay keys not configured)
                </p>
              )}
              <button className="text-sm text-[#5b6b82]" onClick={() => setPhase("intervention")}>
                Cancel
              </button>
            </div>
              </>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function PayOption({
  selected,
  onClick,
  icon,
  label,
}: {
  selected: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-3 rounded-xl border px-4 py-3 text-left text-sm ${
        selected ? "border-teal-500 bg-teal-50" : "hover:bg-slate-50"
      }`}
    >
      <span className={`h-4 w-4 rounded-full border ${selected ? "border-4 border-teal-600" : ""}`} />
      {icon}
      {label}
    </button>
  );
}

function DemoBtn({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="rounded-lg border bg-white px-3 py-2 text-left text-xs font-medium hover:bg-slate-50"
    >
      {children}
    </button>
  );
}

function Stat({
  label,
  value,
  className,
}: {
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <div className="rounded-xl bg-slate-50 p-3">
      <p className="text-xs text-[#5b6b82]">{label}</p>
      <p className={`mt-1 font-semibold ${className ?? ""}`}>{value}</p>
    </div>
  );
}

function loadRazorpay() {
  return new Promise<void>((resolve, reject) => {
    if (document.getElementById("rzp-script")) {
      resolve();
      return;
    }
    const script = document.createElement("script");
    script.id = "rzp-script";
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Razorpay SDK failed to load"));
    document.body.appendChild(script);
  });
}
