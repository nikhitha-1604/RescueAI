import Link from "next/link";
import { ArrowDown, ArrowRight, ShieldCheck } from "lucide-react";

const STEPS = ["Checkout", "AI Prediction", "Smart Intervention", "Payment", "Revenue Rescued"];

export default function HomePage() {
  return (
    <div className="min-h-screen bg-[#07111f] text-white">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-4 py-6">
        <div className="flex items-center gap-2 font-semibold">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#2ee6a8]/15 text-[#2ee6a8]">
            <ShieldCheck className="h-4 w-4" />
          </span>
          RescueAI
        </div>
        <Link
          href="/dashboard"
          className="text-sm text-white/70 transition hover:text-white"
        >
          Dashboard
        </Link>
      </header>

      <main className="mx-auto max-w-6xl px-4 pb-24 pt-10">
        <p className="mb-4 text-xs font-semibold uppercase tracking-[0.22em] text-[#2ee6a8]">
          Razorpay AI Buildathon · Checkout recovery
        </p>
        <h1 className="max-w-4xl text-4xl font-semibold leading-tight tracking-tight sm:text-6xl">
          Save the sale before the customer leaves.
        </h1>
        <p className="mt-6 max-w-2xl text-lg text-white/70">
          RescueAI detects checkout hesitation, predicts abandonment, and chooses the
          right recovery action before revenue is lost.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/demo"
            className="inline-flex items-center gap-2 rounded-full bg-[#2ee6a8] px-6 py-3 text-sm font-semibold text-[#07111f] shadow-[0_10px_30px_rgba(46,230,168,0.25)] transition hover:bg-[#5ff0c2]"
          >
            Run Demo <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            href="/checkout"
            className="inline-flex items-center rounded-full border border-white/15 px-6 py-3 text-sm font-semibold text-white/90 hover:bg-white/5"
          >
            Open live checkout
          </Link>
        </div>

        <div className="mt-16 grid gap-3 rounded-3xl border border-white/10 bg-white/5 p-6 sm:grid-cols-5">
          {STEPS.map((step, index) => (
            <div key={step} className="flex flex-col items-center text-center">
              <div className="flex h-12 w-full items-center justify-center rounded-2xl bg-[#0c1a2e] text-sm font-medium">
                {step}
              </div>
              {index < STEPS.length - 1 ? (
                <ArrowDown className="mt-3 h-4 w-4 text-[#2ee6a8] sm:hidden" />
              ) : null}
            </div>
          ))}
        </div>

        <p className="mt-10 max-w-xl text-sm text-white/45">
          Heuristic abandonment scoring with policy guardrails. The model is a demo
          decision engine — not a scientifically validated predictor. Payments never
          auto-charge.
        </p>
      </main>
    </div>
  );
}
