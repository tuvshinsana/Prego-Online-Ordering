const path = require("path");
const fs = require("fs");
const { DatabaseSync } = require("node:sqlite");

const dbFile =
  process.env.SQLITE_PATH ||
  path.join(__dirname, "db", process.env.SQLITE_FILENAME || "prego.sqlite");

fs.mkdirSync(path.dirname(dbFile), { recursive: true });
const db = new DatabaseSync(dbFile);
db.exec("PRAGMA foreign_keys = ON");

function runQuery(sql, params = []) {
  const stmt = db.prepare(sql);
  const op = sql.trim().split(/\s+/)[0].toUpperCase();
  const normalizedParams = Array.isArray(params) ? params : [params];

  if (op === "SELECT" || op === "PRAGMA" || op === "WITH") {
    const rows = stmt.all(...normalizedParams);
    return [rows];
  }

  const info = stmt.run(...normalizedParams);
  return [
    {
      affectedRows: info.changes ?? 0,
      lastInsertId: info.lastInsertRowid ?? null,
    },
  ];
}

function createConnection() {
  let inTx = false;
  return {
    async beginTransaction() {
      db.exec("BEGIN IMMEDIATE");
      inTx = true;
    },
    async commit() {
      if (inTx) db.exec("COMMIT");
      inTx = false;
    },
    async rollback() {
      if (inTx) db.exec("ROLLBACK");
      inTx = false;
    },
    async execute(sql, params = []) {
      return runQuery(sql, params);
    },
    async query(sql, params = []) {
      return runQuery(sql, params);
    },
    release() {
      /* no-op for SQLite */
    },
  };
}

function ensureSchema() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS menu (
      item_id TEXT PRIMARY KEY,
      item_name TEXT NOT NULL,
      price REAL NOT NULL DEFAULT 0,
      category TEXT
    );

    CREATE TABLE IF NOT EXISTS pickup_slots (
      slot_id TEXT PRIMARY KEY,
      date TEXT NOT NULL,
      start_time TEXT NOT NULL,
      end_time TEXT NOT NULL,
      max_orders INTEGER NOT NULL DEFAULT 30
    );

    CREATE TABLE IF NOT EXISTS orders (
      order_id TEXT PRIMARY KEY,
      student_id TEXT NOT NULL,
      student_name TEXT,
      slot_id TEXT NOT NULL,
      status TEXT NOT NULL,
      subtotal REAL NOT NULL,
      created_at TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      CONSTRAINT fk_orders_slot FOREIGN KEY (slot_id) REFERENCES pickup_slots(slot_id)
        ON UPDATE CASCADE ON DELETE RESTRICT
    );

    CREATE TABLE IF NOT EXISTS order_items (
      order_item_id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id TEXT NOT NULL,
      item_id TEXT,
      item_name TEXT NOT NULL,
      qty INTEGER NOT NULL,
      item_price REAL NOT NULL,
      line_total REAL NOT NULL,
      CONSTRAINT fk_items_order FOREIGN KEY (order_id) REFERENCES orders(order_id)
        ON UPDATE CASCADE ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS staff (
      staff_id TEXT PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT DEFAULT 'staff'
    );

    CREATE INDEX IF NOT EXISTS idx_orders_student ON orders(student_id);
    CREATE INDEX IF NOT EXISTS idx_orders_slot ON orders(slot_id);
  `);

  // Add student_name column to orders if missing (SQLite)
  const cols = db.prepare("PRAGMA table_info(orders)").all();
  const hasStudentName = cols.some((c) => c.name === "student_name");
  if (!hasStudentName) {
    db.exec("ALTER TABLE orders ADD COLUMN student_name TEXT");
  }
}

function seedDefaults() {
  const menuCount = db.prepare("SELECT COUNT(*) AS cnt FROM menu").get().cnt;
  if (!menuCount) {
    const seedMenu = db.prepare(
      "INSERT OR IGNORE INTO menu (item_id, item_name, price, category) VALUES (?, ?, ?, ?)"
    );
    [
      ["PA1", "Vegetarian Lasagna", 205, "Pasta"],
      ["PA2", "Ravioli Spinach", 225, "Pasta"],
      ["PI1", "Margherita", 125, "Pizza"],
      ["DR1", "Coca-Cola", 55, "Drink"],
    ].forEach((row) => seedMenu.run(...row));
  }

  const slotCount = db
    .prepare("SELECT COUNT(*) AS cnt FROM pickup_slots")
    .get().cnt;
  if (!slotCount) {
    const seedSlot = db.prepare(
      "INSERT OR REPLACE INTO pickup_slots (slot_id, date, start_time, end_time, max_orders) VALUES (?, ?, ?, ?, ?)"
    );
    const daysToSeed = 14; // next 2 weeks of weekdays
    for (let offset = 1; offset <= daysToSeed; offset++) {
      const date = new Date();
      date.setDate(date.getDate() + offset);
      const day = date.getDay();
      // Skip weekends
      if (day === 0 || day === 6) continue;
      const dateStr = date.toISOString().slice(0, 10);

      const startMinutes = 7 * 60;
      const endMinutes = 17 * 60;
      for (let minutes = startMinutes; minutes < endMinutes; minutes += 15) {
        const hh = Math.floor(minutes / 60)
          .toString()
          .padStart(2, "0");
        const mm = (minutes % 60).toString().padStart(2, "0");
        const hhEnd = Math.floor((minutes + 15) / 60)
          .toString()
          .padStart(2, "0");
        const mmEnd = ((minutes + 15) % 60).toString().padStart(2, "0");
        const startStr = `${hh}:${mm}:00`;
        const endStr = `${hhEnd}:${mmEnd}:00`;
        const slotId = `${dateStr.replace(/-/g, "")}-${hh}${mm}`;
        seedSlot.run(slotId, dateStr, startStr, endStr, 30);
      }
    }
  }

  db.prepare(
    "INSERT OR IGNORE INTO staff (staff_id, username, password, role) VALUES (?, ?, ?, ?)"
  ).run("ST1", "admin", "admin123", "admin");
}

ensureSchema();
seedDefaults();

const pool = {
  async query(sql, params = []) {
    return runQuery(sql, params);
  },
  async execute(sql, params = []) {
    return runQuery(sql, params);
  },
  async getConnection() {
    return createConnection();
  },
  db,
};

module.exports = pool;
