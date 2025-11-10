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
    kind === 'ok' ? 'fa-circle-check' : kind === 'warn' ? 'fa-triangle-exclamation' : 'fa-circle-xmark'
  }"></i> ${msg}`;
  box.appendChild(div);
  setTimeout(() => div.remove(), 2500);
}

// --- DATOS DE EJEMPLO (MOCK) PARA PEDIDOS ---
// (Esto lo moverás a tu API/BD después)
let mockOrders = [
  {
    _id: "order_1", orderNumber: "HK-12345",
    customer: { name: "Juan Pérez", email: "juan@correo.com" },
    shippingAddress: { calle: "Av. Siempre Viva 123", ciudad: "Springfield", cp: "12345" },
    products: [{ name: "Jersey Retro 1998", qty: 1 }, { name: "Gorra Edición Especial", qty: 2 }],
    total: 7300, status: "Pagado", trackingNumber: ""
  },
  {
    _id: "order_2", orderNumber: "HK-12346",
    customer: { name: "Ana García", email: "ana@correo.com" },
    shippingAddress: { calle: "Calle Falsa 456", ciudad: "Ciudad Capital", cp: "67890" },
    products: [{ name: "Balón Firmado Leyenda", qty: 1 }],
    total: 12800, status: "En Preparación", trackingNumber: ""
  },
  {
    _id: "order_3", orderNumber: "HK-12347",
    customer: { name: "Carlos Sánchez", email: "carlos@correo.com" },
    shippingAddress: { calle: "Blvd. Principal 789", ciudad: "Metrópolis", cp: "10112" },
    products: [{ name: "Tarjeta Rookie 1986", qty: 1 }],
    total: 4200, status: "Enviado", trackingNumber: "FEDEX-987654321"
  }
];


/********** Adaptador de API (Fusionado) **********/
const api = {
  // --- FUNCIONES DE PRODUCTOS (TU CÓDIGO) ---
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

  // --- NUEVAS FUNCIONES DE PEDIDOS (Simuladas) ---
  async listOrders() {
    console.log("Simulando: listOrders()");
    // En el futuro, esto sería:
    // const r = await fetch('/api/orders'); return r.json();
    return Promise.resolve(mockOrders); // Devuelve los datos de ejemplo
  },

  async updateOrder(id, status, trackingNumber) {
    console.log("Simulando: updateOrder()", { id, status, trackingNumber });
    // En el futuro, esto sería:
    // const r = await fetch(`/api/orders/${id}`, { 
    //   method: "PUT",
    //   headers: { "Content-Type": "application/json" },
    //   body: JSON.stringify({ status, trackingNumber })
    // });
    // if (!r.ok) throw new Error("Error actualizando pedido");
    
    // Simulación: Actualizar el mock
    const order = mockOrders.find(o => o._id === id);
    if (order) {
      order.status = status;
      order.trackingNumber = trackingNumber;
    }
    return Promise.resolve(order);
  }
};

/********** Controlador de UI **********/
const state = { page: 1, limit: 10, search: "" };

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

  // --- NUEVOS Elementos de Pedidos ---
  ordersTbody: $("#orders-tbody"),
  modalGestionPedido: $("#modalGestionPedido"),
  orderModalTitle: $("#order-modal-title"),
  orderSaveButton: $("#save-order-status")
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

      // --- PARTE MODIFICADA ---
      // Si se hace clic en "envios", carga la tabla de pedidos
      if (tabId === 'envios') {
        loadOrders();
      }
      // --- FIN DE LA MODIFICACIÓN ---
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
async function refresh() {
  try {
    const { items, total } = await api.list(state);
    renderRows(items);
    paginate(total);
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
        <div class="muted" style="font-size:12px;">${escape(p.customer.email)}</div>
      </td>
      <td>${escape(p.customer.name)}</td>
      <td>${fmtMoney(p.total)}</td>
      <td>
        <span class="status-badge" data-status="${escape(p.status)}">
          ${escape(p.status)}
        </span>
      </td>
      <td>
        <div class="row-actions">
          <button class="btn" data-manage-order="${p._id}" title="Gestionar Pedido">
            <i class="fa-solid fa-pen-to-square"></i> Gestionar
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
  // Usamos los datos mock. En el futuro, podrías hacer un fetch del pedido por ID
  const order = mockOrders.find(o => o._id === id);
  if (!order) {
    toast("No se encontró el pedido", "err");
    return;
  }

  // Rellenar el modal
  $("#order-modal-title").textContent = `Gestionar Pedido #${order.orderNumber}`;
  $("#order-id-input").value = order._id;
  $("#order-customer-name").textContent = order.customer.name;
  $("#order-customer-email").textContent = order.customer.email;
  $("#order-customer-address").textContent = `${order.shippingAddress.calle}, ${order.shippingAddress.ciudad}, C.P. ${order.shippingAddress.cp}`;
  
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
  const status = $("#order-status-select").value;
  const trackingNumber = $("#order-tracking-input").value.trim();

  try {
    await api.updateOrder(id, status, trackingNumber);
    toast("Pedido actualizado (Simulado)", "ok");
    closeOrderModal();
    loadOrders(); // Recarga la tabla de pedidos
  } catch(err) {
    toast(err.message, "err");
  }
}
// --- FIN DE NUEVAS FUNCIONES ---


/********** Handlers (Manejadores de Eventos) **********/

// --- Handlers de Productos (TU CÓDIGO) ---
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
    formData = collectForm(); // Recoge los datos como FormData
  } catch(err) {
    toast(err.message, "err");
    return;
  }

  try {
    if (id) {
      await api.update(id, formData); // Actualiza
      toast("Producto actualizado", "ok");
    } else {
      await api.create(formData); // Crea
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
window.addEventListener("keydown", (e) => { if (e.key === "Escape") closeModals(); });

// Borrar imagen de producto
$("#current-images-preview").addEventListener('click', async (e) => {
  const deleteBtn = e.target.closest('.img-delete-btn');
  if (!deleteBtn) return; // No se hizo clic en un botón de borrar

  const { path, id } = deleteBtn.dataset;
  if (!path || !id) return;

  if (!confirm("¿Seguro que quieres eliminar esta imagen? Esta acción no se puede deshacer.")) {
    return;
  }

  try {
    await api.deleteImage(id, path);
    toast("Imagen eliminada", "ok");
    // Elimina el elemento de la UI
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
  // Un <div> no tiene .reset(), reseteamos manualmente
  $("#id").value = "";
  $("#name").value = "";
  $("#category").value = "";
  $("#price").value = "";
  $("#discount").value = "0";
  $("#images").value = "";
  $("#description").value = "";
  $("#highlights").value = "";

  // Oculta la vista previa de imágenes
  $("#current-images-preview").innerHTML = "";
  $("#current-images-preview").classList.add("hidden");

  $("#formTitle").textContent = "Nuevo producto";
  el.modalForm.classList.remove("hidden");
}

// Abre el modal para editar
async function openEdit(id) {
  try {
    const { items } = await api.list({ limit: 1000 }); // Obtenemos todos
    const product = items.find(p => p._id === id);
    if (!product) throw new Error("Producto no encontrado");
    
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

// Cierra todos los modales
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
  $("#images").value = ""; 
  
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
refresh(); // Carga el inventario (productos) al inicio