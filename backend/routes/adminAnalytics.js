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

module.exports = router;
