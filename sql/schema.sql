-- MySQL schema for Prego Ordering (Criterion B)

CREATE TABLE IF NOT EXISTS menu (
  item_id    VARCHAR(32) PRIMARY KEY,
  item_name  VARCHAR(255) NOT NULL,
  price      DECIMAL(10,2) NOT NULL DEFAULT 0,
  category   VARCHAR(64)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS pickup_slots (
  slot_id     VARCHAR(32) PRIMARY KEY,
  date        DATE NOT NULL,
  start_time  TIME NOT NULL,
  end_time    TIME NOT NULL,
  max_orders  INT NOT NULL DEFAULT 30
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS orders (
  order_id    VARCHAR(64) PRIMARY KEY,
  student_id  VARCHAR(64) NOT NULL,
  slot_id     VARCHAR(32) NOT NULL,
  status      VARCHAR(20) NOT NULL,
  subtotal    DECIMAL(10,2) NOT NULL,
  created_at  DATETIME NOT NULL,
  expires_at  DATETIME NOT NULL,
  CONSTRAINT fk_orders_slot FOREIGN KEY (slot_id) REFERENCES pickup_slots(slot_id)
    ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS order_items (
  order_item_id BIGINT AUTO_INCREMENT PRIMARY KEY,
  order_id   VARCHAR(64) NOT NULL,
  item_id    VARCHAR(32),
  item_name  VARCHAR(255) NOT NULL,
  qty        INT NOT NULL,
  item_price DECIMAL(10,2) NOT NULL,
  line_total DECIMAL(10,2) NOT NULL,
  CONSTRAINT fk_items_order FOREIGN KEY (order_id) REFERENCES orders(order_id)
    ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS staff (
  staff_id VARCHAR(32) PRIMARY KEY,
  username VARCHAR(64) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  role     VARCHAR(32) DEFAULT 'staff'
) ENGINE=InnoDB;

-- Seed data
INSERT INTO menu (item_id, item_name, price, category) VALUES
  ('PA1', 'Vegetarian Lasagna', 205, 'Pasta'),
  ('PA2', 'Ravioli Spinach', 225, 'Pasta'),
  ('PI1', 'Margherita', 125, 'Pizza'),
  ('DR1', 'Coca-Cola', 55, 'Drink')
ON DUPLICATE KEY UPDATE price = VALUES(price);

INSERT INTO pickup_slots (slot_id, date, start_time, end_time, max_orders) VALUES
  ('S1', DATE_ADD(CURDATE(), INTERVAL 1 DAY), '12:00:00', '12:30:00', 30),
  ('S2', DATE_ADD(CURDATE(), INTERVAL 1 DAY), '12:30:00', '13:00:00', 30),
  ('S3', DATE_ADD(CURDATE(), INTERVAL 1 DAY), '13:00:00', '13:30:00', 30)
ON DUPLICATE KEY UPDATE max_orders = VALUES(max_orders);

INSERT INTO staff (staff_id, username, password, role) VALUES
  ('ST1', 'admin', 'admin123', 'admin')
ON DUPLICATE KEY UPDATE role = VALUES(role);
