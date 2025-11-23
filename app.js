// ================================================================
// History Keepers — index.js (lógica exclusiva de index.html)
// ================================================================

// ---- Estado y datos base (catálogo mínimo para home/buscar/slider)
const state = {
  viewModes: { catalogo: "grid", buscar: "list" },
  catalogoLayout: "themed", // ← NUEVO: 'themed' o 'flat'
  lastSearch: [],
  lastCatalogFilter: null,
  index: 0,
  timer: null,
  slides: [],
  isAuthenticated: false,
  user: { rol: "invitado", nombre: "Invitado" },
  products: []
};

// ---- Temáticas (reglas simples por palabras clave/categorías)
const THEMES = [
  { id: "destacados", title: "Destacados", test: (p, txt) => p.featured === true || p.rating >= 4.5 },
  { id: "ofertas", title: "Ofertas", test: (p) => getOffer(p).discountPct > 0 },
  { id: "retro", title: "Retro / Vintage", test: (_, txt) => /retro|vintage|clásic|199|198|197/.test(txt) },
  { id: "firmados", title: "Firmados y certificados", test: (_, txt) => /firmad|autenticad|certificad|autograph|signature/.test(txt) },
  { id: "tarjetas", title: "Tarjetas coleccionables", test: (_, txt) => /tarjeta|trading\s?card|rookie|panini|upper\s?deck|topps|carta/.test(txt) },
  { id: "jerseys", title: "Jerseys", test: (_, txt) => /jersey|camiset|playera/.test(txt) },
  { id: "balones", title: "Balones", test: (_, txt) => /bal[oó]n|ball/.test(txt) },
  { id: "futbol", title: "Fútbol", test: (p, txt) => (p.category || "").toLowerCase() === "fútbol" || /f[úu]tbol|soccer|liga|mundial/.test(txt) },
  { id: "basquet", title: "Básquetbol", test: (p, txt) => (p.category || "").toLowerCase() === "básquetbol" || /b[áa]squet|basket|nba|jordan|kobe|lebron/.test(txt) },
  { id: "beis", title: "Béisbol", test: (p, txt) => (p.category || "").toLowerCase() === "béisbol" || /b[ée]isbol|mlb|yankees|dodgers/.test(txt) },
  { id: "f1", title: "F1 / Automovilismo", test: (_, txt) => /f1|fórmula\s?1|formula\s?1|automovil|automotor|ferrar|mercedes|red\s?bull|verstappen|hamilton/.test(txt) },
  { id: "boxeo", title: "Boxeo", test: (_, txt) => /boxeo|canelo|tyson|boxer|wbc|wbo|ibf/.test(txt) },
  { id: "musica", title: "Música", test: (p, txt) => (p.category || "").toLowerCase() === "música" || /musica|concierto|banda|rock/.test(txt) },
  { id: "pokemon", title: "Pokemon", test: (p, txt) => (p.category || "").toLowerCase() === "pokemon" || /pokemon|pikachu|charizard|tcg/.test(txt) },
  { id: "f1", title: "F1", test: (p, txt) => (p.category || "").toLowerCase() === "fórmula 1" },
  { id: "voleibol", title: "Voleibol", test: (p, txt) => (p.category || "").toLowerCase() === "voleibol" }
];

function collectText(p) {
  // Texto combinado y normalizado para pruebas de tema
  const joined = `${p.name || ""} ${p.description || ""} ${p.category || ""}`.trim();
  return normalizeStr(joined);
}

function groupByThemes(products) {
  const buckets = [];
  for (const t of THEMES) {
    const items = products.filter(p => {
      const txt = collectText(p);
      return t.test(p, txt);
    });
    if (items.length) buckets.push({ id: t.id, title: t.title, items });
  }
  return buckets;
}


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

function isNewish(p) {
  const now = Date.now();
  const times = [p.createdAt, p.updatedAt, p.date]
    .map(d => Date.parse(d))
    .filter(n => !Number.isNaN(n));
  if (times.length) {
    const latest = Math.max(...times);
    const days = (now - latest) / (1000 * 60 * 60 * 24);
    return days <= 90; // “nuevo” = últimos 90 días
  }
  const txt = collectText(p);
  return /nuevo|new|reciente|últim[ao]s|latest|2024|2025/.test(txt);
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
  // 1. Validar que existan productos
  if (!state.products || state.products.length === 0) return;

  // 2. Crear una copia y mezclarla aleatoriamente
  // [...state.products] crea una copia para no desordenar el catálogo principal
  // .sort(() => 0.5 - Math.random()) es un truco rápido para barajar el array
  const mezclados = [...state.products].sort(() => 0.5 - Math.random());

  // 3. Tomar los primeros 3 de la lista ya mezclada
  const seleccionRandom = mezclados.slice(0, 3);

  // 4. Mapear al formato del slider (igual que antes)
  state.slides = seleccionRandom.map(p => ({
      id: p._id,
      // MODIFICACIÓN AQUÍ: Intentamos pedir una imagen más ancha a Cloudinary (si aplica)
      // Ajusta 'w_1200' si necesitas otro ancho, o quita '.replace(...)' si tus URLs no lo usan
      src: (p.images && p.images.length > 0) 
            ? p.images[0].replace("/upload/", "/upload/w_1200,f_auto,q_auto/") // Añade transformaciones
            : ph(p.name),
      title: p.name,
      caption: p.description ? p.description.substring(0, 60) + "..." : "Pieza de colección única",
      price: formatPrice(p.price)
    }));

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
    
    // --- LÓGICA DEL CLIC ---
    // Hacemos que el cursor sea una mano
    el.style.cursor = "pointer";
    
    // Asignamos el evento click a todo el div del slide
    el.onclick = function() {
      console.log("Redirigiendo a producto:", s.id); // Para depuración en consola
      window.location.href = `/producto/producto.html?id=${s.id}`;
    };

    // HTML interno del slide (Texto + Botón)
    el.innerHTML = `
      <div class="caption">
        <div style="text-align: left;">
          <h3>${s.title}</h3>
          <p>${s.caption}</p>
          <span class="price-tag" style="display:inline-block; margin-top:8px; font-weight:bold; color: #ffd700; background: rgba(0,0,0,0.6); padding: 4px 8px; border-radius: 4px;">
            ${s.price}
          </span>
        </div>
        <button class="btn btn-primary">Ver Ahora</button>
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
    d.addEventListener("click", (e) => {
      e.stopPropagation(); // Evita que el click en el punto dispare el click del slide
      go(i);
    });
    dots.appendChild(d);
  });
}

function wireSliderControls() {
  const slider = document.querySelector(".slider");
  if (!slider) return;
  
  // Detener rotación al pasar el mouse
  slider.addEventListener("mouseenter", stopAuto);
  slider.addEventListener("mouseleave", startAuto);

  // Flechas (Usamos stopPropagation para que no activen el link del slide)
  document.querySelector(".ctrl.prev")?.addEventListener("click", (e) => {
    e.stopPropagation(); 
    prev();
  });
  document.querySelector(".ctrl.next")?.addEventListener("click", (e) => {
    e.stopPropagation();
    next();
  });

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
 home: (() => {
    // 1. Definir todas tus categorías y sus imágenes
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

    // 2. Generar el HTML para el carrusel
    const categoryCarouselHTML = allCategories.map(cat => `
      <div class="category-tile" data-category="${cat.name}" 
           style="background-image: url('${cat.img}');">
        <h3>${cat.name}</h3>
      </div>
    `).join("");

    // 3. Devolver el HTML final para la sección
    return `
      <section class="card">
        <div class="inv-card__head" style="border-bottom: 1px solid var(--border); padding-bottom: 16px; margin-bottom: 16px;">
          <div class="inv-card__title">
            <h2 style="margin: 0;">Explora por Categoría</h2>
          </div>
        </div>
        <div class="inv-card__body">
          <div class="category-carousel-container">
            <div class="category-carousel">
              ${categoryCarouselHTML}
            </div>
          </div>
        </div>
      </section>
    `;
  })(),
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
          <p>Si contamos tambien con tienda fisica y entregas en fisico dentro de la ciudad.</p>
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
    { key: "home", label: "Categorías" },
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
    // CONECTAR LAS NUEVAS TARJETAS DEL CARRUSEL
    content.querySelectorAll('.category-tile').forEach(card => {
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

  content.innerHTML = `
    <section class="tpanels">
      
      <article class="tpanel" data-mode="theme" data-filter="destacados">
        <div class="tp-copy">
          <small>DESTACADOS</small>
          <h3>OFERTAS EN TENDENCIA</h3>
          <span class="tp-link">VER MÁS</span>
        </div>
      </article>

      <article class="tpanel" data-mode="catalog" data-filter="">
        <div class="tp-copy">
          <small>NUEVO</small>
          <h3>TU PRIMERA COMPRA</h3>
          <span class="tp-link">EXPLORAR CATÁLOGO</span>
        </div>
      </article>

      <article class="tpanel" data-mode="theme" data-filter="ofertas">
        <div class="tp-copy">
          <small>PROMOS</small>
          <h3>HASTA 25% EN COLECCIONABLES</h3>
          <span class="tp-link">DESCUBRIR</span>
        </div>
      </article>

      <article class="tpanel" data-mode="theme" data-filter="firmados">
        <div class="tp-copy">
          <small>TUS FAVORITOS</small>
          <h3>COLECCIONES MÁS VISTAS</h3>
          <span class="tp-link">VER AHORA</span>
        </div>
      </article>

    </section>
  `;

  // Lógica de redirección al hacer clic en los paneles
  content.querySelectorAll('.tpanel').forEach(panel => {
    panel.addEventListener('click', () => {
      const mode = panel.dataset.mode;     
      const filter = panel.dataset.filter; 

      // Ajustar la pestaña activa en el menú
      document.querySelectorAll("nav.menu a").forEach(a => {
        a.classList.toggle("active", a.dataset.key === 'catalogo');
      });

      if (mode === 'theme') {
        // Modo Temática
        state.catalogoLayout = "themed";
        renderCatalog();
        setTimeout(() => {
          const targetSection = document.getElementById(`t-${filter}`);
          if (targetSection) {
            // Scroll ajustado para temáticas
            const y = targetSection.getBoundingClientRect().top + window.scrollY - 100;
            window.scrollTo({ top: y, behavior: 'smooth' });
          }
        }, 100);
      } else {
        // Modo Catálogo General
        state.catalogoLayout = "flat";
        renderCatalog(filter || null);
        
        // --- FIX SCROLL: Ir directo al contenido sin que el header lo tape ---
        setTimeout(() => {
          const contentSection = document.querySelector("section.content");
          if (contentSection) {
            // Calculamos: Posición del elemento + Scroll Actual - Altura Header (90px) - Margen extra (20px)
            const y = contentSection.getBoundingClientRect().top + window.scrollY - 110;
            window.scrollTo({ top: y, behavior: 'smooth' });
          }
        }, 50);
      }
    });
  });
}




function renderCatalog(filterCategory = null) {
  state.lastCatalogFilter = filterCategory ?? null;

  if (state.catalogoLayout === "themed" && !filterCategory) {
    renderCatalogThemed(null);
    return;
  }

  const content = document.querySelector("section.content");
  if (!content) return;

  const productsToShow = filterCategory
    ? state.products.filter(p => p.category === filterCategory)
    : state.products;

  const title = filterCategory ? `Catálogo: ${filterCategory}` : "Catálogo";
  const subtitle = filterCategory
    ? `Mostrando artículos de ${filterCategory}.`
    : "Explora todo el catálogo en vista lista/cuadrícula.";

  const mode = state.viewModes.catalogo || "grid";
  const has = productsToShow.length > 0;

  content.innerHTML = `
    <div class="card">
      <div class="section-head">
        <div>
          <h2>${title}</h2>
          <p class="small">${subtitle}</p>
        </div>
        <div style="display:flex; gap:8px;">
          <button class="btn icon-btn" id="toggle-layout"
            title="Ver por temáticas"></button>
          <button class="btn icon-btn" id="toggle-catalogo"
            title="Cambiar a vista ${mode === "grid" ? "lista" : "cuadrícula"}"
            aria-label="Cambiar vista">
            ${mode === "grid" ? "≡" : "▦"}
          </button>
        </div>
      </div>

      ${has
        ? renderProductsHTML(productsToShow, mode, { center: mode === "grid" })
        : `<p class="small" style="margin-top:10px;">No se encontraron productos.</p>`}
    </div>
  `;

  // Toggle vista grid/list
  document.getElementById("toggle-catalogo")?.addEventListener("click", () => {
    state.viewModes.catalogo = (state.viewModes.catalogo === "grid") ? "list" : "grid";
    renderCatalog(state.lastCatalogFilter);
  });

  // Cambiar a vista temáticas
  document.getElementById("toggle-layout")?.addEventListener("click", () => {
    state.catalogoLayout = "themed";
    renderCatalog(state.lastCatalogFilter);
  });

  wireProductCardHover(content);
}


function renderCatalogThemed(filterCategory = null) {
  const content = document.querySelector("section.content");
  if (!content) return;

  const base = filterCategory
    ? state.products.filter(p => (p.category || "") === filterCategory)
    : state.products;

  if (!base.length) {
    content.innerHTML = `
      <div class="card">
        <div class="section-head">
          <div>
            <h2>Catálogo por temáticas</h2>
            <p class="small">No hay productos para mostrar.</p>
          </div>
          <button class="btn icon-btn" id="toggle-layout">▦</button>
        </div>
      </div>`;
    document.getElementById("toggle-layout")?.addEventListener("click", () => {
      state.catalogoLayout = "flat";
      renderCatalog(state.lastCatalogFilter);
    });
    return;
  }

  const groups = groupByThemes(base);
  const chips = groups.map(g => `<button class="chip" data-goto="${g.id}">${g.title}</button>`).join("");

  content.innerHTML = `
    <div class="card">
      <div class="section-head">
        <div>
          <h2>Catálogo por temáticas</h2>
          <p class="small">${filterCategory ? `Filtrado por categoría: ${filterCategory}. ` : ""}Explora colecciones agrupadas por interés.</p>
        </div>
        <button class="btn icon-btn" id="toggle-layout" title="Ver lista completa">${"≡"}</button>
      </div>

      <div class="theme-nav">${chips}</div>
    </div>

    ${groups.map(g => `
      <section class="theme-section" id="t-${g.id}">
        <div class="section-head">
          <h3>${g.title}</h3>
          <span class="muted small">${g.items.length} artículos</span>
        </div>
        ${renderProductsHTML(g.items, "grid", { center: true })}
      </section>
    `).join("")}
  `;

  // interacciones
  document.getElementById("toggle-layout")?.addEventListener("click", () => {
    state.catalogoLayout = "flat";
    renderCatalog(state.lastCatalogFilter);
  });

  content.querySelectorAll(".theme-nav .chip").forEach(b => {
    b.addEventListener("click", () => {
      const id = b.getAttribute("data-goto");
      const el = content.querySelector(`#t-${id}`);
      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  });

  // Hover de productos
  content.querySelectorAll(".theme-section").forEach(sec => wireProductCardHover(sec));
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

  // Botones LOGIN / REGISTRARSE de la barra superior
  document.querySelectorAll('.actions [data-open]').forEach(btn => {
    btn.addEventListener('click', () => {
      const which = btn.getAttribute('data-open');
      if (which === 'login') dlgLogin?.showModal();
      if (which === 'register') dlgRegister?.showModal();
    });
  });

  // Cerrar al hacer click fuera del contenido
  [dlgLogin, dlgRegister].forEach(dlg => {
    if (!dlg) return;
    dlg.addEventListener("click", (e) => {
      if (e.target === dlg) dlg.close("cancel");
    });
  });

  // Links para cambiar entre login / registro
  document.querySelectorAll("[data-switch]").forEach(link => {
    link.addEventListener("click", (e) => {
      e.preventDefault();
      const target = link.dataset.switch; // "login" o "register"
      closeAnyModal();
      document.getElementById(`dlg-${target}`)?.showModal();
    });
  });
}

function wireAuthForms() {
  const loginForm = document.getElementById("login-form");
  const registerForm = document.getElementById("register-form");
  const dlgRegisterInfo = document.getElementById("dlg-register-info");
  const dlgUnverified   = document.getElementById("dlg-unverified");

  // 1. REGISTRO
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

      // Cerrar formulario y mostrar aviso de verificación
      document.getElementById("dlg-register")?.close();
      registerForm.reset?.();
      dlgRegisterInfo?.showModal();

    } catch {
      showToast("Error de red al registrar.", "error");
    }
  });

  // 2. LOGIN 
  const btnLogin = document.getElementById("btn-login-submit");
  
  if (btnLogin) {
    // Clonamos el botón para limpiar listeners anteriores
    const newBtn = btnLogin.cloneNode(true);
    btnLogin.parentNode.replaceChild(newBtn, btnLogin);
    
    newBtn.addEventListener("click", async (e) => {
      e.preventDefault(); // Evita recarga del dialog

      const emailVal = document.getElementById("log-email")?.value.trim();
      const passVal  = document.getElementById("log-password")?.value;

      if (!emailVal || !passVal) {
        showToast("Por favor, ingresa correo y contraseña.", "error");
        return;
      }

      try {
        const res = await fetch("/api/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: emailVal, password: passVal }),
        });
        const data = await res.json();

        if (!res.ok || !data.success) {
          // 403 = comprador no verificado
          if (res.status === 403) {
            dlgUnverified?.showModal();
          } else {
            showToast(data.message || "Credenciales incorrectas.", "error");
          }
          return;
        }

        // Éxito
        state.isAuthenticated = true;
        state.user = { ...data.user };
        localStorage.setItem('hk-user-id', state.user._id);

        document.getElementById("dlg-login")?.close();
        updateUIForAuthState();
        showToast(`¡Bienvenido(a), ${state.user.nombre.split(" ")[0]}!`, "success");

        setTimeout(() => {
          redirectByRole(state.user.rol);
        }, 1000);

      } catch (err) {
        console.error(err);
        showToast("Error de conexión con el servidor.", "error");
      }
    });
  }
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
  // Buscamos el contenedor de la derecha (donde están Login/Registro)
  const actionsContainer = document.querySelector(".header-right");
  if (!actionsContainer) return;

  if (state.isAuthenticated) {
    // --- USUARIO LOGUEADO ---
    const userName = state.user?.nombre?.split(" ")[0] || state.user?.rol || "Usuario";
    let panelHref = "/index.html";
    
    const r = (state.user?.rol || "").toLowerCase();
    if (r.includes("admin")) panelHref = "/assets/admin/admin.html";
    else if (r.includes("gerente")) panelHref = "/gerente/gerente.html";
    else if (r.includes("trabajador")) panelHref = "/trabajador/trabajador.html";
    else if (r.includes("comprador") || r.includes("usuario")) panelHref = "/comprador/comprador.html";
    
    // SOLO mostramos "MI PANEL" y "SALIR". ¡Ya no agregamos el carrito aquí!
    actionsContainer.innerHTML = `
      <a class="top-btn" href="${panelHref}" style="text-decoration:none;">MI PANEL</a>
      <button class="top-btn" data-action="logout">SALIR</button>
    `;
    actionsContainer.querySelector('[data-action="logout"]')?.addEventListener("click", handleLogout);
    
  } else {
    // --- USUARIO NO LOGUEADO ---
    // SOLO mostramos Login y Registro.
    actionsContainer.innerHTML = `
      <button class="top-btn" data-open="login">LOGIN</button>
      <button class="top-btn" data-open="register">REGISTRARSE</button>
    `;
    // Reconectamos los eventos de los modales
    wireTopbarModals(); 
  }
}

function handleLogout() {
  state.isAuthenticated = false;
  state.user = { rol: "invitado", nombre: "Invitado" };
  
  // --- AÑADIDO: Borrar ID de localStorage ---
  localStorage.removeItem('hk-user-id');
  
  updateUIForAuthState();
  showToast("Sesión cerrada correctamente.", "success");
}


//Lógica del botón "Regresar Arriba"
document.addEventListener("DOMContentLoaded", () => {
  const btn = document.getElementById("btn-back-to-top");
  if (!btn) return;

  // 1. Mostrar/ocultar al hacer scroll
  window.addEventListener("scroll", () => {
    if (window.scrollY > 300) {
      btn.classList.add("show");
    } else {
      btn.classList.remove("show");
    }
  }, { passive: true }); // Mejora el rendimiento

  // 2. Hacer clic para subir
  btn.addEventListener("click", () => {
    window.scrollTo({
      top: 0,
      behavior: "smooth" // Deslizamiento suave
    });
  });

  // ===== CÓDIGO NUEVO: Activar enlaces del Footer =====
  const footerLinks = document.querySelectorAll('footer a[data-key]');
  footerLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault(); // Evita que la página salte arriba
      const key = link.getAttribute('data-key');
      
      // Llama a tu función de navegación existente
      setActive(key);
      
      // Sube suavemente al inicio para ver el contenido
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  });

});