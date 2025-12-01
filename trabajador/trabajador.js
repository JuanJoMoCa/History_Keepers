/* =========================================================
   History Keepers — trabajador.js (Lógica POS - VERSIÓN FINAL CORREGIDA)
   ========================================================= */

// Estado del POS
const state = {
  products: [],     // Catálogo completo
  cart: [],         // Items en el ticket actual
  currentPaymentMethod: null,
  customer: null,   // Datos del cliente verificado
  finalCustomerData: null // Datos listos para enviar
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
  
  // Búsqueda por Enter
  $("#pos-search").addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      const term = e.target.value.trim();
      const exactMatch = state.products.find(p => p.barcode === term);
      if (exactMatch) {
        addToTicket(exactMatch);
        e.target.value = ""; 
        toast("Producto agregado", "success");
      }
    }
  });

  // Conectar botones principales
  $("#btn-check-user").addEventListener("click", checkUserByEmail);
  $("#btn-confirm-sale").addEventListener("click", finalizeSale);
  $("#btn-finish-transaction").addEventListener("click", completeTransaction);
});

// --- PESTAÑAS ---
window.switchTab = function(tabName) {
  document.querySelectorAll('.worker-tab').forEach(b => b.classList.remove('active'));
  event.target.classList.add('active'); 

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
    const res = await fetch('/api/products?limit=1000'); 
    const data = await res.json();
    // Filtro relajado: Disponible o sin estatus definido
    state.products = (data.items || []).filter(p => 
      p.status === 'Disponible' || !p.status
    );
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

// --- PROCESO DE COBRO: PASO 1 (Abrir Modal Cliente) ---
window.initCheckout = function(method) {
  if (state.cart.length === 0) {
    toast("El ticket está vacío", "error");
    return;
  }
  state.currentPaymentMethod = method;
  
  // Limpiar modal
  $("#cust-email").value = "";
  $("#cust-name").value = "";
  $("#cust-name").disabled = false;
  $("#user-found-msg").style.display = "none";
  $("#user-not-found-msg").style.display = "none";
  state.customer = null;

  document.getElementById("modal-customer").showModal();
};

// --- PROCESO DE COBRO: PASO 2 (Verificar Cliente) ---
async function checkUserByEmail() {
  const emailInput = $("#cust-email");
  const nameInput = $("#cust-name");
  const email = emailInput.value.trim().toLowerCase(); // Limpieza clave
  const btn = $("#btn-check-user");

  $("#user-found-msg").style.display = "none";
  $("#user-not-found-msg").style.display = "none";

  if (!email) {
    toast("Escribe un correo primero.", "error");
    return;
  }

  btn.textContent = "BUSCANDO...";
  btn.disabled = true;

  try {
    const res = await fetch(`/api/users/lookup?email=${encodeURIComponent(email)}`);
    const data = await res.json();

    if (data.found) {
      $("#user-found-msg").style.display = "block";
      $("#found-name").textContent = data.name;
      nameInput.value = data.name;
      nameInput.disabled = true; // Bloquear para asegurar consistencia
      
      state.customer = {
        email: data.email,
        name: data.name,
        userId: data._id
      };
      toast("Cliente vinculado", "success");
    } else {
      $("#user-not-found-msg").style.display = "block";
      nameInput.value = "";
      nameInput.disabled = false;
      nameInput.focus();
      state.customer = null;
    }
  } catch (err) {
    console.error(err);
    toast("Error de conexión", "error");
    nameInput.disabled = false;
  } finally {
    btn.textContent = "VERIFICAR";
    btn.disabled = false;
  }
}

// --- PROCESO DE COBRO: PASO 3 (Confirmar Datos y Abrir Pago) ---
async function finalizeSale() {
  console.log("1. Función finalizeSale iniciada"); // <--- LOG 1

  const emailInput = $("#cust-email").value.trim();
  const nameInput = $("#cust-name").value.trim();

  if (!nameInput) {
    console.log("Error: Nombre vacío"); // <--- LOG ERROR
    toast("El nombre es obligatorio.", "error");
    $("#cust-name").focus();
    return;
  }

  // Guardar datos validados
  state.finalCustomerData = {
    name: state.customer ? state.customer.name : nameInput,
    email: state.customer ? state.customer.email : (emailInput || "mostrador@hk.com"),
    address: "Sucursal Física",
    userId: state.customer ? state.customer.userId : null
  };
  
  console.log("2. Datos de cliente guardados:", state.finalCustomerData); // <--- LOG 2

  // Cambio de modal
  const modalCustomer = document.getElementById("modal-customer");
  console.log("3. Intentando cerrar modal cliente:", modalCustomer); // <--- LOG 3
  modalCustomer.close();
  
  console.log("4. Abriendo modal de pago..."); // <--- LOG 4
  openPaymentModal();
}

// --- PROCESO DE COBRO: PASO 4 (Modal de Pago) ---
function openPaymentModal() {
  const total = state.cart.reduce((sum, p) => sum + p.price, 0);
  
  $("#pay-amount-display").textContent = fmtMoney(total);
  $("#pay-modal-title").textContent = `COBRAR (${state.currentPaymentMethod.toUpperCase()})`;

  if (state.currentPaymentMethod === 'Efectivo') {
    $("#pay-cash-area").style.display = "block";
    $("#pay-card-area").style.display = "none";
    
    const inputCash = $("#cash-received");
    inputCash.value = "";
    $("#cash-change").textContent = "$0.00";
    
    inputCash.oninput = () => {
      const received = parseFloat(inputCash.value) || 0;
      const change = received - total;
      $("#cash-change").textContent = fmtMoney(change);
      $("#cash-change").style.color = change >= 0 ? "green" : "red";
    };
    setTimeout(() => inputCash.focus(), 100);

  } else {
    $("#pay-cash-area").style.display = "none";
    $("#pay-card-area").style.display = "block";
    $("#card-ref").value = "";
    setTimeout(() => $("#card-ref").focus(), 100);
  }

  document.getElementById("modal-payment").showModal();
}

// --- PROCESO DE COBRO: PASO 5 (Enviar al Servidor) ---
async function completeTransaction() {
  const total = state.cart.reduce((sum, p) => sum + p.price, 0);
  let trackingNote = "";

  if (state.currentPaymentMethod === 'Efectivo') {
    const received = parseFloat($("#cash-received").value) || 0;
    if (received < total) {
      toast("Monto insuficiente.", "error");
      return;
    }
    trackingNote = `Pago en Efectivo (Recibido: ${fmtMoney(received)})`;
  } else {
    const ref = $("#card-ref").value.trim();
    if (!ref) {
      toast("Ingresa la referencia.", "error");
      return;
    }
    trackingNote = `Pago con Tarjeta (Ref: ${ref})`;
  }

  const orderPayload = {
    orderNumber: `POS-${Date.now().toString().slice(-6)}`,
    customerDetails: state.finalCustomerData,
    products: state.cart.map(p => ({
      product: p._id,
      name: p.name,
      price: p.price,
      qty: 1
    })),
    subtotal: total,
    total: total,
    shippingCost: 0,
    status: 'Entregado',
    tipoVenta: 'Física',
    trackingNumber: trackingNote,
    createdAt: new Date()
  };

  const btn = $("#btn-finish-transaction");
  btn.textContent = "PROCESANDO...";
  btn.disabled = true;

  try {
    const res = await fetch("/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(orderPayload)
    });

    if (!res.ok) throw new Error("Error guardando venta");

    toast("¡Venta Exitosa!", "success");
    document.getElementById("modal-payment").close();
    
    // Limpieza
    state.cart = [];
    state.customer = null;
    state.finalCustomerData = null;
    renderTicket(); 
    loadCatalog(); 

  } catch (err) {
    console.error(err);
    toast("Error en el servidor", "error");
  } finally {
    btn.textContent = "FINALIZAR VENTA";
    btn.disabled = false;
  }
}

// --- HISTORIAL ---
async function loadMyHistory() {
  const tbody = $("#history-tbody");
  tbody.innerHTML = '<tr><td colspan="5">Cargando...</td></tr>';

  try {
    const res = await fetch('/api/orders');
    const allOrders = await res.json();
    const mySales = allOrders.filter(o => o.tipoVenta === 'Física');

    if (mySales.length === 0) {
      tbody.innerHTML = '<tr><td colspan="5">No hay ventas registradas.</td></tr>';
      return;
    }

    tbody.innerHTML = mySales.map(o => `
      <tr>
        <td>${o.orderNumber}</td>
        <td>${o.customerDetails.name}</td>
        <td>${o.trackingNumber}</td>
        <td>${fmtMoney(o.total)}</td>
        <td>${new Date(o.createdAt).toLocaleTimeString()}</td>
      </tr>
    `).join("");
  } catch (err) {
    tbody.innerHTML = '<tr><td colspan="5">Error historial.</td></tr>';
  }
}