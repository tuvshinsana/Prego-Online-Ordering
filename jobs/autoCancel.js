const { STATUS } = require("../lib/status");

function startAutoCancelJob(pool, intervalMs = 60000) {
  const task = async () => {
    try {
      const now = new Date();
      const [rows] = await pool.query(
        `SELECT o.order_id AS orderId, ps.date AS slotDate, ps.start_time AS slotStart
         FROM orders o
         JOIN pickup_slots ps ON ps.slot_id = o.slot_id
         WHERE o.status = ?`,
        [STATUS.PENDING]
      );

      const toCancel = (rows || []).filter((row) => {
        const slotStart = new Date(`${row.slotDate}T${row.slotStart}`);
        const cancelAt = new Date(slotStart.getTime() - 15 * 60 * 1000);
        return now >= cancelAt;
      });

      if (!toCancel.length) return;

      const placeholders = toCancel.map(() => "?").join(", ");
      const orderIds = toCancel.map((row) => row.orderId);
      const [result] = await pool.query(
        `UPDATE orders SET status = ? WHERE order_id IN (${placeholders})`,
        [STATUS.CANCELED, ...orderIds]
      );
      if (result.affectedRows) {
        console.log(
          `auto-cancel: ${result.affectedRows} pending orders canceled (15-min cutoff)`
        );
      }
    } catch (err) {
      console.error("auto-cancel job failed", err);
    }
  };

  // run once on boot, then repeat
  task();
  return setInterval(task, intervalMs);
}

module.exports = { startAutoCancelJob };
