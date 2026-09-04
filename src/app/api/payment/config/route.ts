import { NextResponse } from "next/server";
import { publicPaymentConfig } from "@/lib/payment";

export const runtime = "nodejs";

export function GET() {
  return NextResponse.json(publicPaymentConfig());
}
