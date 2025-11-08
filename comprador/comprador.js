/* =========================================================
   History Keepers — comprador.js (Autocontenido)
   ========================================================= */

// Solo actualiza el año del footer.
document.addEventListener("DOMContentLoaded", () => {
  const yearSpan = document.getElementById("y");
  if (yearSpan) yearSpan.textContent = new Date().getFullYear();
});
