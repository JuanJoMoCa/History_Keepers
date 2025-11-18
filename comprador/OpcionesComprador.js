/* =========================================================
   History Keepers — OpcionesComprador.js
   Lógica para el panel de "Mi Cuenta" (Completo)
   ========================================================= */

/********** Utils UI **********/
const $ = (s, c = document) => c.querySelector(s);
const $$ = (s, c = document) => Array.from(c.querySelectorAll(s));

let toastTimer;
function showToast(msg, kind = "ok") {
  const box = $("#toasts");
  if (!box) return;
  const div = document.createElement("div");
  div.className = `toast toast--${kind}`; 
  div.innerHTML = `<i class="fa-solid ${
    kind === 'ok' ? 'fa-circle-check' : 'fa-triangle-exclamation'
  }"></i> ${msg}`;
  box.appendChild(div);
  setTimeout(() => div.remove(), 2500);
}

// Helper para escapar HTML
function escape(s = "") {
  return s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

// Helper para formatear dinero
const fmtMoney = (n) => "$" + (Number(n || 0)).toLocaleString("es-MX");

/********** Estado Global **********/
const state = {
  userId: null,
  user: null
};

/********** Selectores del DOM **********/
const el = {
  // Perfil
  profileForm: $("#profile-form"),
  saveProfileBtn: $("#save-profile"),
  passwordForm: $("#password-form"),
  savePasswordBtn: $("#save-password"),

  // Direcciones
  addressTbody: $("#address-tbody"),
  btnNewAddress: $("#btnNewAddress"),
  modalAddressForm: $("#modalAddressForm"),
  addressForm: $("#address-form"),
  addressFormTitle: $("#address-form-title"),
  saveAddressBtn: $("#save-address"),
  
  // Pedidos
  ordersTbody: $("#orders-tbody"),

  // --- NUEVO: Métodos de Pago ---
  paymentTbody: $("#payment-tbody"),
  btnNewPayment: $("#btnNewPayment"),
  modalPaymentForm: $("#modalPaymentForm"),
  paymentForm: $("#payment-form"),
  paymentFormTitle: $("#payment-form-title"),
  savePaymentBtn: $("#save-payment")
};

/********** API (Frontend) **********/
const api = {
  async getProfile(id) {
    const r = await fetch(`/api/profile/${id}`);
    if (!r.ok) throw new Error("No se pudieron cargar tus datos");
    return r.json();
  },
  async updateProfile(id, data) {
    const r = await fetch(`/api/profile/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!r.ok) throw new Error((await r.json()).message || "Error al actualizar");
    return r.json();
  },
  async updatePassword(id, newPassword) {
    const r = await fetch(`/api/password/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ newPassword })
    });
    if (!r.ok) throw new Error((await r.json()).message || "Error al cambiar contraseña");
    return r.json();
  },
  
  // APIs de Pedidos
  async getMyOrders(id) {
    const r = await fetch(`/api/my-orders/${id}`);
    if (!r.ok) throw new Error("No se pudieron cargar tus pedidos");
    return r.json();
  },
  async updateOrderStatus(id, status, trackingNumber) {
    const r = await fetch(`/api/orders/${id}/status`, { 
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status, trackingNumber })
    });
    if (!r.ok) throw new Error("Error actualizando pedido");
    return r.json();
  },

  // APIs de Direcciones
  async getAddresses(id) {
    const r = await fetch(`/api/profile/${id}/addresses`);
    if (!r.ok) throw new Error("No se pudieron cargar las direcciones");
    return r.json();
  },
  async addAddress(id, addressData) {
    const r = await fetch(`/api/profile/${id}/addresses`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(addressData)
    });
    if (!r.ok) throw new Error((await r.json()).message || "Error al guardar dirección");
    return r.json();
  },
  async deleteAddress(id, addrId) {
    const r = await fetch(`/api/profile/${id}/addresses/${addrId}`, {
      method: 'DELETE'
    });
    if (!r.ok) throw new Error((await r.json()).message || "Error al eliminar dirección");
    return r.json();
  },

  // --- NUEVO: APIs de Métodos de Pago ---
  async getPayments(id) {
    const r = await fetch(`/api/profile/${id}/payments`);
    if (!r.ok) throw new Error("No se pudieron cargar los métodos de pago");
    return r.json();
  },
  async addPayment(id, paymentData) {
    const r = await fetch(`/api/profile/${id}/payments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(paymentData)
    });
    if (!r.ok) throw new Error((await r.json()).message || "Error al guardar método de pago");
    return r.json();
  },
  async deletePayment(id, payId) {
    const r = await fetch(`/api/profile/${id}/payments/${payId}`, {
      method: 'DELETE'
    });
    if (!r.ok) throw new Error((await r.json()).message || "Error al eliminar método de pago");
    return r.json();
  }
};

/********** Lógica de Pestañas (ACTUALIZADA) **********/
function wireTabNavigation() {
  const navLinks = $$('.inv-nav__item[data-tab]');
  const tabContents = $$('.tab-content');

  navLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const tabId = link.dataset.tab;
      
      navLinks.forEach(nav => nav.classList.remove('active'));
      link.classList.add('active');
      
      tabContents.forEach(tab => {
        if (tab.id !== 'loader') {
          tab.classList.add('hidden');
        }
      });
      $(`#tab-${tabId}`).classList.remove('hidden');

      // Cargar datos al hacer clic en la pestaña
      if (tabId === 'pedidos') loadMyOrders();
      if (tabId === 'direcciones') loadMyAddresses();
      if (tabId === 'pagos') loadMyPayments(); // <-- AÑADIDO
    });
  });
}

/********** Lógica de Perfil (Sin cambios) **********/
async function loadUserProfile() {
  const loader = $("#loader");
  try {
    const user = await api.getProfile(state.userId);
    state.user = user;
    
    $("#profile-nombre").value = user.nombre || '';
    $("#profile-email").value = user.email || '';
    $("#profile-telefono").value = user.telefono || '';
    
    loader.classList.add('hidden');
    $("#tab-perfil").classList.remove('hidden');

  } catch (err) {
    showToast(err.message, 'err');
    setTimeout(() => window.location.href = '/index.html', 2000);
  }
}
function wireProfileForms() {
  el.saveProfileBtn.addEventListener('click', async () => {
    const data = {
      nombre: $("#profile-nombre").value,
      email: $("#profile-email").value,
      telefono: $("#profile-telefono").value
    };
    if (!data.nombre || !data.email) {
      showToast("Nombre y Email son obligatorios.", "err"); return;
    }
    try {
      const result = await api.updateProfile(state.userId, data);
      state.user = result.user; 
      showToast(result.message, 'ok');
    } catch (err) {
      showToast(err.message, 'err');
    }
  });
  el.savePasswordBtn.addEventListener('click', async () => {
    const pass = $("#pass-new").value;
    const confirm = $("#pass-confirm").value;
    if (!pass || pass.length < 6) {
      showToast("La contraseña debe tener al menos 6 caracteres.", "err"); return;
    }
    if (pass !== confirm) {
      showToast("Las contraseñas no coinciden.", "err"); return;
    }
    try {
      const result = await api.updatePassword(state.userId, pass);
      showToast(result.message, 'ok');
      $("#pass-new").value = "";
      $("#pass-confirm").value = "";
    } catch (err) {
      showToast(err.message, 'err');
    }
  });
}

/********** Lógica de Pedidos (Sin cambios) **********/
async function loadMyOrders() {
  const tbody = el.ordersTbody;
  if (!tbody) return;
  tbody.innerHTML = '<tr><td colspan="5">Cargando pedidos...</td></tr>';
  try {
    const orders = await api.getMyOrders(state.userId);
    renderMyOrdersTable(orders);
  } catch (err) {
    tbody.innerHTML = '<tr><td colspan="5">Error al cargar pedidos.</td></tr>';
    showToast(err.message, 'err');
  }
}
function renderMyOrdersTable(orders = []) {
  const tbody = el.ordersTbody;
  if (!tbody) return;
  if (orders.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5">No tienes pedidos anteriores.</td></tr>';
    return;
  }
  tbody.innerHTML = orders.map(order => {
    let actions = '';
    if (order.status === 'Pagado' || order.status === 'En Preparación' || order.status === 'Enviado') {
      actions = `<button class="btn btn--danger" data-cancel-order="${order._id}">Cancelar</button>`;
    } else if (order.status === 'Entregado') {
      actions = `<button class="btn" data-return-order="${order._id}">Devolución</button>`;
    } else {
      actions = `<span>---</span>`;
    }
    return `
      <tr>
        <td>${escape(order.orderNumber)}</td>
        <td>${new Date(order.createdAt).toLocaleDateString("es-MX")}</td>
        <td>${fmtMoney(order.total)}</td>
        <td>
          <span class="status-badge" data-status="${escape(order.status)}">
            ${escape(order.status)}
          </span>
        </td>
        <td class="row-actions">${actions}</td>
      </tr>
    `;
  }).join("");
  tbody.querySelectorAll('[data-cancel-order]').forEach(b => {
    b.addEventListener('click', () => handleCancelOrder(b.dataset.cancelOrder));
  });
  tbody.querySelectorAll('[data-return-order]').forEach(b => {
    b.addEventListener('click', () => handleReturnOrder(b.dataset.returnOrder));
  });
}
async function handleCancelOrder(orderId) {
  if (!confirm("¿Estás seguro de que quieres cancelar este pedido?")) return;
  try {
    await api.updateOrderStatus(orderId, 'Cancelado', null);
    showToast("Pedido cancelado exitosamente.", "ok");
    loadMyOrders();
  } catch (err) {
    showToast(err.message, "err");
  }
}
async function handleReturnOrder(orderId) {
  showToast("Función de devolución aún no implementada.", "warn");
}

/********** Lógica de Direcciones (Sin cambios) **********/
async function loadMyAddresses() {
  const tbody = el.addressTbody;
  if (!tbody) return;
  tbody.innerHTML = '<tr><td colspan="5">Cargando direcciones...</td></tr>';
  try {
    const addresses = await api.getAddresses(state.userId);
    renderAddressTable(addresses);
  } catch (err) {
    tbody.innerHTML = '<tr><td colspan="5">Error al cargar direcciones.</td></tr>';
    showToast(err.message, 'err');
  }
}
function renderAddressTable(addresses = []) {
  const tbody = el.addressTbody;
  if (!tbody) return;
  
  if (addresses.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5" class="muted" style="text-align:center; padding:20px;">No tienes direcciones guardadas.</td></tr>';
    return;
  }

  tbody.innerHTML = addresses.map(addr => `
    <tr>
      <td><strong>${escape(addr.alias)}</strong></td>
      <td>${escape(addr.calle)}</td>
      <td>${escape(addr.ciudad)}</td>
      <td>${escape(addr.cp)}</td>
      <td>
        <div class="row-actions">
          <button class="btn" data-edit-address='${JSON.stringify(addr)}' title="Editar">
            <i class="fa-solid fa-pen-to-square"></i>
          </button>
          <button class="btn btn--danger" data-delete-address="${addr._id}" title="Eliminar">
            <i class="fa-solid fa-trash"></i>
          </button>
        </div>
      </td>
    </tr>
  `).join("");

  // Conectar Eliminar
  tbody.querySelectorAll('[data-delete-address]').forEach(b => {
    b.addEventListener('click', () => handleDeleteAddress(b.dataset.deleteAddress));
  });

  // Conectar Editar (NUEVO)
  tbody.querySelectorAll('[data-edit-address]').forEach(b => {
    b.addEventListener('click', () => openAddressModal(JSON.parse(b.dataset.editAddress)));
  });
}
function openAddressModal(addressData = null) {
  el.addressForm.reset();
  
  if (addressData) {
    // MODO EDICIÓN
    $("#address-id").value = addressData._id;
    $("#addr-alias").value = addressData.alias;
    $("#addr-calle").value = addressData.calle;
    $("#addr-colonia").value = addressData.colonia;
    $("#addr-ciudad").value = addressData.ciudad;
    $("#addr-cp").value = addressData.cp;
    el.addressFormTitle.textContent = "Editar Dirección";
    el.saveAddressBtn.textContent = "Actualizar";
  } else {
    // MODO CREACIÓN
    $("#address-id").value = "";
    el.addressFormTitle.textContent = "Nueva Dirección";
    el.saveAddressBtn.textContent = "Guardar Dirección";
  }
  el.modalAddressForm.classList.remove('hidden');
}
function closeAddressModal() {
  el.modalAddressForm.classList.add('hidden');
}
async function saveAddress() {
  const formData = new FormData(el.addressForm);
  const data = Object.fromEntries(formData.entries());
  const id = $("#address-id").value; // Verificar si hay ID

  if (!data.alias || !data.calle || !data.colonia || !data.ciudad || !data.cp) {
    showToast("Todos los campos son obligatorios.", "err"); return;
  }

  try {
    if (id) {

      await api.deleteAddress(state.userId, id); // Borrar viejo
      await api.addAddress(state.userId, data); // Crear nuevo
      showToast("Dirección actualizada", "ok");
    } else {
      await api.addAddress(state.userId, data);
      showToast("Dirección guardada", "ok");
    }
    closeAddressModal();
    loadMyAddresses();
  } catch (err) {
    showToast(err.message, "err");
  }
}
async function handleDeleteAddress(addrId) {
  if (!confirm("¿Estás seguro de que quieres eliminar esta dirección?")) return;
  try {
    await api.deleteAddress(state.userId, addrId);
    showToast("Dirección eliminada", "ok");
    loadMyAddresses();
  } catch (err) {
    showToast(err.message, "err");
  }
}

// --- AÑADIR ESTE BLOQUE COMPLETO ---
/********** Lógica de Métodos de Pago **********/

/**
 * Carga y renderiza la tabla de tarjetas
 */
async function loadMyPayments() {
  const tbody = el.paymentTbody;
  if (!tbody) return;
  tbody.innerHTML = '<tr><td colspan="5">Cargando métodos de pago...</td></tr>';

  try {
    const payments = await api.getPayments(state.userId);
    renderPaymentTable(payments);
  } catch (err) {
    tbody.innerHTML = '<tr><td colspan="5">Error al cargar métodos de pago.</td></tr>';
    showToast(err.message, 'err');
  }
}

/**
 * Dibuja las filas de la tabla de tarjetas
 */
function renderPaymentTable(payments = []) {
  const tbody = el.paymentTbody;
  if (!tbody) return;

  if (payments.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5" class="muted" style="text-align:center; padding:20px;">No tienes métodos de pago guardados.</td></tr>';
    return;
  }

  tbody.innerHTML = payments.map(pay => {
    const lastFour = escape(pay.cardNumber).slice(-4);
    const maskedNumber = `**** **** **** ${lastFour}`;
    
    return `
      <tr>
        <td><strong>${escape(pay.alias)}</strong></td>
        <td>${escape(pay.cardholderName)}</td>
        <td>${maskedNumber}</td>
        <td>${escape(pay.expiryDate)}</td>
        <td>
          <div class="row-actions">
            <button class="btn" data-edit-payment='${JSON.stringify(pay)}' title="Editar">
              <i class="fa-solid fa-pen-to-square"></i>
            </button>
            <button class="btn btn--danger" data-delete-payment="${pay._id}" title="Eliminar">
              <i class="fa-solid fa-trash"></i>
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join("");

  // Conectar Eliminar
  tbody.querySelectorAll('[data-delete-payment]').forEach(b => {
    b.addEventListener('click', () => handleDeletePayment(b.dataset.deletePayment));
  });

  // Conectar Editar (NUEVO)
  tbody.querySelectorAll('[data-edit-payment]').forEach(b => {
    b.addEventListener('click', () => openPaymentModal(JSON.parse(b.dataset.editPayment)));
  });
}

/**
 * Abre el modal de pago (para crear)
 */
function openPaymentModal(paymentData = null) {
  el.paymentForm.reset();
  
  if (paymentData) {
    // MODO EDICIÓN
    $("#payment-id").value = paymentData._id;
    $("#pay-alias").value = paymentData.alias;
    $("#pay-name").value = paymentData.cardholderName;
    $("#pay-number").value = paymentData.cardNumber;
    $("#pay-expiry").value = paymentData.expiryDate;
    el.modalPaymentForm.querySelector('h3').textContent = "Editar Método de Pago";
    el.savePaymentBtn.textContent = "Actualizar";
  } else {
    // MODO CREACIÓN
    $("#payment-id").value = "";
    el.modalPaymentForm.querySelector('h3').textContent = "Nuevo Método de Pago";
    el.savePaymentBtn.textContent = "Guardar Método";
  }
  el.modalPaymentForm.classList.remove('hidden');
}

/**
 * Cierra el modal de pago
 */
function closePaymentModal() {
  el.modalPaymentForm.classList.add('hidden');
}

/**
 * Guarda el nuevo método de pago
 */
async function savePayment() {
  const formData = new FormData(el.paymentForm);
  const data = Object.fromEntries(formData.entries());
  const id = $("#payment-id").value;

  if (!data.alias || !data.cardholderName || !data.cardNumber || !data.expiryDate) {
    showToast("Todos los campos son obligatorios.", "err"); return;
  }

  try {
    if (id) {
      // Misma lógica de "Borrar y Crear" si no hay endpoint PUT específico
      await api.deletePayment(state.userId, id);
      await api.addPayment(state.userId, data);
      showToast("Método actualizado", "ok");
    } else {
      await api.addPayment(state.userId, data);
      showToast("Método guardado", "ok");
    }
    closePaymentModal();
    loadMyPayments();
  } catch (err) {
    showToast(err.message, "err");
  }
}

/**
 * Maneja la eliminación de un método de pago
 */
async function handleDeletePayment(payId) {
  if (!confirm("¿Estás seguro de que quieres eliminar este método de pago?")) return;

  try {
    await api.deletePayment(state.userId, payId);
    showToast("Método de pago eliminado", "ok");
    loadMyPayments(); // Recargar la tabla
  } catch (err) {
    showToast(err.message, "err");
  }
}
// --- FIN DEL BLOQUE NUEVO ---


/********** Init (ACTUALIZADO) **********/
document.addEventListener("DOMContentLoaded", () => {
  // 1. Verificar si el usuario está logueado
  state.userId = localStorage.getItem('hk-user-id');
  if (!state.userId) {
    alert("Necesitas iniciar sesión para ver esta página.");
    window.location.href = '/index.html';
    return;
  }

  // 2. Conectar la navegación de pestañas
  wireTabNavigation();
  
  // 3. Conectar los formularios de la pestaña "Perfil"
  wireProfileForms();

  // 4. Conectar Handlers de Dirección
  el.btnNewAddress.addEventListener('click', openAddressModal);
  el.saveAddressBtn.addEventListener('click', saveAddress);
  $$('[data-close-address]').forEach(btn => btn.addEventListener('click', closeAddressModal));
  el.modalAddressForm.addEventListener('click', e => {
    if (e.target === el.modalAddressForm) closeAddressModal();
  });
  
  // --- 5. AÑADIR HANDLERS DE PAGO ---
  el.btnNewPayment.addEventListener('click', openPaymentModal);
  el.savePaymentBtn.addEventListener('click', savePayment);
  $$('[data-close-payment]').forEach(btn => btn.addEventListener('click', closePaymentModal));
  el.modalPaymentForm.addEventListener('click', e => {
    if (e.target === el.modalPaymentForm) closePaymentModal();
  });

  // 6. Actualizar Keydown
  window.addEventListener("keydown", (e) => { 
    if (e.key === "Escape") {
      closeAddressModal();
      closePaymentModal(); // <-- AÑADIDO
    }
  });
  
  // 7. Cargar los datos del perfil del usuario (inicia en la pestaña "Perfil")
  loadUserProfile();
});