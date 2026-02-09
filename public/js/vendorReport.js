(() => {
  const chartEl = document.getElementById("orders-chart");
  const tableBody = document.getElementById("report-table-body");
  const errEl = document.getElementById("report-error");
  const cardOrders = document.getElementById("card-orders");
  const cardRevenue = document.getElementById("card-revenue");
  const cardAvg = document.getElementById("card-avg");

  if (!chartEl) return;

  let chart;

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

  function formatCurrency(n) {
    const num = Number(n || 0);
    return "₱" + num.toFixed(2);
  }

  function updateCards(rows) {
    const totalOrders = rows.reduce((sum, r) => sum + Number(r.orders || 0), 0);
    const totalRevenue = rows.reduce((sum, r) => sum + Number(r.revenue || 0), 0);
    const avg = rows.length ? totalOrders / rows.length : 0;
    if (cardOrders) cardOrders.textContent = totalOrders;
    if (cardRevenue) cardRevenue.textContent = formatCurrency(totalRevenue);
    if (cardAvg) cardAvg.textContent = avg.toFixed(1);
  }

  function renderTable(rows) {
    if (!tableBody) return;
    tableBody.innerHTML = rows
      .map(
        (r) => `
        <tr>
          <td>${r.day}</td>
          <td>${r.orders}</td>
          <td>${formatCurrency(r.revenue)}</td>
        </tr>`
      )
      .join("");
  }

  function renderChart(rows) {
    if (!chartEl) return;
    const labels = rows.map((r) => r.day);
    const dataOrders = rows.map((r) => Number(r.orders || 0));
    const dataRevenue = rows.map((r) => Number(r.revenue || 0));

    if (chart) chart.destroy();
    chart = new Chart(chartEl, {
      type: "line",
      data: {
        labels,
        datasets: [
          {
            label: "Orders",
            data: dataOrders,
            borderColor: "#2a7b4b",
            backgroundColor: "rgba(42, 123, 75, 0.15)",
            tension: 0.25,
            yAxisID: "y",
          },
          {
            label: "Revenue",
            data: dataRevenue,
            borderColor: "#4b5bff",
            backgroundColor: "rgba(75, 91, 255, 0.12)",
            tension: 0.25,
            yAxisID: "y1",
          },
        ],
      },
      options: {
        responsive: true,
        scales: {
          y: {
            title: { display: true, text: "Orders" },
            beginAtZero: true,
            grid: { display: false },
          },
          y1: {
            title: { display: true, text: "Revenue" },
            beginAtZero: true,
            position: "right",
            grid: { drawOnChartArea: false },
          },
        },
        plugins: {
          legend: { display: true },
          tooltip: {
            callbacks: {
              label: (ctx) =>
                ctx.dataset.label === "Revenue"
                  ? `Revenue: ${formatCurrency(ctx.parsed.y)}`
                  : `Orders: ${ctx.parsed.y}`,
            },
          },
        },
      },
    });
  }

  function fetchData() {
    clearError();
    fetch("/api/staff/analytics/weekly")
      .then((res) => {
        if (res.status === 401) {
          window.location.href = "/staff/login";
          return [];
        }
        if (!res.ok) throw new Error("Failed to load analytics");
        return res.json();
      })
      .then((rows) => {
        const sorted = (rows || []).sort((a, b) => new Date(a.day) - new Date(b.day));
        updateCards(sorted);
        renderTable(sorted);
        renderChart(sorted);
      })
      .catch((err) => {
        console.error(err);
        showError(err.message || "Unable to load report");
      });
  }

  fetchData();
})();
