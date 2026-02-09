const express = require("express");
const path = require("path");

const router = express.Router();
const page = (file) => (req, res) =>
  res.sendFile(path.join(__dirname, "..", "public", file));

// Student flow
router.get("/", page("index.html"));
router.get("/order/menu", page("menu.html"));
router.get("/order/menu.html", page("menu.html"));
router.get("/order/cart", page("cart.html"));
router.get("/order/cart.html", page("cart.html"));
router.get("/order/slot", page("slot.html"));
router.get("/order/slot.html", page("slot.html"));
router.get("/order/id", page("id.html"));
router.get("/order/id.html", page("id.html"));
router.get("/order/review", page("review.html"));
router.get("/order/review.html", page("review.html"));
router.get("/order/confirm/:id", page("confirm.html"));


// Staff flow
router.get("/staff/login", page("staff-login.html"));
router.get("/staff", page("staff.html"));
router.get("/staff/orders", page("staff.html"));
router.get("/staff/orders/:id", page("staff.html"));
router.get("/vendor", page("vendor.html"));
router.get("/vendor/report", page("vendor-report.html"));

module.exports = router;
