import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";

const DB_PATH = path.join(process.cwd(), "data", "rescueai.db");

type GlobalDb = typeof globalThis & { __rescueaiDb?: Database.Database };

function createSchema(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS customers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT NOT NULL,
      opted_out INTEGER NOT NULL DEFAULT 0,
      is_returning INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS checkout_sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      customer_id INTEGER NOT NULL,
      amount INTEGER NOT NULL,
      product TEXT NOT NULL DEFAULT 'Premium Laptop',
      status TEXT NOT NULL,
      abandonment_probability INTEGER,
      risk_level TEXT,
      likely_reason TEXT,
      intervention_count INTEGER NOT NULL DEFAULT 0,
      stop_reason TEXT,
      revenue_recovered INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      FOREIGN KEY (customer_id) REFERENCES customers(id)
    );

    CREATE TABLE IF NOT EXISTS checkout_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      checkout_id INTEGER NOT NULL,
      event_type TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (checkout_id) REFERENCES checkout_sessions(id)
    );

    CREATE TABLE IF NOT EXISTS recovery_actions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      checkout_id INTEGER NOT NULL,
      action TEXT NOT NULL,
      status TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (checkout_id) REFERENCES checkout_sessions(id)
    );

    CREATE TABLE IF NOT EXISTS payments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      checkout_id INTEGER NOT NULL,
      amount INTEGER NOT NULL,
      status TEXT NOT NULL,
      method TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (checkout_id) REFERENCES checkout_sessions(id)
    );

    CREATE TABLE IF NOT EXISTS metrics (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      revenue_at_risk INTEGER NOT NULL,
      revenue_rescued INTEGER NOT NULL,
      active_checkouts INTEGER NOT NULL,
      successful_interventions INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS audit_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      checkout_id INTEGER NOT NULL,
      customer TEXT NOT NULL,
      event_type TEXT NOT NULL,
      action TEXT,
      result TEXT,
      reason TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (checkout_id) REFERENCES checkout_sessions(id)
    );
  `);

  for (const statement of [
    "ALTER TABLE checkout_sessions ADD COLUMN intervention_count INTEGER NOT NULL DEFAULT 0",
    "ALTER TABLE checkout_sessions ADD COLUMN stop_reason TEXT",
    "ALTER TABLE checkout_sessions ADD COLUMN revenue_recovered INTEGER NOT NULL DEFAULT 0",
  ]) {
    try {
      db.exec(statement);
    } catch {
      // Existing databases already have the migrated column.
    }
  }
}

function seed(db: Database.Database) {
  const count = db.prepare("SELECT COUNT(*) as c FROM customers").get() as { c: number };
  if (count.c > 0) return;

  const now = new Date().toISOString();

  const insertCustomer = db.prepare(
    "INSERT INTO customers (name, email, opted_out, is_returning) VALUES (?, ?, ?, ?)"
  );
  insertCustomer.run("Rahul Sharma", "rahul.sharma@example.com", 0, 0);
  insertCustomer.run("Priya", "priya@example.com", 0, 1);
  insertCustomer.run("Arjun", "arjun@example.com", 0, 1);

  db.prepare(
    "INSERT INTO metrics (id, revenue_at_risk, revenue_rescued, active_checkouts, successful_interventions) VALUES (1, ?, ?, ?, ?)"
  ).run(842500, 518750, 127, 84);

  const insertSession = db.prepare(
    `INSERT INTO checkout_sessions (customer_id, amount, product, status, abandonment_probability, risk_level, likely_reason, intervention_count, revenue_recovered, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );
  const insertEvent = db.prepare(
    "INSERT INTO checkout_events (checkout_id, event_type, created_at) VALUES (?, ?, ?)"
  );
  const insertAction = db.prepare(
    "INSERT INTO recovery_actions (checkout_id, action, status, created_at) VALUES (?, ?, ?, ?)"
  );
  const insertPayment = db.prepare(
    "INSERT INTO payments (checkout_id, amount, status, method, created_at) VALUES (?, ?, ?, ?, ?)"
  );

  const rahul = insertSession.run(
    1, 69999, "Premium Laptop", "recovering", 82, "HIGH", "Payment failure", 1, 0, now
  );
  insertEvent.run(rahul.lastInsertRowid, "checkout_started", now);
  insertEvent.run(rahul.lastInsertRowid, "payment_failure", now);
  insertAction.run(rahul.lastInsertRowid, "ALTERNATIVE_PAYMENT", "recommended", now);

  const priya = insertSession.run(
    2, 4999, "Wireless Earbuds", "rescued", 71, "HIGH", "Inactivity", 1, 4999, now
  );
  insertEvent.run(priya.lastInsertRowid, "checkout_started", now);
  insertEvent.run(priya.lastInsertRowid, "inactivity", now);
  insertAction.run(priya.lastInsertRowid, "REMINDER", "completed", now);
  insertPayment.run(priya.lastInsertRowid, 4999, "success", "upi", now);

  const arjun = insertSession.run(
    3, 24999, "Smart Watch", "started", 32, "LOW", "Low risk", 0, 0, now
  );
  insertEvent.run(arjun.lastInsertRowid, "checkout_started", now);
  insertAction.run(arjun.lastInsertRowid, "NO_ACTION", "completed", now);

  seedBatch(db, now);
}

const BATCH_NAMES = [
  "Ananya Iyer", "Vikram Mehta", "Neha Kapoor", "Rohan Das", "Meera Shah",
  "Karan Malhotra", "Ishita Rao", "Dev Patel", "Aditi Nair", "Sahil Verma",
  "Tanya Bansal", "Mohan Joshi", "Kavya Menon", "Adil Khan", "Nisha Sethi",
  "Yash Agarwal", "Pooja Reddy", "Kabir Singh", "Simran Kaur", "Aarav Jain",
  "Diya Bose", "Rahul Bhat", "Maya Pillai", "Om Thakur", "Sana Ali",
  "Harsh Gupta", "Riya Kulkarni", "Manav Roy", "Zoya Fernandes", "Aman Sood",
  "Shruti Ghosh", "Nitin Suri", "Lakshmi Krishnan", "Ibrahim Sheikh", "Tara Sen",
  "Abhishek Jain", "Mitali Desai", "Rajiv Menon", "Sonia Dutta", "Naveen Rao",
];

function seedBatch(db: Database.Database, now: string) {
  const insertCustomer = db.prepare(
    "INSERT INTO customers (name, email, opted_out, is_returning) VALUES (?, ?, 0, ?)"
  );
  const insertSession = db.prepare(
    `INSERT INTO checkout_sessions (customer_id, amount, product, status, abandonment_probability, risk_level, likely_reason, intervention_count, revenue_recovered, created_at)
     VALUES (?, ?, 'Demo order', ?, ?, ?, ?, ?, ?, ?)`
  );
  const insertEvent = db.prepare(
    "INSERT INTO checkout_events (checkout_id, event_type, created_at) VALUES (?, ?, ?)"
  );
  const insertAction = db.prepare(
    "INSERT INTO recovery_actions (checkout_id, action, status, created_at) VALUES (?, ?, ?, ?)"
  );

  BATCH_NAMES.forEach((name, index) => {
    const amount = [3999, 7999, 12999, 24999, 49999][index % 5];
    const risk = [18, 42, 68, 76, 88][index % 5];
    const highRisk = risk > 60;
    const recovered = index % 4 !== 0 && highRisk;
    const status = recovered ? "rescued" : highRisk ? (index % 3 === 0 ? "blocked" : "recovering") : "started";
    const reason = highRisk ? (index % 2 ? "Inactivity" : "Payment failure") : "Low risk";
    const action = highRisk ? (reason === "Payment failure" ? "ALTERNATIVE_PAYMENT" : "REMINDER") : "NO_ACTION";
    const customer = insertCustomer.run(`${name}`, `${name.toLowerCase().replaceAll(" ", ".")}@example.com`, index % 6 === 0 ? 1 : 0);
    const session = insertSession.run(customer.lastInsertRowid, amount, status, risk, highRisk ? "HIGH" : risk > 30 ? "MEDIUM" : "LOW", reason, recovered || highRisk ? 1 : 0, recovered ? amount : 0, now);
    insertEvent.run(session.lastInsertRowid, "checkout_started", now);
    if (highRisk) insertEvent.run(session.lastInsertRowid, reason === "Inactivity" ? "inactivity" : "payment_failure", now);
    insertAction.run(session.lastInsertRowid, action, recovered ? "completed" : highRisk ? "passed" : "completed", now);
  });
}

export function getDb() {
  const g = globalThis as GlobalDb;
  if (!g.__rescueaiDb) {
    fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
    const db = new Database(DB_PATH);
    db.pragma("journal_mode = WAL");
    createSchema(db);
    seed(db);
    ensureBatch(db);
    g.__rescueaiDb = db;
  }
  return g.__rescueaiDb;
}

export function nowIso() {
  return new Date().toISOString();
}

export function addEvent(
  checkoutId: number,
  eventType: string,
  details?: { action?: string; result?: string; reason?: string }
) {
  const db = getDb();
  const createdAt = nowIso();
  db
    .prepare("INSERT INTO checkout_events (checkout_id, event_type, created_at) VALUES (?, ?, ?)")
    .run(checkoutId, eventType, createdAt);
  const row = db.prepare(
    `SELECT c.name, s.amount, s.abandonment_probability, s.likely_reason
     FROM checkout_sessions s JOIN customers c ON c.id = s.customer_id WHERE s.id = ?`
  ).get(checkoutId) as { name: string; amount: number; abandonment_probability: number | null; likely_reason: string | null } | undefined;
  if (row) {
    db.prepare(
      "INSERT INTO audit_logs (checkout_id, customer, event_type, action, result, reason, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)"
    ).run(
      checkoutId,
      row.name,
      eventType,
      details?.action ?? null,
      details?.result ?? auditResult(eventType, row),
      details?.reason ?? auditReason(eventType, row),
      createdAt
    );
  }
}

function auditResult(eventType: string, row: { abandonment_probability: number | null }) {
  if (eventType === "guardrails_passed" || eventType === "payment_success" || eventType === "rescued") return "PASSED";
  if (eventType === "guardrails_blocked") return "BLOCKED";
  if (eventType.startsWith("abandonment_risk_")) return `${row.abandonment_probability ?? "—"}%`;
  return "RECORDED";
}

function auditReason(eventType: string, row: { amount?: number; likely_reason: string | null }) {
  if (eventType.startsWith("abandonment_risk_")) return row.likely_reason ?? "Risk assessed from checkout events";
  if (eventType === "rescued") return `₹${(row.amount ?? 0).toLocaleString("en-IN")} revenue recovered`;
  return null;
}

export function ensureBatch(db: Database.Database) {
  const batchCount = db.prepare("SELECT COUNT(*) as count FROM checkout_sessions WHERE customer_id > 3").get() as { count: number };
  if (batchCount.count >= BATCH_NAMES.length) return;
  db.prepare("DELETE FROM audit_logs WHERE checkout_id IN (SELECT id FROM checkout_sessions WHERE customer_id > 3)").run();
  db.prepare("DELETE FROM payments WHERE checkout_id IN (SELECT id FROM checkout_sessions WHERE customer_id > 3)").run();
  db.prepare("DELETE FROM recovery_actions WHERE checkout_id IN (SELECT id FROM checkout_sessions WHERE customer_id > 3)").run();
  db.prepare("DELETE FROM checkout_events WHERE checkout_id IN (SELECT id FROM checkout_sessions WHERE customer_id > 3)").run();
  db.prepare("DELETE FROM checkout_sessions WHERE customer_id > 3").run();
  db.prepare("DELETE FROM customers WHERE id > 3").run();
  seedBatch(db, nowIso());
}
