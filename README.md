# RescueAI 

## AI Revenue Recovery Agent

> **Save the sale before the customer leaves.**

RescueAI is an AI-powered revenue recovery agent that detects checkout abandonment risk, identifies payment friction, recommends an appropriate recovery action, and measures the revenue recovered.



## 🎯 Problem

A failed payment doesn't always mean the customer is unwilling to buy.

Customers may abandon checkout because of:

- Payment failures
- Customer hesitation
- Multiple payment attempts
- Checkout inactivity

Merchants can see that a payment failed, but often don't have an intelligent system to determine:

- Which customers are likely to abandon?
- Why are they at risk?
- What recovery action should be taken?
- When should the recovery process stop?
- How much revenue was actually recovered?

This gap between **detecting a failed checkout and recovering the sale** can result in lost revenue.



## 💡 Solution

**RescueAI** acts as an intelligent recovery layer around the checkout process.

It analyzes checkout signals, calculates abandonment risk, identifies the likely friction, recommends a recovery action, validates it through safety guardrails, and measures the outcome.

### Recovery Loop

**Detect → Diagnose → Decide → Guard → Act → Measure → Audit → Stop**

For example, when a ₹69,999 payment fails and the customer shows hesitation, RescueAI identifies the checkout as high-risk, recommends an alternative payment method, validates the action through guardrails, and helps the customer retry the payment.

If the payment succeeds, the recovered revenue is reflected in the merchant dashboard.



# ⚡ Key Features

###  AI Checkout Risk Detection

Analyzes checkout signals and calculates abandonment risk based on factors such as:

- Payment failure
- Customer hesitation
- Multiple attempts
- Checkout inactivity
- Cart value
- Returning customer status

Risk levels are classified as:

- LOW
- MEDIUM
- HIGH


# 🔄 How It Works

```bash
Checkout Events
      ↓
AI Risk Engine
      ↓
Diagnose Friction
      ↓
Recovery Decision
      ↓
Guardrails
      ↓
Recovery Action
      ↓
Payment Retry
      ↓
Outcome
      ↓
Measure + Audit
      ↓
Stopping Rules

```

# 🛠️ Tech Stack

- Next.js
- React
- TypeScript
- Tailwind CSS
- SQLite
- better-sqlite3
- Recharts
- Lucide React
- Local Payment Simulator

## 🚀 How to Run

### Prerequisites

Make sure the following are installed:

- Node.js
- npm
- Git

###  Clone the Repository

```bash
git clone https://github.com/YOUR_USERNAME/rescueai.git
cd rescueai
npm install
npm run dev
Open your browser and visit:
http://localhost:3000
