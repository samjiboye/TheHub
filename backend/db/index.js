const Database = require("better-sqlite3");
const fs = require("fs");
const path = require("path");

const dbPath = process.env.DB_PATH || path.join(__dirname, "thehub.db");
const db = new Database(dbPath);
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

const schema = fs.readFileSync(path.join(__dirname, "schema.sql"), "utf8");
db.exec(schema);

function ensureColumn(table, column, definition) {
  const cols = db.prepare(`PRAGMA table_info(${table})`).all();
  if (!cols.some((c) => c.name === column)) {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
  }
}
ensureColumn("salons", "paystack_subaccount_code", "TEXT");
ensureColumn("salons", "paystack_payouts_enabled", "INTEGER NOT NULL DEFAULT 0");
ensureColumn("bookings", "payment_status", "TEXT NOT NULL DEFAULT 'unpaid'");
ensureColumn("bookings", "paystack_reference", "TEXT");

module.exports = db;
