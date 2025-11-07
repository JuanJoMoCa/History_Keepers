/* =========================================================
   History Keepers — comprador.js (Autocontenido)
   ========================================================= */

/*
  Esta página no requiere la lógica de autenticación de app.js
  ya que el estado (botones de "Mi Perfil" y "Cerrar Sesión")
  está fijo en el HTML.
*/

// La única lógica requerida es actualizar el año en el footer.
document.addEventListener("DOMContentLoaded", () => {
  const yearSpan = document.getElementById('y');
  if (yearSpan) {
    yearSpan.textContent = new Date().getFullYear();
  }
});