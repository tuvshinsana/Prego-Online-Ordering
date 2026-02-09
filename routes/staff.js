const express = require("express");
const { STATUS, canTransition, terminalStatuses } = require("../lib/status");

function requireStaff(req, res, next) {
  if (req.session && req.session.staffUser) {
    return next();
  }
  return res.status(401).json({ error: "Not authenticated" });
}

function buildStaffRouter(pool) {
  const router = express.Router();

  // POST /api/staff/login
  router.post("/login", async (req, res) => {
    const { username, password } = req.body || {};
    if (!username || !password) {
      return res.status(400).json({ error: "Username and password required" });
    }
    try {
      const [rows] = await pool.query(
        "SELECT staff_id AS staffId, username, password, role FROM staff WHERE username = ?",
        [username]
      );
      const user = rows[0];
      if (!user || user.password !== password) {
        return res.status(401).json({ error: "Invalid credentials" });
      }
      req.session.staffUser = { staffId: user.staffId, username: user.username };
      return res.json({ staffId: user.staffId, username: user.username, role: user.role });
    } catch (err) {
      console.error("staff:login", err);
      return res.status(500).json({ error: "Login failed" });
    }
  });

  // POST /api/staff/logout
  router.post("/logout", (req, res) => {
    if (!req.session) return res.json({ ok: true });
    req.session.destroy(() => res.json({ ok: true }));
  });

  // GET /api/staff/orders?status=&date=&slot=&studentId=
  router.get("/orders", requireStaff, async (req, res) => {
    const { status, date, slot, studentId } = req.query;
    try {
      let sql = `
        SELECT o.order_id AS orderId,
               o.student_id AS studentId,
               o.student_name AS studentName,
               o.slot_id AS slotId,
               ps.date AS slotDate,
               ps.start_time AS slotStart,
               ps.end_time AS slotEnd,
               o.status,
               o.subtotal,
               o.created_at AS createdAt,
               o.expires_at AS expiresAt
        FROM orders o
        LEFT JOIN pickup_slots ps ON ps.slot_id = o.slot_id
        WHERE 1=1`;
      const params = [];
      if (status) {
        sql += " AND o.status = ?";
        params.push(status);
      }
      if (date) {
        sql += " AND DATE(o.created_at) = ?";
        params.push(date);
      }
      if (slot) {
        sql += " AND o.slot_id = ?";
        params.push(slot);
      }
      if (studentId) {
        sql += " AND o.student_id = ?";
        params.push(studentId);
      }
      sql += " ORDER BY o.created_at DESC";

      const [rows] = await pool.query(sql, params);
      res.json(rows);
    } catch (err) {
      console.error("staff:orders:list", err);
      res.status(500).json({ error: "Failed to load orders" });
    }
  });

  // GET /api/staff/orders/:id
  router.get("/orders/:id", requireStaff, async (req, res) => {
    const orderId = req.params.id;
    try {
      const [orders] = await pool.query(
        `SELECT o.order_id AS orderId,
                o.student_id AS studentId,
                o.student_name AS studentName,
                o.slot_id AS slotId,
                ps.date AS slotDate,
                ps.start_time AS slotStart,
                ps.end_time AS slotEnd,
                o.status,
                o.subtotal,
                o.created_at AS createdAt,
                o.expires_at AS expiresAt
         FROM orders o
         LEFT JOIN pickup_slots ps ON ps.slot_id = o.slot_id
         WHERE o.order_id = ?`,
        [orderId]
      );
      if (!orders.length) return res.status(404).json({ error: "Order not found" });

      const [items] = await pool.query(
        "SELECT order_item_id AS orderItemId, item_id AS itemId, item_name AS name, qty, item_price AS price, line_total AS lineTotal FROM order_items WHERE order_id = ?",
        [orderId]
      );
      res.json({ ...orders[0], items });
    } catch (err) {
      console.error("staff:orders:get", err);
      res.status(500).json({ error: "Failed to load order" });
    }
  });

  // PATCH /api/staff/orders/:id with { newStatus }
  router.patch("/orders/:id", requireStaff, async (req, res) => {
    const orderId = req.params.id;
    let { newStatus } = req.body || {};
    if (typeof newStatus === "string") newStatus = newStatus.toUpperCase();
    if (!newStatus || !STATUS[newStatus]) {
      return res.status(400).json({ error: "Invalid status" });
    }
    try {
      const [rows] = await pool.query(
        "SELECT status FROM orders WHERE order_id = ?",
        [orderId]
      );
      if (!rows.length) return res.status(404).json({ error: "Order not found" });

      const current = rows[0].status;
      if (terminalStatuses.has(current)) {
        return res.status(409).json({ error: "Order can no longer change status" });
      }
      if (!canTransition(current, newStatus)) {
        return res.status(400).json({ error: "Transition not allowed" });
      }

      await pool.query("UPDATE orders SET status = ? WHERE order_id = ?", [
        newStatus,
        orderId,
      ]);
      res.json({ orderId, status: newStatus });
    } catch (err) {
      console.error("staff:orders:update", err);
      res.status(500).json({ error: "Failed to update status" });
    }
  });

  // PATCH /api/staff/orders/:id/pay (PENDING -> PAID)
  router.patch("/orders/:id/pay", requireStaff, async (req, res) => {
    const orderId = req.params.id;
    try {
      const [rows] = await pool.query(
        "SELECT status FROM orders WHERE order_id = ?",
        [orderId]
      );
      if (!rows.length) return res.status(404).json({ error: "Order not found" });

      const current = rows[0].status;
      if (current !== STATUS.PENDING) {
        return res.status(400).json({ error: "Only PENDING orders can be paid" });
      }
      await pool.query("UPDATE orders SET status = ? WHERE order_id = ?", [
        STATUS.PAID,
        orderId,
      ]);
      res.json({ orderId, status: STATUS.PAID });
    } catch (err) {
      console.error("staff:orders:pay", err);
      res.status(500).json({ error: "Failed to update payment status" });
    }
  });

  // GET /api/staff/analytics/weekly - last 7 days orders/revenue
  router.get("/analytics/weekly", requireStaff, async (_req, res) => {
    try {
      const [rows] = await pool.query(
        `SELECT DATE(created_at) AS day,
                COUNT(*) AS orders,
                SUM(subtotal) AS revenue
         FROM orders
         WHERE DATE(created_at) >= DATE('now', '-6 day')
         GROUP BY DATE(created_at)
         ORDER BY DATE(created_at) ASC`
      );
      res.json(rows || []);
    } catch (err) {
      console.error("staff:analytics:weekly", err);
      res.status(500).json({ error: "Failed to load analytics" });
    }
  });

  return router;
}

module.exports = buildStaffRouter;
