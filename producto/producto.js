/* =========================================================
   History Keepers — product.js (Autocontenido)
   ========================================================= */

// ================================================================
// Lógica Global (Extraída de app.js)
// ================================================================

const globalState = {
  isAuthenticated: false,
  user: { rol: "invitado", nombre: "Invitado" },
};

// Utilidades
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

// Toast
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

// Modales + Auth
function closeAnyModal() {
  document.querySelectorAll("dialog[open]").forEach(d => {
    const form = d.querySelector("form");
    if (form) form.reset();
    d.close("cancel");
  });
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
      const card = dlg.querySelector(".modal-card")?.getBoundingClientRect();
      if (!card) return;
      const inside =
        e.clientX >= card.left && e.clientX <= card.right &&
        e.clientY >= card.top && e.clientY <= card.bottom;
      if (!inside) dlg.close("cancel");
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

  registerForm?.addEventListener("submit", (e) => {
    e.preventDefault();
    // ... Lógica de registro (simulada) ...
    showToast("Registro simulado. Ahora inicia sesión.", "success");
    closeAnyModal();
    document.getElementById("dlg-login")?.showModal();
  });

  loginForm?.addEventListener("submit", (e) => {
    e.preventDefault();
    // ... Lógica de login (simulada) ...
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

  const cartIcon = `<a href="carrito.html" class="cart-icon" aria-label="Ir al carrito de compras">🛒</a>`;

  if (globalState.isAuthenticated) {
    const userName = globalState.user.nombre.split(" ")[0] || globalState.user.rol;
    actionsContainer.innerHTML = `
      ${cartIcon}
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
  globalState.isAuthenticated = false;
  globalState.user = { rol: "invitado", nombre: "Invitado" };
  updateUIForAuthState();
  showToast("Sesión cerrada correctamente.", "success");
}

// ================================================================
// Base de Datos (Extraída de app.js)
// ================================================================

// El estado de los productos debe estar aquí para que la página funcione
const state = {
  products: [
    {
      id: "jersey-1998",
      name: "Jersey Retro 1998",
      price: 3500,
      stock: 5,
      category: "Fútbol",
      images: [
        "assets/products/jersey1998-1.jpg",
        "assets/products/jersey1998-2.jpg",
        "assets/products/jersey1998-3.jpg"
      ],
      description: "Edición histórica de club, excelente estado de conservación.",
      highlights: ["Tallas M y L", "Original", "Coleccionable"]
    },
    {
      id: "balon-firmado",
      name: "Balón Firmado",
      price: 6800,
      stock: 3,
      category: "Fútbol",
      images: [
        "assets/products/balon-1.jpg",
        "assets/products/balon-2.jpg"
      ],
      description: "Balón autografiado con certificado de autenticidad.",
      highlights: ["Incluye certificado", "Edición limitada"]
    },
    {
      id: "tarjeta-1986",
      name: "Tarjeta Rookie 1986",
      price: 4200,
      stock: 2,
      category: "Básquetbol",
      images: [
        "assets/products/rookie1986-1.jpg",
        "assets/products/rookie1986-2.jpg"
      ],
      description: "Tarjeta rookie clásica, ideal para marcos y exhibición.",
      highlights: ["Grado de conservación alto", "Serie especial"]
    },
    {
      id: "guantes-2005",
      name: "Guantes de Portero 2005",
      price: 2100,
      stock: 8,
      category: "Fútbol",
      images: [
        "assets/products/guantes2005-1.jpg"
      ],
      description: "Modelo profesional de archivo 2005.",
      highlights: ["Pieza de archivo", "Material original"]
    }
  ]
};

// ================================================================
// Inicialización Global de la Página
// ================================================================
document.addEventListener("DOMContentLoaded", () => {
  // Conecta la lógica global
  wireTopbarModals();
  wireAuthForms();
  updateUIForAuthState();

  // Tecla global
  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeAnyModal();
  });
  
  // Actualiza el año en el footer (movido desde tu script en línea)
  const yearSpan = document.getElementById('y');
  if (yearSpan) yearSpan.textContent = new Date().getFullYear();

  // Inicia la lógica específica de la página de producto
  initProductPage();
});

// ================================================================
// Lógica Específica de la Página de Producto
// ================================================================

function initProductPage() {
  const params = new URLSearchParams(window.location.search);
  const productId = params.get("id");

  if (!productId) {
    showNotFound();
    return;
  }

  const product = state.products.find(p => p.id === productId);

  if (!product) {
    showNotFound();
    return;
  }

  renderProduct(product);
  wireProductActions(product);
  wireCommentForm();
}

function showNotFound() {
  document.getElementById("not-found").hidden = false;
  document.getElementById("product-view").hidden = true;
  document.getElementById("comments-card").hidden = true;
}

function renderProduct(product) {
  // --- 1. Info General ---
  document.title = `${product.name} — History Keepers`;
  document.getElementById("bc-name").textContent = product.name;
  document.getElementById("p-title").textContent = product.name;
  document.getElementById("p-price").textContent = formatPrice(product.price);
  document.getElementById("p-stock").textContent = product.stock;
  document.getElementById("p-desc").textContent = product.description;
  
  // --- 2. Highlights (Lista) ---
  const hList = document.getElementById("p-highlights");
  hList.innerHTML = "";
  if (product.highlights && product.highlights.length > 0) {
    product.highlights.forEach(item => {
      const li = document.createElement("li");
      li.textContent = item;
      hList.appendChild(li);
    });
  }
  
  // --- 3. Galería de Imágenes ---
  const mainImg = document.getElementById("p-main");
  const thumbsContainer = document.getElementById("p-thumbs");
  thumbsContainer.innerHTML = ""; // Limpiar
  
  if (product.images && product.images.length > 0) {
    // Poner la primera imagen como principal
    mainImg.src = product.images[0];
    
    // Crear los thumbnails
    product.images.forEach((imgSrc, index) => {
      const thumbDiv = document.createElement("div");
      thumbDiv.className = "thumb";
      if (index === 0) thumbDiv.classList.add("active");
      
      const thumbImg = document.createElement("img");
      thumbImg.src = imgSrc;
      
      thumbDiv.appendChild(thumbImg);
      
      // Añadir listener para cambiar imagen
      thumbDiv.addEventListener("click", () => {
        mainImg.src = imgSrc;
        // Actualizar clase 'active'
        thumbsContainer.querySelectorAll(".thumb").forEach(t => t.classList.remove("active"));
        thumbDiv.classList.add("active");
      });
      
      thumbsContainer.appendChild(thumbDiv);
    });
  } else {
    // No hay imágenes, usar placeholder
    mainImg.src = ph(product.name);
  }

  // --- 4. Mostrar contenido ---
  document.getElementById("product-view").hidden = false;
  document.getElementById("comments-card").hidden = false;
}

function wireProductActions(product) {
  document.getElementById("add-cart").addEventListener("click", () => {
    const qty = document.getElementById("qty").valueAsNumber || 1;
    // ... Lógica para añadir al carrito (localStorage) ...
    showToast(`Se agregaron ${qty} "${product.name}" al carrito.`, "success");
  });

  document.getElementById("buy-now").addEventListener("click", () => {
    // ... Lógica para añadir al carrito (localStorage) ...
    // Redirigir al carrito
    window.location.href = "carrito.html";
  });
}

function wireCommentForm() {
  const form = document.getElementById("comment-form");
  const list = document.getElementById("comments-list");

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const fd = new FormData(form);
    const name = fd.get("name");
    const rating = parseInt(fd.get("rating"), 10);
    const text = fd.get("text");
    const stars = "★".repeat(rating) + "☆".repeat(5 - rating);

    const newComment = document.createElement("div");
    newComment.className = "comment-item";
    newComment.innerHTML = `
      <div class="comment-head">
        <span class="comment-name">${name}</span>
        <span class="stars">${stars}</span>
        <span class="comment-date"> — 
          ${new Date().toLocaleDateString()}
        </span>
      </div>
      <p>${text}</p>
    `;
    
    list.prepend(newComment); // Añadir al inicio
    form.reset();
    showToast("¡Gracias por tu opinión!", "success");
  });
}