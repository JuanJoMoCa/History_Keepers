/* =========================================================
   History Keepers — producto.js (FINAL - Auth Persistente)
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
// Modales + Auth (PERSISTENTE)
// ------------------------------

// --- NUEVA FUNCIÓN: Verificar sesión al cargar (Igual que en carrito) ---
async function checkAuth() {
  const userId = localStorage.getItem('hk-user-id');
  if (!userId) return; // No hay sesión guardada

  try {
    const res = await fetch(`/api/profile/${userId}`);
    if (res.ok) {
      const userData = await res.json();
      globalState.isAuthenticated = true;
      globalState.user = userData;
      updateUIForAuthState(); // Actualiza el header visualmente
    } else {
      localStorage.removeItem('hk-user-id'); // Sesión inválida
    }
  } catch (e) {
    console.error("Error verificando sesión:", e);
  }
}

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

  // Registro
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

  // Login
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
        
        // GUARDAR SESIÓN
        localStorage.setItem('hk-user-id', result.user._id);

        setTimeout(() => {
          // Redirección según rol
          const userRole = result.user.rol;
          if(userRole.includes('admin')) window.location.href = '/assets/admin/admin.html';
          else if(userRole.includes('gerente')) window.location.href = '/gerente/gerente.html';
          else if(userRole.includes('trabajador')) window.location.href = '/trabajador/trabajador.html';
          else {
             // Si es usuario normal, nos quedamos aquí pero actualizamos estado
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
  localStorage.removeItem('hk-user-id');
  updateUIForAuthState();
  showToast("Sesión cerrada correctamente.", "success");
}

// ------------------------------
// Init de la página
// ------------------------------
document.addEventListener("DOMContentLoaded", async () => {
  wireTopbarModals();
  wireAuthForms();
  
  // 1. VERIFICAR SESIÓN AL INICIO
  await checkAuth();
  
  // 2. Si ya estábamos logueados, la UI se actualizó arriba
  // updateUIForAuthState(); // (checkAuth ya lo llama si es necesario)

  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeAnyModal();
  });

  const yearSpan = document.getElementById("y");
  if (yearSpan) yearSpan.textContent = new Date().getFullYear();

  initProductPage();
});

// ------------------------------
// Lógica de Producto
// ------------------------------
async function initProductPage() {
  const params = new URLSearchParams(window.location.search);
  const productId = params.get("id");

  if (!productId) {
    showNotFound();
    return;
  }

  try {
    const response = await fetch(`/api/products/${productId}`);
    if (!response.ok) throw new Error('Producto no encontrado');
    const product = await response.json();
    
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
  document.title = `${product.name} — History Keepers`;
  document.getElementById("bc-name").textContent = product.name;
  document.getElementById("p-title").textContent = product.name;
  document.getElementById("p-desc").textContent = product.description;

  // Precio
  const priceContainer = document.getElementById("p-price-container");
  const price = product.price;
  const discount = product.discount || 0;

  if (discount > 0) {
    const newPrice = price * (1 - discount / 100);
    priceContainer.innerHTML = `
      <span class="price-current">${formatPrice(newPrice)}</span>
      <span class="price-original">${formatPrice(price)}</span>
      <span class="price-discount-badge">${discount}% OFF</span>
    `;
  } else {
    priceContainer.innerHTML = `
      <span class="price-current">${formatPrice(price)}</span>
    `;
  }

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
    mainImg.src = images[0];
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
    mainImg.src = ph(product.name);
  }

  document.getElementById("product-view").hidden = false;
}

function wireProductActions(product) {
  // Calcular precio final para el carrito
  const price = product.price;
  const discount = product.discount || 0;
  const finalPrice = (discount > 0) ? price * (1 - discount / 100) : price;

  // Acción "Agregar al Carrito"
  document.getElementById("add-cart")?.addEventListener("click", () => {
    // SIEMPRE AGREGAMOS 1 (Ignoramos selectores de cantidad si los hubiera)
    const qty = 1; 
    
    const cart = JSON.parse(localStorage.getItem("hk_cart") || "[]");
    const existing = cart.find((i) => i.id === product._id); 
    
    if (existing) {
       showToast(`"${product.name}" ya está en tu carrito.`, "success");
    } else {
      cart.push({ 
        id: product._id, 
        name: product.name, 
        price: finalPrice,
        qty: qty,
        image: (product.images && product.images[0]) ? product.images[0] : ph(product.name)
      });
      localStorage.setItem("hk_cart", JSON.stringify(cart));
      showToast(`Se agregó "${product.name}" al carrito.`, "success");
    }
  });

  // Acción "Comprar Ahora"
  document.getElementById("buy-now")?.addEventListener("click", () => {
    const qty = 1;
    const cart = JSON.parse(localStorage.getItem("hk_cart") || "[]");
    const existing = cart.find((i) => i.id === product._id);
    
    if (!existing) {
      cart.push({ 
        id: product._id, 
        name: product.name, 
        price: finalPrice,
        qty: qty,
        image: (product.images && product.images[0]) ? product.images[0] : ph(product.name)
      });
      localStorage.setItem("hk_cart", JSON.stringify(cart));
    }
    window.location.href = "/carrito/carrito.html";
  });
}