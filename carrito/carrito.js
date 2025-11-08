/* =========================================================
   History Keepers — carrito.js (Autocontenido)
   ========================================================= */

// ------------------------------
// Estado global simple (auth)
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
    <svg xmlns="http://www.w3.org/2000/svg" width="200" height="200">
      <rect width="100%" height="100%" fill="#eee"/>
      <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle"
            fill="#666" font-family="Inter,Arial" font-size="14">${title}</text>
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
// Estado del carrito
// ------------------------------
const cartState = {
  items: [], // [{ id, name, price, qty, image? }]
  shipping: 150,
};

function loadCart() {
  const saved = JSON.parse(localStorage.getItem("hk_cart") || "[]");
  cartState.items = Array.isArray(saved) ? saved : [];
}

function saveCart() {
  localStorage.setItem("hk_cart", JSON.stringify(cartState.items));
}

// ------------------------------
// Render & lógica carrito
// ------------------------------
function initCartPage() {
  // Botón Regresar
  document.getElementById("go-back")?.addEventListener("click", (e) => {
    e.preventDefault();
    if (history.length > 1) history.back();
    else window.location.href = "/index.html";
  });

  const cartEmpty = document.getElementById("cart-empty");
  const cartItemsContainer = document.getElementById("cart-items-container");
  const cartSummary = document.getElementById("cart-summary");

  loadCart();

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

  wireCheckoutSteps();
}

function renderCartItems() {
  const container = document.getElementById("cart-items-container");
  container.innerHTML = "";

  cartState.items.forEach((item) => {
    const itemEl = document.createElement("div");
    itemEl.className = "card cart-item";
    const imgSrc = item.image || ph(item.name);

    itemEl.innerHTML = `
      <img src="${imgSrc}" alt="${item.name}">
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
      <button class="btn cart-item-remove" data-id="${item.id}" title="Quitar">✕</button>
    `;

    container.appendChild(itemEl);
  });

  // Listeners
  container.querySelectorAll(".btn-qty-inc").forEach((b) =>
    b.addEventListener("click", () => changeQty(b.dataset.id, +1))
  );
  container.querySelectorAll(".btn-qty-dec").forEach((b) =>
    b.addEventListener("click", () => changeQty(b.dataset.id, -1))
  );
  container.querySelectorAll(".cart-item-remove").forEach((b) =>
    b.addEventListener("click", () => removeItem(b.dataset.id))
  );
}

function changeQty(id, delta) {
  const item = cartState.items.find((i) => i.id === id);
  if (!item) return;
  item.qty += delta;
  if (item.qty <= 0) {
    cartState.items = cartState.items.filter((i) => i.id !== id);
  }
  saveCart();
  if (cartState.items.length === 0) {
    document.getElementById("cart-empty").hidden = false;
    document.getElementById("cart-items-container").hidden = true;
    document.getElementById("cart-summary").hidden = true;
  } else {
    renderCartItems();
    updateSummary();
  }
}

function removeItem(id) {
  cartState.items = cartState.items.filter((i) => i.id !== id);
  saveCart();
  if (cartState.items.length === 0) {
    document.getElementById("cart-empty").hidden = false;
    document.getElementById("cart-items-container").hidden = true;
    document.getElementById("cart-summary").hidden = true;
  } else {
    renderCartItems();
    updateSummary();
  }
}

function updateSummary() {
  const subtotal = cartState.items.reduce((sum, it) => sum + it.price * it.qty, 0);
  const count = cartState.items.reduce((sum, it) => sum + it.qty, 0);
  const total = subtotal + cartState.shipping;

  document.getElementById("summary-count").textContent = `(${count} artículo${count !== 1 ? "s" : ""})`;
  document.getElementById("summary-subtotal").textContent = formatPrice(subtotal);
  document.getElementById("summary-shipping").textContent = formatPrice(cartState.shipping);
  document.getElementById("summary-total").textContent = formatPrice(total);
}

// ------------------------------
// Checkout steps
// ------------------------------
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

  document.getElementById("btn-to-address")?.addEventListener("click", () => {
    if (cartState.items.length === 0) {
      showToast("Tu carrito está vacío.", "error");
      return;
    }
    steps.summary.hidden = true;
    steps.address.hidden = false;
    title.textContent = "Dirección de Envío";
  });

  document.getElementById("btn-to-payment")?.addEventListener("click", () => {
    if (!forms.address.checkValidity()) {
      showToast("Por favor, completa todos los campos de dirección.", "error");
      forms.address.reportValidity();
      return;
    }
    steps.address.hidden = true;
    steps.payment.hidden = false;
    title.textContent = "Método de Pago";
  });

  document.getElementById("btn-pay")?.addEventListener("click", () => {
    if (!forms.payment.checkValidity()) {
      showToast("Por favor, completa los datos de pago.", "error");
      forms.payment.reportValidity();
      return;
    }
    // Simulación de pago
    localStorage.removeItem("hk_cart");
    cartState.items = [];
    steps.payment.hidden = true;
    steps.confirmation.hidden = false;
    title.textContent = "¡Gracias!";
    document.getElementById("cart-items-container").hidden = true;
  });
}

// ------------------------------
// Init
// ------------------------------
document.addEventListener("DOMContentLoaded", () => {
  wireTopbarModals();
  wireAuthForms();
  updateUIForAuthState();

  // ESC cierra modales
  window.addEventListener("keydown", (e) => { if (e.key === "Escape") closeAnyModal(); });

  // Año footer
  const y = document.getElementById("y");
  if (y) y.textContent = new Date().getFullYear();

  initCartPage();
});
