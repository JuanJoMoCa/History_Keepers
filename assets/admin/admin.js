/* =========================================================
   History Keepers — admin.js (Lógica del Panel de Admin)
   ========================================================= */

/********** Utils UI **********/
// Funciones de ayuda para seleccionar elementos
const $ = (s, c = document) => c.querySelector(s);
const $$ = (s, c = document) => Array.from(c.querySelectorAll(s));

// Formatear precio (simple)
const fmtMoney = (n) => "$" + (Number(n || 0)).toLocaleString("es-MX");

// Mostrar notificaciones "Toast"
function toast(msg, kind = "ok") {
  const box = $("#toasts");
  const div = document.createElement("div");
  div.className = `toast toast--${kind}`;
  // Iconos basados en la clase de la referencia
  div.innerHTML = `<i class="fa-solid ${
    kind === 'ok' ? 'fa-circle-check' : kind === 'warn' ? 'fa-triangle-exclamation' : 'fa-circle-xmark'
  }"></i> ${msg}`;
  box.appendChild(div);
  setTimeout(() => div.remove(), 2500);
}

/********** Adaptador de API **********/
// Este objeto maneja toda la comunicación con tu server.js
const api = {
  // Listar productos (con paginación y búsqueda)
  async list({ search = "", page = 1, limit = 10 } = {}) {
    const url = new URL('/api/products', window.location.origin);
    url.searchParams.set("search", search);
    url.searchParams.set("page", page);
    url.searchParams.set("limit", limit);
    const r = await fetch(url);
    if (!r.ok) throw new Error("Error listando productos");
    return r.json();
  },
  // Crear un producto nuevo (envía un objeto JSON)
  async create(productData) {
    const r = await fetch('/api/products', {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(productData)
    });
    if (!r.ok) throw new Error((await r.json()).message || "Error creando");
    return r.json();
  },
  // Actualizar un producto (envía un objeto JSON)
  async update(id, productData) {
    const r = await fetch(`/api/products/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(productData)
    });
    if (!r.ok) throw new Error((await r.json()).message || "Error actualizando");
    return r.json();
  },
  // Eliminar un producto
  async remove(id) {
    const r = await fetch(`/api/products/${id}`, { method: "DELETE" });
    if (!r.ok) throw new Error("Error eliminando");
    return { ok: true };
  }
};

/********** Controlador de UI **********/

// Estado de la página (paginación, búsqueda)
const state = { page: 1, limit: 10, search: "" };

// Elementos del DOM
const el = {
  tbody: $("#tbody"),
  meta: $("#meta"),
  page: $("#page"),
  prev: $("#prev"),
  next: $("#next"),
  search: $("#search"),
  btnSearch: $("#btnSearch"),
  btnNew: $("#btnNew"),
  modalForm: $("#modalForm"),
  form: $("#form"),
  formTitle: $("#formTitle"),
  save: $("#save"),
};

function wireTabNavigation() {
  const navLinks = $$('.inv-nav__item[data-tab]');
  const tabContents = $$('.tab-content');

  navLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const tabId = link.dataset.tab;

      // 1. Actualizar el botón activo
      navLinks.forEach(nav => nav.classList.remove('active'));
      link.classList.add('active');

      // 2. Mostrar el contenido de la pestaña
      tabContents.forEach(tab => {
        tab.classList.toggle('hidden', tab.id !== `tab-${tabId}`);
      });
    });
  });
}



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

  // Conecta los botones de "Editar" y "Eliminar" de cada fila
  $$("button[data-edit]").forEach(b => b.addEventListener("click", () => openEdit(b.dataset.edit)));
  $$("button[data-del]").forEach(b => b.addEventListener("click", () => removeProduct(b.dataset.del)));
}

// Actualiza la paginación (ej. "1 / 3")
function paginate(total) {
  const pages = Math.max(1, Math.ceil(total / state.limit));
  el.page.textContent = `${state.page} / ${pages}`;
  el.prev.disabled = state.page <= 1;
  el.next.disabled = state.page >= pages;
  el.meta.textContent = `${total} producto${total === 1 ? '' : 's'}`;
}

// Función principal: recarga los datos de la API y redibuja la tabla
async function refresh() {
  try {
    const { items, total } = await api.list(state);
    renderRows(items);
    paginate(total);
  } catch(err) {
    toast(err.message, 'err');
  }
}

/********** Handlers (Manejadores de Eventos) **********/

// Botón "Agregar nuevo"
el.btnNew.addEventListener("click", openCreate);
// Botón "Buscar"
el.btnSearch.addEventListener("click", () => { state.search = el.search.value.trim(); state.page = 1; refresh(); });
// Buscar con "Enter"
el.search.addEventListener("keydown", e => { if (e.key === "Enter") { state.search = el.search.value.trim(); state.page = 1; refresh(); } });
// Paginación
el.prev.addEventListener("click", () => { if (state.page > 1) { state.page--; refresh(); } });
el.next.addEventListener("click", () => { state.page++; refresh(); });

// Botón "Guardar" del modal
el.save.addEventListener("click", async () => {
  const id = $("#id").value;
  let payload;
  try {
    payload = collectForm(); // Recoge los datos del formulario
  } catch(err) {
    toast(err.message, "err"); // Muestra error si faltan campos
    return;
  }

  try {
    if (id) {
      await api.update(id, payload); // Actualiza si había un ID
      toast("Producto actualizado", "ok");
    } else {
      await api.create(payload); // Crea si no había ID
      toast("Producto creado", "ok");
    }
    closeModals();
    refresh();
  } catch (err) {
    toast(err.message || "Error al guardar", "err");
  }
});

// Cerrar modales
$$("[data-close]").forEach(b => b.addEventListener("click", closeModals));
el.modalForm.addEventListener("click", e => { if (e.target === el.modalForm) closeModals(); });
window.addEventListener("keydown", (e) => { if (e.key === "Escape") closeModals(); });


/********** Lógica del Formulario (CRUD) **********/

// Abre el modal para crear un producto
function openCreate() {
  $("#form").reset(); // Limpia el formulario
  $("#id").value = ""; // Asegura que no haya ID
  $("#formTitle").textContent = "Nuevo producto";
  el.modalForm.classList.remove("hidden");
}

// Abre el modal para editar (busca el producto y rellena el form)
async function openEdit(id) {
  try {
    // Para editar, necesitamos los datos de 1 producto
    // Hacemos una búsqueda simple filtrando los items que ya tenemos
    const { items } = await api.list({ search: '', page: 1, limit: 1000 }); // Obtenemos todos
    const product = items.find(p => p._id === id);
    if (!product) throw new Error("Producto no encontrado");
    
    fillForm(product); // Rellena el formulario
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

// Rellena el formulario del modal con los datos de un producto
function fillForm(p) {
  $("#id").value = p?._id || "";
  $("#name").value = p?.name || "";
  $("#category").value = p?.category || "";
  $("#price").value = p?.price ?? "";
  $("#description").value = p?.description || "";
  // Unimos los arrays con comas para rellenar los inputs
  $("#images").value = (p?.images || []).join(", ");
  $("#highlights").value = (p?.highlights || []).join(", ");
}

// Recoge los datos del formulario y los devuelve como un objeto
function collectForm() {
  const name = $("#name").value.trim();
  const price = Number($("#price").value);

  if (!name || !price) {
    throw new Error("Completa Nombre y Precio");
  }

  // El servidor se encarga de procesar los strings a arrays
  return {
    name: name,
    category: $("#category").value.trim() || "General",
    price: price,
    description: $("#description").value.trim(),
    images: $("#images").value.trim(), // Se envía como string
    highlights: $("#highlights").value.trim() // Se envía como string
  };
}

/********** Helpers **********/
// Escapa HTML para evitar XSS en la tabla
function escape(s = "") {
  return s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

/********** Init **********/
// Carga inicial
wireTabNavigation();
refresh();