// ================================================================
// History Keepers — carrito.js (Lógica de Carrito + Stepper)
// ================================================================

// Estado global (similar a product.js)
const state = {
  isAuthenticated: false,
  user: { rol: "invitado", nombre: "Invitado" },
  products: [], // Se llenará con los datos de los productos
  shippingCost: 150, // Costo de envío fijo
};

// Fallback de productos (para saber el stock)
const FALLBACK_PRODUCTS = [
  { id:"jersey-1998", name:"Jersey Retro 1998", price:3500, stock:5, images:["..."] },
  { id:"balon-firmado", name:"Balón Firmado", price:6800, stock:3, images:["..."] },
  { id:"tarjeta-1986", name:"Tarjeta Rookie 1986", price:4200, stock:2, images:["..."] },
  { id:"guantes-2005", name:"Guantes de Portero 2005", price:2100, stock:8, images:["..."] }
];

// ---------- Utilidades (Copiadas de product.js) ----------
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

async function loadProducts() {
  try {
    const res = await fetch("data/products.json", { cache: "no-store" });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && data.length) return data;
    }
  } catch {}
  return FALLBACK_PRODUCTS;
}

// ---------- Lógica del Carrito ----------

/**
 * Lee el carrito desde localStorage
 * @returns {Array} El carrito
 */
function getCart() {
  try {
    const raw = localStorage.getItem("hk_cart");
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/**
 * Guarda el carrito en localStorage y vuelve a renderizar
 * @param {Array} cart - El nuevo estado del carrito
 */
function updateCartState(cart) {
  try {
    localStorage.setItem("hk_cart", JSON.stringify(cart));
  } catch (e) {
    console.error("No se pudo guardar el carrito", e);
    showToast("Error al actualizar el carrito", "error");
  }
  renderCart(); // Vuelve a renderizar todo con los nuevos datos
}

/**
 * Renderiza la lista de items y el resumen de compra
 */
function renderCart() {
  const cart = getCart();
  const container = document.getElementById("cart-items-container");
  const emptyView = document.getElementById("cart-empty");
  const summaryView = document.getElementById("cart-summary");

  if (cart.length === 0) {
    container.innerHTML = "";
    emptyView.hidden = false;
    summaryView.hidden = true; // Oculta el resumen si no hay nada
    return;
  }

  emptyView.hidden = true;
  summaryView.hidden = false;

  let subtotal = 0;
  
  container.innerHTML = cart.map(item => {
    subtotal += (item.price * item.qty);
    // Buscamos el producto en el estado para saber su stock
    const product = state.products.find(p => p.id === item.id);
    const stock = product ? (product.stock || 0) : item.qty;
    
    // Deshabilitar el botón '+' si la cantidad iguala o supera el stock
    const isMaxStock = item.qty >= stock;

    return `
      <div class="card cart-item">
        <img src="${item.image || ph(item.name)}" alt="${item.name}">
        
        <div class="item-details">
          <strong>${item.name}</strong>
          <p class="small">Precio Unitario: ${formatPrice(item.price)}</p>
        </div>
        
        <div class="item-quantity">
          <button class="btn small" data-action="dec" data-id="${item.id}" ${item.qty <= 1 ? 'disabled' : ''}>-</button>
          <span>${item.qty}</span>
          <button class="btn small" data-action="inc" data-id="${item.id}" ${isMaxStock ? 'disabled' : ''}>+</button>
        </div>
        
        <div class="item-price">
          <strong>${formatPrice(item.price * item.qty)}</strong>
        </div>

        <button class="btn small ghost cart-item-remove" data-action="remove" data-id="${item.id}" aria-label="Eliminar">✕</button>
      </div>
    `;
  }).join("");

  // Actualizar el resumen
  const total = subtotal + state.shippingCost;
  document.getElementById("summary-count").textContent = `(${cart.length} artículo${cart.length > 1 ? 's' : ''})`;
  document.getElementById("summary-subtotal").textContent = formatPrice(subtotal);
  document.getElementById("summary-shipping").textContent = formatPrice(state.shippingCost);
  document.getElementById("summary-total").textContent = formatPrice(total);
}

/**
 * Manejador de eventos para los botones del carrito (aumentar, disminuir, eliminar)
 */
function handleCartAction(e) {
  const target = e.target.closest("button[data-action]");
  if (!target) return;

  const action = target.dataset.action;
  const id = target.dataset.id;
  let cart = getCart();

  if (action === "remove") {
    cart = cart.filter(item => item.id !== id);
    showToast("Producto eliminado", "success");
  } else {
    const itemIndex = cart.findIndex(item => item.id === id);
    if (itemIndex === -1) return;
    
    if (action === "inc") {
      // Verificar stock
      const product = state.products.find(p => p.id === id);
      const stock = product ? (product.stock || 0) : cart[itemIndex].qty;
      if (cart[itemIndex].qty < stock) {
        cart[itemIndex].qty++;
      } else {
        showToast("No hay más stock disponible", "error");
      }
    } else if (action === "dec") {
      if (cart[itemIndex].qty > 1) {
        cart[itemIndex].qty--;
      }
    }
  }
  
  updateCartState(cart);
}

// ---------- Lógica del Stepper (Proceso de Pago) ----------

/**
 * Muestra un paso específico del checkout y oculta los demás
 * @param {string} stepName - El ID del div a mostrar (ej. 'step-summary')
 */
function showStep(stepName) {
  // Ocultar todos los pasos
  document.querySelectorAll(".checkout-step").forEach(step => {
    step.hidden = true;
  });

  // Mostrar el paso deseado
  const activeStep = document.getElementById(stepName);
  if (activeStep) {
    activeStep.hidden = false;
  }

  // Actualizar título (opcional, pero da buena UX)
  const titles = {
    'step-summary': 'Resumen del Pedido',
    'step-address': 'Dirección de Envío',
    'step-payment': 'Método de Pago',
    'step-confirmation': '¡Compra Exitosa!'
  };
  document.getElementById("summary-title").textContent = titles[stepName] || 'Resumen';
}

/**
 * NUEVA FUNCIÓN: Añade formateo en tiempo real a los inputs
 */
function initFormFormatting() {
  // Formatear solo como numérico (CP y CVV)
  document.getElementById('addr-cp').addEventListener('input', e => {
    e.target.value = e.target.value.replace(/\D/g, ''); // Solo dígitos
  });
  document.getElementById('pay-cvv').addEventListener('input', e => {
    e.target.value = e.target.value.replace(/\D/g, ''); // Solo dígitos
  });

  // Formatear número de tarjeta (añade espacios)
  document.getElementById('pay-tarjeta').addEventListener('input', e => {
    e.target.value = e.target.value
      .replace(/\D/g, '') // Quitar no-dígitos
      .replace(/(\d{4})(?=\d)/g, '$1 '); // Añadir espacio cada 4 dígitos
  });
  
  // Formatear fecha de vencimiento (añade /)
  document.getElementById('pay-fecha').addEventListener('input', e => {
    let val = e.target.value.replace(/\D/g, ''); // Quitar no-dígitos
    if (val.length > 2) {
      val = val.slice(0, 2) + '/' + val.slice(2, 4); // Poner / y limitar a 4 dígitos (MM/AA)
    }
    e.target.value = val;
  });
}

/**
 * NUEVA FUNCIÓN: Validación de formatos de pago
 * @returns {boolean} - True si los formatos son válidos
 */
function validatePaymentFormats() {
  const card = document.getElementById('pay-tarjeta').value;
  const date = document.getElementById('pay-fecha').value;
  const cvv = document.getElementById('pay-cvv').value;

  // 1. Validar número de tarjeta (16 dígitos, que son 19 chars con espacios)
  if (card.length !== 19) {
    showToast("El número de tarjeta debe ser de 16 dígitos.", "error");
    return false;
  }
  
  // 2. Validar fecha (formato MM/AA)
  // Esta regex verifica que MM sea 01-12 y AA sean dos dígitos
  if (!/^(0[1-9]|1[0-2])\/\d{2}$/.test(date)) {
    showToast("La fecha de vencimiento debe tener el formato MM/AA.", "error");
    return false;
  }

  // 3. Validar CVV (3 o 4 dígitos)
  if (cvv.length < 3 || cvv.length > 4) {
    showToast("El CVV debe tener 3 o 4 dígitos.", "error");
    return false;
  }

  return true; // Todo en orden
}

/**
 * Conecta los botones del stepper (ACTUALIZADO con validación)
 */
function initStepper() {
  const addressForm = document.getElementById("address-form");
  const paymentForm = document.getElementById("payment-form");

  document.getElementById("btn-to-address")?.addEventListener("click", () => {
    // Validar que el usuario esté logueado
    if (!state.isAuthenticated) {
      showToast("Debes iniciar sesión para continuar", "error");
      document.getElementById("dlg-login")?.showModal();
      return;
    }
    showStep('step-address');
  });

  document.getElementById("btn-to-payment")?.addEventListener("click", () => {
    // 1. Revisar campos vacíos (gracias al 'required' en HTML)
    if (!addressForm.checkValidity()) {
      showToast("Completa todos los campos de dirección.", "error");
      addressForm.reportValidity(); // Muestra el popup nativo de HTML5
      return;
    }
    
    // 2. Revisar formato de CP
    const cp = document.getElementById('addr-cp').value;
    if (cp.length !== 5) {
      showToast("El Código Postal debe tener 5 dígitos.", "error");
      return;
    }

    // Si todo está bien, avanzamos
    showStep('step-payment');
  });

  document.getElementById("btn-pay")?.addEventListener("click", () => {
    // 1. Revisar campos vacíos
    if (!paymentForm.checkValidity()) {
      showToast("Completa todos los campos de pago.", "error");
      paymentForm.reportValidity();
      return;
    }

    // 2. Revisar formatos (tarjeta, fecha, cvv)
    if (!validatePaymentFormats()) {
      return; // La función validate ya muestra el toast de error
    }

    // --- Simulación de pago (como antes) ---
    
    // 1. Limpiar el carrito
    localStorage.removeItem("hk_cart");
    
    // 2. Mostrar confirmación
    showStep('step-confirmation');
    
    // 3. Ocultar el resumen completo (porque el carrito está vacío)
    setTimeout(() => {
       renderCart(); // Esto mostrará el mensaje de "carrito vacío"
       // Dejamos la tarjeta de confirmación visible por un momento más
       document.getElementById("summary-title").textContent = "¡Compra Exitosa!";
       document.getElementById("step-confirmation").hidden = false;
       document.getElementById("cart-summary").hidden = false;
    }, 100);

    // 4. Mostrar notificación
    showToast("¡Gracias por tu compra!", "success");
  });
}

// ================================================================
// Inicialización (Boot) (ACTUALIZADO)
// ================================================================
document.addEventListener("DOMContentLoaded", async () => {
  // Inicializar año en footer
  document.getElementById('y').textContent = new Date().getFullYear();

  // Cargar lógica de autenticación y modales
  wireTopbarModals();
  wireAuthForms();
  updateUIForAuthState(); // Muestra "Login" o "Hola, Usuario"
  
  // Cargar los datos de productos (para saber el stock)
  state.products = await loadProducts();

  // Renderizar el carrito por primera vez
  renderCart();

  // Conectar los botones del carrito (aumentar, disminuir, etc.)
  document.getElementById("cart-items-container").addEventListener("click", handleCartAction);
  
  // Conectar los botones del proceso de pago (stepper)
  initStepper();
  
  // NUEVA LLAMADA: Iniciar el formateo de inputs
  initFormFormatting();
});


// ================================================================
// Funciones de Auth y Modales (Copiadas de product.js)
// ================================================================

let toastTimer;
function showToast(message, type="success"){
  const toast = document.getElementById("toast-notification");
  if(!toast) return;
  clearTimeout(toastTimer);
  toast.textContent = message;
  toast.className = "toast";
  toast.classList.add(type,"show");
  toastTimer = setTimeout(()=> toast.classList.remove("show"), 3000);
}

function closeAnyModal(){
  document.querySelectorAll("dialog[open]").forEach(d=>{
    const form = d.querySelector("form");
    if(form) form.reset();
    d.close("cancel");
  });
}

function wireTopbarModals(){
  const dlgLogin = document.getElementById("dlg-login");
  const dlgRegister = document.getElementById("dlg-register");

  // Abrir (delegado al contenedor de acciones)
  const actionsContainer = document.querySelector(".actions");
  actionsContainer?.addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-open]');
    if (!btn) return;
    const which = btn.getAttribute('data-open');
    if (which === 'login') dlgLogin?.showModal();
    if (which === 'register') dlgRegister?.showModal();
  });

  [dlgLogin, dlgRegister].forEach(dlg=>{
    if(!dlg) return;
    dlg.addEventListener("click",(e)=>{
      const card = dlg.querySelector(".modal-card")?.getBoundingClientRect();
      if(!card) return;
      const inside = e.clientX>=card.left && e.clientX<=card.right && e.clientY>=card.top && e.clientY<=card.bottom;
      if(!inside) dlg.close("cancel");
    });
  });

  // Switch entre modales
  document.querySelectorAll("[data-switch]").forEach(link => {
    link.addEventListener("click", (e) => {
      e.preventDefault();
      const target = link.dataset.switch;
      closeAnyModal();
      document.getElementById(`dlg-${target}`)?.showModal();
    });
  });

  window.addEventListener("keydown",(e)=>{ if(e.key==="Escape") closeAnyModal(); });
}

function wireAuthForms(){
  const loginForm = document.getElementById("login-form");
  const registerForm = document.getElementById("register-form");

  registerForm?.addEventListener("submit", async (e)=>{
    e.preventDefault();
    // ... (Lógica de registro simulada)
    showToast("Registro simulado. Ahora inicia sesión.", "success");
    closeAnyModal();
    document.getElementById("dlg-login")?.showModal();
  });

  loginForm?.addEventListener("submit", async (e)=>{
    e.preventDefault();
    const fd = new FormData(loginForm);
    const email = (fd.get("email")||"").toString().trim();
    // ... (Lógica de login simulada)
    closeAnyModal();
    state.isAuthenticated = true;
    state.user = { rol:"usuario", nombre: email || "Usuario" };
    updateUIForAuthState();
    showToast(`Bienvenido(a), ${state.user.nombre.split(" ")[0]}!`, "success");
  });
}

function updateUIForAuthState(){
  const actionsContainer = document.querySelector(".actions");
  if(!actionsContainer) return;
  // El icono del carrito ya está en el HTML, solo manejamos el auth
  
  // Limpiamos los botones de auth antes de añadir los nuevos
  actionsContainer.querySelectorAll('.btn').forEach(btn => btn.remove());
  actionsContainer.querySelectorAll('.welcome-message').forEach(msg => msg.remove());

  if(state.isAuthenticated){
    const userName = state.user.nombre.split(" ")[0] || state.user.rol;
    actionsContainer.insertAdjacentHTML('beforeend', `
      <span class="welcome-message">Hola, ${userName}!</span>
      <button class="btn top-btn ghost" data-action="logout">Cerrar Sesión</button>
    `);
    actionsContainer.querySelector('[data-action="logout"]')?.addEventListener("click", handleLogout);
  } else {
    actionsContainer.insertAdjacentHTML('beforeend', `
      <button class="btn top-btn" data-open="login">Login</button>
      <button class="btn top-btn" data-open="register">Registrarse</button>
    `);
    // Los listeners para data-open ya están delegados en wireTopbarModals
  }
}

function handleLogout(){
  state.isAuthenticated = false;
  state.user = { rol:"invitado", nombre:"Invitado" };
  updateUIForAuthState();
  showToast("Sesión cerrada correctamente.", "success");
  // Si el usuario estaba en un paso avanzado del checkout, lo regresamos al resumen
  showStep('step-summary');
}