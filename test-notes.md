Manual Test Notes (Criterion B)
==============================

Setup
- Start server: `npm install && npm start`
- Staff login: admin / admin123 (default seed)

Student flow
1) Place order end-to-end
   - Menu: add items, proceed to cart.
   - Slot: choose date/time; ensure list loads.
   - ID: enter 6-digit ID + name.
   - Review: items/subtotal/slot/ID visible; click Place order → lands on confirm page with order id.
2) My Orders listing
   - Go to /orders; with studentId set, see recent order.
3) Slot full validation
   - Create a slot with low max_orders; place orders until capacity reached; next attempt returns 409/“Pickup slot is full”.
4) Open order block
   - With an existing PENDING/PAID/PREPARING/READY order, another POST /api/orders for same studentId returns 409/“You already have an active order in progress”.

Slots
- GET /api/slots returns future slots with remaining > 0, ordered by date/time.
- Capacity check enforced again on POST /api/orders.

Staff/Vendor
1) Auth protection
   - /staff/orders without session → redirected/401.
   - Login succeeds with admin/admin123.
2) Status transitions
   - Allowed steps only (PENDING→PAID→PREPARING→READY→COMPLETED; CANCELED allowed from non-terminal).
   - “Mark as done” on READY sets COMPLETED and disables further action.
3) Order detail
   - /staff/orders/:id shows items, student name/ID, slot date/time.

Auto-cancel
- Create PENDING order with expires_at in past → job cancels it within interval; canceled no longer counts toward capacity.

Error handling
- Bad studentId (<6 digits) rejected on ID page.
- POST /api/orders with missing items or slot returns 400.

Screenshots to capture
- Student review page before placing order.
- Confirm page after order creation.
- My Orders page showing entry.
- Staff orders table with READY order and Mark as done.
- Staff detail view showing items.
- Evidence of auto-cancel (log or DB query showing status updated to CANCELED).
