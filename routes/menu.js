const express = require("express");

function buildMenuRouter(pool) {
  const router = express.Router();

  router.get("/", async (_req, res) => {
    try {
      const [rows] = await pool.query(
        "SELECT item_id AS itemId, item_name AS name, price, category FROM menu ORDER BY category, item_name"
      );
      res.json(rows);
    } catch (err) {
      console.error("menu:list", err);
      res.status(500).json({ error: "Failed to load menu" });
    }
  });

  return router;
}

module.exports = buildMenuRouter;
