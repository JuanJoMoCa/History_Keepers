/* =========================================================
   History Keepers — carrito.js (FINAL - V5)
   Correcciones: Auth persistente y Items únicos (sin qty)
   ========================================================= */

// ------------------------------
// Estado global simple (auth)
// ------------------------------
const globalState = {
  isAuthenticated: false,
  user: { rol: "invitado", nombre: "Invitado" },
};

// Variables para datos guardados
let userAddresses = [];
let userPayments = [];

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
// Auth & Modales
// ------------------------------

// --- NUEVA FUNCIÓN: Verificar sesión al cargar ---
async function checkAuth() {
  const userId = localStorage.getItem('hk-user-id');
  if (!userId) return; // No hay sesión guardada

  try {
    // Verificamos con la API para traer nombre y correo actualizados
    const res = await fetch(`/api/profile/${userId}`);
    if (res.ok) {
      const userData = await res.json();
      globalState.isAuthenticated = true;
      globalState.user = userData;
      updateUIForAuthState(); // Actualiza el header visualmente
    } else {
      // Si el usuario no existe en BD, limpiamos
      localStorage.removeItem('hk-user-id');
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
        
        globalState.isAuthenticated = true;
        globalState.user = result.user;
        localStorage.setItem('hk-user-id', globalState.user._id);
        
        updateUIForAuthState();
        
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
    let panelHref = "/index.html";
    const r = (globalState.user?.rol || "").toLowerCase();
    if (r.includes("admin")) panelHref = "/assets/admin/admin.html";
    else if (r.includes("gerente")) panelHref = "/gerente/gerente.html";
    else if (r.includes("trabajador")) panelHref = "/trabajador/trabajador.html";
    else if (r.includes("comprador") || r.includes("usuario")) panelHref = "/comprador/comprador.html";
    
    actionsContainer.innerHTML = `
      ${cartIconHTML}
      <a class="btn top-btn ghost" href="${panelHref}">Mi panel</a>
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
  window.location.reload(); // Recargar para limpiar estados
}

// ------------------------------
// Estado del carrito
// ------------------------------
const cartState = {
  items: [],
  shipping: 150,
};

function loadCart() {
  const saved = JSON.parse(localStorage.getItem("hk_cart") || "[]");
  cartState.items = Array.isArray(saved) ? saved : [];
  
  // --- CORRECCIÓN DE CANTIDADES ---
  // Aseguramos que todo lo cargado tenga qty = 1 por ser artículos únicos
  cartState.items.forEach(item => item.qty = 1);
}

function saveCart() {
  localStorage.setItem("hk_cart", JSON.stringify(cartState.items));
}

// ------------------------------
// Render & lógica carrito
// ------------------------------
function initCartPage() {
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

// --- RENDERIZADO SIN BOTONES DE CANTIDAD ---
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
      
      <div class="item-quantity" style="color: var(--muted); font-size: 0.9rem;">
        <span>Cant: 1</span>
      </div>
      
      <div class="item-price">
        <strong>${formatPrice(item.price)}</strong> </div>
      
      <button class="btn cart-item-remove" data-id="${item.id}" title="Quitar del carrito">✕</button>
    `;
    container.appendChild(itemEl);
  });

  // Solo escuchamos el botón de eliminar
  container.querySelectorAll(".cart-item-remove").forEach((b) =>
    b.addEventListener("click", () => removeItem(b.dataset.id))
  );
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
  const subtotal = cartState.items.reduce((sum, it) => sum + it.price, 0); // Qty es siempre 1
  const count = cartState.items.length; // Un item = una unidad
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
  const btnPay = document.getElementById("btn-pay");

  // 1. Ir a Dirección
  document.getElementById("btn-to-address")?.addEventListener("click", async () => {
    if (cartState.items.length === 0) {
      showToast("Tu carrito está vacío.", "error");
      return;
    }
    
    // VALIDACIÓN DE SESIÓN (Ahora ya debería estar true gracias a checkAuth)
    if (!globalState.isAuthenticated) {
      showToast("Debes iniciar sesión para continuar.", "error");
      document.getElementById("dlg-login")?.showModal();
      return;
    }
    
    await loadUserAddressesForCheckout();
    steps.summary.hidden = true;
    steps.address.hidden = false;
    title.textContent = "Dirección de Envío";
  });

  // 2. Ir a Pago
  document.getElementById("btn-to-payment")?.addEventListener("click", async () => {
    if (!forms.address.checkValidity()) {
      showToast("Por favor, completa todos los campos de dirección.", "error");
      forms.address.reportValidity();
      return;
    }
    
    await loadUserPaymentsForCheckout();
    steps.address.hidden = true;
    steps.payment.hidden = false;
    title.textContent = "Método de Pago";
  });

  // 3. PAGAR AHORA
  btnPay?.addEventListener("click", async () => {
    if (!forms.payment.checkValidity()) {
      showToast("Por favor, completa los datos de pago.", "error");
      forms.payment.reportValidity();
      return;
    }
    
    const originalText = btnPay.textContent;
    btnPay.disabled = true;
    btnPay.textContent = "Procesando pago...";
    
    try {
      // Guardar Dirección
      const saveAddrDiv = document.getElementById("save-address-div");
      const saveAddrCheck = document.getElementById("save-address-check");
      const addressData = Object.fromEntries(new FormData(forms.address).entries());
      
      if (saveAddrDiv && saveAddrDiv.style.display !== 'none' && saveAddrCheck && saveAddrCheck.checked) {
        try {
          addressData.alias = `Envío ${new Date().toLocaleDateString()}`;
          await fetch(`/api/profile/${globalState.user._id}/addresses`, {
             method: 'POST',
             headers: { 'Content-Type': 'application/json' },
             body: JSON.stringify(addressData)
          });
        } catch (e) { console.warn("No se pudo guardar la dirección:", e); }
      }

      // Guardar Tarjeta
      const savePayDiv = document.getElementById("save-payment-div");
      const savePayCheck = document.getElementById("save-payment-check");
      const paymentData = {
        cardholderName: document.getElementById("pay-nombre").value,
        cardNumber: document.getElementById("pay-tarjeta").value,
        expiryDate: document.getElementById("pay-exp").value,
        alias: `Tarjeta ${new Date().toLocaleDateString()}`
      };
      
      if (savePayDiv && savePayDiv.style.display !== 'none' && savePayCheck && savePayCheck.checked) {
        try {
           await fetch(`/api/profile/${globalState.user._id}/payments`, {
             method: 'POST',
             headers: { 'Content-Type': 'application/json' },
             body: JSON.stringify(paymentData)
          });
        } catch (e) { console.warn("No se pudo guardar la tarjeta:", e); }
      }

      // Preparar orden (Qty siempre 1)
      const subtotal = cartState.items.reduce((sum, it) => sum + it.price, 0);
      const total = subtotal + cartState.shipping;
      
      const orderPayload = {
        customerDetails: {
          name: globalState.user.nombre, 
          email: globalState.user.email,
          address: `${addressData.calle}, ${addressData.colonia}, ${addressData.ciudad}, C.P. ${addressData.cp}`
        },
        products: cartState.items.map(item => ({
          product: item.id,
          name: item.name,
          price: item.price,
          qty: 1
        })),
        subtotal,
        shippingCost: cartState.shipping,
        total,
        tipoVenta: 'Online'
      };

      const resp = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(orderPayload)
      });
      
      const result = await resp.json();

      if (!resp.ok) {
        throw new Error(result.message || "No se pudo procesar el pedido.");
      }

      // ÉXITO
      localStorage.removeItem("hk_cart");
      cartState.items = [];
      
      steps.payment.hidden = true;
      steps.confirmation.hidden = false;
      title.textContent = "¡Gracias!";

      const breadcrumb = document.querySelector(".breadcrumb");
      if (breadcrumb) breadcrumb.style.display = "none";
      
      document.getElementById("cart-items-container").hidden = true;
      
      const confirmMsg = document.querySelector("#step-confirmation p");
      if(confirmMsg) confirmMsg.innerHTML = `¡Pago exitoso! Tu pedido <strong>#${result.orderNumber}</strong> ha sido confirmado.<br>Te hemos enviado un correo con los detalles.`;

    } catch (err) {
      showToast(err.message, "error");
      btnPay.disabled = false;
      btnPay.textContent = originalText;
      if (err.message.includes("disponible")) {
         setTimeout(() => window.location.reload(), 3000);
      }
    }
  });
}

// --- Funciones auxiliares para Direcciones ---

async function loadUserAddressesForCheckout() {
  const select = document.getElementById("saved-address-select");
  const wrapper = document.getElementById("saved-addresses-wrapper");
  try {
    const res = await fetch(`/api/profile/${globalState.user._id}/addresses`);
    if (!res.ok) return; 
    
    userAddresses = await res.json();
    
    if (userAddresses.length > 0) {
      wrapper.hidden = false;
      select.innerHTML = `<option value="">-- Seleccionar una dirección guardada --</option>` + 
        userAddresses.map((addr, i) => {
            const label = (addr.alias && !addr.alias.startsWith("Envío")) ? addr.alias : addr.calle;
            return `<option value="${i}">📍 ${label} (${addr.cp})</option>`;
        }).join("");
      select.addEventListener("change", fillAddressFormFromSelection);
    }
  } catch (e) { console.error("Error cargando direcciones", e); }
}

function fillAddressFormFromSelection() {
  const idx = this.value;
  const saveDiv = document.getElementById("save-address-div");
  const saveCheck = document.getElementById("save-address-check");

  if (idx === "") {
    document.getElementById("address-form").reset();
    if (saveDiv) saveDiv.style.display = 'flex'; 
    return;
  }
  
  const addr = userAddresses[idx];
  if (!addr) return;
  
  document.getElementById("addr-calle").value = addr.calle;
  document.getElementById("addr-colonia").value = addr.colonia;
  document.getElementById("addr-ciudad").value = addr.ciudad;
  document.getElementById("addr-cp").value = addr.cp;
  
  if (saveCheck) saveCheck.checked = false;
  if (saveDiv) saveDiv.style.display = 'none'; 
}

// --- Funciones auxiliares para Pagos ---

async function loadUserPaymentsForCheckout() {
  const select = document.getElementById("saved-payment-select");
  const wrapper = document.getElementById("saved-payments-wrapper");
  try {
    const res = await fetch(`/api/profile/${globalState.user._id}/payments`);
    if (!res.ok) return;
    
    userPayments = await res.json();
    
    if (userPayments.length > 0) {
      wrapper.hidden = false;
      select.innerHTML = `<option value="">-- Seleccionar tarjeta guardada --</option>` +
        userPayments.map((pay, i) => {
          const last4 = pay.cardNumber.slice(-4);
          const label = (pay.alias && !pay.alias.startsWith("Tarjeta")) ? pay.alias : `Tarjeta terminada en ${last4}`;
          return `<option value="${i}">💳 ${label}</option>`;
        }).join("");
      select.addEventListener("change", fillPaymentFormFromSelection);
    }
  } catch (e) { console.error("Error cargando pagos", e); }
}

function fillPaymentFormFromSelection() {
  const idx = this.value;
  const saveDiv = document.getElementById("save-payment-div");
  const saveCheck = document.getElementById("save-payment-check");

  if (idx === "") { 
      document.getElementById("payment-form").reset(); 
      if (saveDiv) saveDiv.style.display = 'flex'; 
      return; 
  }

  const pay = userPayments[idx];
  if (!pay) return;

  document.getElementById("pay-nombre").value = pay.cardholderName;
  document.getElementById("pay-tarjeta").value = pay.cardNumber;
  document.getElementById("pay-exp").value = pay.expiryDate;
  document.getElementById("pay-cvv").value = ""; 
  
  if (saveCheck) saveCheck.checked = false;
  if (saveDiv) saveDiv.style.display = 'none';
}

// ------------------------------
// Init
// ------------------------------
document.addEventListener("DOMContentLoaded", async () => {
  // 1. Conectamos la lógica de UI
  wireTopbarModals();
  wireAuthForms();
  
  // 2. IMPORTANTE: Verificamos la sesión PRIMERO
  await checkAuth();
  
  window.addEventListener("keydown", (e) => { if (e.key === "Escape") closeAnyModal(); });
  const y = document.getElementById("y");
  if (y) y.textContent = new Date().getFullYear();
  
  // 3. Cargamos el carrito una vez que sabemos si hay user o no
  initCartPage();
});