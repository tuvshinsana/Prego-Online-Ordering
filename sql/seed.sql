-- Optional seed data for local testing

INSERT INTO menu (item_id, item_name, price, category) VALUES
  ('PA3', 'Meat Lasagna', 225, 'Pasta'),
  ('PI2', 'Pepperoni', 140, 'Pizza'),
  ('DR2', 'Water', 35, 'Drink')
ON DUPLICATE KEY UPDATE price = VALUES(price);

INSERT INTO pickup_slots (slot_id, date, start_time, end_time, max_orders) VALUES
  ('S4', DATE_ADD(CURDATE(), INTERVAL 1 DAY), '14:00:00', '14:30:00', 40),
  ('S5', DATE_ADD(CURDATE(), INTERVAL 1 DAY), '14:30:00', '15:00:00', 40)
ON DUPLICATE KEY UPDATE max_orders = VALUES(max_orders);
