"use client";

import { useEffect, useState } from "react";
import { Check } from "lucide-react";
import { AppNav } from "@/components/AppNav";
import { inr } from "@/lib/format";
import { readLastSession, type StoredSession } from "@/lib/session-store";

export default function RecoveryPage() {
  const [session, setSession] = useState<StoredSession | null>(null);
  const [events, setEvents] = useState<{ label: string }[]>([]);

  useEffect(() => {
    const stored = readLastSession();
    void Promise.resolve().then(() => {
      setSession(stored);
      if (stored?.checkoutId) {
        return fetch(`/api/checkout/${stored.checkoutId}/timeline`)
          .then((r) => r.json())
          .then((data) => setEvents(data.events ?? []));
      }
    });
  }, []);

  return (
    <div className="min-h-screen">
      <AppNav />
      <main className="mx-auto max-w-3xl px-4 py-8">
        <h1 className="text-2xl font-semibold tracking-tight">AI recovery decision</h1>
        <p className="mt-1 text-sm text-[#5b6b82]">
          Status of the latest checkout rescue attempt. The agent never auto-charges.
        </p>

        {!session ? (
          <p className="mt-8 rounded-2xl border bg-white p-6 text-sm text-[#5b6b82]">
            No live recovery yet. Open checkout and simulate a payment failure to populate this
            timeline.
          </p>
        ) : (
          <div className="mt-6 space-y-4">
            {session.rescued ? (
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6 text-center">
                <p className="text-3xl">🎉</p>
                <h2 className="mt-2 text-2xl font-semibold">CHECKOUT RESCUED</h2>
                <p className="mt-1 font-medium">{inr(session.amount)} Revenue Recovered</p>
              </div>
            ) : null}
            {session.stopReason ? (
              <div className="rounded-2xl border border-rose-200 bg-rose-50 p-5 text-sm text-rose-800">
                <p className="font-semibold">Recovery stopped</p>
                <p className="mt-1">Reason: {session.stopReason}</p>
              </div>
            ) : null}

            <section className="rounded-2xl border bg-white p-6 shadow-sm">
              <h2 className="font-semibold">Live agent activity</h2>
              <ol className="mt-4 space-y-3">
                {(events.length ? events : fallbackTimeline(session)).map((item, index) => (
                  <li key={`${item.label}-${index}`} className="flex items-start gap-2 text-sm">
                    <Check className="mt-0.5 h-4 w-4 text-emerald-600" />
                    {item.label}
                  </li>
                ))}
              </ol>
            </section>

            {session.analysis ? (
              <section className="rounded-2xl border bg-white p-6 shadow-sm text-sm">
                <p>Abandonment Risk: {session.analysis.probability}%</p>
                <p>Likely friction: {session.analysis.likelyReason}</p>
                <p>Intervention: {session.decision?.title}</p>
                <p>Guardrails: {session.guardrailsPassed ? "PASSED ✓" : "Pending / blocked"}</p>
                <p>Result: {session.rescued ? "Payment Successful" : "In progress"}</p>
              </section>
            ) : null}
          </div>
        )}
      </main>
    </div>
  );
}

function fallbackTimeline(session: StoredSession) {
  const items = [{ label: "Checkout started" }];
  if (session.analysis) {
    items.push({ label: "Payment failure detected" });
    items.push({ label: `Abandonment risk calculated: ${session.analysis.probability}%` });
    items.push({ label: "Likely friction identified" });
    items.push({ label: "Recovery action selected" });
  }
  if (session.guardrailsPassed) items.push({ label: "Guardrails passed" });
  if (session.rescued) {
    items.push({ label: "Customer completed payment" });
    items.push({ label: `${inr(session.amount)} rescued` });
  }
  return items;
}
