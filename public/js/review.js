function loadCart() {
  return JSON.parse(localStorage.getItem('cart') || '[]');
}

const cartBody = document.getElementById('review-cart-body');
const subtotalSpan = document.getElementById('review-subtotal');
const slotP = document.getElementById('review-slot');
const studentP = document.getElementById('review-student');
const placeBtn = document.getElementById('place-order-btn');

const cart = loadCart();
const pickupInfo = JSON.parse(localStorage.getItem('pregoPickup') || 'null');
const studentId = localStorage.getItem('studentId');
const studentName = localStorage.getItem('studentName') || '';

// basic checks
if (!cart.length) {
  alert('Cart is empty. Going back to menu.');
  window.location.href = '/order/menu';
}

if (!pickupInfo || !pickupInfo.slotId) {
  alert('No pickup slot selected. Going back.');
  window.location.href = '/order/slot';
}

if (!studentId) {
  alert('No student ID entered. Going back.');
  window.location.href = '/order/id';
}

// render cart
let subtotal = 0;
cartBody.innerHTML = '';

cart.forEach(item => {
  const row = document.createElement('tr');

  const nameTd = document.createElement('td');
  nameTd.textContent = item.name;

  const qtyTd = document.createElement('td');
  qtyTd.textContent = item.qty;

  const priceTd = document.createElement('td');
  priceTd.textContent = `₱${item.price.toFixed(2)}`;

  const total = item.price * item.qty;
  subtotal += total;

  const totalTd = document.createElement('td');
  totalTd.textContent = `₱${total.toFixed(2)}`;

  row.appendChild(nameTd);
  row.appendChild(qtyTd);
  row.appendChild(priceTd);
  row.appendChild(totalTd);

  cartBody.appendChild(row);
});

subtotalSpan.textContent = subtotal.toFixed(2);

// show student + slot
studentP.textContent = `${studentName ? studentName + ' – ' : ''}${studentId}`;

slotP.textContent = `${pickupInfo.date} ${pickupInfo.startTime?.slice(0,5)}–${pickupInfo.endTime?.slice(0,5)}`;

// place order
placeBtn.addEventListener('click', () => {
  const payload = {
    studentId,
    studentName,
    slotId: pickupInfo.slotId,
    pickupDate: pickupInfo.date,
    pickupStartTime: pickupInfo.startTime,
    pickupEndTime: pickupInfo.endTime,
    items: cart.map((c) => ({
      itemId: c.id,
      name: c.name,
      qty: c.qty,
      price: c.price,
    })),
    subtotal,
  };

  fetch('/api/orders', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  })
    .then(res => {
      if (!res.ok) {
        return res.json().then(body => {
          throw new Error(body.error || body.message || 'Order failed');
        });
      }
      return res.json();
    })
    .then(data => {
      localStorage.setItem('lastOrderId', data.orderId);
      localStorage.removeItem('cart');
      localStorage.removeItem('pregoPickup');
      localStorage.removeItem('studentId');
      localStorage.removeItem('studentName');
      window.location.href = `/order/confirm/${data.orderId}`;
    })
    .catch(err => {
      console.error(err);
      alert('Error placing order: ' + err.message);
    });
});
