(() => {
  const tbody = document.getElementById("vendor-orders-body");
  const emptyEl = document.getElementById("vendor-empty");
  const errEl = document.getElementById("vendor-error");

  if (!tbody) return;

  function showError(msg) {
    if (!errEl) return;
    errEl.style.display = "block";
    errEl.textContent = msg;
  }

  function clearError() {
    if (!errEl) return;
    errEl.style.display = "none";
    errEl.textContent = "";
  }

  function formatDate(dt) {
    if (!dt) return "";
    const d = new Date(dt);
    return d.toLocaleString([], { dateStyle: "medium", timeStyle: "short" });
  }

  function formatSlot(o) {
    if (o.slotDate && o.slotStart) {
      const dateStr = new Date(o.slotDate).toLocaleDateString([], {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
      const timeStr = o.slotStart.slice(0, 5);
      return `${dateStr} ${timeStr}`;
    }
    return o.slotId || "";
  }

  function renderRow(o) {
    const canMarkDone = o.status === "READY";
    const displayId = (o.orderId || "").replace(/^ORD[-_]?/i, "");
    return `
      <tr data-id="${o.orderId}">
        <td>${displayId}</td>
        <td>${o.studentName || o.studentId || ""}</td>
        <td>${formatSlot(o)}</td>
        <td class="status">${o.status}</td>
        <td>₱${Number(o.subtotal || 0).toFixed(2)}</td>
        <td>${formatDate(o.createdAt)}</td>
        <td>
          <button class="mark-done" ${canMarkDone ? "" : "disabled"}>Mark as done</button>
        </td>
      </tr>
    `;
  }

  function attachActions() {
    tbody.querySelectorAll(".mark-done").forEach((btn) => {
      btn.addEventListener("click", async (e) => {
        const tr = e.target.closest("tr");
        const id = tr.dataset.id;
        e.target.disabled = true;
        clearError();
        try {
          const res = await fetch(`/api/staff/orders/${encodeURIComponent(id)}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ newStatus: "COMPLETED" }),
          });
          if (!res.ok) {
            const body = await res.json().catch(() => ({}));
            throw new Error(body.error || "Failed to update");
          }
          tr.querySelector(".status").textContent = "COMPLETED";
        } catch (err) {
          console.error(err);
          showError(err.message);
          e.target.disabled = false;
        }
      });
    });
  }

  function fetchOrders() {
    clearError();
    fetch("/api/staff/orders")
      .then((res) => {
        if (res.status === 401) {
          window.location.href = "/staff/login";
          return [];
        }
        if (!res.ok) throw new Error("Failed to load orders");
        return res.json();
      })
      .then((orders) => {
        tbody.innerHTML = "";
        if (!orders || orders.length === 0) {
          emptyEl.style.display = "block";
          return;
        }
        emptyEl.style.display = "none";
        tbody.innerHTML = orders.map(renderRow).join("");
        attachActions();
      })
      .catch((err) => {
        console.error(err);
        showError(err.message || "Unable to load orders");
        emptyEl.style.display = "block";
      });
  }

  fetchOrders();
})();
