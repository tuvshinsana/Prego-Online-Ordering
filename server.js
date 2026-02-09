const express = require("express");
const path = require("path");
const cors = require("cors");
const session = require("express-session");

const pool = require("./db");
const { SESSION_SECRET, PORT, HOST, CORS_ORIGIN } = require("./config");
const buildMenuRouter = require("./routes/menu");
const buildSlotsRouter = require("./routes/slots");
const buildOrdersRouter = require("./routes/orders");
const buildStaffRouter = require("./routes/staff");
const pagesRouter = require("./routes/pages");
const { startAutoCancelJob } = require("./jobs/autoCancel");

const app = express();
const IN_PROD = process.env.NODE_ENV === "production";

if (IN_PROD) {
  // Allow secure cookies when running behind a proxy/load balancer
  app.set("trust proxy", 1);
}

const corsOptions = CORS_ORIGIN ? { origin: CORS_ORIGIN } : undefined;
app.use(cors(corsOptions));
app.use(express.json());

app.use(
  session({
    secret: SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      maxAge: 1000 * 60 * 60 * 6, // 6 hours
      sameSite: "lax",
      secure: IN_PROD,
    },
  })
);

// static assets
app.use(express.static(path.join(__dirname, "public")));

// APIs
app.get("/api/health", (_req, res) => res.json({ status: "ok" }));
app.use("/api/menu", buildMenuRouter(pool));
app.use("/api/slots", buildSlotsRouter(pool));
app.use("/api/orders", buildOrdersRouter(pool));
app.use("/api/staff", buildStaffRouter(pool));

// Pages (sitemap)
app.use(pagesRouter);

app.listen(PORT, HOST, () => {
  console.log(`Server running on http://${HOST}:${PORT}`);
});

// Background job: auto-cancel expired pending orders
startAutoCancelJob(pool, 60 * 1000);
