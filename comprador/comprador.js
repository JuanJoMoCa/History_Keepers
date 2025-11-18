/* ================================================================
   History Keepers — comprador.js (Panel de Comprador)
   Lógica fusionada de app.js + nueva cabecera de perfil
   ================================================================ */

// ---- Estado (los productos se cargarán desde la API) ----
const state = {
  viewModes: { catalogo: "grid", buscar: "list" },
  catalogoLayout: "themed",
  lastSearch: [],
  lastCatalogFilter: null,
  isAuthenticated: false,
  user: { rol: "invitado", nombre: "Invitado" },
  products: []
};

// ---- Utilidades ----
function formatPrice(n) {
  return (n ?? 0).toLocaleString("es-MX", {
    style: "currency",
    currency: "MXN",
    maximumFractionDigits: 0
  });
}
function ph(title = "Producto") {
  const svg = encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' width='800' height='600'>
      <rect width='100%' height='100%' fill='#eee'/>
      <text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle' fill='#666' font-family='Inter,Arial' font-size='24'>${title}</text>
    </svg>`
  );
  return `data:image/svg+xml;utf8,${svg}`;
}
function normalizeStr(s) {
  return (s || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}
function buildSuggestionLexicon() {
  if (state._lexicon) return state._lexicon;
  const base = new Set();
  const add = (txt = "") =>
    txt.split(/[^A-Za-zÁÉÍÓÚÜÑáéíóúüñ0-9]+/).forEach(w => {
      if (w && w.length >= 3) base.add(w.toLowerCase());
    });
  state.products.forEach(p => { add(p.name); add(p.category); add(p.description); });
  ["jersey","balón","gorra","tarjeta","guantes","fútbol","basquetbol","béisbol", "formula 1", "boxeo", "voleibol", "música", "pokemon"].forEach(add);
  state._lexicon = Array.from(base).sort();
  return state._lexicon;
}
function getImages(p) {
  const imgs = (p.images || []).filter(src => !!src && src.trim() !== "");
  return imgs.length ? imgs : [ph(p.name)];
}
function getOffer(p) {
  const price = p.price || 0;
  const discount = p.discount || 0;
  if (discount > 0) {
    const finalPrice = price * (1 - discount / 100);
    return { finalPrice, oldPrice: price, discountPct: discount };
  } else {
    return { finalPrice: price, oldPrice: null, discountPct: 0 };
  }
}
function escape(s = "") {
  return s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

// ================================================================
// Toast (global)
let toastTimer;
function showToast(message, type = "success") {
  const toast = document.getElementById("toast-notification");
  if (!toast) return;
  clearTimeout(toastTimer);
  toast.textContent = message;
  toast.className = "toast";
  toast.classList.add(type, "show");
  toastTimer = setTimeout(() => toast.classList.remove("show"), 3000);
}

// ================================================================
// --- ARRANQUE DE LA APLICACIÓN ---
document.addEventListener("DOMContentLoaded", async () => {
  // 1. Verificar si el usuario está logueado
  await checkAuth();

  // 2. Cargar los productos REALES desde la API
  await loadProducts();
  
  // 3. Inicializar el resto de la UI
  buildMenu();
  wireFooterLinks();
  setActive("inicio"); // Carga el nuevo dashboard de inicio
  
  // 4. Conectar el nuevo menú de perfil
  wireProfileMenu();
});

/**
 * Verifica la autenticación al cargar la página
 */
async function checkAuth() {
  const userId = localStorage.getItem('hk-user-id');
  if (!userId) {
    alert("Necesitas iniciar sesión para ver esta página.");
    window.location.href = '/index.html';
    return;
  }
  
  try {
    const res = await fetch(`/api/profile/${userId}`);
    if (!res.ok) throw new Error('Sesión no válida');
    const user = await res.json();
    
    state.isAuthenticated = true;
    state.user = user;
    
    const welcome = document.getElementById('profile-welcome');
    if (welcome) welcome.textContent = `Hola, ${user.nombre.split(' ')[0]}`;

  } catch (err) {
    alert("Tu sesión ha expirado. Por favor, inicia sesión de nuevo.");
    localStorage.removeItem('hk-user-id');
    window.location.href = '/index.html';
  }
}

/**
 * Conecta el menú de perfil
 */
function wireProfileMenu() {
  const btn = document.getElementById('profile-menu-btn');
  const dropdown = document.getElementById('profile-menu-dropdown');
  const logoutBtn = document.getElementById('logout-btn');

  if (!btn || !dropdown || !logoutBtn) return;

  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    dropdown.classList.toggle('hidden');
  });

  logoutBtn.addEventListener('click', () => {
    localStorage.removeItem('hk-user-id');
    showToast("Cerrando sesión...", "ok");
    setTimeout(() => {
      window.location.href = '/index.html';
    }, 1500);
  });

  document.addEventListener('click', (e) => {
    if (!dropdown.contains(e.target) && e.target !== btn) {
      dropdown.classList.add('hidden');
    }
  });
}

/**
 * Carga productos desde la API
 */
async function loadProducts() {
  try {
    const response = await fetch('/api/products?limit=1000');
    if (!response.ok) throw new Error('No se pudieron cargar los productos');
    const data = await response.json();
    state.products = data.items || [];
  } catch (error) {
    console.error(error);
    showToast("Error al cargar productos de la tienda.", "error");
    state.products = [];
  }
}

/**
 * API Local (Frontend)
 */
const api = {
  async getMyOrders(id) {
    const r = await fetch(`/api/my-orders/${id}`);
    if (!r.ok) throw new Error("No se pudieron cargar tus pedidos");
    return r.json();
  }
};

// ================================================================
// Menú + Secciones
// ================================================================

// (Se copian las secciones de app.js)
const sections = {
  // 'inicio' se genera dinámicamente
  preguntas: `
    <div class="card">
      <h2>Preguntas Frecuentes (FAQ)</h2>
      <div class="faq-container" style="margin-top: 20px;">
        <details class="faq-item">
          <summary>¿Los productos son originales?</summary>
          <p>Sí, todos nuestros artículos son 100% originales y certificados.</p>
        </details>
        <details class="faq-item">
          <summary>¿Cómo funciona el envío?</summary>
          <p>Realizamos envíos a todo el país. El costo y tiempo de entrega se calculan al finalizar la compra.</p>
        </details>
      </div>
    </div>
  `
};

/**
 * CONSTRUIR MENÚ (MODIFICADO)
 * Se elimina la pestaña "Deportes"
 */
function buildMenu() {
  const nav = document.querySelector("nav.menu");
  if (!nav) return;
  const items = [
    { key: "inicio",   label: "Inicio" },
    { key: "catalogo", label: "Catálogo" },
    { key: "buscar", label: "Buscar" }
  ];
  nav.innerHTML = `<ul>
    ${items.map(i => `<li><a href="#" data-key="${i.key}">${i.label}</a></li>`).join("")}
  </ul>`;
  nav.querySelectorAll("a").forEach(a => {
    a.addEventListener("click", e => {
      e.preventDefault();
      setActive(a.dataset.key);
    });
  });
}

function wireFooterLinks() {
  document.querySelectorAll('footer [data-key]').forEach(a => {
    a.addEventListener('click', e => {
      e.preventDefault();
      setActive(a.dataset.key);
      window.scrollTo(0, 0);
    });
  });
}

/**
 * SET ACTIVE (MODIFICADO)
 * Se elimina la lógica de "home" (Deportes)
 */
function setActive(key) {
  document.querySelectorAll("nav.menu a").forEach(a => {
    a.classList.toggle("active", a.dataset.key === key);
  });
  const content = document.querySelector("section.content");
  if (!content) return;

  if (key === "inicio") { renderInicioDashboard(); return; } // <-- CAMBIO
  if (key === "catalogo"){ renderCatalog(); return; }
  if (key === "buscar")  { renderBuscar();  return; }
  content.innerHTML = sections[key] || "";
}

// --- Lógica de renderizado (copiada de app.js) ---

function createProductCard(p) {
  const imgs = getImages(p);
  const { finalPrice, oldPrice, discountPct } = getOffer(p);
  const primary = imgs[0];

  return `
    <div class="card product-card" data-id="${p._id}" tabindex="0">
      <div class="pc-media">
        <img class="pc-img" src="${primary}" alt="${p.name}">
        ${discountPct ? `<span class="pc-badge">${discountPct}% OFF</span>` : ``}
      </div>
      <div class="pc-body">
        <div class="pc-title">${p.name}</div>
        <div class="pc-price">
          <span class="pc-current">${formatPrice(finalPrice)}</span>
          ${oldPrice ? `<span class="pc-old">${formatPrice(oldPrice)}</span>` : ``}
          ${discountPct ? `<span class="pc-off">${discountPct}% OFF</span>` : ``}
        </div>
        <a class="btn" href="/producto/producto.html?id=${encodeURIComponent(p._id)}">Ver</a>
      </div>
    </div>
  `;
}

function renderProductsHTML(products, mode = "grid", { center = false } = {}) {
  const wrapperClass = mode === "grid"
    ? `grid ${center ? "grid-center" : ""}`
    : "list-vertical";
  return `<div class="${wrapperClass}" style="margin-top:10px;">
    ${products.map(createProductCard).join("")}
  </div>`;
}

/**
 * RENDER INICIO (MODIFICADO)
 * Ahora es el nuevo Dashboard
 */
async function renderInicioDashboard() {
  const content = document.querySelector("section.content");
  if (!content) return;

  // 1. Definir categorías (Igual que antes)
  const allCategories = [
    { name: "Fútbol", img: "/assets/Categorias/futbol.avif" },
    { name: "Baloncesto", img: "/assets/Categorias/basket.jpg" },
    { name: "Béisbol", img: "/assets/Categorias/beisbol.webp" },
    { name: "Fútbol Americano", img: "/assets/Categorias/americano.jpeg" },
    { name: "Boxeo", img: "/assets/Categorias/boxeo.avif" },
    { name: "Fórmula 1", img: "/assets/Categorias/f1.jpg" },
    { name: "Música", img: "/assets/Categorias/musica.jpg" },
    { name: "Pokemon", img: "/assets/Categorias/pokemon.jpg" },
    { name: "Voleibol", img: "/assets/Categorias/voleibol.avif" }
  ];

  const categoryCarouselHTML = allCategories.map(cat => `
    <div class="category-tile" data-category="${cat.name}" 
         style="background-image: url('${cat.img}');">
      <h3>${cat.name}</h3>
    </div>
  `).join("");

  // 2. Renderizar la estructura del Dashboard
  // NOTA: Asegúrate de que el ID del tbody sea 'recent-orders-tbody'
  content.innerHTML = `
    <div class="card section-center" style="margin-bottom: 20px;">
      <h2>Bienvenido/a, ${state.user.nombre.split(' ')[0]}</h2>
    </div>
    
    <div class="dashboard-grid-comprador"> 
      <section class="inv-card" style="margin-bottom: 20px;">
        <div class="inv-card__head">
          <div class="inv-card__title">
            <h3>Mis Pedidos Recientes</h3>
          </div>
        </div>
        <div class="inv-tablewrap">
          <table class="inv-table">
            <thead>
              <tr>
                <th>N° Pedido</th>
                <th>Total</th>
                <th>Estatus</th>
              </tr>
            </thead>
            <tbody id="recent-orders-tbody">
              <tr><td colspan="3" class="muted" style="padding: 20px; text-align: center;">Cargando pedidos...</td></tr>
            </tbody>
          </table>
        </div>
      </section>
      
      <section class="inv-card">
        <div class="inv-card__head">
          <div class="inv-card__title">
            <h3>Explora por Categoría</h3>
          </div>
        </div>
        <div class="inv-card__body" style="padding: 20px;">
          <div class="category-carousel-container">
            <div class="category-carousel">
              ${categoryCarouselHTML}
            </div>
          </div>
        </div>
      </section>
    </div>
  `;

  // 3. Conectar tarjetas de categoría
  content.querySelectorAll('.category-tile').forEach(card => {
    card.addEventListener('click', () => {
      const category = card.dataset.category;
      renderCatalog(category);
      document.querySelectorAll("nav.menu a").forEach(a => {
        a.classList.toggle("active", a.dataset.key === 'catalogo');
      });
    });
  });

  // 4. Cargar Pedidos Recientes (CORREGIDO)
  const tbody = document.getElementById("recent-orders-tbody");
  
  if (!state.user._id) {
    console.warn("No hay ID de usuario para cargar pedidos.");
    tbody.innerHTML = `<tr><td colspan="3" class="muted" style="text-align: center;">Error de sesión</td></tr>`;
    return;
  }

  try {
    // Llamamos a la API
    const orders = await api.getMyOrders(state.user._id);
    
    // Si no hay pedidos, mostramos mensaje
    if (!orders || orders.length === 0) {
      tbody.innerHTML = `<tr><td colspan="3" class="muted" style="padding: 20px; text-align: center;">No hay pedidos recientes.</td></tr>`;
      return;
    }

    // Tomamos solo los 3 más recientes
    const recentOrders = orders.slice(0, 3);

    // Renderizamos las filas
    tbody.innerHTML = recentOrders.map(order => `
      <tr>
        <td>${escape(order.orderNumber)}</td>
        <td>${formatPrice(order.total)}</td>
        <td>
          <span class="status-badge" data-status="${escape(order.status)}">
            ${escape(order.status)}
          </span>
        </td>
      </tr>
    `).join("");

  } catch (err) {
    console.error("Error cargando pedidos dashboard:", err);
    tbody.innerHTML = `<tr><td colspan="3" class="muted" style="padding: 20px; text-align: center;">No se pudieron cargar los pedidos.</td></tr>`;
  }
}

// (El resto de las funciones: renderCatalog, renderBuscar, wireProductCardHover, etc.
// se copian de 'app.js' y no necesitan cambios)

function renderCatalog(filterCategory = null) {
  const content = document.querySelector("section.content");
  if (!content) return;
  state.lastCatalogFilter = filterCategory ?? null;
  const productsToShow = filterCategory
    ? state.products.filter(p => p.category === filterCategory)
    : state.products;
  const title = filterCategory ? `Catálogo: ${filterCategory}` : "Catálogo";
  const subtitle = filterCategory
    ? `Mostrando artículos de ${filterCategory}.`
    : "Explora todos nuestros artículos destacados.";
  const mode = state.viewModes.catalogo || "grid";
  const has = productsToShow.length > 0;

  content.innerHTML = `
    <div class="card">
      <div class="section-head">
        <div>
          <h2>${title}</h2>
          <p class="small">${subtitle}</p>
        </div>
        <button class="btn icon-btn" id="toggle-catalogo"
          title="Cambiar a vista ${mode === "grid" ? "lista" : "cuadrícula"}"
          aria-label="Cambiar vista">
          ${mode === "grid" ? "≡" : "▦"}
        </button>
      </div>
      ${has
        ? renderProductsHTML(productsToShow, mode, { center: mode === "grid" })
        : `<p class="small" style="margin-top:10px;">No se encontraron productos.</p>`}
    </div>
  `;
  document.getElementById("toggle-catalogo")?.addEventListener("click", () => {
    state.viewModes.catalogo = (state.viewModes.catalogo === "grid") ? "list" : "grid";
    renderCatalog(state.lastCatalogFilter);
  });
  wireProductCardHover(content);
}

function renderBuscar() {
  const content = document.querySelector("section.content");
  if (!content) return;
  const mode = state.viewModes.buscar || "list";
  content.innerHTML = `
    <div class="card">
      <div class="section-head">
        <h2>Buscar</h2>
        <button class="btn icon-btn" id="toggle-buscar"
          title="Cambiar a vista ${mode === "grid" ? "lista" : "cuadrícula"}"
          aria-label="Cambiar vista">
          ${mode === "grid" ? "≡" : "▦"}
        </button>
      </div>
      <div style="display:flex; gap:8px;">
        <div class="autocomplete" style="flex:1;">
          <input id="q" class="input" placeholder="Ej. jersey, balón, tarjeta..." autocomplete="off" />
          <div id="suggestions" class="suggestions hidden"></div>
        </div>
        <button class="btn" id="btn-search">Buscar</button>
      </div>
      <div id="results" style="margin-top:12px"></div>
    </div>
  `;
  const btn   = content.querySelector("#btn-search");
  const q     = content.querySelector("#q");
  const res   = content.querySelector("#results");
  const sBox  = content.querySelector("#suggestions");
  const words = buildSuggestionLexicon();

  function renderSuggestions(prefix) {
    const p = normalizeStr(prefix.trim());
    if (p.length < 2) { sBox.classList.add("hidden"); sBox.innerHTML = ""; return; }
    const matches = words.filter(w => normalizeStr(w).startsWith(p)).slice(0, 8);
    if (matches.length === 0) { sBox.classList.add("hidden"); sBox.innerHTML = ""; return; }
    sBox.innerHTML = matches.map(m => `<button type="button" class="suggestion" data-term="${m}">${m}</button>`).join("");
    sBox.classList.remove("hidden");
    sBox.querySelectorAll(".suggestion").forEach(b => {
      b.addEventListener("click", () => {
        q.value = b.dataset.term;
        sBox.classList.add("hidden");
        doSearch();
        q.focus();
      });
    });
  }

  function renderResultsFromState() {
    const mode = state.viewModes.buscar || "list";
    const tbtn = document.getElementById("toggle-buscar");
    if (tbtn) tbtn.innerHTML = (mode === "grid") ? "≡" : "▦";
    if (!state.lastSearch || state.lastSearch.length === 0) {
      res.innerHTML = `<p class="small">Escribe algo para buscar.</p>`;
      return;
    }
    res.innerHTML = renderProductsHTML(state.lastSearch, mode, { center: false });
    wireProductCardHover(res);
  }

  function doSearch() {
    const term = (q.value || "").trim();
    if (!term) { state.lastSearch = []; renderResultsFromState(); return; }
    const needle = normalizeStr(term);
    state.lastSearch = state.products.filter(p =>
      normalizeStr(`${p.name} ${p.description ?? ""} ${p.category ?? ""}`).includes(needle)
    );
    renderResultsFromState();
  }

  btn.addEventListener("click", doSearch);
  q.addEventListener("keydown", e => { if (e.key === "Enter") doSearch(); });
  q.addEventListener("input", () => renderSuggestions(q.value));
  document.addEventListener("click", (e) => {
    if (!sBox.contains(e.target) && e.target !== q) sBox.classList.add("hidden");
  });
  document.getElementById("toggle-buscar")?.addEventListener("click", () => {
    state.viewModes.buscar = (state.viewModes.buscar === "grid") ? "list" : "grid";
    renderResultsFromState();
  });
  renderResultsFromState();
}

function wireProductCardHover(scopeEl) {
  const cards = scopeEl.querySelectorAll('.product-card');
  cards.forEach(card => {
    const id = card.dataset.id;
    const p = state.products.find(x => x._id === id);
    if (!p) return;
    const imgs = getImages(p);
    const imgEl = card.querySelector('.pc-img');
    
    card.addEventListener('click', (e) => {
      if (e.target.closest('a.btn')) return;
      window.location.href = `/producto/producto.html?id=${p._id}`;
    });

    if (imgs.length <= 1) return;
    let i = 0, t = null;
    const start = () => {
      if (t) return;
      t = setInterval(() => {
        i = (i + 1) % imgs.length;
        if(imgEl) imgEl.src = imgs[i];
      }, 1200);
    };
    const stop = () => {
      if (t) clearInterval(t);
      t = null;
      i = 0;
      if(imgEl) imgEl.src = imgs[0];
    };
    card.addEventListener('mouseenter', start);
    card.addEventListener('mouseleave', stop);
    card.addEventListener('focusin', start);
    card.addEventListener('focusout', stop);
  });
}