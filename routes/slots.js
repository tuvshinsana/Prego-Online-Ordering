const express = require("express");
const { STATUS } = require("../lib/status");

function buildSlotsRouter(pool) {
  const router = express.Router();
  const MAX_ORDERS_PER_SLOT = 30;

  router.get("/", async (_req, res) => {
    try {
      // SQLite: strftime('%w', date) returns 0=Sunday ... 6=Saturday
      const [slots] = await pool.query(
        `
          SELECT
            s.slot_id   AS slotId,
            s.date      AS date,
            s.start_time AS startTime,
            s.end_time   AS endTime,
            s.max_orders AS maxOrders,
            COALESCE(o.current_orders, 0) AS currentOrders
          FROM pickup_slots s
          LEFT JOIN (
            SELECT slot_id, COUNT(*) AS current_orders
            FROM orders
            WHERE status <> ?
            GROUP BY slot_id
          ) o ON o.slot_id = s.slot_id
          WHERE CAST(strftime('%w', s.date) AS INTEGER) NOT IN (0, 6)
            AND DATE(s.date) >= DATE('now')
            AND TIME(s.start_time) BETWEEN '07:00:00' AND '17:00:00'
          ORDER BY s.date ASC, s.start_time ASC
        `,
        [STATUS.CANCELED]
      );

      const enriched = (slots || [])
        .map((slot) => {
          const activeOrders = Number(slot.currentOrders || 0);
          const maxOrders = Math.min(
            Number(slot.maxOrders || 0),
            MAX_ORDERS_PER_SLOT
          );
          return {
            slotId: String(slot.slotId),
            date: slot.date,
            startTime: slot.startTime,
            endTime: slot.endTime,
            maxOrders,
            activeOrders,
            remaining: Math.max(maxOrders - activeOrders, 0),
          };
        })
        .filter((slot) => slot.remaining > 0);

      res.json(enriched);
    } catch (err) {
      console.error("GET /api/slots ERROR:", err);
      res.status(500).json({ error: err.message });
    }
  });

  return router;
}

module.exports = buildSlotsRouter;
