export function razorpayEnabled() {
  return Boolean(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET);
}

export function publicPaymentConfig() {
  if (!razorpayEnabled()) {
    return { mode: "demo" as const, keyId: null as string | null };
  }
  return {
    mode: "razorpay" as const,
    keyId: process.env.RAZORPAY_KEY_ID as string,
  };
}
