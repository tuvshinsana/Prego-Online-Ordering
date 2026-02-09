const textEl = document.getElementById('confirm-text');
const detailsEl = document.getElementById('confirm-details');

function getOrderIdFromPath() {
  const parts = window.location.pathname.split('/').filter(Boolean);
  const maybeId = parts[parts.length - 1];
  if (maybeId && maybeId !== 'confirm') return maybeId;
  return null;
}

const orderId =
  getOrderIdFromPath() || localStorage.getItem('lastOrderId') || '';

function displayOrderId(id) {
  return (id || '').replace(/^ORD[-_]?/i, '');
}

if (!orderId) {
  textEl.textContent = 'No order information found.';
} else {
  textEl.textContent = `Your order ID is ${displayOrderId(orderId)}.`;
  fetch('/api/orders/' + encodeURIComponent(orderId))
    .then((res) => res.ok ? res.json() : Promise.reject())
    .then((order) => {
      const slot = order.slotId
        ? `${order.slotId}`
        : 'No slot saved';
      const list = document.createElement('ul');
      list.innerHTML = `
        <li><strong>Status:</strong> ${order.status}</li>
        <li><strong>Subtotal:</strong> ₱${Number(order.subtotal || 0).toFixed(2)}</li>
        <li><strong>Pickup slot:</strong> ${slot}</li>
        <li><strong>Created:</strong> ${order.createdAt}</li>
      `;
      detailsEl.appendChild(list);
    })
    .catch(() => {
      detailsEl.textContent = 'Unable to load order details right now.';
    });
}

localStorage.removeItem('lastOrderId');
