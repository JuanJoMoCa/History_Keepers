/* =========================================================
   History Keepers — producto.js (Autocontenido)
   ========================================================= */

// ------------------------------
// Estado global (simple)
// ------------------------------
const globalState = {
  isAuthenticated: false,
  user: { rol: "invitado", nombre: "Invitado" },
};

// ------------------------------
// Utils
// ------------------------------
function formatPrice(n) {
  return (n ?? 0).toLocaleString("es-MX", {
    style: "currency",
    currency: "MXN",
    maximumFractionDigits: 0,
  });
}

function ph(title = "Producto") {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="800" height="600">
      <rect width="100%" height="100%" fill="#eee"/>
      <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle"
            fill="#666" font-family="Inter,Arial" font-size="24">${title}</text>
    </svg>
  `;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

// ------------------------------
// Toast
// ------------------------------
let toastTimer;
function showToast(message, type = "success") {
  const toast = document.getElementById("toast-notification");
  if (!toast) return;
  clearTimeout(toastTimer);
  toast.textContent = message;
  toast.className = "toast";
  toast.classList.add(type);
  toast.classList.add("show");
  toastTimer = setTimeout(() => toast.classList.remove("show"), 3000);
}

// ------------------------------
// Modales + Auth
// ------------------------------
function closeAnyModal() {
  document.querySelectorAll("dialog[open]").forEach((d) => {
    const form = d.querySelector("form");
    if (form) form.reset();
    d.close("cancel");
  });
}

function wireTopbarModals() {
  const dlgLogin = document.getElementById("dlg-login");
  const dlgRegister = document.getElementById("dlg-register");

  document.querySelectorAll('.actions [data-open]').forEach((btn) => {
    btn.addEventListener("click", () => {
      const which = btn.getAttribute("data-open");
      if (which === "login") dlgLogin?.showModal();
      if (which === "register") dlgRegister?.showModal();
    });
  });

  [dlgLogin, dlgRegister].forEach((dlg) => {
    if (!dlg) return;
    dlg.addEventListener("click", (e) => {
      const card = dlg.querySelector(".modal-card")?.getBoundingClientRect();
      if (!card) return;
      const inside =
        e.clientX >= card.left && e.clientX <= card.right &&
        e.clientY >= card.top && e.clientY <= card.bottom;
      if (!inside) dlg.close("cancel");
    });
  });

  document.querySelectorAll("[data-switch]").forEach((link) => {
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

  registerForm?.addEventListener("submit", (e) => {
    e.preventDefault();
    showToast("Registro simulado. Ahora inicia sesión.", "success");
    closeAnyModal();
    document.getElementById("dlg-login")?.showModal();
  });

  loginForm?.addEventListener("submit", (e) => {
    e.preventDefault();
    const email = new FormData(loginForm).get("email") || "Usuario";
    closeAnyModal();
    globalState.isAuthenticated = true;
    globalState.user = { rol: "usuario", nombre: email };
    updateUIForAuthState();
    showToast(`Bienvenido(a), ${globalState.user.nombre.split(" ")[0]}!`, "success");
  });
}

function updateUIForAuthState() {
  const actionsContainer = document.querySelector(".actions");
  if (!actionsContainer) return;

  const cartIconHTML = `<a href="/carrito/carrito.html" class="cart-icon" aria-label="Ir al carrito de compras">🛒</a>`;

  if (globalState.isAuthenticated) {
    const userName = globalState.user.nombre.split(" ")[0] || globalState.user.rol;
    actionsContainer.innerHTML = `
      ${cartIconHTML}
      <span class="welcome-message">Hola, ${userName}!</span>
      <button class="btn top-btn ghost" data-action="logout">Cerrar Sesión</button>
    `;
    actionsContainer
      .querySelector('[data-action="logout"]')
      ?.addEventListener("click", handleLogout);
  } else {
    actionsContainer.innerHTML = `
      ${cartIconHTML}
      <button class="btn top-btn" data-open="login">Login</button>
      <button class="btn top-btn" data-open="register">Registrarse</button>
    `;
    wireTopbarModals();
  }
}

function handleLogout() {
  globalState.isAuthenticated = false;
  globalState.user = { rol: "invitado", nombre: "Invitado" };
  updateUIForAuthState();
  showToast("Sesión cerrada correctamente.", "success");
}

// ------------------------------
// “BD” de ejemplo para la página
// (Usa imágenes que sí existen en tu repo)
// ------------------------------
const state = {
  products: [
    {
      id: "jersey-1998",
      name: "Jersey Retro 1998",
      price: 3500,
      stock: 5,
      category: "Fútbol",
      images: [
        "/assets/slides/slide1.png",
        "/assets/slides/slide2.png",
        "/assets/slides/slide3.png"
      ],
      description: "Edición histórica de club, excelente estado de conservación.",
      highlights: ["Tallas M y L", "Original", "Coleccionable"],
    },
    {
      id: "balon-firmado",
      name: "Balón Firmado",
      price: 6800,
      stock: 3,
      category: "Fútbol",
      images: ["/assets/slides/slide2.png", "/assets/slides/slide3.png"],
      description: "Balón autografiado con certificado de autenticidad.",
      highlights: ["Incluye certificado", "Edición limitada"],
    },
    {
      id: "tarjeta-1986",
      name: "Tarjeta Rookie 1986",
      price: 4200,
      stock: 2,
      category: "Básquetbol",
      images: ["/assets/slides/slide3.png"],
      description: "Tarjeta rookie clásica, ideal para marcos y exhibición.",
      highlights: ["Grado de conservación alto", "Serie especial"],
    }
    
  ],
};

// ------------------------------
// Init de la página
// ------------------------------
document.addEventListener("DOMContentLoaded", () => {
  wireTopbarModals();
  wireAuthForms();
  updateUIForAuthState();

  // Esc para cerrar modales
  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeAnyModal();
  });

  // Año footer
  const yearSpan = document.getElementById("y");
  if (yearSpan) yearSpan.textContent = new Date().getFullYear();

  // Lógica específica de producto
  initProductPage();
});

// ------------------------------
// Página de producto
// ------------------------------
function initProductPage() {
  const params = new URLSearchParams(window.location.search);
  const productId = params.get("id");

  if (!productId) {
    showNotFound();
    return;
  }

  const product = state.products.find((p) => p.id === productId);
  if (!product) {
    showNotFound();
    return;
  }

  renderProduct(product);
  wireProductActions(product);
}

function showNotFound() {
  document.getElementById("not-found").hidden = false;
  document.getElementById("product-view").hidden = true;
}

function renderProduct(product) {
  // Título, migas y textos
  document.title = `${product.name} — History Keepers`;
  document.getElementById("bc-name").textContent = product.name;
  document.getElementById("p-title").textContent = product.name;
  document.getElementById("p-price").textContent = formatPrice(product.price);
  document.getElementById("p-stock").textContent = product.stock;
  document.getElementById("p-desc").textContent = product.description;

  // Highlights
  const hList = document.getElementById("p-highlights");
  hList.innerHTML = "";
  (product.highlights || []).forEach((item) => {
    const li = document.createElement("li");
    li.textContent = item;
    hList.appendChild(li);
  });

  // Galería
  const mainImg = document.getElementById("p-main");
  const thumbsContainer = document.getElementById("p-thumbs");
  thumbsContainer.innerHTML = "";

  if (product.images && product.images.length > 0) {
    mainImg.src = product.images[0];

    product.images.forEach((imgSrc, index) => {
      const thumbDiv = document.createElement("div");
      thumbDiv.className = "thumb";
      if (index === 0) thumbDiv.classList.add("active");

      const thumbImg = document.createElement("img");
      thumbImg.src = imgSrc;
      thumbImg.alt = `${product.name} miniatura ${index + 1}`;

      thumbDiv.appendChild(thumbImg);

      thumbDiv.addEventListener("click", () => {
        mainImg.src = imgSrc;
        thumbsContainer.querySelectorAll(".thumb").forEach((t) => t.classList.remove("active"));
        thumbDiv.classList.add("active");
      });

      thumbsContainer.appendChild(thumbDiv);
    });
  } else {
    mainImg.src = ph(product.name);
  }

  // Mostrar contenido
  document.getElementById("product-view").hidden = false;
}

function wireProductActions(product) {
  document.getElementById("add-cart")?.addEventListener("click", () => {
    const qty = document.getElementById("qty").valueAsNumber || 1;

    // carrito en localStorage (simple)
    const cart = JSON.parse(localStorage.getItem("hk_cart") || "[]");
    const existing = cart.find((i) => i.id === product.id);
    if (existing) {
      existing.qty += qty;
    } else {
      cart.push({ id: product.id, name: product.name, price: product.price, qty });
    }
    localStorage.setItem("hk_cart", JSON.stringify(cart));

    showToast(`Se agregaron ${qty} "${product.name}" al carrito.`, "success");
  });

  document.getElementById("buy-now")?.addEventListener("click", () => {
    // añade 1 si no está
    const cart = JSON.parse(localStorage.getItem("hk_cart") || "[]");
    const existing = cart.find((i) => i.id === product.id);
    if (existing) {
      existing.qty += 1;
    } else {
      cart.push({ id: product.id, name: product.name, price: product.price, qty: 1 });
    }
    localStorage.setItem("hk_cart", JSON.stringify(cart));

    // redirige al carrito (ruta absoluta correcta)
    window.location.href = "/carrito/carrito.html";
  });
}
