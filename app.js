// ================================================================
// History Keepers — index.js (lógica exclusiva de index.html)
// ================================================================

// ---- Estado y datos base (catálogo mínimo para home/buscar/slider)
const state = {
  viewModes: { catalogo: "grid", buscar: "list" },
  lastSearch: [],
  lastCatalogFilter: null,
  index: 0,
  timer: null,
  slides: [],
  isAuthenticated: false,
  user: { rol: "invitado", nombre: "Invitado" },
  products: [] // <-- Se cargará desde la API
};

// ---- Utilidades
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
// Normaliza texto (minúsculas y sin acentos)
function normalizeStr(s) {
  return (s || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

// Crea un léxico simple para autocompletar (una sola vez)
function buildSuggestionLexicon() {
  if (state._lexicon) return state._lexicon;
  const base = new Set();
  const add = (txt = "") =>
    txt.split(/[^A-Za-zÁÉÍÓÚÜÑáéíóúüñ0-9]+/).forEach(w => {
      if (w && w.length >= 3) base.add(w.toLowerCase());
    });
  state.products.forEach(p => { add(p.name); add(p.category); add(p.description); });
  // Términos genéricos
  ["jersey","balón","gorra","tarjeta","guantes","fútbol","basquetbol","béisbol", "formula 1", "boxeo", "voleibol"].forEach(add);
  state._lexicon = Array.from(base).sort();
  return state._lexicon;
}

function getImages(p) {
  const imgs = (p.images || []).filter(src => !!src && src.trim() !== "");
  return imgs.length ? imgs : [ph(p.name)];
}

// Devuelve {oldPrice, discountPct} si hay oferta; soporta oldPrice o discountPercent
function getOffer(p) {
  const price = p.price || 0;
  const discount = p.discount || 0; // p.discount es el porcentaje
  
  if (discount > 0) {
    const finalPrice = price * (1 - discount / 100);
    return {
      finalPrice: finalPrice,
      oldPrice: price, // El precio original
      discountPct: discount
    };
  } else {
    return {
      finalPrice: price,
      oldPrice: null,
      discountPct: 0
    };
  }
}

function createMiniProductCard(p) {
  const imgs = getImages(p);
  const { finalPrice, oldPrice, discountPct } = getOffer(p);

  return `
    <div class="card product-card mini h-item" data-id="${p._id}">
      <div class="pc-media">
        <img class="pc-img" src="${imgs[0]}" alt="${p.name}">
        ${discountPct ? `<span class="pc-badge">${discountPct}% OFF</span>` : ``}
      </div>
      <div class="pc-body">
        <div class="pc-title">${p.name}</div>
        <div class="pc-price">
          <span class="pc-current">${formatPrice(finalPrice)}</span>
          ${oldPrice ? `<span class="pc-old">${formatPrice(oldPrice)}</span>` : ``}
        </div>
      </div>
    </div>
  `;
}

function renderCarousel(products) {
  return `<div class="h-carousel">
    ${products.map(createMiniProductCard).join("")}
  </div>`;
}

function renderImageStrip(imgs = []) {
  if (!imgs.length) return '';
  return `<div class="image-strip">
    ${imgs.map(src => `<img src="${src}" alt="Coleccionable">`).join("")}
  </div>`;
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
// Inicialización (solo elementos presentes en index.html)
document.addEventListener("DOMContentLoaded", async () => {
  // 1. Conectar lógica de modales y login
  wireTopbarModals();
  wireAuthForms();
  updateUIForAuthState(); // (Esto leerá si el usuario ya está logueado)

  // 2. Cargar los productos REALES desde la API
  await loadProducts();
  
  // 3. Inicializar el resto de la UI
  if (document.querySelector(".slider")) {
    await initSlider();
    wireSliderControls();
  }
  
  buildMenu();
  wireFooterLinks();
  setActive("inicio"); // Cargar la pestaña de inicio por defecto
  
  // 4. Listener global de 'Escape'
  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeAnyModal();
  });
});

async function loadProducts() {
  try {
    const response = await fetch('/api/products?limit=1000'); // Pedir todos
    if (!response.ok) {
      throw new Error('No se pudieron cargar los productos');
    }
    const data = await response.json();
    state.products = data.items || []; // Guardar productos en el estado
  } catch (error) {
    console.error(error);
    showToast("Error al cargar productos de la tienda.", "error");
    state.products = []; // Usar array vacío si falla
  }
}

async function initSlider() {
  try {
    const res = await fetch("/data/slides.json", { cache: "no-store" });
    if (res.ok) state.slides = await res.json();
  } catch (_) { /* fallback */ }

  if (!Array.isArray(state.slides) || state.slides.length === 0) {
    state.slides = state.products.map(p => ({
      src: (p.images && p.images[0]) || ph(p.name),
      title: p.name,
      caption: p.description || "Artículo de colección"
    }));
  }

  buildSlider();
  startAuto();
}

function renderProductsHTML(products, mode = "grid", { center = false } = {}) {
  const wrapperClass = mode === "grid"
    ? `grid ${center ? "grid-center" : ""}`
    : "list-vertical";
  return `<div class="${wrapperClass}" style="margin-top:10px;">
    ${products.map(createProductCard).join("")}
  </div>`;
}


// ================================================================
// Slider (index)
function buildSlider() {
  const slidesWrap = document.querySelector(".slides");
  if (!slidesWrap) return;

  slidesWrap.innerHTML = "";
  state.slides.forEach(s => {
    const el = document.createElement("div");
    el.className = "slide";
    el.style.backgroundImage = `url("${s.src}")`;
    el.innerHTML = `
      <div class="caption">
        <h3>${s.title ?? ""}</h3>
        <p>${s.caption ?? ""}</p>
      </div>
    `;
    slidesWrap.appendChild(el);
  });

  buildDots();
  updateSlider();
}
function buildDots() {
  const dots = document.querySelector(".dots");
  if (!dots) return;
  dots.innerHTML = "";
  state.slides.forEach((_, i) => {
    const d = document.createElement("button");
    d.className = "dot";
    d.setAttribute("aria-label", `Ir a slide ${i + 1}`);
    d.addEventListener("click", () => go(i));
    dots.appendChild(d);
  });
}
function wireSliderControls() {
  const slider = document.querySelector(".slider");
  if (!slider) return;
  slider.addEventListener("mouseenter", stopAuto);
  slider.addEventListener("mouseleave", startAuto);
  document.querySelector(".ctrl.prev")?.addEventListener("click", prev);
  document.querySelector(".ctrl.next")?.addEventListener("click", next);
  window.addEventListener("keydown", (e) => {
    if (e.key === "ArrowRight") next();
    if (e.key === "ArrowLeft") prev();
  });
}
function go(i) {
  state.index = (i + state.slides.length) % state.slides.length;
  updateSlider();
  restartAuto();
}
function updateSlider() {
  const slidesWrap = document.querySelector(".slides");
  if (!slidesWrap) return;
  slidesWrap.style.transform = `translateX(-${state.index * 100}%)`;
  document.querySelectorAll(".dot").forEach((d, idx) => {
    d.classList.toggle("active", idx === state.index);
  });
}
function prev() { go(state.index - 1); }
function next() { go(state.index + 1); }
function startAuto() { stopAuto(); state.timer = setInterval(() => next(), 4500); }
function stopAuto() { if (state.timer) clearInterval(state.timer); state.timer = null; }
function restartAuto() { stopAuto(); startAuto(); }

// ================================================================
// Menú + Secciones (index)
const sections = {
  inicio: `
    <div class="card section-center">
      <h2>Inicio</h2>
      <p class="small">Bienvenido a History Keepers. Usa las pestañas para explorar el sitio.</p>
    </div>
  `,
  home: `
    <div class="card section-center">
      <h2>Explora por Deporte</h2>
      <p class="small">Selecciona tu disciplina para ver los artículos de colección correspondientes.</p>
      <div class="grid grid-center" style="margin-top:10px;">
        <div class="card category-card" data-category="Fútbol" style="background-image: url('/assets/Categorias/futbol.jpg');">
          <h3>Fútbol</h3>
          <p class="small">Jerseys, balones y guantes históricos.</p>
        </div>
        <div class="card category-card" data-category="Básquetbol" style="background-image: url('/assets/Categorias/basket.jpg');">
          <h3>Básquetbol</h3>
          <p class="small">Tarjetas rookie y memorabilia.</p>
        </div>
        <div class="card category-card" data-category="Béisbol" style="background-image: url('/assets/Categorias/beisbol.jpg');">
          <h3>Béisbol</h3>
          <p class="small">(Próximamente)</p>
        </div>
      </div>
    </div>
  `,
  preguntas: `
    <div class="card">
      <h2>Preguntas Frecuentes (FAQ)</h2>
      <p class="small">Encuentra respuestas a las dudas más comunes sobre nuestros productos y servicios.</p>
      <div class="faq-container" style="margin-top: 20px;">
        <details class="faq-item">
          <summary>¿Los productos son originales?</summary>
          <p>Sí, todos nuestros artículos son 100% originales y certificados. Nos especializamos en memorabilia auténtica y trabajamos directamente con proveedores verificados.</p>
        </details>
        <details class="faq-item">
          <summary>¿Cómo funciona el envío?</summary>
          <p>Realizamos envíos a todo el país. El costo y tiempo de entrega dependen de tu ubicación y se calculan al finalizar la compra. Todos los artículos se envían con protección especial para coleccionistas.</p>
        </details>
        <details class="faq-item">
          <summary>¿Puedo devolver un producto?</summary>
          <p>Aceptamos devoluciones hasta 30 días después de la compra, siempre y cuando el producto se encuentre en el mismo estado en que fue enviado y conserve sus etiquetas y certificados.</p>
        </details>
        <details class="faq-item">
          <summary>¿Tienen tienda física?</summary>
          <p>Por el momento operamos 100% en línea para poder ofrecerte el mejor catálogo de coleccionables de todo el mundo.</p>
        </details>
      </div>
    </div>
  `
};

function buildMenu() {
  const nav = document.querySelector("nav.menu");
  if (!nav) return;

  const items = [
    { key: "inicio",   label: "Inicio" },
    { key: "home", label: "Deportes" },
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

function setActive(key) {
  document.querySelectorAll("nav.menu a").forEach(a => {
    a.classList.toggle("active", a.dataset.key === key);
  });
  const content = document.querySelector("section.content");
  if (!content) return;

  if (key === "inicio") { renderInicio(); return; }
  if (key === "home") {
    content.innerHTML = sections[key] || "";
    content.querySelectorAll('.category-card').forEach(card => {
      card.addEventListener('click', () => {
        const category = card.dataset.category;
        renderCatalog(category);
        document.querySelectorAll("nav.menu a").forEach(a => {
          a.classList.toggle("active", a.dataset.key === 'catalogo');
        });
      });
    });
    return;
    
  }
    
  if (key === "catalogo"){ renderCatalog(); return; }
  if (key === "buscar")  { renderBuscar();  return; }

  content.innerHTML = sections[key] || "";
}

function createProductCard(p) {
  const imgs = getImages(p);
  const { finalPrice, oldPrice, discountPct } = getOffer(p); // Usar la nueva lógica
  const primary = imgs[0];

  // IMPORTANTE:
  // 1. data-id ahora usa p._id
  // 2. El <a> ahora usa p._id
  // 3. Los precios usan finalPrice y oldPrice
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

function renderInicio() {
  const content = document.querySelector("section.content");
  if (!content) return;

  const imgsAll = state.products.flatMap(p => getImages(p));
  const img1 = imgsAll[0] || ph("Ofertas");
  const img2 = imgsAll[1] || ph("Primera compra");
  const img3 = imgsAll[2] || ph("Esenciales");
  const img4 = imgsAll[3] || ph("Favoritos");

  const withOffer = state.products.filter(p => getOffer(p).discountPct);
  const ofertas    = withOffer.length ? withOffer : state.products.slice(0, 6);
  const destacados = state.products.slice(0, 10);
  const visualImgs = (imgsAll.length ? imgsAll : [
    ph("Jersey"), ph("Balón"), ph("Tarjeta"), ph("Guantes"), ph("Poster")
  ]).slice(0, 12);

  content.innerHTML = `
    <!-- NUEVA franja superior (4 paneles) -->
    <section class="tpanels">
      <article class="tpanel">
        <div class="tp-copy">
          <small>DESTACADOS</small>
          <h3>Ofertas en tendencia</h3>
          <a class="tp-link" href="#" data-key="catalogo">Ver más</a>
        </div>
        <div class="tp-img" style="background-image:url('${img1}')"></div>
      </article>

      <article class="tpanel">
        <div class="tp-copy">
          <small>NUEVO</small>
          <h3>Tu primera compra</h3>
          <a class="tp-link" href="#" data-key="catalogo">Explorar catálogo</a>
        </div>
        <div class="tp-img" style="background-image:url('${img2}')"></div>
      </article>

      <article class="tpanel">
        <div class="tp-copy">
          <small>PROMOS</small>
          <h3>Hasta 25% en coleccionables</h3>
          <a class="tp-link" href="#" data-key="catalogo">Descubrir</a>
        </div>
        <div class="tp-img" style="background-image:url('${img3}')"></div>
      </article>

      <article class="tpanel">
        <div class="tp-copy">
          <small>TUS FAVORITOS</small>
          <h3>Colecciones más vistas</h3>
          <a class="tp-link" href="#" data-key="catalogo">Ver ahora</a>
        </div>
        <div class="tp-img" style="background-image:url('${img4}')"></div>
      </article>
    </section>

    <!-- Grilla principal -->
    <div class="home-sections">
      <!-- Ofertas en tendencia (más ancho) -->
      <section class="card h-card h-span-2">
        <div class="section-head">
          <h3>Ofertas en tendencia</h3>
          <a href="#" data-key="catalogo">Ver más</a>
        </div>
        ${renderCarousel(ofertas)}
      </section>

      <!-- Comienza con tu elección -->
      <section class="card h-card">
        <div class="section-head">
          <h3>Comienza con tu elección</h3>
          <a href="#" data-key="catalogo">Explorar catálogo</a>
        </div>
        <p class="small">Compra en cualquier categoría y encuentra piezas históricas.</p>
        <div style="aspect-ratio:3/2; border-radius:12px; border:1px solid var(--border);
             background:url('/assets/Categorias/futbol.jpg') center/cover no-repeat;"></div>
      </section>

      <!-- Explora por categoría (a todo el ancho, más abajo) -->
      <section class="card h-card h-span-3">
        <div class="section-head"><h3>Explora por categoría</h3></div>
        <div class="tile-grid">
          <div class="tile" data-category="Fútbol"
               style="background-image:url('/assets/Categorias/futbol.jpg');"><h4>Fútbol</h4></div>
          <div class="tile" data-category="Básquetbol"
               style="background-image:url('/assets/Categorias/basket.jpg');"><h4>Básquetbol</h4></div>
          <div class="tile" data-category="Béisbol"
               style="background-image:url('/assets/Categorias/beisbol.jpg');"><h4>Béisbol</h4></div>
        </div>
      </section>
    </div>

    <!-- (MOVIDOS ABAJO) Banners “dos mitades” -->
    <div class="promo-row">
      <section class="promo">
        <div class="p-copy">
          <small class="muted">ENVÍOS DESDE USA</small>
          <h3>Mundo gamer — hasta 40% OFF</h3>
          <a class="p-link" href="#" data-key="catalogo">Ver más</a>
        </div>
        <div class="p-img" style="background-image:url('${imgsAll[4] || ph("Gamer")}');"></div>
      </section>
      <section class="promo">
        <div class="p-copy">
          <small class="muted">OFERTAS</small>
          <h3>Hasta 50% de descuento</h3>
          <a class="p-link" href="#" data-key="catalogo">Ver más</a>
        </div>
        <div class="p-img" style="background-image:url('${imgsAll[5] || ph("Ofertas")}');"></div>
      </section>
    </div>

    <!-- Videojuegos antiguos -->
    <section class="card h-card" style="margin-top:16px;">
      <div class="section-head">
        <h3>Videojuegos antiguos</h3>
        <a href="#" data-key="catalogo">Ver más</a>
      </div>
      ${renderImageStrip([
        ph("NES"), ph("SNES"), ph("Game Boy"), ph("N64"), ph("PS1"), ph("Dreamcast"),
        ph("Arcade"), ph("Mega Drive")
      ])}
    </section>

    <!-- Solo imágenes -->
    <section class="card h-card" style="margin-top:16px;">
      <div class="section-head"><h3>Solo imágenes — lo más visual</h3></div>
      ${renderImageStrip((imgsAll.length ? imgsAll : [
        ph("Jersey"), ph("Balón"), ph("Tarjeta"), ph("Guantes"), ph("Poster")
      ]).slice(0,12))}
    </section>

    <!-- Nuevos y destacados -->
    <section class="card h-card" style="margin-top:16px;">
      <div class="section-head">
        <h3>Nuevos y destacados</h3>
        <a href="#" data-key="catalogo">Ver más</a>
      </div>
      ${renderCarousel(destacados)}
    </section>

    <!-- Métodos de pago (queda al final) -->
    <section class="card h-card" style="margin-top:16px;">
      <div class="section-head"><h3>Descubre nuestros métodos de pago</h3></div>
      <div class="pay-strip">
        <div class="pay-item"><svg class="pay-icon" viewBox="0 0 24 24"><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/><rect x="16" y="14" width="4" height="3" rx="1"/></svg>Crédito y débito</div>
        <div class="pay-item"><svg class="pay-icon" viewBox="0 0 24 24"><rect x="3" y="6" width="18" height="12" rx="2"/><circle cx="12" cy="12" r="2.5"/><path d="M5 9h0M19 9h0M5 15h0M19 15h0"/></svg>Efectivo</div>
        <div class="pay-item"><svg class="pay-icon" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="17" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="16" y1="2" x2="16" y2="6"/></svg>Pago a meses</div>
        <div class="pay-item"><svg class="pay-icon" viewBox="0 0 24 24"><rect x="3" y="8" width="18" height="12" rx="2"/><line x1="3" y1="14" x2="21" y2="14"/><line x1="12" y1="8" x2="12" y2="20"/><path d="M12 8c-1.6-.5-3-1.8-3-3a2 2 0 1 1 4 0c0 1.2-1.2 2.5-3 3 M12 8c1.6-.5 3-1.8 3-3a2 2 0 1 0-4 0c0 1.2 1.2 2.5 3 3"/></svg>Tarjeta de regalo</div>
        <div class="pay-item"><svg class="pay-icon" viewBox="0 0 24 24"><rect x="3" y="6" width="18" height="12" rx="2"/><path d="M8 12l-2 2 2 2"/><path d="M16 12l2-2-2-2"/><line x1="10" y1="14" x2="14" y2="10"/></svg>Transferencia</div>
      </div>
    </section>
  `;

  // Navegación desde “Inicio”
  content.querySelectorAll('[data-key="catalogo"]').forEach(a => {
    a.addEventListener('click', e => { e.preventDefault(); setActive('catalogo'); });
  });
  content.querySelectorAll('.tile[data-category]').forEach(t => {
    t.addEventListener('click', () => {
      renderCatalog(t.dataset.category);
      document.querySelectorAll("nav.menu a").forEach(a =>
        a.classList.toggle("active", a.dataset.key === 'catalogo'));
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  });

  // Hover-carrusel para mini-products
  wireProductCardHover(content);
}




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

  // Toggle vista
  document.getElementById("toggle-catalogo")?.addEventListener("click", () => {
    state.viewModes.catalogo = (state.viewModes.catalogo === "grid") ? "list" : "grid";
    renderCatalog(state.lastCatalogFilter);
  });

  // Hover: ciclado de imágenes
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

  function closeAnyModal() {
    document.querySelectorAll("dialog[open]").forEach(d => d.close("cancel"));
  }

  function wireTopbarModals() {
  const dlgLogin = document.getElementById("dlg-login");
  const dlgRegister = document.getElementById("dlg-register");

  document.querySelectorAll('.actions [data-open]').forEach(btn => {
    btn.addEventListener('click', () => {
      const which = btn.getAttribute('data-open');
      if (which === 'login') dlgLogin?.showModal();
      if (which === 'register') dlgRegister?.showModal();
    });
  });

  [dlgLogin, dlgRegister].forEach(dlg => {
    if (!dlg) return;
    dlg.addEventListener("click", (e) => {
      if (e.target === dlg) dlg.close("cancel");
    });
  });

  document.querySelectorAll("[data-switch]").forEach(link => {
    link.addEventListener("click", (e) => {
      e.preventDefault();
      const target = link.dataset.switch;
      closeAnyModal();
      document.getElementById(`dlg-${target}`)?.showModal();
    });
  });
}

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

    // Actualiza icono del botón
    const tbtn = document.getElementById("toggle-buscar");
    if (tbtn) tbtn.innerHTML = (mode === "grid") ? "≡" : "▦";

    if (!state.lastSearch || state.lastSearch.length === 0) {
      res.innerHTML = `<p class="small">Escribe algo para buscar.</p>`;
      return;
    }

    res.innerHTML = renderProductsHTML(state.lastSearch, mode, { center: false });

    // Hover: ciclado de imágenes en resultados
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

  // Toggle de vista en Buscar
  document.getElementById("toggle-buscar")?.addEventListener("click", () => {
    state.viewModes.buscar = (state.viewModes.buscar === "grid") ? "list" : "grid";
    renderResultsFromState();
  });

  // Estado inicial
  renderResultsFromState();
}



// ================================================================
// Modales + Auth (solo lo que existe en index.html)
function closeAnyModal() {
  document.querySelectorAll("dialog[open]").forEach(d => d.close("cancel"));
}
function wireTopbarModals() {
  const dlgLogin = document.getElementById("dlg-login");
  const dlgRegister = document.getElementById("dlg-register");

  document.querySelectorAll('.actions [data-open]').forEach(btn => {
    btn.addEventListener('click', () => {
      const which = btn.getAttribute('data-open');
      if (which === 'login') dlgLogin?.showModal();
      if (which === 'register') dlgRegister?.showModal();
    });
  });

  [dlgLogin, dlgRegister].forEach(dlg => {
    if (!dlg) return;
    dlg.addEventListener("click", (e) => {
      if (e.target === dlg) dlg.close("cancel");
    });
  });

  document.querySelectorAll("[data-switch]").forEach(link => {
    link.addEventListener("click", (e) => {
      e.preventDefault();
      const target = link.dataset.switch;
      closeAnyModal();
      document.getElementById(`dlg-${target}`)?.showModal();
    });
  });
}

function wireAuthForms() {
  const loginForm = document.getElementById("login-form");
  const registerForm = document.getElementById("register-form");

  // Registro (Conectado a la API)
  registerForm?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const fd = new FormData(registerForm);
    const payload = {
      nombre: fd.get("nombre"),
      email: fd.get("email"),
      password: fd.get("password"),
    };
    try {
      const res = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        showToast(data.message || "No se pudo registrar.", "error");
        return;
      }
      showToast("Registro exitoso. Inicia sesión.", "success");
      document.getElementById("dlg-register")?.close();
      document.getElementById("dlg-login")?.showModal();
    } catch {
      showToast("Error de red al registrar.", "error");
    }
  });

  // Login real + redirect por rol
  loginForm?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const fd = new FormData(loginForm);
    const email = fd.get("email");
    const password = fd.get("password");

    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        showToast(data.message || "No se pudo iniciar sesión.", "error");
        return;
      }

      state.isAuthenticated = true;
      state.user = { ...data.user };
      
      document.getElementById("dlg-login")?.close();
      updateUIForAuthState();
      showToast(`¡Bienvenido(a), ${state.user.nombre.split(" ")[0]}!`, "success");

      // AÑADIDO: Retraso de 1 segundo para la redirección
      setTimeout(() => {
        redirectByRole(state.user.rol);
      }, 1000);

    } catch {
      showToast("Error de red al iniciar sesión.", "error");
    }
  });
}

function redirectByRole(rol = "") {
  const r = (rol || "").toLowerCase();
  if (r.includes("admin"))     { window.location.href = "/assets/admin/admin.html"; return; }
  if (r.includes("gerente"))   { window.location.href = "/gerente/gerente.html";   return; }
  if (r.includes("trabajador")){ window.location.href = "/trabajador/trabajador.html"; return; }
  if (r.includes("comprador") || r.includes("usuario")) {
    window.location.href = "/comprador/comprador.html"; return;
  }
  // Si no es un rol especial, nos quedamos en index.
  // window.location.href = "/index.html";
}

function wireProductCardHover(scopeEl) {
  const cards = scopeEl.querySelectorAll('.product-card');
  cards.forEach(card => {
    const id = card.dataset.id;
    const p = state.products.find(x => x._id === id); // <-- CORREGIDO a _id
    if (!p) return; // Producto no encontrado

    const imgs = getImages(p);
    const imgEl = card.querySelector('.pc-img');
    
    // 1. Lógica de clic para redireccionar
    card.addEventListener('click', (e) => {
      // Evitar que el clic se dispare si se hizo clic en el botón "Ver"
      if (e.target.closest('a.btn')) {
        return;
      }
      // Redirigir a la página del producto
      window.location.href = `/producto/producto.html?id=${p._id}`;
    });

    // 2. Lógica de hover para ciclar imágenes
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


function updateUIForAuthState() {
  const actionsContainer = document.querySelector(".actions");
  if (!actionsContainer) return;

  const cartIcon = `<a href="/carrito/carrito.html" class="cart-icon" aria-label="Ir al carrito de compras">🛒</a>`;

  if (state.isAuthenticated) {
    const userName = state.user?.nombre?.split(" ")[0] || state.user?.rol || "Usuario";

    let panelHref = "/index.html";
    const r = (state.user?.rol || "").toLowerCase();
    if (r.includes("admin")) panelHref = "/assets/admin/admin.html";
    else if (r.includes("gerente")) panelHref = "/gerente/gerente.html";
    else if (r.includes("trabajador")) panelHref = "/trabajador/trabajador.html";
    else if (r.includes("comprador") || r.includes("usuario")) panelHref = "/comprador/comprador.html";

    actionsContainer.innerHTML = `
      ${cartIcon}
      <a class="btn top-btn ghost" href="${panelHref}">Mi panel</a>
      <span class="welcome-message">Hola, ${userName}!</span>
      <button class="btn top-btn ghost" data-action="logout">Cerrar Sesión</button>
    `;
    actionsContainer.querySelector('[data-action="logout"]')?.addEventListener("click", handleLogout);
  } else {
    actionsContainer.innerHTML = `
      ${cartIcon}
      <button class="btn top-btn" data-open="login">Login</button>
      <button class="btn top-btn" data-open="register">Registrarse</button>
    `;
    // El listener para data-open se añade en wireTopbarModals
    wireTopbarModals(); 
  }
}

function handleLogout() {
  state.isAuthenticated = false;
  state.user = { rol: "invitado", nombre: "Invitado" };
  updateUIForAuthState();
  showToast("Sesión cerrada correctamente.", "success");
}


