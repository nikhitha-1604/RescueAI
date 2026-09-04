# RescueAI

**Save the sale before the customer leaves.**

Checkout recovery agent for the Razorpay AI Buildathon. Detects payment friction, scores abandonment risk with a transparent heuristic, applies guardrails, and helps the customer complete payment. The agent never auto-charges and never changes the amount.

## Run locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Optional `.env.local`:

```
OPENAI_API_KEY=
OPENAI_MODEL=gpt-4o-mini
RAZORPAY_KEY_ID=
RAZORPAY_KEY_SECRET=
```

Without those keys the app uses a deterministic fallback engine and the demo payment simulator.

## Demo script (3–5 minutes)

1. Open `/dashboard` — ₹8.42L revenue at risk (labeled demo data).
2. Open `/checkout` — Rahul Sharma, Premium Laptop, ₹69,999.
3. Click **Simulate Payment Failure**.
4. Wait for analysis — **82%** abandonment probability, **HIGH**.
5. Likely friction: payment failure.
6. Recommended action: alternative payment.
7. Guardrails **PASSED**.
8. Continue payment with UPI or Card.
9. **Simulate Successful Payment**.
10. **CHECKOUT RESCUED** — ₹69,999 recovered.
11. Return to dashboard — Revenue Rescued increased by ₹69,999.

Or run the automatic sequence on `/demo`.

## Scoring (heuristic, not a validated ML model)

| Signal | Score |
| --- | --- |
| Payment failure | +30 |
| Customer hesitation | +20 |
| Multiple attempts | +15 |
| Long inactivity | +20 |
| High cart value | +5 |
| Returning customer | -10 |

0–30 LOW · 31–60 MEDIUM · 61+ HIGH. Probability is a scaled score for the demo.
