(() => {
  const loginForm = document.getElementById("staff-login-form");
  const logoutBtn = document.getElementById("staff-logout-btn");

  // --- Login page ---
  if (loginForm) {
    const userInput = document.getElementById("staff-username");
    const passInput = document.getElementById("staff-password");
    const errEl = document.getElementById("staff-login-error");

    loginForm.addEventListener("submit", (e) => {
      e.preventDefault();
      errEl.textContent = "";

      fetch("/api/staff/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: userInput.value.trim(),
          password: passInput.value,
        }),
      })
        .then((res) => {
          if (!res.ok) throw res;
          return res.json();
        })
        .then(() => {
          window.location.href = "/staff/orders";
        })
        .catch(async (res) => {
          let msg = "Login failed";
          try {
            const body = await res.json();
            msg = body.error || msg;
          } catch (_) {
            /* ignore */
          }
          errEl.textContent = msg;
        });
    });
    return;
  }

  // --- Dashboard page ---
  if (logoutBtn) {
    logoutBtn.addEventListener("click", () => {
      fetch("/api/staff/logout", { method: "POST" }).finally(() => {
        window.location.href = "/staff/login";
      });
    });
  }

  const ordersBody = document.getElementById("staff-orders-body");
  const emptyEl = document.getElementById("staff-orders-empty");
  const detailEl = document.getElementById("staff-order-detail");
  const filterStatus = document.getElementById("filter-status");
  const filterDate = document.getElementById("filter-date");
  const filterSlot = document.getElementById("filter-slot");
  const filterStudent = document.getElementById("filter-student");
  const filterApplyBtn = document.getElementById("filter-apply-btn");

  if (!ordersBody) return;

  const nextStatusMap = {
    PENDING: "PAID",
    PAID: "PREPARING",
    PREPARING: "READY",
    READY: "COMPLETED",
  };

  function displayOrderId(id) {
    return (id || "").replace(/^ORD[-_]?/i, "");
  }

  function handleUnauthorized(status) {
    if (status === 401) window.location.href = "/staff/login";
  }

  function formatDate(dt) {
    if (!dt) return "";
    const d = new Date(dt);
    return d.toLocaleString([], { dateStyle: "medium", timeStyle: "short" });
  }

  function formatSlot(order) {
    if (order.slotDate && order.slotStart) {
      const d = new Date(order.slotDate);
      const dateStr = d.toLocaleDateString([], {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
      const timeStr = (order.slotStart || "").slice(0, 5);
      return `${dateStr} ${timeStr}`;
    }
    return order.slotId || "";
  }

  function fetchOrders() {
    const params = new URLSearchParams();
    if (filterStatus.value) params.append("status", filterStatus.value);
    if (filterDate.value) params.append("date", filterDate.value);
    if (filterSlot.value) params.append("slot", filterSlot.value);
    if (filterStudent.value) params.append("studentId", filterStudent.value);

    fetch("/api/staff/orders?" + params.toString())
      .then((res) => {
        if (!res.ok) {
          handleUnauthorized(res.status);
          throw new Error("Failed to load");
        }
        return res.json();
      })
      .then((orders) => {
        ordersBody.innerHTML = "";
        if (!orders || orders.length === 0) {
          emptyEl.style.display = "block";
          return;
        }
        emptyEl.style.display = "none";

        orders.forEach((order) => {
          const tr = document.createElement("tr");
          tr.dataset.orderId = order.orderId;
          tr.innerHTML = `
            <td>${displayOrderId(order.orderId)}</td>
            <td>${order.studentName || order.studentId || ""}</td>
            <td>${formatSlot(order)}</td>
            <td>${order.status}</td>
            <td>₱${Number(order.subtotal || 0).toFixed(2)}</td>
            <td>${formatDate(order.createdAt)}</td>
            <td></td>
          `;

          const actionTd = tr.lastElementChild;
          const next = nextStatusMap[order.status];
          if (next) {
            const btn = document.createElement("button");
            btn.textContent = `Mark ${next}`;
            btn.addEventListener("click", () => updateStatus(order.orderId, next));
            actionTd.appendChild(btn);
          } else {
            actionTd.textContent = "-";
          }

          tr.addEventListener("click", () => loadDetail(order.orderId));
          ordersBody.appendChild(tr);
        });
      })
      .catch((err) => {
        console.error(err);
        emptyEl.style.display = "block";
        emptyEl.textContent = "Could not load orders.";
      });
  }

  function updateStatus(orderId, newStatus) {
    fetch("/api/staff/orders/" + encodeURIComponent(orderId), {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ newStatus }),
    })
      .then((res) => {
        if (!res.ok) {
          handleUnauthorized(res.status);
          return res.json().then((body) => {
            throw new Error(body.error || "Update failed");
          });
        }
        return res.json();
      })
      .then(() => fetchOrders())
      .catch((err) => alert(err.message));
  }

  function loadDetail(orderId) {
    detailEl.textContent = "Loading...";
    fetch("/api/staff/orders/" + encodeURIComponent(orderId))
      .then((res) => {
        if (!res.ok) {
          handleUnauthorized(res.status);
          throw new Error("Failed to load");
        }
        return res.json();
      })
      .then((order) => {
        const list = document.createElement("div");
        list.innerHTML = `
          <p><strong>Order:</strong> ${displayOrderId(order.orderId)}</p>
          <p><strong>Student:</strong> ${order.studentName || order.studentId || ""}</p>
          <p><strong>Status:</strong> ${order.status}</p>
          <p><strong>Subtotal:</strong> ₱${Number(order.subtotal || 0).toFixed(2)}</p>
          <p><strong>Slot:</strong> ${formatSlot(order)}</p>
          <h3>Items</h3>
        `;
        const ul = document.createElement("ul");
        (order.items || []).forEach((it) => {
          const li = document.createElement("li");
          li.textContent = `${it.qty} × ${it.name} — ₱${Number(
            it.lineTotal || 0
          ).toFixed(2)}`;
          ul.appendChild(li);
        });
        list.appendChild(ul);
        detailEl.innerHTML = "";
        detailEl.appendChild(list);
      })
      .catch((err) => {
        console.error(err);
        detailEl.textContent = "Unable to load order detail.";
      });
  }

  if (filterApplyBtn) {
    filterApplyBtn.addEventListener("click", (e) => {
      e.preventDefault();
      fetchOrders();
    });
  }

  fetchOrders();
})();
