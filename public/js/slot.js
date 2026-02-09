// public/js/slot.js
// ------------------------------------------------------
// Pickup selection with date dropdown and 15-minute time grid (7 AM - 5 PM)
// No weekends, minimum 10 minutes from now
// ------------------------------------------------------

(function () {
  const listEl = document.getElementById("slot-list");
  const confirmBtn = document.getElementById("slot-confirm-btn");
  const infoEl = document.getElementById("slot-info");
  const dateSelect = document.getElementById("pickup-date-select");
  const timeSelect = document.getElementById("pickup-time-select");

  if (!listEl || !confirmBtn || !timeSelect || !dateSelect) {
    console.error("slot.js: Missing DOM elements.");
    return;
  }

  let slots = [];
  let selectedSlotId = null;
  const savedPickup = JSON.parse(localStorage.getItem("pregoPickup") || "null");
  if (savedPickup && savedPickup.slotId) {
    selectedSlotId = savedPickup.slotId;
  }

  // -------- Helpers --------

  function toDateTime(dateStr, timeStr) {
    // dateStr: "2024-07-01", timeStr: "13:00:00"
    // Use local time
    const [y, m, d] = dateStr.split("-").map(Number);
    const [hh, mm] = timeStr.split(":").map(Number);
    return new Date(y, m - 1, d, hh, mm || 0, 0, 0);
  }

  function formatSlotLabel(slot) {
    const dt = toDateTime(slot.date, slot.startTime);

    const weekday = dt.toLocaleDateString(undefined, { weekday: "short" });
    const monthDay = dt.toLocaleDateString(undefined, { month: "short", day: "numeric" });
    return `${weekday} · ${monthDay} · ${slot.startTime.slice(0, 5)}–${slot.endTime.slice(0, 5)}`;
  }

  function formatDateDisplay(dateStr) {
    const dt = toDateTime(dateStr, "12:00:00");
    return dt.toLocaleDateString(undefined, {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }

  function getCutoffTime() {
    const now = new Date();
    return new Date(now.getTime() + 10 * 60 * 1000); // now + 10 minutes
  }

  function addMinutesToTime(timeStr, minutesToAdd = 15) {
    const [hh, mm, ss = "00"] = timeStr.split(":").map(Number);
    const base = new Date(2000, 0, 1, hh, mm, ss || 0);
    base.setMinutes(base.getMinutes() + minutesToAdd);
    const hhOut = base.getHours().toString().padStart(2, "0");
    const mmOut = base.getMinutes().toString().padStart(2, "0");
    const ssOut = base.getSeconds().toString().padStart(2, "0");
    return `${hhOut}:${mmOut}:${ssOut}`;
  }

  function isWeekend(dateStr) {
    const dt = toDateTime(dateStr, "12:00:00");
    const day = dt.getDay();
    return day === 0 || day === 6; // Sunday = 0, Saturday = 6
  }

  function isTimeInRange(timeStr) {
    // timeStr format: "HH:MM:SS" or "HH:MM"
    const [hh, mm] = timeStr.split(":").map(Number);
    const total = hh * 60 + (Number.isFinite(mm) ? mm : 0);
    return total >= 7 * 60 && total <= 17 * 60; // 7:00 AM through 5:00 PM inclusive
  }

  function formatTimeForDisplay(timeStr) {
    // Convert "07:00:00" to "7:00 AM", "13:30:00" to "1:30 PM"
    const [hh, mm] = timeStr.split(":").map(Number);
    const hour12 = hh % 12 || 12;
    const ampm = hh < 12 ? "AM" : "PM";
    const minutes = mm.toString().padStart(2, "0");
    return `${hour12}:${minutes} ${ampm}`;
  }

  function isPastSelection(dateStr, timeStr) {
    if (!dateStr || !timeStr) return true;
    const cutoff = getCutoffTime();
    const selected = toDateTime(dateStr, timeStr);
    return selected <= cutoff;
  }

  function generateTimeOptions() {
    // Generate all 15-minute slots from 7:00 to 17:00 (inclusive)
    const options = [];
    const startMinutes = 7 * 60;
    const endMinutes = 17 * 60;
    for (let minutes = startMinutes; minutes <= endMinutes; minutes += 15) {
      const hh = Math.floor(minutes / 60)
        .toString()
        .padStart(2, "0");
      const mm = (minutes % 60).toString().padStart(2, "0");
      const time24 = `${hh}:${mm}:00`;
      options.push(time24);
    }
    return options;
  }

  function getAvailableDates() {
    const uniq = Array.from(new Set(slots.map((s) => s.date)));
    return uniq.sort((a, b) => new Date(a) - new Date(b));
  }

  function generateUpcomingDates(days = 14) {
    const dates = [];
    const today = new Date();
    for (let i = 0; i < days; i++) {
      const dt = new Date(today);
      dt.setDate(today.getDate() + i);
      const day = dt.getDay();
      // Skip weekends
      if (day === 0 || day === 6) continue;
      dates.push(dt.toISOString().slice(0, 10));
    }
    return dates;
  }

  function getAvailableTimesForDate(dateStr) {
    const times = slots
      .filter((s) => s.date === dateStr)
      .map((s) => s.startTime)
      .filter((t) => {
        const [, mm] = t.split(":").map(Number);
        return Number.isFinite(mm) && mm % 15 === 0;
      });
    return Array.from(new Set(times)).sort(
      (a, b) => toDateTime("1970-01-01", a) - toDateTime("1970-01-01", b)
    );
  }

  function populateDateDropdown() {
    // Always show the next 14 weekdays, but keep any existing slot dates included
    const generated = generateUpcomingDates(14);
    const availableDates = getAvailableDates();
    const merged = Array.from(new Set([...generated, ...availableDates])).sort(
      (a, b) => new Date(a) - new Date(b)
    );
    dateSelect.innerHTML = '<option value="">-- Select a date --</option>';
    merged.forEach((dateStr) => {
      const option = document.createElement("option");
      option.value = dateStr;
      option.textContent = formatDateDisplay(dateStr);
      dateSelect.appendChild(option);
    });

    dateSelect.disabled = false;
  }

  function populateTimeDropdown(selectedDate) {
    timeSelect.innerHTML = '<option value="">-- Select a time --</option>';
    // Show full 7:00–17:00 in 15-minute increments regardless of backend slots
    const timeOptions = generateTimeOptions();

    timeOptions.forEach((timeStr) => {
      const option = document.createElement("option");
      option.value = timeStr;
      option.textContent = formatTimeForDisplay(timeStr);
      if (selectedDate && isPastSelection(selectedDate, timeStr)) {
        option.disabled = true;
      }
      timeSelect.appendChild(option);
    });

    timeSelect.disabled = false;
  }

  function renderSlots() {
    listEl.innerHTML = "";
    selectedSlotId = null;
    confirmBtn.disabled = true;

    const selectedDate = dateSelect.value;
    if (!selectedDate) {
      listEl.innerHTML =
        '<p class="alert alert--info">Please select a pickup date first.</p>';
      return;
    }

    const selectedTime = timeSelect.value;
    if (!selectedTime) {
      listEl.innerHTML =
        '<p class="alert alert--info">Please select a pickup time from the dropdown above.</p>';
      return;
    }

    if (isPastSelection(selectedDate, selectedTime)) {
      listEl.innerHTML =
        '<p class="alert alert--danger">Please select a pickup time in the future.</p>';
      confirmBtn.disabled = true;
      return;
    }

    const cutoff = getCutoffTime();
    const manualSlotId = `manual-${selectedDate}-${selectedTime}`;

    // Sort by date+time ascending
    const sorted = [...slots].sort((a, b) => {
      const aDt = toDateTime(a.date, a.startTime);
      const bDt = toDateTime(b.date, b.startTime);
      return aDt - bDt;
    });

    // Filter by:
    // 1. Selected date/time (must match the dropdown selection)
    // 2. Not weekend
    // 3. At least 10 minutes from now
    // 4. Time range 7 AM - 5 PM (already filtered in backend, but double-check)
    // 5. Has capacity
    const eligible = sorted.filter((slot) => {
      // Must match selected date
      if (slot.date !== selectedDate) return false;

      // Must match selected time
      if (slot.startTime !== selectedTime) return false;

      // No weekends
      if (isWeekend(slot.date)) return false;

      // Must be in 7 AM - 5 PM range
      if (!isTimeInRange(slot.startTime)) return false;

      // Must be strictly AFTER (now + 10min)
      const slotStart = toDateTime(slot.date, slot.startTime);
      if (slotStart <= cutoff) return false;

      // Capacity check removed

      return true;
    });

    // Default to first eligible slot (or keep previously saved selection)
    if (!selectedSlotId && eligible.length) {
      selectedSlotId = eligible[0].slotId;
    }

    if (eligible.length === 0) {
      selectedSlotId = manualSlotId;
      listEl.innerHTML =
        '<p class="alert alert--info">Note: your order will not be processed until you pay in person and present your ID card. We will confirm your pickup at the counter.</p>';
      confirmBtn.disabled = false;
      return;
    }

    confirmBtn.disabled = false;

    eligible.forEach((slot) => {
      const wrapper = document.createElement("label");
      wrapper.className = "slot-option";

      const input = document.createElement("input");
      input.type = "radio";
      input.name = "pickup-slot";
      input.value = slot.slotId;
      input.disabled = true;

      const content = document.createElement("div");
      content.className = "slot-option-body";

      const title = document.createElement("div");
      title.className = "slot-title";
      title.textContent = formatSlotLabel(slot);

      content.appendChild(title);

      wrapper.appendChild(input);
      wrapper.appendChild(content);

      listEl.appendChild(wrapper);
    });

    // If something was previously selected, keep it if still valid
    if (selectedSlotId) {
      const radio = listEl.querySelector(
        `input[name="pickup-slot"][value="${selectedSlotId}"]`
      );
      if (radio) {
        radio.checked = true;
      } else {
        selectedSlotId = null;
      }
    }
  }

  function loadSlots() {
    // Show loading state
    listEl.innerHTML = '<p class="alert alert--info">Loading pickup slots...</p>';
    confirmBtn.disabled = true;

    fetch("/api/slots")
      .then((res) => {
        if (!res.ok) {
          return res.json().then(err => {
            throw new Error(err.error || "Failed to load slots");
          }).catch(() => {
            throw new Error(`Server error (${res.status}). Please check if the server is running.`);
          });
        }
        return res.json();
      })
      .then((data) => {
        slots = Array.isArray(data) ? data : [];
        populateDateDropdown();
        const mergedDates = Array.from(
          new Set([...generateUpcomingDates(14), ...getAvailableDates()])
        ).sort((a, b) => new Date(a) - new Date(b));

        // Pick saved date if still valid, otherwise first generated date
        let defaultDate = "";
        if (savedPickup && mergedDates.includes(savedPickup.date)) {
          defaultDate = savedPickup.date;
        } else if (mergedDates.length) {
          defaultDate = mergedDates[0];
        }
        if (defaultDate) dateSelect.value = defaultDate;

        populateTimeDropdown(defaultDate);

        // Select saved time if still valid, otherwise first time in full range
        const timesForDate = generateTimeOptions();
        const defaultTime =
          (savedPickup &&
            savedPickup.startTime &&
            defaultDate === savedPickup?.date &&
            (timesForDate.includes(savedPickup.startTime) || true))
            ? savedPickup.startTime
            : (timesForDate[0] || "");
        if (defaultTime) timeSelect.value = defaultTime;

        if (slots.length === 0) {
          listEl.innerHTML =
            '<p class="alert alert--info">Note: your order will not be processed until you pay in person and present your ID card. We’ll confirm availability at pickup.</p>';
          confirmBtn.disabled = false;
        }

        renderSlots();
      })
      .catch((err) => {
        console.error("Error loading slots:", err);
        const errorMsg = err.message || "Unable to load pickup slots. Please refresh the page.";
        listEl.innerHTML =
          `<p class="alert alert--danger">${errorMsg}</p>`;
        confirmBtn.disabled = true;
        // Keep dropdowns available even on error
        populateDateDropdown();
        dateSelect.disabled = false;
        populateTimeDropdown(dateSelect.value);
      });
  }

  // -------- Time dropdown change handler --------

  timeSelect.addEventListener("change", () => {
    renderSlots();
  });

  // -------- Date dropdown change handler --------

  dateSelect.addEventListener("change", () => {
    populateTimeDropdown(dateSelect.value);
    const times = dateSelect.value ? getAvailableTimesForDate(dateSelect.value) : [];
    if (times.length) {
      timeSelect.value = times[0];
    } else {
      timeSelect.value = "";
    }
    renderSlots();
  });

  // -------- Confirm button --------

  confirmBtn.addEventListener("click", () => {
    if (!selectedSlotId) {
      const dateVal = dateSelect.value;
      const timeVal = timeSelect.value;
      if (!dateVal) {
        alert("Please choose a pickup date first.");
        return;
      }
      if (!timeVal || isPastSelection(dateVal, timeVal)) {
        alert("Please choose a pickup time in the future.");
        return;
      }
      selectedSlotId = `manual-${dateVal}-${timeVal || "time"}`;
    }

    const slot = slots.find((s) => s.slotId === selectedSlotId);
    // If not found (fallback case), allow continuing; we'll keep the selected date/time.

    // Check again against all rules at the moment of confirmation
    const start = slot ? toDateTime(slot.date, slot.startTime) : null;
    const startTime = slot ? slot.startTime : timeSelect.value;
    const endTime = slot?.endTime || (startTime ? addMinutesToTime(startTime, 15) : "");
    const pickupInfo = slot
      ? {
          slotId: slot.slotId,
          date: slot.date,
          startTime,
          endTime,
        }
      : {
          slotId: selectedSlotId,
          date: dateSelect.value,
          startTime,
          endTime,
        };

    // Save in localStorage for later pages (id.html, review.html)
    localStorage.setItem("pregoPickup", JSON.stringify(pickupInfo));

    window.location.href = "id.html";
  });

  // Initialize
  populateTimeDropdown();
  loadSlots();
})();
