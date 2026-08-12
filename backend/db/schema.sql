-- TheHub database schema (Postgres)

CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE,
  phone TEXT,
  role TEXT NOT NULL CHECK (role IN ('customer', 'owner')) DEFAULT 'customer',
  password_hash TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS salons (
  id SERIAL PRIMARY KEY,
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
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS services (
  id SERIAL PRIMARY KEY,
  salon_id INTEGER NOT NULL REFERENCES salons(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  duration_min INTEGER NOT NULL,
  price REAL NOT NULL
);
ALTER TABLE services ADD COLUMN IF NOT EXISTS home_service_price REAL;
ALTER TABLE services ADD COLUMN IF NOT EXISTS salon_service_available BOOLEAN NOT NULL DEFAULT true;

CREATE TABLE IF NOT EXISTS bookings (
  id SERIAL PRIMARY KEY,
  customer_id INTEGER NOT NULL REFERENCES users(id),
  salon_id INTEGER NOT NULL REFERENCES salons(id),
  service_id INTEGER NOT NULL REFERENCES services(id),
  time_slot TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending', 'confirmed', 'completed', 'cancelled')) DEFAULT 'pending',
  service_price REAL NOT NULL,
  booking_fee REAL NOT NULL DEFAULT 2.50,
  commission_rate REAL NOT NULL DEFAULT 0.10,
  commission_amount REAL NOT NULL,
  payout_amount REAL NOT NULL,
  payment_status TEXT NOT NULL CHECK (payment_status IN ('unpaid', 'paid', 'failed', 'refunded')) DEFAULT 'unpaid',
  paystack_reference TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS reviews (
  id SERIAL PRIMARY KEY,
  salon_id INTEGER NOT NULL REFERENCES salons(id),
  customer_id INTEGER NOT NULL REFERENCES users(id),
  booking_id INTEGER REFERENCES bookings(id),
  rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_salons_category ON salons(category);
CREATE INDEX IF NOT EXISTS idx_bookings_salon ON bookings(salon_id);
CREATE INDEX IF NOT EXISTS idx_bookings_customer ON bookings(customer_id);
CREATE INDEX IF NOT EXISTS idx_reviews_salon ON reviews(salon_id);

ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_token TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_token_expires TIMESTAMP;
ALTER TABLE salons ADD COLUMN IF NOT EXISTS service_type TEXT DEFAULT 'unisex';
ALTER TABLE salons ADD COLUMN IF NOT EXISTS state TEXT;
ALTER TABLE salons ADD COLUMN IF NOT EXISTS city TEXT;
ALTER TABLE salons ADD COLUMN IF NOT EXISTS cancellation_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE salons ADD COLUMN IF NOT EXISTS profile_image_url TEXT;
ALTER TABLE salons ADD COLUMN IF NOT EXISTS profile_image_public_id TEXT;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS cancelled_by TEXT;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS cancel_reason TEXT;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS cancel_note TEXT;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS booking_date DATE;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS location_type TEXT NOT NULL DEFAULT 'salon';
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS customer_address TEXT;

CREATE TABLE IF NOT EXISTS salon_media (
  id SERIAL PRIMARY KEY,
  salon_id INTEGER NOT NULL REFERENCES salons(id) ON DELETE CASCADE,
  media_type TEXT NOT NULL CHECK (media_type IN ('image', 'video')),
  url TEXT NOT NULL,
  public_id TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_salon_media_salon ON salon_media(salon_id);

ALTER TABLE bookings ADD COLUMN IF NOT EXISTS reminder_sent_at TIMESTAMP;

CREATE TABLE IF NOT EXISTS notifications (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT,
  booking_id INTEGER REFERENCES bookings(id) ON DELETE SET NULL,
  read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, created_at DESC);

ALTER TABLE users ADD COLUMN IF NOT EXISTS wallet_balance REAL NOT NULL DEFAULT 0;
ALTER TABLE salons ADD COLUMN IF NOT EXISTS bank_code TEXT;
ALTER TABLE salons ADD COLUMN IF NOT EXISTS account_number TEXT;
ALTER TABLE salons ADD COLUMN IF NOT EXISTS paystack_recipient_code TEXT;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS payment_method TEXT NOT NULL DEFAULT 'paystack';
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS payout_status TEXT NOT NULL DEFAULT 'paid';

CREATE TABLE IF NOT EXISTS wallet_transactions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('fund', 'debit', 'refund')),
  amount REAL NOT NULL,
  booking_id INTEGER REFERENCES bookings(id) ON DELETE SET NULL,
  paystack_reference TEXT,
  status TEXT NOT NULL CHECK (status IN ('pending', 'success', 'failed')) DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_wallet_tx_user ON wallet_transactions(user_id, created_at DESC);

ALTER TABLE bookings ADD COLUMN IF NOT EXISTS completion_photo_url TEXT;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS completion_otp TEXT;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS completion_otp_expires_at TIMESTAMP;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS completion_requested_at TIMESTAMP;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS disputed_at TIMESTAMP;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS dispute_reason TEXT;

-- Default 'accepted' so existing bookings aren't retroactively gated behind
-- acceptance; new bookings are explicitly set to 'pending' at payment time.
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS owner_response TEXT NOT NULL DEFAULT 'accepted' CHECK (owner_response IN ('pending', 'accepted', 'declined'));

ALTER TABLE users ADD COLUMN IF NOT EXISTS loyalty_bookings_since_reward INTEGER NOT NULL DEFAULT 0;

ALTER TABLE wallet_transactions DROP CONSTRAINT IF EXISTS wallet_transactions_type_check;
ALTER TABLE wallet_transactions ADD CONSTRAINT wallet_transactions_type_check CHECK (type IN ('fund', 'debit', 'refund', 'reward'));

-- Marketplace: TheHub-curated product catalog, orders, and order line items.
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_admin BOOLEAN NOT NULL DEFAULT false;

-- Remembers each customer's most recently used marketplace delivery details so
-- checkout can pre-fill them next time instead of asking again.
ALTER TABLE users ADD COLUMN IF NOT EXISTS saved_delivery_address TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS saved_delivery_state TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS saved_delivery_city TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS saved_delivery_phone TEXT;

CREATE TABLE IF NOT EXISTS product_categories (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  icon_url TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS products (
  id SERIAL PRIMARY KEY,
  category_id INTEGER REFERENCES product_categories(id),
  name TEXT NOT NULL,
  description TEXT,
  price REAL NOT NULL,
  stock_quantity INTEGER NOT NULL DEFAULT 0,
  image_url TEXT,
  image_public_id TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);

CREATE TABLE IF NOT EXISTS product_orders (
  id SERIAL PRIMARY KEY,
  customer_id INTEGER NOT NULL REFERENCES users(id),
  status TEXT NOT NULL CHECK (status IN ('pending', 'processing', 'dispatched', 'delivered', 'cancelled')) DEFAULT 'pending',
  subtotal REAL NOT NULL,
  delivery_fee REAL NOT NULL DEFAULT 0,
  total REAL NOT NULL,
  delivery_address TEXT NOT NULL,
  delivery_state TEXT,
  delivery_city TEXT,
  delivery_phone TEXT,
  courier_name TEXT,
  courier_tracking_ref TEXT,
  payment_status TEXT NOT NULL CHECK (payment_status IN ('unpaid', 'paid', 'failed', 'refunded')) DEFAULT 'unpaid',
  payment_method TEXT NOT NULL DEFAULT 'paystack',
  paystack_reference TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_product_orders_customer ON product_orders(customer_id, created_at DESC);

CREATE TABLE IF NOT EXISTS product_order_items (
  id SERIAL PRIMARY KEY,
  order_id INTEGER NOT NULL REFERENCES product_orders(id) ON DELETE CASCADE,
  product_id INTEGER NOT NULL REFERENCES products(id),
  product_name TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  unit_price REAL NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_product_order_items_order ON product_order_items(order_id);

-- Marketplace runs as pre-order for now (no held inventory) — snapshot the promised
-- delivery window on each order so changing the default later doesn't rewrite history.
ALTER TABLE product_orders ADD COLUMN IF NOT EXISTS estimated_delivery_days INTEGER NOT NULL DEFAULT 42;
-- Fulfillment is manual-assisted: admin places the matching order on a supplier site
-- (e.g. AliExpress) after payment and records the reference here for tracking.
ALTER TABLE product_orders ADD COLUMN IF NOT EXISTS supplier_order_ref TEXT;

-- Product reviews — tied to a specific delivered order/item so only real buyers can review,
-- and each buyer can only review a product once per order.
CREATE TABLE IF NOT EXISTS product_reviews (
  id SERIAL PRIMARY KEY,
  product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  customer_id INTEGER NOT NULL REFERENCES users(id),
  order_id INTEGER NOT NULL REFERENCES product_orders(id),
  rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE (product_id, order_id)
);

CREATE INDEX IF NOT EXISTS idx_product_reviews_product ON product_reviews(product_id);


-- Add Lashes & Nails (renamed from Nails), Piercing, and Tattoos as salon categories
UPDATE salons SET category = 'Lashes & Nails' WHERE category = 'Nails';
ALTER TABLE salons DROP CONSTRAINT IF EXISTS salons_category_check;
ALTER TABLE salons ADD CONSTRAINT salons_category_check CHECK (category IN ('Barbing', 'Hairdressing', 'Lashes & Nails', 'Makeup', 'Spa', 'Piercing', 'Tattoos'));
