// Simple cart helpers using localStorage

function loadCart() {
  try {
    return JSON.parse(localStorage.getItem('cart') || '[]');
  } catch (_) {
    return [];
  }
}

function saveCart(cart) {
  localStorage.setItem('cart', JSON.stringify(cart));
}

function calcSubtotal(cart) {
  return cart.reduce((sum, item) => sum + item.price * item.qty, 0);
}

function updateSubtotalDisplay() {
  const subtotalSpan = document.getElementById('menu-subtotal');
  if (!subtotalSpan) return;
  const cart = loadCart();
  subtotalSpan.textContent = calcSubtotal(cart).toFixed(2);
}

// Turn each .menu-item into an orderable item

function initMenuItems() {
  const cart = loadCart();
  const items = document.querySelectorAll('.menu-item[data-id][data-price]');

  items.forEach(el => {
    const id = el.dataset.id;
    const name =
      el.dataset.name ||
      (el.querySelector('.menu-name')
        ? el.querySelector('.menu-name').textContent.trim()
        : id);
    const price = Number(el.dataset.price);

    const priceBox = el.querySelector('.menu-price');
    if (!priceBox) return;

    // Ensure currency display
    const rawPriceText = priceBox.textContent.trim();
    if (!rawPriceText.startsWith('₱')) {
      priceBox.textContent = '₱' + rawPriceText;
    }

    // Create "in cart" text + Add button
    const info = document.createElement('div');
    info.style.fontSize = '0.8rem';
    info.style.marginTop = '0.25rem';

    const qtySpan = document.createElement('span');
    qtySpan.dataset.role = 'qty-display';

    const existing = cart.find(c => c.id === id);
    const currentQty = existing ? existing.qty : 0;
    qtySpan.textContent = currentQty ? `In cart: ${currentQty}` : 'Not in cart';

    const btn = document.createElement('button');
    btn.className = 'menu-add-btn';
    btn.textContent = 'Add';

    btn.addEventListener('click', () => {
      let c = loadCart();
      let item = c.find(x => x.id === id);
      if (!item) {
        item = { id, name, price, qty: 0 };
        c.push(item);
      }
      item.qty += 1;
      saveCart(c);
      qtySpan.textContent = `In cart: ${item.qty}`;
      updateSubtotalDisplay();
    });

    info.appendChild(qtySpan);
    info.appendChild(document.createTextNode(' '));
    info.appendChild(btn);

    priceBox.appendChild(info);
  });

  updateSubtotalDisplay();
}

function initCartButton() {
  const btn = document.getElementById('menu-cart-btn');
  if (!btn) return;
  btn.addEventListener('click', () => {
    window.location.href = '/order/cart';
  });
}

document.addEventListener('DOMContentLoaded', () => {
  initMenuItems();
  initCartButton();
});
