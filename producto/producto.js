/* =========================================================
   History Keepers — producto.js (Conectado a la API)
   ========================================================= */

// ------------------------------
// Estado global
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
// Modales + Auth (REAL)
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

  // Registro (Conectado a la API)
  registerForm?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const fd = new FormData(registerForm);
    const nombre = (fd.get("nombre") || "").toString().trim();
    const email = (fd.get("email") || "").toString().trim();
    const password = (fd.get("password") || "").toString();

    if (!nombre || !email || !password) {
      showToast("Todos los campos son obligatorios.", "error");
      return;
    }
    try {
      const resp = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nombre, email, password })
      });
      const result = await resp.json();
      if (result?.success) {
        showToast(result.message || "Cuenta creada.", "success");
        closeAnyModal();
        document.getElementById("dlg-login")?.showModal();
      } else {
        showToast(result?.message || "No se pudo registrar.", "error");
      }
    } catch {
      showToast("Error de conexión con el servidor.", "error");
    }
  });

  // Login (Conectado a la API y con redirección)
  loginForm?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const fd = new FormData(loginForm);
    const email = (fd.get("email") || "").toString().trim();
    const password = (fd.get("password") || "").toString();

    if (!email || !password) {
      showToast("Introduce tu correo y contraseña.", "error");
      return;
    }
    try {
      const resp = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
      });
      const result = await resp.json();

      if (result?.success) {
        closeAnyModal();
        showToast(result.message || `Bienvenido(a), ${result.user.nombre.split(" ")[0]}!`, "success");
        
        setTimeout(() => {
          const userRole = result.user.rol;
          switch (userRole) {
            case 'usuario comprador':
              window.location.href = '/comprador/comprador.html';
              break;
            case 'trabajador':
              window.location.href = '/trabajador/trabajador.html';
              break;
            case 'gerente':
              window.location.href = '/gerente/gerente.html';
              break;
            case 'administrador':
              window.location.href = '/assets/admin/admin.html';
              break;
            default:
              globalState.isAuthenticated = true;
              globalState.user = result.user;
              updateUIForAuthState();
          }
        }, 1000); 

      } else {
        showToast(result?.message || "Credenciales incorrectas.", "error");
      }
    } catch {
      showToast("Error de conexión con el servidor.", "error");
    }
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
// Init de la página
// ------------------------------
document.addEventListener("DOMContentLoaded", () => {
  wireTopbarModals();
  wireAuthForms();
  updateUIForAuthState(); // (Esto puede cambiar si hay un token guardado, pero por ahora está bien)

  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeAnyModal();
  });

  const yearSpan = document.getElementById("y");
  if (yearSpan) yearSpan.textContent = new Date().getFullYear();

  // Lógica específica de producto
  initProductPage();
});

// ------------------------------
// Página de producto (CONECTADA A API)
// ------------------------------
async function initProductPage() {
  const params = new URLSearchParams(window.location.search);
  const productId = params.get("id");

  if (!productId) {
    showNotFound();
    return;
  }

  try {
    // Pide el producto a la API que creamos en server.js
    const response = await fetch(`/api/products/${productId}`);
    
    if (!response.ok) {
      throw new Error('Producto no encontrado en la base de datos');
    }
    
    const product = await response.json();
    
    // Si todo sale bien, renderiza el producto
    renderProduct(product);
    wireProductActions(product);

  } catch (error) {
    console.error("Error al cargar el producto:", error.message);
    showNotFound();
  }
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
  // El campo de stock ya no existe
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
  
  const images = product.images || [];

  if (images.length > 0) {
    mainImg.src = images[0]; // Muestra la primera imagen

    images.forEach((imgSrc, index) => {
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
    // Si no hay imágenes, muestra el placeholder
    mainImg.src = ph(product.name);
  }

  // Mostrar contenido
  document.getElementById("product-view").hidden = false;
}

function wireProductActions(product) {
  document.getElementById("add-cart")?.addEventListener("click", () => {
    const qty = document.getElementById("qty").valueAsNumber || 1;
    const cart = JSON.parse(localStorage.getItem("hk_cart") || "[]");
    
    // CORREGIDO: Usar _id de MongoDB
    const existing = cart.find((i) => i.id === product._id); 
    
    if (existing) {
      existing.qty += qty;
    } else {
      // CORREGIDO: Guardar _id y la primera imagen
      cart.push({ 
        id: product._id, 
        name: product.name, 
        price: product.price, 
        qty,
        image: (product.images && product.images[0]) ? product.images[0] : ph(product.name)
      });
    }
    localStorage.setItem("hk_cart", JSON.stringify(cart));
    showToast(`Se agregaron ${qty} "${product.name}" al carrito.`, "success");
  });

  document.getElementById("buy-now")?.addEventListener("click", () => {
    const qty = document.getElementById("qty").valueAsNumber || 1;
    const cart = JSON.parse(localStorage.getItem("hk_cart") || "[]");
    
    // CORREGIDO: Usar _id de MongoDB
    const existing = cart.find((i) => i.id === product._id);
    
    if (existing) {
      existing.qty += qty;
    } else {
      cart.push({ 
        id: product._id, 
        name: product.name, 
        price: product.price, 
        qty,
        image: (product.images && product.images[0]) ? product.images[0] : ph(product.name)
      });
    }
    localStorage.setItem("hk_cart", JSON.stringify(cart));
    window.location.href = "/carrito/carrito.html";
  });
}