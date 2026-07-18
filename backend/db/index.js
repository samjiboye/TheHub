const Database = require("better-sqlite3");
const fs = require("fs");
const path = require("path");

// On most hosts, only a mounted persistent disk survives deploys/restarts.
// Set DB_PATH to that disk's path in production (e.g. /data/salonconnect.db on Render).
const dbPath = process.env.DB_PATH || path.join(__dirname, "salonconnect.db");
const db = new Database(dbPath);
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

const schema = fs.readFileSync(path.join(__dirname, "schema.sql"), "utf8");
db.exec(schema);

// Lightweight migration: if this database was created before Stripe support was added,
// add the new columns instead of requiring a fresh database.
function ensureColumn(table, column, definition) {
  const cols = db.prepare(`PRAGMA table_info(${table})`).all();
  if (!cols.some((c) => c.name === column)) {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
  }
}
ensureColumn("salons", "stripe_account_id", "TEXT");
ensureColumn("salons", "stripe_payouts_enabled", "INTEGER NOT NULL DEFAULT 0");
ensureColumn("bookings", "payment_status", "TEXT NOT NULL DEFAULT 'unpaid'");
ensureColumn("bookings", "stripe_checkout_session_id", "TEXT");
ensureColumn("bookings", "stripe_payment_intent_id", "TEXT");

module.exports = db;
