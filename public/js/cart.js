function loadCart() {
  return JSON.parse(localStorage.getItem('cart') || '[]');
}

function saveCart(cart) {
  localStorage.setItem('cart', JSON.stringify(cart));
}

function renderCart() {
  const cart = loadCart();
  const tbody = document.getElementById('cart-body');
  const subtotalSpan = document.getElementById('cart-subtotal');

  tbody.innerHTML = '';

  let subtotal = 0;

  if (!cart.length) {
    const row = document.createElement('tr');
    const cell = document.createElement('td');
    cell.colSpan = 5;
    cell.textContent = 'Your cart is empty.';
    row.appendChild(cell);
    tbody.appendChild(row);
    if (subtotalSpan) {
      subtotalSpan.textContent = '0.00';
    }
    return;
  }

  cart.forEach((item, index) => {
    const row = document.createElement('tr');

    const nameTd = document.createElement('td');
    nameTd.textContent = item.name;

    const qtyTd = document.createElement('td');
    const qtyInput = document.createElement('input');
    qtyInput.type = 'number';
    qtyInput.min = '1';
    qtyInput.value = item.qty;
    qtyInput.onchange = () => {
      const newQty = parseInt(qtyInput.value, 10) || 1;
      cart[index].qty = newQty;
      saveCart(cart);
      renderCart();
    };
    qtyTd.appendChild(qtyInput);

    const priceTd = document.createElement('td');
    priceTd.textContent = `₱${item.price.toFixed(2)}`;

    const total = item.price * item.qty;
    subtotal += total;

    const totalTd = document.createElement('td');
    totalTd.textContent = `₱${total.toFixed(2)}`;

    const removeTd = document.createElement('td');
    const removeBtn = document.createElement('button');
    removeBtn.textContent = 'Remove';
    removeBtn.onclick = () => {
      cart.splice(index, 1);
      saveCart(cart);
      renderCart();
    };
    removeTd.appendChild(removeBtn);

    row.appendChild(nameTd);
    row.appendChild(qtyTd);
    row.appendChild(priceTd);
    row.appendChild(totalTd);
    row.appendChild(removeTd);

    tbody.appendChild(row);
  });

  if (subtotalSpan) {
    subtotalSpan.textContent = subtotal.toFixed(2);
  }
}

renderCart();

document.getElementById("cart-slot-btn")?.addEventListener("click", () => {
  // Require cart not empty before going to slot selection
  const cart = JSON.parse(localStorage.getItem("cart") || "[]");
  if (!Array.isArray(cart) || cart.length === 0) {
    alert("Your cart is empty.");
    return;
  }
  window.location.href = "/order/slot";
});
