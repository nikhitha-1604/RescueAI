"use client";

import { useEffect, useState, type ReactNode } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Activity, BadgeIndianRupee, Percent, RotateCcw, ShoppingCart } from "lucide-react";
import { AppNav } from "@/components/AppNav";
import { inr } from "@/lib/format";

type Metrics = {
  demo: boolean;
  revenueAtRisk: number;
  revenueRescued: number;
  rescueRate: number;
  activeCheckouts: number;
  successfulInterventions: number;
  performance: {
    analyzed: number;
    highRisk: number;
    interventions: number;
    recovered: number;
    revenueAtRisk: number;
    revenueRecovered: number;
    recoveryRate: number;
    interventionSuccessRate: number;
  };
  recentAudit: { id: number; event_type: string; result: string | null; reason: string | null; created_at: string }[];
};

type CaseRow = {
  id: number;
  name: string;
  amount: number;
  risk: number;
  reason: string;
  status: string;
};

const CHART = [
  { day: "Mon", rescued: 62000 },
  { day: "Tue", rescued: 71000 },
  { day: "Wed", rescued: 54000 },
  { day: "Thu", rescued: 88000 },
  { day: "Fri", rescued: 96000 },
  { day: "Sat", rescued: 79000 },
  { day: "Sun", rescued: 68800 },
];

export default function DashboardPage() {
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [cases, setCases] = useState<CaseRow[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [resetting, setResetting] = useState(false);

  async function load() {
    try {
      const [metricsResponse, casesResponse] = await Promise.all([
        fetch("/api/metrics", { cache: "no-store" }),
        fetch("/api/cases", { cache: "no-store" }),
      ]);
      if (!metricsResponse.ok || !casesResponse.ok) {
        throw new Error("Dashboard data is temporarily unavailable.");
      }
      const [nextMetrics, nextCases] = await Promise.all([
        metricsResponse.json() as Promise<Metrics>,
        casesResponse.json() as Promise<{ cases?: CaseRow[] }>,
      ]);
      setMetrics(nextMetrics);
      setCases(nextCases.cases ?? []);
      setLoadError(null);
    } catch {
      setLoadError("Live dashboard data is temporarily unavailable. Retrying...");
    }
  }

  async function resetDemo() {
    setResetting(true);
    try {
      const response = await fetch("/api/demo/reset", { method: "POST" });
      if (!response.ok) throw new Error("Reset failed");
      await load();
    } catch {
      setLoadError("Demo reset failed. Please try again.");
    } finally {
      setResetting(false);
    }
  }

  useEffect(() => {
    void Promise.resolve().then(load);
    const id = setInterval(load, 2500);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="min-h-screen">
      <AppNav />
      <main className="mx-auto max-w-6xl px-4 py-8">
        <div className="mb-6 flex items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Recovery dashboard</h1>
            <p className="mt-1 text-sm text-[#5b6b82]">
              Live merchant view of checkout risk and rescued revenue.
            </p>
          </div>
          <button
            type="button"
            onClick={resetDemo}
            disabled={resetting}
            title="Restore the original seeded demo data"
            className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-700 transition hover:bg-amber-100 disabled:cursor-wait disabled:opacity-60"
          >
            <RotateCcw className={`h-3.5 w-3.5 ${resetting ? "animate-spin" : ""}`} />
            {resetting ? "Resetting..." : "Reset demo data"}
          </button>
        </div>
        {loadError ? (
          <p className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            {loadError}
          </p>
        ) : null}

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <MetricCard
            label="Revenue at Risk"
            value={metrics ? inr(metrics.revenueAtRisk) : "—"}
            hint="Demo baseline"
            icon={<BadgeIndianRupee className="h-5 w-5" />}
          />
          <MetricCard
            label="Revenue Rescued"
            value={metrics ? inr(metrics.revenueRescued) : "—"}
            hint="Updates after each successful rescue"
            icon={<Activity className="h-5 w-5" />}
            accent
          />
          <MetricCard
            label="Rescue Rate"
            value={metrics ? `${metrics.rescueRate}%` : "—"}
            hint="Rescued / at-risk"
            icon={<Percent className="h-5 w-5" />}
          />
          <MetricCard
            label="Active Checkouts"
            value={metrics ? String(metrics.activeCheckouts) : "—"}
            hint={
              metrics
                ? `${metrics.successfulInterventions} successful interventions`
                : ""
            }
            icon={<ShoppingCart className="h-5 w-5" />}
          />
        </div>

        {metrics ? (
          <section className="mt-6 rounded-2xl border bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-sm font-semibold">Recovery performance</h2>
              <span className="text-xs font-medium text-emerald-700">AI agent · Active</span>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-4 lg:grid-cols-8">
              <Performance label="Checkouts analyzed" value={metrics.performance.analyzed} />
              <Performance label="High risk" value={metrics.performance.highRisk} />
              <Performance label="Interventions" value={metrics.performance.interventions} />
              <Performance label="Successful recoveries" value={metrics.performance.recovered} />
              <Performance label="Batch at risk" value={inr(metrics.performance.revenueAtRisk)} />
              <Performance label="Batch recovered" value={inr(metrics.performance.revenueRecovered)} />
              <Performance label="Recovery rate" value={`${metrics.performance.recoveryRate}%`} />
              <Performance label="Intervention success" value={`${metrics.performance.interventionSuccessRate}%`} />
            </div>
            <div className="mt-5 grid gap-5 lg:grid-cols-2">
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wide text-[#5b6b82]">Recovery funnel</h3>
                <div className="mt-3 grid grid-cols-4 gap-2 text-center text-xs">
                  <Funnel label="Analyzed" value={metrics.performance.analyzed} />
                  <Funnel label="High risk" value={metrics.performance.highRisk} />
                  <Funnel label="Interventions" value={metrics.performance.interventions} />
                  <Funnel label="Recovered" value={metrics.performance.recovered} />
                </div>
              </div>
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wide text-[#5b6b82]">Agent audit trail</h3>
                <ul className="mt-3 space-y-2 text-xs">
                  {metrics.recentAudit.slice(0, 5).map((event) => (
                    <li key={event.id} className="flex items-start gap-2">
                      <span className="mt-0.5 text-emerald-600">✓</span>
                      <span>{auditLabel(event.event_type)}{event.result ? ` · ${event.result}` : ""}{event.reason ? ` — ${event.reason}` : ""}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </section>
        ) : null}

        <div className="mt-6 grid gap-6 lg:grid-cols-5">
          <section className="rounded-2xl border bg-white p-5 shadow-sm lg:col-span-3">
            <h2 className="text-sm font-semibold">Rescued revenue (demo week)</h2>
            <div className="mt-4 h-56">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={CHART}>
                  <defs>
                    <linearGradient id="rescued" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0f9d8a" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#0f9d8a" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="#eef2f7" vertical={false} />
                  <XAxis dataKey="day" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip formatter={(v) => inr(Number(v ?? 0))} />
                  <Area
                    type="monotone"
                    dataKey="rescued"
                    stroke="#0f9d8a"
                    fill="url(#rescued)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </section>

          <section className="rounded-2xl border bg-white p-5 shadow-sm lg:col-span-2">
            <h2 className="text-sm font-semibold">Recent recovery cases</h2>
            <ul className="mt-4 space-y-3">
              {cases.map((item) => (
                <li
                  key={item.id}
                  className="rounded-xl border border-slate-100 bg-slate-50/70 p-3"
                >
                  <div className="flex items-center justify-between">
                    <p className="font-medium">{item.name}</p>
                    <StatusPill status={item.status} />
                  </div>
                  <p className="mt-1 text-sm text-[#5b6b82]">
                    {inr(item.amount)} · {item.risk}% abandonment risk
                  </p>
                  <p className="text-xs text-[#5b6b82]">{item.reason}</p>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </main>
    </div>
  );
}

function MetricCard({
  label,
  value,
  hint,
  icon,
  accent,
}: {
  label: string;
  value: string;
  hint: string;
  icon: ReactNode;
  accent?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border p-5 shadow-sm ${
        accent ? "border-teal-200 bg-teal-50/60" : "bg-white"
      }`}
    >
      <div className="flex items-center justify-between text-[#5b6b82]">
        <p className="text-sm">{label}</p>
        {icon}
      </div>
      <p className="mt-3 text-3xl font-semibold tracking-tight">{value}</p>
      <p className="mt-1 text-xs text-[#5b6b82]">{hint}</p>
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const tone =
    status === "Recovered"
      ? "bg-emerald-50 text-emerald-700"
      : status === "Recovering"
        ? "bg-amber-50 text-amber-700"
        : "bg-slate-100 text-slate-600";
  return <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${tone}`}>{status}</span>;
}

function Performance({ label, value }: { label: string; value: string | number }) {
  return <div className="rounded-xl bg-slate-50 p-3"><p className="text-[11px] text-[#5b6b82]">{label}</p><p className="mt-1 text-lg font-semibold">{value}</p></div>;
}

function Funnel({ label, value }: { label: string; value: number }) {
  return <div className="rounded-lg border border-teal-100 bg-teal-50 p-2"><p className="text-lg font-semibold text-teal-800">{value}</p><p className="text-[#5b6b82]">{label}</p></div>;
}

function auditLabel(eventType: string) {
  return eventType.replaceAll("_", " ").replace(/^./, (letter) => letter.toUpperCase());
}
