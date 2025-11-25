/* =========================================================
   History Keepers — admin.js (Lógica del Panel de Admin)
   VERSIÓN CON SUBIDA DE ARCHIVOS (FormData)
   Y GESTIÓN DE PEDIDOS (SIMULADA)
   ========================================================= */

/********** Utils UI **********/
const $ = (s, c = document) => c.querySelector(s);
const $$ = (s, c = document) => Array.from(c.querySelectorAll(s));

const fmtMoney = (n) => "$" + (Number(n || 0)).toLocaleString("es-MX");

function toast(msg, kind = "ok") {
  const box = $("#toasts");
  const div = document.createElement("div");
  div.className = `toast toast--${kind}`;
  div.innerHTML = `<i class="fa-solid ${
    kind === 'ok' ? 'fa-circle-check' : 'fa-triangle-exclamation'
  }"></i> ${msg}`;
  box.appendChild(div);
  setTimeout(() => div.remove(), 2500); // <-- CORRECCIÓN: ')' y ';' añadidos
} // <-- CORRECCIÓN: '}' añadida

/********** Adaptador de API (Fusionado) **********/
const api = {
  // --- FUNCIONES DE PRODUCTOS ---
  async list({ search = "", page = 1, limit = 10 } = {}) {
    const url = new URL('/api/products', window.location.origin);
    url.searchParams.set("search", search);
    url.searchParams.set("page", page);
    url.searchParams.set("limit", limit);
    const r = await fetch(url);
    if (!r.ok) throw new Error("Error listando productos");
    return r.json();
  },
  
  async create(formData) {
    const r = await fetch('/api/products', { method: "POST", body: formData });
    if (!r.ok) throw new Error((await r.json()).message || "Error creando");
    return r.json();
  },
  
  async update(id, formData) {
    const r = await fetch(`/api/products/${id}`, { method: "PUT", body: formData });
    if (!r.ok) throw new Error((await r.json()).message || "Error actualizando");
    return r.json();
  },
  
  async remove(id) {
    const r = await fetch(`/api/products/${id}`, { method: "DELETE" });
    if (!r.ok) throw new Error("Error eliminando");
    return { ok: true };
  },

  async deleteImage(productId, imagePath) {
    const r = await fetch(`/api/products/${productId}/image`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ imagePath })
    });
    if (!r.ok) throw new Error((await r.json()).message || "Error eliminando imagen");
    return r.json();
  },

  // --- FUNCIONES DE PEDIDOS (CONECTADAS) ---
  async listOrders() {
    const r = await fetch('/api/orders');
    if (!r.ok) throw new Error("Error al cargar los pedidos");
    return r.json();
  },

  async updateOrder(id, status, trackingNumber) {
    const r = await fetch(`/api/orders/${id}/status`, { 
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status, trackingNumber })
    });
    if (!r.ok) throw new Error((await r.json()).message || "Error actualizando pedido");
    return r.json();
  },

  async getSalesSummary() {
    const r = await fetch('/api/sales/summary');
    if (!r.ok) throw new Error("Error al cargar el resumen de ventas");
    return r.json();
  },

  async listUsers() {
    const r = await fetch('/api/users');
    if (!r.ok) throw new Error("Error al cargar empleados");
    return r.json();
  },

  async createUser(userData) {
    const r = await fetch('/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userData)
    });
    if (!r.ok) throw new Error((await r.json()).message || "Error creando empleado");
    return r.json();
  },

  async updateUserRole(id, rol) {
    const r = await fetch(`/api/users/${id}/role`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rol })
    });
    if (!r.ok) throw new Error((await r.json()).message || "Error actualizando rol");
    return r.json();
  },

  async deleteUser(id) {
    const r = await fetch(`/api/users/${id}`, { method: 'DELETE' });
    if (!r.ok) throw new Error("Error eliminando empleado");
    return { ok: true };
  }
};

/********** Controlador de UI **********/
const state = { 
  page: 1, 
  limit: 10, 
  search: "",
  orders: [],
  salesData: null, // Para guardar los datos de la API
  salesMonthChart: null, // Para la instancia del gráfico
  salesTypeChart: null,
  users: []  // Para la instancia del gráfico
};

const el = {
  // --- Elementos de Productos ---
  tbody: $("#tbody"),
  meta: $("#meta"),
  page: $("#page"),
  prev: $("#prev"),
  next: $("#next"),
  search: $("#search"),
  btnSearch: $("#btnSearch"),
  btnNew: $("#btnNew"),
  modalForm: $("#modalForm"),
  formTitle: $("#formTitle"),
  save: $("#save"),

  // --- Elementos de Pedidos ---
  ordersTbody: $("#orders-tbody"),
  modalGestionPedido: $("#modalGestionPedido"),
  orderModalTitle: $("#order-modal-title"),
  orderSaveButton: $("#save-order-status"),
  salesTbody: $("#sales-tbody"),
  salesFilterType: $("#sales-filter-type"),
  salesFilterMonth: $("#sales-filter-month"),
  salesByMonthCtx: $("#sales-by-month-chart")?.getContext('2d'),
  salesByTypeCtx: $("#sales-by-type-chart")?.getContext('2d'),
  usersTbody: $("#users-tbody"),
  btnNewUser: $("#btnNewUser"),
  modalUserForm: $("#modalUserForm"),
  userForm: $("#user-form"),
  userFormTitle: $("#user-form-title"),
  userPasswordField: $("#user-password-field"),
  saveUserButton: $("#save-user")
};

// --- LÓGICA DE NAVEGACIÓN POR PESTAÑAS (MODIFICADA) ---
// (Esta función reemplaza la que tenías)
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
        tab.classList.toggle('hidden', tab.id !== `tab-${tabId}`);
      });

      if (tabId === 'envios') {
        loadOrders();
      }
      if (tabId === 'ventas') {
        loadOrders();
        loadSalesDashboard();
      }
      // --- AÑADIDO ---
      if (tabId === 'empleados') {
        loadUsers(); // Carga la lista de empleados
      }
    });
  });
}


// --- LÓGICA DE PRODUCTOS (TU CÓDIGO) ---
// Dibuja las filas de la tabla
function renderRows(list = []) {
  el.tbody.innerHTML = list.map(p => `
    <tr>
      <td>
        <div style="font-weight:700">${escape(p.name)}</div>
        <div class="muted" style="font-size:12px; max-width: 400px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${escape(p.description || "")}</div>
      </td>
      <td>${escape(p.category || "—")}</td>
      <td>${fmtMoney(p.price)}</td>
      
      <td>
        <span class="status-badge-product" data-status="${escape(p.status)}">
          ${escape(p.status)}
        </span>
      </td>
      
      <td>
        <div class="row-actions">
          <button class="btn" data-edit="${p._id}" title="Editar"><i class="fa-solid fa-pen"></i></button>
          <button class="btn btn--danger" data-del="${p._id}" title="Eliminar"><i class="fa-solid fa-trash"></i></button>
        </div>
      </td>
    </tr>
  `).join("");

  $$("button[data-edit]").forEach(b => b.addEventListener("click", () => openEdit(b.dataset.edit)));
  $$("button[data-del]").forEach(b => b.addEventListener("click", () => removeProduct(b.dataset.del)));
}

// Actualiza la paginación
function paginate(total) {
  const pages = Math.max(1, Math.ceil(total / state.limit));
  el.page.textContent = `${state.page} / ${pages}`;
  el.prev.disabled = state.page <= 1;
  el.next.disabled = state.page >= pages;
  el.meta.textContent = `${total} producto${total === 1 ? '' : 's'}`;
}

// Función principal: recarga los datos
/*async function refresh() {
  try {
    const { items, total } = await api.list(state);
    renderRows(items);
    paginate(total);
  } catch(err) {
    toast(err.message, 'err');
  }
}*/

// --- 1. Función REFRESH (Arreglada para mostrar datos) ---
async function refresh() {
  try {
    const data = await api.list(state);
    
    // CORRECCIÓN: Aceptamos la lista directa (Array) o el formato viejo
    const items = Array.isArray(data) ? data : (data.items || []);
    const total = items.length;

    renderRows(items); // Dibuja la tabla
    paginate(total);   // Actualiza el contador de páginas
  } catch(err) {
    toast(err.message, 'err');
  }
}


// --- NUEVAS FUNCIONES PARA PEDIDOS ---
/**
 * Carga y renderiza la tabla de pedidos
 */
async function loadOrders() {
  try {
    const orders = await api.listOrders();
    
    state.orders = orders; // <--- ¡ESTA LÍNEA ES CRUCIAL! Asegúrate de que esté ahí.
    
    renderOrdersTable(orders);
  } catch(err) {
    toast(err.message, 'err');
  }
}

/**
 * Dibuja las filas de la tabla de pedidos
 */
function renderOrdersTable(list = []) {
  el.ordersTbody.innerHTML = list.map(p => `
    <tr>
      <td>
        <div style="font-weight:700">${escape(p.orderNumber)}</div>
        <div class="muted" style="font-size:12px;">${escape(p.customerDetails.email)}</div>
      </td>
      <td>${escape(p.customerDetails.name)}</td>
      <td>${fmtMoney(p.total)}</td>
      <td>
        <span class="status-badge" data-status="${escape(p.status)}">
          ${escape(p.status)}
        </span>
      </td>
      <td>
        <div class="row-actions">
          <button class="btn" data-manage-order="${p._id}" title="Gestionar Pedido">
            <i class="fa-solid fa-pen-to-square"></i> 
          </button>
        </div>
      </td>
    </tr>
  `).join("");

  // Conectar los nuevos botones de "Gestionar"
  $$("button[data-manage-order]").forEach(b => 
    b.addEventListener("click", () => openOrderModal(b.dataset.manageOrder))
  );
}

/**
 * Abre el modal de gestión de pedido y lo rellena con datos
 */
function openOrderModal(id) {
  // CAMBIO: Lee de state.orders, no de mockOrders
  const order = state.orders.find(o => o._id === id);
  if (!order) {
    toast("No se encontró el pedido", "err");
    return;
  }

  // Rellenar el modal
  $("#order-modal-title").textContent = `Gestionar Pedido #${order.orderNumber}`;
  $("#order-id-input").value = order._id;
  // CAMBIO: Adaptado a Mongoose (customerDetails)
  $("#order-customer-name").textContent = order.customerDetails.name;
  $("#order-customer-email").textContent = order.customerDetails.email;
  $("#order-customer-address").textContent = order.customerDetails.address;
  
  // Rellenar productos
  $("#order-products-list").innerHTML = order.products.map(
    p => `<li>(${p.qty}x) ${escape(p.name)}</li>`
  ).join("");

  // Rellenar campos de formulario
  $("#order-status-select").value = order.status;
  $("#order-tracking-input").value = order.trackingNumber || "";

  el.modalGestionPedido.classList.remove("hidden");
}

/**
 * Cierra el modal de gestión de pedido
 */
function closeOrderModal() {
  el.modalGestionPedido.classList.add("hidden");
}

/**
 * Guarda los cambios del pedido
 */
async function saveOrderStatus() {
  const id = $("#order-id-input").value;
  const status = $("#order-status-select").value; // <--- Usa el ID correcto
  const trackingNumber = $("#order-tracking-input").value.trim();

  try {
    await api.updateOrder(id, status, trackingNumber);
    toast("Pedido actualizado", "ok"); // <-- Ya no es simulado
    closeOrderModal();
    loadOrders(); // Recarga la tabla de pedidos
  } catch(err) {
    toast(err.message, "err");
  }
}

async function loadSalesDashboard() {
  try {
    const summary = await api.getSalesSummary();
    state.salesData = summary; // Guardar datos

    if (!state.orders || state.orders.length === 0) {
       state.orders = await api.listOrders();
    }

    // 1. Dibujar gráfica de ventas por mes
    renderSalesByMonthChart(summary.salesByMonth || []);

    // 2. Dibujar gráfica de ventas por tipo
    renderSalesByTypeChart(summary.salesByType || []);

    // 3. Renderizar la tabla de ventas (usa state.orders, que se carga con loadOrders)
    renderSalesTable();

  } catch (err) {
    toast(err.message, 'err');
    const salesTab = $("#tab-ventas .inv-card__body");
    if (salesTab) salesTab.innerHTML = `<p>Error al cargar el dashboard.</p>`;
  }
}

/**
 * Dibuja la gráfica de líneas (Ventas por Mes)
 */
function renderSalesByMonthChart(salesData) {
  if (!el.salesByMonthCtx) return;

  // Mapear meses
  const monthNames = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
  // Ordenar los datos (la API los da descendentes)
  const sortedData = salesData.slice().reverse();
  const labels = sortedData.map(d => `${monthNames[d._id.month - 1]} ${d._id.year}`);
  const data = sortedData.map(d => d.totalSales);

  if (state.salesMonthChart) {
    state.salesMonthChart.destroy(); // Destruir gráfica anterior
  }

  state.salesMonthChart = new Chart(el.salesByMonthCtx, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [{
        label: 'Total de Ventas',
        data: data,
        borderColor: 'rgb(183, 136, 47)', // Color --primary
        backgroundColor: 'rgba(183, 136, 47, 0.2)',
        fill: true,
        tension: 0.3
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: { y: { beginAtZero: true } }
    }
  });
}

/**
 * Dibuja la gráfica de dona (Ventas por Tipo)
 */
function renderSalesByTypeChart(salesData) {
  if (!el.salesByTypeCtx) return;

  const labels = salesData.map(d => d._id); // "Online", "Física"
  const data = salesData.map(d => d.totalSales);

  if (state.salesTypeChart) {
    state.salesTypeChart.destroy(); // Destruir gráfica anterior
  }

  state.salesTypeChart = new Chart(el.salesByTypeCtx, {
    type: 'doughnut',
    data: {
      labels: labels,
      datasets: [{
        label: 'Total de Ventas',
        data: data,
        backgroundColor: [
          '#b7882f', // Dorado (--primary)
          '#3a2622', // Café oscuro (sidebar)
          '#6d5a45'  // Café medio (--muted)
        ]
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false
    }
  });
}

/**
 * Dibuja la tabla de historial de ventas (usa state.orders)
 */
function renderSalesTable() {
  const typeFilter = el.salesFilterType.value;
  const monthFilter = el.salesFilterMonth.value; // Formato "YYYY-MM"
  const tbody = $("#sales-tbody");
  if (!tbody) return;

  // Filtrar solo los pedidos completados
  const completedOrders = (state.orders || []).filter(o => 
    o.status === 'Entregado' || o.status === 'Vendido' // 'Vendido' es para ventas físicas
  );

  const filtered = completedOrders.filter(order => {
    const typeMatch = !typeFilter || order.tipoVenta === typeFilter;

    const orderDate = new Date(order.createdAt);
    const orderMonth = `${orderDate.getFullYear()}-${(orderDate.getMonth() + 1).toString().padStart(2, '0')}`;
    const monthMatch = !monthFilter || orderMonth === monthFilter;

    return typeMatch && monthMatch;
  });

  tbody.innerHTML = filtered.map(p => `
    <tr>
      <td>${escape(p.orderNumber)}</td>
      <td>${new Date(p.createdAt).toLocaleDateString("es-MX")}</td>
      <td>${escape(p.customerDetails.name)}</td>
      <td>${escape(p.tipoVenta)}</td>
      <td>${fmtMoney(p.total)}</td>
      <td>
        <span class="status-badge" data-status="${escape(p.status)}">
          ${escape(p.status)}
        </span>
      </td>
    </tr>
  `).join("");
}

/**
 * Conecta los filtros de la tabla de ventas
 */
function wireSalesFilters() {
  el.salesFilterType.addEventListener('change', renderSalesTable);
  el.salesFilterMonth.addEventListener('change', renderSalesTable);
}

async function loadUsers() {
  try {
    const users = await api.listUsers();
    state.users = users;
    renderUsersTable(users);
  } catch(err) {
    toast(err.message, 'err');
  }
}

/**
 * Dibuja las filas de la tabla de empleados
 */
function renderUsersTable(list = []) {
  el.usersTbody.innerHTML = list.map(u => `
    <tr>
      <td>${escape(u.nombre)}</td>
      <td>${escape(u.email)}</td>
      <td>
        <span class="status-badge" data-status="${escape(u.rol)}">
          ${escape(u.rol)}
        </span>
      </td>
      <td>
        <div class="row-actions">
          <button class="btn" data-manage-user="${u._id}" title="Gestionar Rol">
            <i class="fa-solid fa-pen-to-square"></i> 
          </button>
          <button class="btn btn--danger" data-del-user="${u._id}" title="Eliminar Empleado">
            <i class="fa-solid fa-trash"></i>
          </button>
        </div>
      </td>
    </tr>
  `).join("");

  // Conectar los botones de "Gestionar" y "Eliminar"
  $$("button[data-manage-user]").forEach(b => 
    b.addEventListener("click", () => openUserModal(b.dataset.manageUser))
  );
  $$("button[data-del-user]").forEach(b => 
    b.addEventListener("click", () => removeUser(b.dataset.delUser))
  );
}

/**
 * Abre el modal para crear o editar un empleado
 */
function openUserModal(id = null) {
  el.userForm.reset();
  $("#user-id").value = id || "";

  if (id) {
    // --- MODO EDICIÓN (Gestionar Rol) ---
    const user = state.users.find(u => u._id === id);
    if (!user) {
      toast("Empleado no encontrado", "err");
      return;
    }
    el.userFormTitle.textContent = "Gestionar Rol de Empleado";
    // Rellenar campos
    $("#user-name").value = user.nombre;
    $("#user-email").value = user.email;
    $("#user-rol").value = user.rol;
    // Ocultar y deshabilitar campos que no se pueden editar
    $("#user-name").disabled = true;
    $("#user-email").disabled = true;
    el.userPasswordField.classList.add('hidden'); // Ocultar campo de contraseña
    $("#user-password").required = false;

  } else {
    // --- MODO CREACIÓN ---
    el.userFormTitle.textContent = "Crear Nuevo Empleado";
    // Mostrar y habilitar todos los campos
    $("#user-name").disabled = false;
    $("#user-email").disabled = false;
    el.userPasswordField.classList.remove('hidden');
    $("#user-password").required = true;
  }
  
  el.modalUserForm.classList.remove("hidden");
}

/**
 * Cierra el modal de empleados
 */
function closeUserModal() {
  el.modalUserForm.classList.add("hidden");
}

/**
 * Guarda el empleado (nuevo o editado)
 */
async function saveUser() {
  const id = $("#user-id").value;
  const formData = new FormData(el.userForm);
  
  try {
    if (id) {
      // --- LÓGICA DE ACTUALIZAR ROL ---
      const rol = formData.get('rol');
      await api.updateUserRole(id, rol);
      toast("Rol actualizado correctamente", "ok");
    } else {
      // --- LÓGICA DE CREAR USUARIO ---
      const userData = {
        nombre: formData.get('nombre'),
        email: formData.get('email'),
        password: formData.get('password'),
        rol: formData.get('rol')
      };
      await api.createUser(userData);
      toast("Empleado creado exitosamente", "ok");
    }
    closeUserModal();
    loadUsers(); // Recargar la tabla de empleados
  } catch(err) {
    toast(err.message, "err");
  }
}

/**
 * Elimina un empleado
 */
async function removeUser(id) {
  if (!confirm("¿Seguro que quieres eliminar a este empleado? Esta acción no se puede deshacer.")) {
    return;
  }
  try {
    await api.deleteUser(id);
    toast("Empleado eliminado", "ok");
    loadUsers(); // Recargar la tabla
  } catch(err) {
    toast(err.message, "err");
  }
}
// --- FIN DE NUEVAS FUNCIONES ---


/********** Handlers (Manejadores de Eventos) **********/

el.btnNewUser.addEventListener("click", () => openUserModal()); // Botón "Crear Empleado"
$$("[data-close-user]").forEach(b => b.addEventListener("click", closeUserModal));
el.modalUserForm.addEventListener("click", e => { 
  if (e.target === el.modalUserForm) closeUserModal(); 
});
el.saveUserButton.addEventListener("click", saveUser);
el.btnNew.addEventListener("click", openCreate);
el.btnSearch.addEventListener("click", () => { state.search = el.search.value.trim(); state.page = 1; refresh(); });
el.search.addEventListener("keydown", e => { if (e.key === "Enter") { state.search = el.search.value.trim(); state.page = 1; refresh(); } });
el.prev.addEventListener("click", () => { if (state.page > 1) { state.page--; refresh(); } });
el.next.addEventListener("click", () => { state.page++; refresh(); });

// Botón "Guardar" del modal de Producto
el.save.addEventListener("click", async () => {
  const id = $("#id").value;
  let formData;
  try {
    formData = collectForm();
  } catch(err) {
    toast(err.message, "err");
    return;
  }

  try {
    if (id) {
      await api.update(id, formData);
      toast("Producto actualizado", "ok");
    } else {
      await api.create(formData);
      toast("Producto creado", "ok");
    }
    closeModals();
    refresh();
  } catch (err) {
    toast(err.message || "Error al guardar", "err");
  }
});

// Cerrar modal de Producto
$$("[data-close]").forEach(b => b.addEventListener("click", closeModals));
el.modalForm.addEventListener("click", e => { if (e.target === el.modalForm) closeModals(); });
// Actualizado para cerrar ambos modales
window.addEventListener("keydown", (e) => { 
  if (e.key === "Escape") {
    closeModals();
    closeOrderModal();
    closeUserModal(); // <-- AÑADIDO
  } 
});

// Borrar imagen de producto
$("#current-images-preview").addEventListener('click', async (e) => {
  const deleteBtn = e.target.closest('.img-delete-btn');
  if (!deleteBtn) return; 

  const { path, id } = deleteBtn.dataset;
  if (!path || !id) return;

  if (!confirm("¿Seguro que quieres eliminar esta imagen? Esta acción no se puede deshacer.")) {
    return;
  }

  try {
    await api.deleteImage(id, path);
    toast("Imagen eliminada", "ok");
    deleteBtn.parentElement.remove();
  } catch(err) {
    toast(err.message, "err");
  }
});


// --- NUEVOS Handlers para modal de pedido ---
$$("[data-close-order]").forEach(b => b.addEventListener("click", closeOrderModal));
el.modalGestionPedido.addEventListener("click", e => { 
  if (e.target === el.modalGestionPedido) closeOrderModal(); 
});
el.orderSaveButton.addEventListener("click", saveOrderStatus);
/********** Lógica del Formulario (CRUD Productos) **********/

// Abre el modal para crear un producto
function openCreate() {
  $("#id").value = "";
  $("#name").value = "";
  $("#category").value = "";
  $("#price").value = "";
  $("#discount").value = "0";
  $("#images").value = "";
  $("#description").value = "";
  $("#highlights").value = "";
  $("#barcode").value = "";
  $("#status").value = "Disponible";

  $("#current-images-preview").innerHTML = "";
  $("#current-images-preview").classList.add("hidden");

  $("#formTitle").textContent = "Nuevo producto";
  el.modalForm.classList.remove("hidden");
}

// Abre el modal para editar
async function openEdit(id) {
  try {
    // ACTUALIZADO: Llamada directa a la API para 1 producto
    const r = await fetch(`/api/products/${id}`);
    if (!r.ok) throw new Error("Producto no encontrado");
    const product = await r.json();
    
    fillForm(product);
    $("#formTitle").textContent = "Editar producto";
    el.modalForm.classList.remove("hidden");
  } catch (err) {
    toast(err.message, "err");
  }
}

// Borra un producto
function removeProduct(id) {
  if (!confirm("¿Estás seguro de que quieres eliminar este producto?")) return;
  api.remove(id)
    .then(() => { toast("Producto eliminado", "ok"); refresh(); })
    .catch(e => toast(e.message || "Error", "err"));
}

function closeModals() {
  el.modalForm.classList.add("hidden");
}

// Rellena el formulario del modal con los datos de un producto (MODIFICADO)
function fillForm(p) {
  $("#id").value = p?._id || "";
  $("#name").value = p?.name || "";
  $("#category").value = p?.category || "";
  $("#price").value = p?.price ?? "";
  $("#discount").value = p?.discount || "0";
  $("#description").value = p?.description || "";
  $("#highlights").value = (p?.highlights || []).join(", ");
  $("#barcode").value = p?.barcode || "N/A";
  $("#images").value = ""; 
  $("#status").value = p?.status || "Disponible";
  
  const previewContainer = $("#current-images-preview");
  previewContainer.innerHTML = "";
  
  if (p.images && p.images.length > 0) {
    previewContainer.classList.remove("hidden");
    
    const title = document.createElement("p");
    title.textContent = "Imágenes actuales:";
    title.style = "width: 100%; margin: 0 0 5px; font-weight: 600; font-size: 13px;";
    previewContainer.appendChild(title);

    p.images.forEach(imgSrc => {
      const wrapper = document.createElement("div");
      wrapper.className = "img-preview-wrapper";
      
      const img = document.createElement("img");
      img.src = imgSrc;
      img.className = "img-preview";
      img.alt = "Vista previa";
      
      const deleteBtn = document.createElement("button");
      deleteBtn.className = "img-delete-btn";
      deleteBtn.innerHTML = "&times;";
      deleteBtn.title = "Eliminar esta imagen";
      deleteBtn.dataset.path = imgSrc;
      deleteBtn.dataset.id = p._id;
      
      wrapper.appendChild(img);
      wrapper.appendChild(deleteBtn);
      previewContainer.appendChild(wrapper);
    });

  } else {
    previewContainer.classList.add("hidden");
  }
}

// Recoge los datos del formulario como FormData
function collectForm() {
  const name = $("#name").value.trim();
  const price = Number($("#price").value);
  const category = $("#category").value;

  if (!name || !price || !category) {
    throw new Error("Completa Nombre, Precio y Categoría");
  }
  
  const formData = new FormData();
  
  formData.append('name', name);
  formData.append('category', category);
  formData.append('price', price);
  formData.append('discount', Number($("#discount").value) || 0);
  formData.append('description', $("#description").value.trim());
  formData.append('highlights', $("#highlights").value.trim());
  formData.append('status', $("#status").value);
  
  const imageFiles = $("#images").files;
  if (imageFiles && imageFiles.length > 0) {
    for (const file of imageFiles) {
      formData.append('images', file); 
    }
  }
  
  return formData;
}

/********** Helpers **********/
function escape(s = "") {
  return s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

/********** Init **********/
// Carga inicial
wireTabNavigation();
wireSalesFilters(); // <-- AÑADE ESTA LÍNEA
refresh();// Carga el inventario (productos) al inicio