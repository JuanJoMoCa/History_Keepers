/* =========================================================
   History Keepers — carrito.js (Autocontenido)
   ========================================================= */

// ================================================================
// Lógica Global (Extraída de app.js)
// ================================================================

// Estado global de autenticación
const globalState = {
  isAuthenticated: false,
  user: { rol: "invitado", nombre: "Invitado" },
};

// Utilidad de formato de precios
function formatPrice(n) {
  return (n ?? 0).toLocaleString("es-MX", {
    style: "currency",
    currency: "MXN",
    maximumFractionDigits: 0
  });
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
  
  // Actualiza el año en el footer
  document.getElementById("y").textContent = new Date().getFullYear();

  // Inicia la lógica específica de la página del carrito
  initCartPage();
});

// ================================================================
// Lógica Específica de la Página del Carrito
// ================================================================

// Estado local del carrito (debería leerse de localStorage)
const cartState = {
  items: [], // Ej: [{ id: "jersey-1998", name: "...", price: 3500, qty: 1, image: "..." }]
  shipping: 150,
};

function initCartPage() {
  // --- 1. Cargar elementos del DOM ---
  const cartEmpty = document.getElementById("cart-empty");
  const cartItemsContainer = document.getElementById("cart-items-container");
  const cartSummary = document.getElementById("cart-summary");
  
  // --- 2. Cargar carrito desde localStorage ---
  // ... Aquí deberías cargar 'cartState.items' desde localStorage ...
  // ej. const savedItems = JSON.parse(localStorage.getItem("cart")) || [];
  // cartState.items = savedItems;
  
  // --- 3. Renderizar Carrito ---
  if (cartState.items.length === 0) {
    cartEmpty.hidden = false;
    cartItemsContainer.hidden = true;
    cartSummary.hidden = true;
  } else {
    cartEmpty.hidden = true;
    cartItemsContainer.hidden = false;
    cartSummary.hidden = false;
    renderCartItems();
    updateSummary();
  }
  
  // --- 4. Conectar Pasos de Checkout ---
  wireCheckoutSteps();
}

function renderCartItems() {
  const container = document.getElementById("cart-items-container");
  container.innerHTML = ""; // Limpiar
  
  // ... Aquí iría un bucle (loop) sobre 'cartState.items' ...
  // Por cada item, crear el HTML del .cart-item
  /*
  cartState.items.forEach(item => {
    const itemEl = document.createElement("div");
    itemEl.className = "card cart-item";
    itemEl.innerHTML = `
      <img src="${item.image}" alt="${item.name}">
      <div class="item-details">
        <strong>${item.name}</strong>
        <p class="small">Precio: ${formatPrice(item.price)}</p>
      </div>
      <div class="item-quantity">
        <button class="btn btn-qty-dec" data-id="${item.id}">-</button>
        <span>${item.qty}</span>
        <button class="btn btn-qty-inc" data-id="${item.id}">+</button>
      </div>
      <div class="item-price">
        <strong>${formatPrice(item.price * item.qty)}</strong>
      </div>
      <button class="btn cart-item-remove" data-id="${item.id}">✕</button>
    `;
    container.appendChild(itemEl);
  });
  
  // ... Aquí deberías agregar listeners a los botones +/- y ✕ ...
  */
}

function updateSummary() {
  // ... Aquí calcularías el subtotal ...
  const subtotal = 0; // ej. cartState.items.reduce((sum, item) => sum + (item.price * item.qty), 0);
  const total = subtotal + cartState.shipping;
  const count = 0; // ej. cartState.items.reduce((sum, item) => sum + item.qty, 0);

  document.getElementById("summary-count").textContent = `(${count} artículos)`;
  document.getElementById("summary-subtotal").textContent = formatPrice(subtotal);
  document.getElementById("summary-shipping").textContent = formatPrice(cartState.shipping);
  document.getElementById("summary-total").textContent = formatPrice(total);
}

// --- Lógica del Stepper de Checkout ---

function wireCheckoutSteps() {
  const steps = {
    summary: document.getElementById("step-summary"),
    address: document.getElementById("step-address"),
    payment: document.getElementById("step-payment"),
    confirmation: document.getElementById("step-confirmation"),
  };

  const forms = {
    address: document.getElementById("address-form"),
    payment: document.getElementById("payment-form"),
  };
  
  const title = document.getElementById("summary-title");

  document.getElementById("btn-to-address").addEventListener("click", () => {
    // ... Aquí podrías validar que el carrito no esté vacío ...
    steps.summary.hidden = true;
    steps.address.hidden = false;
    title.textContent = "Dirección de Envío";
  });

  document.getElementById("btn-to-payment").addEventListener("click", () => {
    if (!forms.address.checkValidity()) {
      showToast("Por favor, completa todos los campos de dirección.", "error");
      forms.address.reportValidity(); // Muestra errores del navegador
      return;
    }
    steps.address.hidden = true;
    steps.payment.hidden = false;
    title.textContent = "Método de Pago";
  });
  
  document.getElementById("btn-pay").addEventListener("click", () => {
{
    if (!forms.payment.checkValidity()) {
      showToast("Por favor, completa los datos de pago.", "error");
      forms.payment.reportValidity();
      return;
    }
    
    // ... Aquí iría la lógica final de pago (simulación) ...
    
    // Vaciar carrito en localStorage
    // localStorage.removeItem("cart");
    
    // Mostrar confirmación
    steps.payment.hidden = true;
    steps.confirmation.hidden = false;
    title.textContent = "¡Gracias!";
  container.innerHTML = ""; // Limpiar
  
  // ... Aquí iría un bucle (loop) sobre 'cartState.items' ...
  // Por cada item, crear el HTML del .cart-item
  /*
  cartState.items.forEach(item => {
    const itemEl = document.createElement("div");
    itemEl.className = "card cart-item";
    itemEl.innerHTML = `
      <img src="${item.image}" alt="${item.name}">
      <div class="item-details">
        <strong>${item.name}</strong>
        <p class="small">Precio: ${formatPrice(item.price)}</p>
      </div>
      <div class="item-quantity">
        <button class="btn btn-qty-dec" data-id="${item.id}">-</button>
        <span>${item.qty}</span>
        <button class="btn btn-qty-inc" data-id="${item.id}">+</button>
      </div>
      <div class="item-price">
        <strong>${formatPrice(item.price * item.qty)}</strong>
      </div>
      <button class="btn cart-item-remove" data-id="${item.id}">✕</button>
    `;
    container.appendChild(itemEl);
  });
  
  // ... Aquí deberías agregar listeners a los botones +/- y ✕ ...
  */
}

function updateSummary() {
  // ... Aquí calcularías el subtotal ...
  const subtotal = 0; // ej. cartState.items.reduce((sum, item) => sum + (item.price * item.qty), 0);
  const total = subtotal + cartState.shipping;
  const count = 0; // ej. cartState.items.reduce((sum, item) => sum + item.qty, 0);

  document.getElementById("summary-count").textContent = `(${count} artículos)`;
  document.getElementById("summary-subtotal").textContent = formatPrice(subtotal);
  document.getElementById("summary-shipping").textContent = formatPrice(cartState.shipping);
  document.getElementById("summary-total").textContent = formatPrice(total);
}

// --- Lógica del Stepper de Checkout ---

function wireCheckoutSteps() {
  const steps = {
    summary: document.getElementById("step-summary"),
    address: document.getElementById("step-address"),
    payment: document.getElementById("step-payment"),
    confirmation: document.getElementById("step-confirmation"),
  };

  const forms = {
    address: document.getElementById("address-form"),
    payment: document.getElementById("payment-form"),
  };
  
  const title = document.getElementById("summary-title");

  document.getElementById("btn-to-address").addEventListener("click", () => {
    // ... Aquí podrías validar que el carrito no esté vacío ...
    steps.summary.hidden = true;
    steps.address.hidden = false;
    title.textContent = "Dirección de Envío";
  });

  document.getElementById("btn-to-payment").addEventListener("click", () => {
    if (!forms.address.checkValidity()) {
      showToast("Por favor, completa todos los campos de dirección.", "error");
      forms.address.reportValidity(); // Muestra errores del navegador
      return;
    }
    steps.address.hidden = true;
    steps.payment.hidden = false;
    title.textContent = "Método de Pago";
  });
  
  document.getElementById("btn-pay").addEventListener("click", () => {
    if (!forms.payment.checkValidity()) {
      showToast("Por favor, completa los datos de pago.", "error");
      forms.payment.reportValidity();
      return;
    }
    
    // ... Aquí iría la lógica final de pago (simulación) ...
    
    // Vaciar carrito en localStorage
    // localStorage.removeItem("cart");
    
    // Mostrar confirmación
    steps.payment.hidden = true;
    steps.confirmation.hidden = false;
    title.textContent = "¡Gracias!";
    
    // Ocultar lista de items
    document.getElementById("cart-items-container").hidden = true;
  });
}
    
    // Ocultar lista de items
    document.getElementById("cart-items-container").hidden = true;
  });
}