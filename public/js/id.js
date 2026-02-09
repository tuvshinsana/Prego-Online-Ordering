(() => {
  const form = document.getElementById("id-form");
  const idInput = document.getElementById("student-id");
  const nameInput = document.getElementById("student-name");

  if (!form || !idInput || !nameInput) return;

  // Prefill with any saved info
  idInput.value = localStorage.getItem("studentId") || "";
  nameInput.value = localStorage.getItem("studentName") || "";

  form.addEventListener("submit", (e) => {
    e.preventDefault();

    const studentId = idInput.value.trim();
    const studentName = nameInput.value.trim();

    // Only numbers, exactly 6 digits
    if (!/^[0-9]{6}$/.test(studentId)) {
      alert("Please enter a valid student ID: exactly 6 digits.");
      idInput.focus();
      return;
    }

    if (!studentName) {
      alert("Please enter your name.");
      nameInput.focus();
      return;
    }
    if (studentName.length > 80) {
      alert("Name is too long (max 80 characters).");
      nameInput.focus();
      return;
    }

    localStorage.setItem("studentId", studentId);
    localStorage.setItem("studentName", studentName);

    window.location.href = "/order/review";
  });
})();
