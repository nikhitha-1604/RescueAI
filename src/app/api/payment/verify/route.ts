import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { razorpayEnabled } from "@/lib/payment";
import { addEvent, getDb, nowIso } from "@/lib/db";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!razorpayEnabled()) {
    return NextResponse.json({ error: "Razorpay is not configured" }, { status: 400 });
  }

  const body = (await request.json()) as {
    checkoutId?: number;
    razorpay_order_id?: string;
    razorpay_payment_id?: string;
    razorpay_signature?: string;
  };

  if (
    !body.checkoutId ||
    !body.razorpay_order_id ||
    !body.razorpay_payment_id ||
    !body.razorpay_signature
  ) {
    return NextResponse.json({ error: "Missing payment fields" }, { status: 400 });
  }

  const payload = `${body.razorpay_order_id}|${body.razorpay_payment_id}`;
  const expected = crypto
    .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET as string)
    .update(payload)
    .digest("hex");

  if (expected !== body.razorpay_signature) {
    return NextResponse.json({ verified: false, error: "Invalid signature" }, { status: 400 });
  }

  const db = getDb();
  const session = db
    .prepare("SELECT amount, status FROM checkout_sessions WHERE id = ?")
    .get(body.checkoutId) as { amount: number; status: string } | undefined;

  if (!session) {
    return NextResponse.json({ error: "Checkout not found" }, { status: 404 });
  }

  if (session.status === "rescued") {
    return NextResponse.json({ verified: true, alreadyRescued: true, amount: session.amount });
  }

  applyRescue(body.checkoutId, session.amount, "razorpay");
  return NextResponse.json({ verified: true, amount: session.amount });
}

function applyRescue(checkoutId: number, amount: number, method: string) {
  const db = getDb();
  db.prepare(
    "INSERT INTO payments (checkout_id, amount, status, method, created_at) VALUES (?, ?, ?, ?, ?)"
  ).run(checkoutId, amount, "success", method, nowIso());
  db.prepare("UPDATE checkout_sessions SET status = ? WHERE id = ?").run("rescued", checkoutId);
  db.prepare(
    "UPDATE metrics SET revenue_rescued = revenue_rescued + ?, active_checkouts = MAX(active_checkouts - 1, 0), successful_interventions = successful_interventions + 1 WHERE id = 1"
  ).run(amount);
  addEvent(checkoutId, "payment_success");
  addEvent(checkoutId, "rescued");
}
