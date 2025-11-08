// ================================================================
// History Keepers — index.js (lógica exclusiva de index.html)
// ================================================================

// ---- Estado y datos base (catálogo mínimo para home/buscar/slider)
const state = {
  index: 0,
  timer: null,
  slides: [],
  isAuthenticated: false,
  user: { rol: "invitado", nombre: "Invitado" },
  products: [
    {
      id: "jersey-1998",
      name: "Jersey Retro 1998",
      price: 3500,
      stock: 5,
      category: "Fútbol",
      images: ["assets/products/jersey1998-1.jpg","assets/products/jersey1998-2.jpg","assets/products/jersey1998-3.jpg"],
      description: "Edición histórica de club, excelente estado de conservación.",
      highlights: ["Tallas M y L","Original","Coleccionable"]
    },
    {
      id: "balon-firmado",
      name: "Balón Firmado",
      price: 6800,
      stock: 3,
      category: "Fútbol",
      images: ["assets/products/balon-1.jpg","assets/products/balon-2.jpg"],
      description: "Balón autografiado con certificado de autenticidad.",
      highlights: ["Incluye certificado","Edición limitada"]
    },
    {
      id: "tarjeta-1986",
      name: "Tarjeta Rookie 1986",
      price: 4200,
      stock: 2,
      category: "Básquetbol",
      images: ["assets/products/rookie1986-1.jpg","assets/products/rookie1986-2.jpg"],
      description: "Tarjeta rookie clásica, ideal para marcos y exhibición.",
      highlights: ["Grado de conservación alto","Serie especial"]
    },
    {
      id: "guantes-2005",
      name: "Guantes de Portero 2005",
      price: 2100,
      stock: 8,
      category: "Fútbol",
      images: ["assets/products/guantes2005-1.jpg"],
      description: "Modelo profesional de archivo 2005.",
      highlights: ["Pieza de archivo","Material original"]
    },
    {
      id: "gorra pokemon",
      name: "Gorra Pokemon",
      price: 9100,
      stock: 10,
      category: "Anime",
      images: [""],
      description: "Modelo profesional de archivo 2005.",
      highlights: ["Pieza de archivo","Material original"]
    }
  ]
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
document.addEventListener("DOMContentLoaded", () => {
  wireTopbarModals();
  wireAuthForms();
  updateUIForAuthState();

  if (document.querySelector(".slider")) {
    initSlider().then(() => {
      buildMenu();
      wireFooterLinks();
      setActive("home");
      wireSliderControls();
    });
  } else {
    buildMenu();
    wireFooterLinks();
    setActive("home");
  }

  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeAnyModal();
  });
});

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
  home: `
    <div class="card">
      <h2>Explora por Deporte</h2>
      <p class="small">Selecciona tu disciplina para ver los artículos de colección correspondientes.</p>
      <div class="grid" style="margin-top:10px; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));">
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

  if (key === "catalogo") { renderCatalog(); return; }
  if (key === "buscar")  { renderBuscar();  return; }

  content.innerHTML = sections[key] || "";
}

function createProductCard(p) {
  return `
    <div class="card product-card">
      <strong>${p.name}</strong>
      <p class="small">Precio: ${formatPrice(p.price)}</p>
      <a class="btn" href="/producto/producto.html?id=${encodeURIComponent(p.id)}">Ver</a>
    </div>
  `;
}
function renderCatalog(filterCategory = null) {
  const content = document.querySelector("section.content");
  if (!content) return;

  const productsToShow = filterCategory
    ? state.products.filter(p => p.category === filterCategory)
    : state.products;

  const title = filterCategory ? `Catálogo: ${filterCategory}` : "Catálogo";
  const subtitle = filterCategory
    ? `Mostrando artículos de ${filterCategory}.`
    : "Explora todos nuestros artículos destacados.";

  let productGrid = '';
  if (productsToShow.length > 0) {
    productGrid = `<div class="grid" style="margin-top:10px">${productsToShow.map(createProductCard).join("")}</div>`;
  } else {
    productGrid = `<p class="small" style="margin-top:10px;">No se encontraron productos para "${filterCategory}".</p>`;
  }

  content.innerHTML = `
    <div class="card">
      <h2>${title}</h2>
      <p class="small">${subtitle}</p>
      ${productGrid}
    </div>
  `;
}
function renderBuscar() {
  const content = document.querySelector("section.content");
  if (!content) return;

  content.innerHTML = `
    <div class="card">
      <h2>Buscar</h2>
      <div style="display:flex; gap:8px; margin-top:8px">
        <input id="q" class="input" placeholder="Ej. jersey, balón, tarjeta..." />
        <button class="btn" id="btn-search">Buscar</button>
      </div>
      <div id="results" style="margin-top:12px" class="small"></div>
    </div>
  `;

  const btn = content.querySelector("#btn-search");
  const q = content.querySelector("#q");
  const res = content.querySelector("#results");

  function doSearch() {
    const term = (q.value || "").trim().toLowerCase();
    if (!term) { res.textContent = "Escribe algo para buscar."; return; }

    const found = state.products.filter(p =>
      `${p.name} ${p.description ?? ""}`.toLowerCase().includes(term)
    );

    if (found.length === 0) {
      res.innerHTML = `Sin resultados para "${term}".`;
      return;
    }

    res.innerHTML = `
      <strong>Resultados:</strong>
      <ul>
        ${found.map(f => `<li><a href="/producto/producto.html?id=${encodeURIComponent(f.id)}">${f.name}</a> — ${formatPrice(f.price)}</li>`).join("")}
      </ul>
    `;
  }

  btn.addEventListener("click", doSearch);
  q.addEventListener("keydown", (e) => { if (e.key === "Enter") doSearch(); });
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

  // Registro (opcional; usa tu backend)
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
      state.user = { ...data.user }; // { nombre, email, rol }
      // Persistencia opcional:
      // localStorage.setItem("hk_user", JSON.stringify(state.user));

      document.getElementById("dlg-login")?.close();
      updateUIForAuthState();
      showToast(`¡Bienvenido(a), ${state.user.nombre.split(" ")[0]}!`, "success");

      redirectByRole(state.user.rol);
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
  window.location.href = "/index.html";
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
    wireTopbarModals();
  }
}

function handleLogout() {
  state.isAuthenticated = false;
  state.user = { rol: "invitado", nombre: "Invitado" };
  updateUIForAuthState();
  showToast("Sesión cerrada correctamente.", "success");
}
