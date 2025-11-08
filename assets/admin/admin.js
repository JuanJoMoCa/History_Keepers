/* =========================================================
   History Keepers — admin.js (Lógica del Panel de Admin)
   VERSIÓN CON SUBIDA DE ARCHIVOS (FormData)
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

/********** Adaptador de API (MODIFICADO para FormData) **********/
const api = {
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

  // --- NUEVA FUNCIÓN API ---
  async deleteImage(productId, imagePath) {
    const r = await fetch(`/api/products/${productId}/image`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ imagePath })
    });
    if (!r.ok) throw new Error((await r.json()).message || "Error eliminando imagen");
    return r.json();
  }
};

/********** Controlador de UI **********/
const state = { page: 1, limit: 10, search: "" };

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
  formTitle: $("#formTitle"),
  save: $("#save"),
};

// --- LÓGICA DE NAVEGACIÓN POR PESTAÑAS ---
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

/********** Handlers (Manejadores de Eventos) **********/

el.btnNew.addEventListener("click", openCreate);
el.btnSearch.addEventListener("click", () => { state.search = el.search.value.trim(); state.page = 1; refresh(); });
el.search.addEventListener("keydown", e => { if (e.key === "Enter") { state.search = el.search.value.trim(); state.page = 1; refresh(); } });
el.prev.addEventListener("click", () => { if (state.page > 1) { state.page--; refresh(); } });
el.next.addEventListener("click", () => { state.page++; refresh(); });

// Botón "Guardar" del modal
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

// Cerrar modales
$$("[data-close]").forEach(b => b.addEventListener("click", closeModals));
el.modalForm.addEventListener("click", e => { if (e.target === el.modalForm) closeModals(); });
window.addEventListener("keydown", (e) => { if (e.key === "Escape") closeModals(); });

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
/********** Lógica del Formulario (CRUD) **********/

// Abre el modal para crear un producto
function openCreate() {
  // Un <div> no tiene .reset(), reseteamos manualmente
  $("#id").value = "";
  $("#name").value = "";
  $("#category").value = "";
  $("#price").value = "";
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
      
      // --- NUEVO: Botón de borrar ---
      const deleteBtn = document.createElement("button");
      deleteBtn.className = "img-delete-btn";
      deleteBtn.innerHTML = "&times;";
      deleteBtn.title = "Eliminar esta imagen";
      deleteBtn.dataset.path = imgSrc; // La ruta a borrar (ej. /assets/uploads/img.jpg)
      deleteBtn.dataset.id = p._id;  // El ID del producto
      
      wrapper.appendChild(img);
      wrapper.appendChild(deleteBtn); // Añade el botón
      previewContainer.appendChild(wrapper);
    });

  } else {
    previewContainer.classList.add("hidden");
  }
}

// Recoge los datos del formulario como FormData (MODIFICADO)
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
  formData.append('description', $("#description").value.trim());
  formData.append('highlights', $("#highlights").value.trim());
  
  const imageFiles = $("#images").files;
  if (imageFiles && imageFiles.length > 0) {
    for (const file of imageFiles) {
      // Esta es la parte clave: 'images' como clave para cada archivo
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
refresh();