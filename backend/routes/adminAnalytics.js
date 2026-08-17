const express = require("express");
const db = require("../db");
const { requireAuth, requireAdmin } = require("../middleware/auth");

const router = express.Router();

// GET /admin/analytics - admin only, platform-wide totals + 30-day trends
router.get("/analytics", requireAuth, requireAdmin, async (req, res) => {
  try {
    const [
      userRows,
      salonRows,
      bookingRows,
      productRows,
      orderRows,
      trendRows,
    ] = await Promise.all([
      db.query(
        `SELECT
          COUNT(*) AS total,
          COUNT(*) FILTER (WHERE role = 'customer') AS customers,
          COUNT(*) FILTER (WHERE role = 'owner') AS owners
         FROM users`
      ),
      db.query(`SELECT COUNT(*) AS total FROM salons`),
      db.query(
        `SELECT
          COUNT(*) AS total,
          COUNT(*) FILTER (WHERE status = 'completed') AS completed,
          COALESCE(SUM(service_price) FILTER (WHERE payment_status = 'paid'), 0) AS revenue,
          COALESCE(SUM(commission_amount) FILTER (WHERE payment_status = 'paid'), 0) AS commission
         FROM bookings`
      ),
      db.query(`SELECT COUNT(*) AS total FROM products WHERE is_active = true`),
      db.query(
        `SELECT
          COUNT(*) AS total,
          COALESCE(SUM(total) FILTER (WHERE payment_status = 'paid'), 0) AS revenue
         FROM product_orders`
      ),
      db.query(
        `WITH days AS (
          SELECT generate_series(CURRENT_DATE - INTERVAL '29 days', CURRENT_DATE, INTERVAL '1 day')::date AS day
        ),
        booking_stats AS (
          SELECT created_at::date AS day, COUNT(*) AS count,
            COALESCE(SUM(service_price) FILTER (WHERE payment_status = 'paid'), 0) AS revenue
          FROM bookings GROUP BY created_at::date
        ),
        order_stats AS (
          SELECT created_at::date AS day, COUNT(*) AS count,
            COALESCE(SUM(total) FILTER (WHERE payment_status = 'paid'), 0) AS revenue
          FROM product_orders GROUP BY created_at::date
        )
        SELECT
          days.day,
          COALESCE(booking_stats.count, 0) AS bookings,
          COALESCE(booking_stats.revenue, 0) AS booking_revenue,
          COALESCE(order_stats.count, 0) AS orders,
          COALESCE(order_stats.revenue, 0) AS order_revenue
        FROM days
        LEFT JOIN booking_stats ON booking_stats.day = days.day
        LEFT JOIN order_stats ON order_stats.day = days.day
        ORDER BY days.day`
      ),
    ]);

    res.json({
      totals: {
        users: parseInt(userRows.rows[0].total, 10),
        customers: parseInt(userRows.rows[0].customers, 10),
        owners: parseInt(userRows.rows[0].owners, 10),
        salons: parseInt(salonRows.rows[0].total, 10),
        bookings: parseInt(bookingRows.rows[0].total, 10),
        completedBookings: parseInt(bookingRows.rows[0].completed, 10),
        bookingRevenue: parseFloat(bookingRows.rows[0].revenue),
        commissionEarned: parseFloat(bookingRows.rows[0].commission),
        products: parseInt(productRows.rows[0].total, 10),
        marketplaceOrders: parseInt(orderRows.rows[0].total, 10),
        marketplaceRevenue: parseFloat(orderRows.rows[0].revenue),
      },
      trends: trendRows.rows.map((r) => ({
        date: r.day,
        bookings: parseInt(r.bookings, 10),
        bookingRevenue: parseFloat(r.booking_revenue),
        orders: parseInt(r.orders, 10),
        orderRevenue: parseFloat(r.order_revenue),
      })),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Couldn't load analytics." });
  }
});

// GET /admin/users - every user on the platform, with basic activity counts
router.get("/users", requireAuth, requireAdmin, async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT
         u.id, u.name, u.email, u.phone, u.role, u.created_at,
         (SELECT COUNT(*) FROM bookings WHERE customer_id = u.id) AS bookings_made,
         (SELECT COUNT(*) FROM salons WHERE owner_id = u.id) AS salons_owned
       FROM users u
       ORDER BY u.created_at DESC`
    );
    res.json(
      rows.map((r) => ({
        id: r.id,
        name: r.name,
        email: r.email,
        phone: r.phone,
        role: r.role,
        createdAt: r.created_at,
        bookingsMade: Number(r.bookings_made),
        salonsOwned: Number(r.salons_owned),
      }))
    );
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Couldn't load users." });
  }
});

// GET /admin/users/:id - one user's profile plus their real activity
router.get("/users/:id", requireAuth, requireAdmin, async (req, res) => {
  try {
    const { rows: userRows } = await db.query(
      "SELECT id, name, email, phone, role, created_at, profile_photo_url, address_state, address_city, address_street, referral_code FROM users WHERE id = $1",
      [req.params.id]
    );
    const user = userRows[0];
    if (!user) return res.status(404).json({ error: "User not found" });

    if (user.role === "owner") {
      const { rows: salons } = await db.query("SELECT id, name, category FROM salons WHERE owner_id = $1", [user.id]);
      const salonIds = salons.map((s) => s.id);
      let bookings = [];
      if (salonIds.length > 0) {
        const { rows } = await db.query(
          `SELECT b.id, b.status, b.payment_status, b.service_price, b.created_at,
                  s.name AS service_name, sa.name AS salon_name, u.name AS customer_name
           FROM bookings b
           JOIN services s ON s.id = b.service_id
           JOIN salons sa ON sa.id = b.salon_id
           JOIN users u ON u.id = b.customer_id
           WHERE b.salon_id = ANY($1)
           ORDER BY b.created_at DESC`,
          [salonIds]
        );
        bookings = rows;
      }
      res.json({ user, salons, bookings });
    } else {
      const { rows: bookings } = await db.query(
        `SELECT b.id, b.status, b.payment_status, b.service_price, b.created_at,
                s.name AS service_name, sa.name AS salon_name
         FROM bookings b
         JOIN services s ON s.id = b.service_id
         JOIN salons sa ON sa.id = b.salon_id
         WHERE b.customer_id = $1
         ORDER BY b.created_at DESC`,
        [user.id]
      );
      res.json({ user, bookings });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Couldn't load that user." });
  }
});

// GET /admin/bookings - every booking platform-wide: who booked who,
// what they paid, whether it went through and whether it's done
router.get("/bookings", requireAuth, requireAdmin, async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT b.id, b.status, b.payment_status, b.service_price, b.commission_amount, b.created_at,
              s.name AS service_name, sa.name AS salon_name, u.name AS customer_name, u.id AS customer_id, sa.id AS salon_id
       FROM bookings b
       JOIN services s ON s.id = b.service_id
       JOIN salons sa ON sa.id = b.salon_id
       JOIN users u ON u.id = b.customer_id
       ORDER BY b.created_at DESC
       LIMIT 200`
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Couldn't load bookings." });
  }
});

module.exports = router;
