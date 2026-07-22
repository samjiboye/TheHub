-- The Hub database schema (SQLite for local dev; port to Postgres for production)

CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT UNIQUE,
  phone TEXT,
  role TEXT NOT NULL CHECK (role IN ('customer', 'owner')) DEFAULT 'customer',
  password_hash TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS salons (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  owner_id INTEGER NOT NULL REFERENCES users(id),
  name TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('Barbing', 'Hairdressing', 'Nails', 'Makeup', 'Spa')),
  bio TEXT,
  address TEXT,
  lat REAL,
  lng REAL,
  hours TEXT,
  paystack_subaccount_code TEXT,
  paystack_payouts_enabled INTEGER NOT NULL DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS services (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  salon_id INTEGER NOT NULL REFERENCES salons(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  duration_min INTEGER NOT NULL,
  price REAL NOT NULL
);

CREATE TABLE IF NOT EXISTS bookings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  customer_id INTEGER NOT NULL REFERENCES users(id),
  salon_id INTEGER NOT NULL REFERENCES salons(id),
  service_id INTEGER NOT NULL REFERENCES services(id),
  time_slot TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending', 'confirmed', 'completed', 'cancelled')) DEFAULT 'pending',
  service_price REAL NOT NULL,
  booking_fee REAL NOT NULL DEFAULT 2.50,
  commission_rate REAL NOT NULL DEFAULT 0.15,
  commission_amount REAL NOT NULL,
  payout_amount REAL NOT NULL,
  payment_status TEXT NOT NULL CHECK (payment_status IN ('unpaid', 'paid', 'failed', 'refunded')) DEFAULT 'unpaid',
  paystack_reference TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS reviews (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  salon_id INTEGER NOT NULL REFERENCES salons(id),
  customer_id INTEGER NOT NULL REFERENCES users(id),
  booking_id INTEGER REFERENCES bookings(id),
  rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_salons_category ON salons(category);
CREATE INDEX IF NOT EXISTS idx_bookings_salon ON bookings(salon_id);
CREATE INDEX IF NOT EXISTS idx_bookings_customer ON bookings(customer_id);
CREATE INDEX IF NOT EXISTS idx_reviews_salon ON reviews(salon_id);
