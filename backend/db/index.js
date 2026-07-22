const { Pool } = require("pg");
const fs = require("fs");
const path = require("path");

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL && process.env.DATABASE_URL.includes("render.com")
    ? { rejectUnauthorized: false }
    : false,
});

const schema = fs.readFileSync(path.join(__dirname, "schema.sql"), "utf8");
pool.query(schema).catch((err) => {
  console.error("Failed to run schema:", err);
});

module.exports = pool;
