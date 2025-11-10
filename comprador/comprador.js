/* =========================================================
   History Keepers — comprador.js (Panel del Cliente)
   ========================================================= */

/**
 * Función para escapar HTML simple
 */
function escape(s = "") {
  return s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

/**
 * Carga y renderiza los pedidos del cliente (con datos mock)
 */
function loadMyOrders() {
  const container = document.getElementById("my-orders-list");
  if (!container) return;

  // En el futuro, llamarías a algo como:
  // const userId = "ID_DEL_USUARIO_LOGUEADO";
  // const response = await fetch(`/api/orders/user/${userId}`);
  // const orders = await response.json();

  // Datos de ejemplo (los mismos que en admin.js, pero filtrados)
  const mockMyOrders = [
    {
      _id: "order_1", orderNumber: "HK-12345",
      products: [{ name: "Jersey Retro 1998", qty: 1 }, { name: "Gorra Edición Especial", qty: 2 }],
      total: 7300, status: "Pagado", trackingNumber: ""
    },
    {
      _id: "order_3", orderNumber: "HK-12347",
      products: [{ name: "Tarjeta Rookie 1986", qty: 1 }],
      total: 4200, status: "Enviado", trackingNumber: "FEDEX-987654321"
    }
  ];

  if (mockMyOrders.length === 0) {
    container.innerHTML = `<p class="muted small">Aún no tienes pedidos.</p>`;
    return;
  }

  container.innerHTML = mockMyOrders.map(order => {
    // Genera el resumen de productos
    const productsSummary = order.products.map(p => `${p.qty}x ${escape(p.name)}`).join(", ");
    
    // Genera la info de rastreo si existe
    const trackingInfo = order.status === 'Enviado' && order.trackingNumber
      ? `<span>Guía: <strong>${escape(order.trackingNumber)}</strong></span>`
      : '';

    return `
      <div class="order-item">
        <div class="order-item__header">
          <h3>Pedido #${escape(order.orderNumber)}</h3>
          <span class="status-badge" data-status="${escape(order.status)}">
            ${escape(order.status)}
          </span>
        </div>
        <div class="order-item__details">
          <span>${productsSummary}</span><br>
          <span>Total: <strong>$${order.total.toLocaleString("es-MX")}</strong></span>
          ${trackingInfo}
        </div>
      </div>
    `;
  }).join("");
}


document.addEventListener("DOMContentLoaded", () => {
  // Actualiza el año del footer
  const yearSpan = document.getElementById("y");
  if (yearSpan) yearSpan.textContent = new Date().getFullYear();

  // Carga los pedidos del cliente
  loadMyOrders();
m});