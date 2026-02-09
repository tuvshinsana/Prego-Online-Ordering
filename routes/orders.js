const express = require("express");
const { UNPAID_EXPIRY_HOURS } = require("../config");
const { STATUS, openStatuses } = require("../lib/status");

function normalizeItems(items) {
  if (!Array.isArray(items) || items.length === 0) return null;
  const normalized = [];

  for (const raw of items) {
    const itemId = typeof raw.itemId === "string" ? raw.itemId.trim() : "";
    const name = typeof raw.name === "string" ? raw.name.trim() : "";
    const qty = Number(raw.qty);
    const price = Number(raw.price);

    if (!itemId && !name) return null;
    if (!Number.isFinite(qty) || qty <= 0) return null;
    if (!Number.isFinite(price) || price < 0) return null;

    const lineTotal = Number((price * qty).toFixed(2));
    normalized.push({
      itemId: itemId || name,
      name: name || itemId,
      qty,
      price,
      lineTotal,
    });
  }

  return normalized;
}

function calcSubtotal(items) {
  return Number(
    items.reduce((sum, it) => sum + Number(it.lineTotal || 0), 0).toFixed(2)
  );
}

function addMinutesToTime(timeStr, minutesToAdd = 15) {
  if (!timeStr) return "";
  const [hh, mm, ss = "00"] = timeStr.split(":").map(Number);
  const base = new Date(2000, 0, 1, hh || 0, mm || 0, ss || 0);
  base.setMinutes(base.getMinutes() + minutesToAdd);
  const hhOut = base.getHours().toString().padStart(2, "0");
  const mmOut = base.getMinutes().toString().padStart(2, "0");
  const ssOut = base.getSeconds().toString().padStart(2, "0");
  return `${hhOut}:${mmOut}:${ssOut}`;
}

async function generateShortOrderId(conn, attempts = 5) {
  for (let i = 0; i < attempts; i++) {
    const rand = (Math.floor(Math.random() * 900000) + 100000).toString(); // 6-digit
    const candidate = rand;
    const [rows] = await conn.execute(
      "SELECT 1 FROM orders WHERE order_id = ? LIMIT 1",
      [candidate]
    );
    if (!rows.length) return candidate;
  }
  throw new Error("Unable to generate unique order ID");
}

function buildOrdersRouter(pool) {
  const router = express.Router();

  // GET /api/orders?studentId=
  router.get("/", async (req, res) => {
    const { studentId } = req.query;
    try {
      let sql =
        `SELECT order_id AS orderId,
                student_id AS studentId,
                student_name AS studentName,
                slot_id AS slotId,
                status,
                subtotal,
                created_at AS createdAt,
                expires_at AS expiresAt
         FROM orders`;
      const params = [];
      if (studentId) {
        sql += " WHERE student_id = ?";
        params.push(studentId);
      }
      sql += " ORDER BY created_at DESC";

      const [rows] = await pool.query(sql, params);
      return res.json(rows);
    } catch (err) {
      console.error("orders:list", err);
      return res.status(500).json({ error: "Failed to load orders" });
    }
  });

  // GET /api/orders/:id (with items)
  router.get("/:id", async (req, res) => {
    const orderId = req.params.id;
    try {
      const [orders] = await pool.query(
        `SELECT order_id AS orderId,
                student_id AS studentId,
                student_name AS studentName,
                slot_id AS slotId,
                status,
                subtotal,
                created_at AS createdAt,
                expires_at AS expiresAt
         FROM orders WHERE order_id = ?`,
        [orderId]
      );
      if (!orders.length) {
        return res.status(404).json({ error: "Order not found" });
      }
      const order = orders[0];
      const [items] = await pool.query(
        "SELECT order_item_id AS orderItemId, item_id AS itemId, item_name AS name, qty, item_price AS price, line_total AS lineTotal FROM order_items WHERE order_id = ?",
        [orderId]
      );
      return res.json({ ...order, items });
    } catch (err) {
      console.error("orders:get", err);
      return res.status(500).json({ error: "Failed to load order" });
    }
  });

  // POST /api/orders
  router.post("/", async (req, res) => {
    const {
      studentId,
      studentName,
      slotId,
      items,
      pickupDate,
      pickupStartTime,
      pickupEndTime,
    } = req.body || {};
    const student = typeof studentId === "string" ? studentId.trim() : "";
    const studentLabel =
      typeof studentName === "string" ? studentName.trim() : "";
    const slot = typeof slotId === "string" ? slotId.trim() : "";

    if (!student || !slot) {
      return res
        .status(400)
        .json({ error: "studentId and slotId are required" });
    }
    if (!/^[0-9]{6}$/.test(student)) {
      return res.status(400).json({ error: "Invalid studentId format" });
    }
    if (studentLabel && studentLabel.length > 80) {
      return res.status(400).json({ error: "Student name too long" });
    }

    const normalizedItems = normalizeItems(items);
    if (!normalizedItems) {
      return res.status(400).json({ error: "Items are required and must be valid" });
    }

    const subtotal = calcSubtotal(normalizedItems);
    if (!Number.isFinite(subtotal) || subtotal <= 0) {
      return res.status(400).json({ error: "Invalid subtotal" });
    }

    const createdAt = new Date();
    const expiresAt = new Date(
      createdAt.getTime() + UNPAID_EXPIRY_HOURS * 60 * 60 * 1000
    );
    const createdAtIso = createdAt.toISOString();
    const expiresAtIso = expiresAt.toISOString();

    const MAX_ORDERS_PER_SLOT = 30;
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      const orderId = await generateShortOrderId(conn);

      // Lock slot row
      let [slotRows] = await conn.execute(
        "SELECT slot_id, date, start_time, end_time, max_orders FROM pickup_slots WHERE slot_id = ?",
        [slot]
      );
      if (!slotRows.length) {
        // Try to create the slot on the fly using provided date/time
        if (!pickupDate || !pickupStartTime) {
          await conn.rollback();
          return res.status(400).json({ error: "Pickup slot not found" });
        }
        const endTime = pickupEndTime || addMinutesToTime(pickupStartTime, 15);
        await conn.execute(
          `INSERT OR IGNORE INTO pickup_slots (slot_id, date, start_time, end_time, max_orders)
           VALUES (?, ?, ?, ?, ?)`,
          [slot, pickupDate, pickupStartTime, endTime, MAX_ORDERS_PER_SLOT]
        );
        [slotRows] = await conn.execute(
          "SELECT slot_id, date, start_time, end_time, max_orders FROM pickup_slots WHERE slot_id = ?",
          [slot]
        );
        if (!slotRows.length) {
          await conn.rollback();
          return res.status(400).json({ error: "Pickup slot not found" });
        }
      }
      const slotRow = slotRows[0];

      // Enforce 10-minute cutoff server-side
      const slotStart = new Date(`${slotRow.date}T${slotRow.start_time}`);
      const cutoff = new Date(Date.now() + 10 * 60 * 1000);
      if (slotStart <= cutoff) {
        await conn.rollback();
        return res
          .status(400)
          .json({ error: "Pickup slot is too soon. Choose a later time." });
      }

      // Check existing open order for this student
      const [openRows] = await conn.execute(
        `SELECT COUNT(*) AS cnt FROM orders WHERE student_id = ? AND status IN (?, ?, ?, ?)`,
        [student, ...openStatuses]
      );
      if (openRows[0]?.cnt > 0) {
        await conn.rollback();
        return res
          .status(409)
          .json({ error: "You already have an active order in progress" });
      }

      // Capacity check (count non-canceled orders)
      const [countRows] = await conn.execute(
        `SELECT COUNT(*) AS cnt FROM orders WHERE slot_id = ? AND status <> ?`,
        [slot, STATUS.CANCELED]
      );
      const activeCount = countRows[0]?.cnt || 0;
      const max = Math.min(
        Number(slotRow.max_orders || 0),
        MAX_ORDERS_PER_SLOT
      );
      if (activeCount >= max) {
        await conn.rollback();
        return res.status(409).json({ error: "Pickup slot is full" });
      }

      await conn.execute(
        `INSERT INTO orders (order_id, student_id, student_name, slot_id, status, subtotal, created_at, expires_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          orderId,
          student,
          studentLabel || null,
          slot,
          STATUS.PENDING,
          subtotal,
          createdAtIso,
          expiresAtIso,
        ]
      );

      if (normalizedItems.length) {
        const stmt =
          "INSERT INTO order_items (order_id, item_id, item_name, qty, item_price, line_total) VALUES (?, ?, ?, ?, ?, ?)";
        for (const it of normalizedItems) {
          await conn.execute(stmt, [
            orderId,
            it.itemId,
            it.name,
            it.qty,
            it.price,
            it.lineTotal,
          ]);
        }
      }

      await conn.commit();
      return res.status(201).json({
        orderId,
        pickupSlot: {
          slotId: slotRow.slot_id,
          date: slotRow.date,
          startTime: slotRow.start_time,
          endTime: slotRow.end_time,
        },
        status: STATUS.PENDING,
        subtotal,
        createdAt: createdAtIso,
        expiresAt: expiresAtIso,
      });
    } catch (err) {
      await conn.rollback();
      console.error("orders:create", err);
      return res.status(500).json({ error: "Failed to place order" });
    } finally {
      conn.release();
    }
  });

  return router;
}

module.exports = buildOrdersRouter;
