import { NextResponse } from "next/server";
import { razorpayEnabled } from "@/lib/payment";
import { getDb } from "@/lib/db";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!razorpayEnabled()) {
    return NextResponse.json(
      { mode: "demo", message: "Razorpay credentials not set. Using demo payment simulator." },
      { status: 200 }
    );
  }

  const body = (await request.json()) as { checkoutId?: number };
  if (!body.checkoutId) {
    return NextResponse.json({ error: "checkoutId required" }, { status: 400 });
  }

  const session = getDb()
    .prepare("SELECT amount, product FROM checkout_sessions WHERE id = ?")
    .get(body.checkoutId) as { amount: number; product: string } | undefined;

  if (!session) {
    return NextResponse.json({ error: "Checkout not found" }, { status: 404 });
  }

  const Razorpay = (await import("razorpay")).default;
  const client = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID as string,
    key_secret: process.env.RAZORPAY_KEY_SECRET as string,
  });

  const order = await client.orders.create({
    amount: session.amount * 100,
    currency: "INR",
    receipt: `rescueai_${body.checkoutId}_${Date.now()}`,
    notes: { checkoutId: String(body.checkoutId), product: session.product },
  });

  return NextResponse.json({
    mode: "razorpay",
    orderId: order.id,
    amount: order.amount,
    currency: order.currency,
    keyId: process.env.RAZORPAY_KEY_ID,
  });
}
