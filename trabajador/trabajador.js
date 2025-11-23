/* =========================================================
   History Keepers — trabajador.js (Lógica POS)
   ========================================================= */

// Estado del POS
const state = {
  products: [],     // Catálogo completo
  cart: [],         // Items en el ticket actual
  currentPaymentMethod: null,
  customer: null    // Datos del cliente verificado
};

// Utils
const $ = (s) => document.querySelector(s);
const fmtMoney = (n) => "$" + (Number(n || 0)).toLocaleString("es-MX");

function toast(msg, type = "success") {
  const t = $("#toast-notification");
  t.textContent = msg;
  t.className = `toast ${type} show`;
  setTimeout(() => t.className = "toast", 3000);
}

// --- INICIALIZACIÓN ---
document.addEventListener("DOMContentLoaded", async () => {
  await loadCatalog();
  
  // Búsqueda dinámica
  $("#pos-search").addEventListener("input", (e) => {
    renderGrid(e.target.value);
  });
  
  // Búsqueda por Enter (útil para lector de código de barras)
  $("#pos-search").addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      const term = e.target.value.trim();
      // Intentar añadir directo si es código de barras exacto
      const exactMatch = state.products.find(p => p.barcode === term);
      if (exactMatch) {
        addToTicket(exactMatch);
        e.target.value = ""; // Limpiar para el siguiente escaneo
        toast("Producto agregado", "success");
      }
    }
  });

  // Botón verificar usuario
  $("#btn-check-user").addEventListener("click", checkUserByEmail);
  
  // Botón confirmar venta final
  $("#btn-confirm-sale").addEventListener("click", finalizeSale);
});

// --- PESTAÑAS ---
window.switchTab = function(tabName) {
  document.querySelectorAll('.worker-tab').forEach(b => b.classList.remove('active'));
  event.target.classList.add('active'); // El botón clickeado

  if(tabName === 'pos') {
    $("#view-pos").style.display = 'grid';
    $("#view-history").classList.remove('active');
  } else {
    $("#view-pos").style.display = 'none';
    $("#view-history").classList.add('active');
    loadMyHistory();
  }
};

// --- CATÁLOGO ---
async function loadCatalog() {
  try {
    // Traemos TODOS los productos disponibles
    const res = await fetch('/api/products?limit=1000'); 
    const data = await res.json();
    // Filtramos solo los que están "Disponible" para evitar vender repetidos
    state.products = (data.items || []).filter(p => p.status === 'Disponible');
    renderGrid();
  } catch (err) {
    console.error(err);
    toast("Error cargando inventario", "error");
  }
}

function renderGrid(filter = "") {
  const container = $("#pos-grid");
  container.innerHTML = "";
  
  const term = filter.toLowerCase();
  const matches = state.products.filter(p => 
    p.name.toLowerCase().includes(term) || 
    (p.barcode && p.barcode.includes(term))
  );

  if(matches.length === 0) {
    container.innerHTML = '<p style="grid-column:1/-1; text-align:center;">No se encontraron productos disponibles.</p>';
    return;
  }

  matches.forEach(p => {
    const card = document.createElement("div");
    card.className = "pos-card";
    card.onclick = () => addToTicket(p);
    card.innerHTML = `
      <img src="${(p.images && p.images[0]) || '/assets/logo.png'}" alt="img">
      <div class="pos-card-info">
        <div class="pos-card-title">${p.name}</div>
        <div class="pos-card-price">${fmtMoney(p.price)}</div>
        ${p.barcode ? `<small style="color:#888; font-size:0.7rem;">${p.barcode}</small>` : ''}
      </div>
    `;
    container.appendChild(card);
  });
}

// --- TICKET (CARRITO) ---
function addToTicket(product) {
  // Verificar si ya está en el ticket (Recuerda: son productos únicos)
  const exists = state.cart.find(i => i._id === product._id);
  if (exists) {
    toast("Este producto único ya está en el ticket", "error");
    return;
  }
  state.cart.push(product);
  renderTicket();
}

function removeFromTicket(index) {
  state.cart.splice(index, 1);
  renderTicket();
}

function renderTicket() {
  const container = $("#ticket-items");
  const totalEl = $("#ticket-total");
  
  container.innerHTML = "";
  let total = 0;

  state.cart.forEach((p, index) => {
    total += p.price;
    const div = document.createElement("div");
    div.className = "ticket-item";
    div.innerHTML = `
      <div class="ticket-item-info">
        <span class="ticket-item-title">${p.name}</span>
        <span class="ticket-item-price">${fmtMoney(p.price)}</span>
      </div>
      <button class="btn btn--danger" style="padding:5px 10px;" onclick="removeFromTicket(${index})">
        <i class="fa-solid fa-trash"></i>
      </button>
    `;
    container.appendChild(div);
  });

  if(state.cart.length === 0) {
    container.innerHTML = '<div style="padding:20px; text-align:center; color:#999;">Ticket vacío</div>';
  }

  totalEl.textContent = fmtMoney(total);
}

// --- PROCESO DE COBRO ---
window.initCheckout = function(method) {
  if (state.cart.length === 0) {
    toast("El ticket está vacío", "error");
    return;
  }
  state.currentPaymentMethod = method;
  
  // Limpiar modal
  $("#cust-email").value = "";
  $("#cust-name").value = "";
  $("#user-found-msg").style.display = "none";
  $("#user-not-found-msg").style.display = "none";
  state.customer = null; // Resetear cliente

  document.getElementById("modal-customer").showModal();
};

async function checkUserByEmail() {
  const email = $("#cust-email").value.trim();
  if (!email) return;

  $("#btn-check-user").textContent = "...";
  
  try {
    const res = await fetch(`/api/users/lookup?email=${encodeURIComponent(email)}`);
    const data = await res.json();

    if (data.found) {
      $("#user-found-msg").style.display = "block";
      $("#found-name").textContent = data.name;
      $("#cust-name").value = data.name; // Autocompletar nombre
      $("#user-not-found-msg").style.display = "none";
      state.customer = { email: data.email, name: data.name }; // Guardar ref
    } else {
      $("#user-found-msg").style.display = "none";
      $("#user-not-found-msg").style.display = "block";
      $("#cust-name").value = ""; // Permitir escribir manual
      state.customer = null;
    }
  } catch (err) {
    console.error(err);
    toast("Error verificando usuario", "error");
  } finally {
    $("#btn-check-user").textContent = "Verificar";
  }
}

async function finalizeSale() {
  const emailInput = $("#cust-email").value.trim();
  const nameInput = $("#cust-name").value.trim();

  // Definir datos finales del cliente
  let finalCustomer = {
    name: nameInput || "Venta de Mostrador",
    email: state.customer ? state.customer.email : (emailInput || "mostrador@hk.com"),
    address: "Tienda Física - Sucursal Central" // Dirección fija
  };

  if (!finalCustomer.name) {
    toast("Por favor ingresa un nombre para el ticket", "error");
    return;
  }

  const total = state.cart.reduce((sum, p) => sum + p.price, 0);

  const orderPayload = {
    customerDetails: finalCustomer,
    products: state.cart.map(p => ({
      product: p._id,
      name: p.name,
      price: p.price,
      qty: 1
    })),
    subtotal: total,
    shippingCost: 0, // Venta física no tiene envío
    total: total,
    tipoVenta: 'Física',
    status: 'Vendido', // <--- Estatus directo para descontar stock
    trackingNumber: `Pago: ${state.currentPaymentMethod}` // Guardamos el método aquí
  };

  try {
    const res = await fetch("/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(orderPayload)
    });

    if (!res.ok) throw new Error("Error al procesar la venta");

    toast("¡Venta realizada con éxito!", "success");
    document.getElementById("modal-customer").close();
    
    // Limpiar todo
    state.cart = [];
    renderTicket();
    loadCatalog(); // Recargar para quitar los productos vendidos

  } catch (err) {
    console.error(err);
    toast("Error en el servidor", "error");
  }
}

// --- HISTORIAL ---
async function loadMyHistory() {
  const tbody = $("#history-tbody");
  tbody.innerHTML = '<tr><td colspan="5">Cargando...</td></tr>';

  try {
    const res = await fetch('/api/orders'); // Trae todas
    const allOrders = await res.json();
    
    // Filtrar solo ventas físicas (asumiendo que el trabajador solo ve lo de tienda)
    // Idealmente el backend filtraría por usuario, pero por ahora filtramos por tipo
    const mySales = allOrders.filter(o => o.tipoVenta === 'Física');

    if (mySales.length === 0) {
      tbody.innerHTML = '<tr><td colspan="5">No hay ventas registradas hoy.</td></tr>';
      return;
    }

    tbody.innerHTML = mySales.map(o => `
      <tr>
        <td>${o.orderNumber}</td>
        <td>${o.customerDetails.name}</td>
        <td>${o.trackingNumber || 'Efectivo'}</td>
        <td>${fmtMoney(o.total)}</td>
        <td>${new Date(o.createdAt).toLocaleTimeString()}</td>
      </tr>
    `).join("");

  } catch (err) {
    tbody.innerHTML = '<tr><td colspan="5">Error al cargar historial.</td></tr>';
  }
}