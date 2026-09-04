"use client";

import { useState } from "react";
import Link from "next/link";
import { LoaderCircle, Play } from "lucide-react";
import { AppNav } from "@/components/AppNav";
import ArchitectureFlow from "@/components/ArchitectureFlow";
import { inr } from "@/lib/format";
import { saveLastSession } from "@/lib/session-store";

const STEPS = [
  { title: "Customer starts checkout", detail: "₹69,999" },
  { title: "Payment attempt fails", detail: "Temporary network issue" },
  { title: "AI detects high abandonment risk", detail: "82%" },
  { title: "AI identifies", detail: "Payment friction" },
  { title: "AI recommends", detail: "Alternative payment" },
  { title: "Guardrails", detail: "PASSED ✓" },
  { title: "Having trouble paying?", detail: "Try UPI or Card" },
  { title: "Customer retries payment", detail: "UPI selected" },
  { title: "Payment successful", detail: "Order confirmed" },
];

export default function DemoPage() {
  const [running, setRunning] = useState(false);
  const [step, setStep] = useState(-1);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run() {
    setRunning(true);
    setDone(false);
    setError(null);
    setStep(0);
    try {
      await fetch("/api/demo/reset", { method: "POST" });
      const started = await fetch("/api/checkout/start", { method: "POST" }).then((r) => r.json());
      await wait(900);
      setStep(1);
      await wait(900);
      const analyzed = await fetch("/api/checkout/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ checkoutId: started.checkoutId, scenario: "payment_failure" }),
      }).then((r) => r.json());
      setStep(2);
      await wait(900);
      setStep(3);
      await wait(900);
      setStep(4);
      await wait(900);
      const guard = await fetch("/api/recovery/guardrails", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          checkoutId: started.checkoutId,
          action: analyzed.decision.action,
          interventionShown: false,
          startedAt: analyzed.startedAt,
        }),
      }).then((r) => r.json());
      if (!guard.passed) {
        setError(guard.blockedReason ?? "Recovery action blocked by policy. No customer action taken.");
        setRunning(false);
        return;
      }
      setStep(5);
      await wait(900);
      setStep(6);
      await wait(900);
      setStep(7);
      await wait(700);
      await fetch("/api/payment/simulate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ checkoutId: started.checkoutId, success: true, method: "upi" }),
      });
      setStep(8);
      saveLastSession({
        checkoutId: started.checkoutId,
        amount: 69999,
        customerName: "Rahul Sharma",
        analysis: {
          probability: analyzed.analysis.probability,
          riskLevel: analyzed.analysis.riskLevel,
          likelyReason: analyzed.analysis.likelyReason,
          usedFallback: analyzed.analysis.usedFallback,
        },
        decision: analyzed.decision,
        guardrailsPassed: true,
        rescued: true,
      });
      await wait(600);
      setDone(true);
    } catch {
      setError("AI unavailable. Using fallback recovery engine.");
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className="min-h-screen">
      <AppNav />
      <main className="mx-auto max-w-3xl px-4 py-8">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-teal-700">
          Live demonstration
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">Run Live Rescue Demo</h1>
        <p className="mt-2 text-sm text-[#5b6b82]">
          Plays the full recovery path: failure → 82% risk → alternative payment → rescued revenue.
        </p>
        <button
          onClick={run}
          disabled={running}
          className="mt-6 inline-flex items-center gap-2 rounded-full bg-[#07111f] px-6 py-3 text-sm font-semibold text-white disabled:opacity-60"
        >
          {running ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
          Run Live Rescue Demo
        </button>

        <ol className="mt-8 space-y-3">
          {STEPS.map((item, index) => {
            const active = index <= step;
            return (
              <li
                key={item.title}
                className={`rounded-2xl border p-4 transition ${
                  active ? "border-teal-200 bg-white shadow-sm" : "border-transparent bg-slate-100/70 text-slate-400"
                }`}
              >
                <p className="text-xs font-semibold uppercase tracking-wide">Step {index + 1}</p>
                <p className="font-medium">{item.title}</p>
                <p className="text-sm">{item.detail}</p>
              </li>
            );
          })}
        </ol>

        {error ? (
          <p className="mt-6 rounded-xl bg-amber-50 p-4 text-sm text-amber-800">{error}</p>
        ) : null}

        {done ? (
          <div className="mt-8 rounded-3xl border border-emerald-200 bg-emerald-50 p-8 text-center">
            <p className="text-4xl font-semibold tracking-tight">{inr(69999)} RESCUED 🎉</p>
            <p className="mt-2 text-sm text-emerald-800">Dashboard revenue rescued increased by {inr(69999)}.</p>
            <Link href="/dashboard" className="mt-4 inline-block text-sm font-semibold underline">
              Open dashboard
            </Link>
          </div>
        ) : null}
        <button
          onClick={() => fetch("/api/demo/reset", { method: "POST" }).then(() => { setStep(-1); setDone(false); setError(null); })}
          className="mt-4 block text-sm text-[#5b6b82] underline"
        >
          Reset demo data
        </button>

        <ArchitectureFlow />
      </main>
    </div>
  );
}

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
