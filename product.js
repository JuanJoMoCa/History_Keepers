// ================================================================
// History Keepers — product.js (Detalle + Comentarios)
// ================================================================
const state = {
  isAuthenticated: false,
  user: { rol: "invitado", nombre: "Invitado" },
  products: []
};

// Fallback de productos (igual que antes)
const FALLBACK_PRODUCTS = [
  { id:"jersey-1998", name:"Jersey Retro 1998", price:3500, stock:5,
    images:["assets/products/jersey1998-1.jpg","assets/products/jersey1998-2.jpg","assets/products/jersey1998-3.jpg"],
    description:"Edición histórica de club, excelente estado de conservación.",
    highlights:["Tallas M y L","Original","Coleccionable"] },
  { id:"balon-firmado", name:"Balón Firmado", price:6800, stock:3,
    images:["assets/products/balon-1.jpg","assets/products/balon-2.jpg"],
    description:"Balón autografiado con certificado de autenticidad.",
    highlights:["Incluye certificado","Edición limitada"] },
  { id:"tarjeta-1986", name:"Tarjeta Rookie 1986", price:4200, stock:2,
    images:["assets/products/rookie1986-1.jpg","assets/products/rookie1986-2.jpg"],
    description:"Tarjeta rookie clásica, ideal para marcos y exhibición.",
    highlights:["Grado de conservación alto","Serie especial"] },
  { id:"guantes-2005", name:"Guantes de Portero 2005", price:2100, stock:8,
    images:["assets/products/guantes2005-1.jpg"],
    description:"Modelo profesional de archivo 2005.",
    highlights:["Pieza de archivo","Material original"] }
];

// ---------- Utilidades ----------
function formatPrice(n){
  return (n ?? 0).toLocaleString("es-MX",{style:"currency",currency:"MXN",maximumFractionDigits:0});
}
function ph(title="Producto"){
  const svg = encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' width='800' height='600'>
    <rect width='100%' height='100%' fill='#eee'/>
    <text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle' fill='#666' font-family='Inter,Arial' font-size='24'>${title}</text>
  </svg>`);
  return `data:image/svg+xml;utf8,${svg}`;
}
function getParam(name){ return new URL(window.location.href).searchParams.get(name); }

async function loadProducts(){
  try{
    const res = await fetch("data/products.json",{cache:"no-store"});
    if(res.ok){
      const data = await res.json();
      if(Array.isArray(data) && data.length) return data;
    }
  }catch{}
  return FALLBACK_PRODUCTS;
}

// ---------- Boot ----------
document.addEventListener("DOMContentLoaded", async () => {
  wireTopbarModals();
  wireAuthForms();
  updateUIForAuthState();

  state.products = await loadProducts();
  const id = getParam("id");
  const product = state.products.find(p => p.id === id);

  if(!product){
    document.getElementById("not-found").hidden = false;
    return;
  }

  renderProduct(product);
  initComments(product.id, product.name);
});

// ---------- Render de producto ----------
function renderProduct(p){
  const view = document.getElementById("product-view");
  view.hidden = false;

  const docTitle = document.getElementById("doc-title");
  if(docTitle) docTitle.textContent = `${p.name} — History Keepers`;
  const bcName = document.getElementById("bc-name");
  if(bcName) bcName.textContent = p.name;

  // Galería
  const imgs = (p.images && p.images.length ? p.images : [ph(p.name)]);
  const thumbs = document.getElementById("p-thumbs");
  const main = document.getElementById("p-main");

  thumbs.innerHTML = imgs.map((src,i)=>`
    <button class="thumb ${i===0?"active":""}" data-idx="${i}" aria-label="Imagen ${i+1}">
      <img src="${src}" alt="${p.name} miniatura ${i+1}">
    </button>`).join("");

  main.src = imgs[0]; main.alt = p.name;

  thumbs.querySelectorAll(".thumb").forEach(btn=>{
    btn.addEventListener("click", ()=>{
      const idx = +btn.dataset.idx;
      main.src = imgs[idx] || imgs[0];
      thumbs.querySelectorAll(".thumb").forEach(b=>b.classList.remove("active"));
      btn.classList.add("active");
      // LÍNEA NUEVA: Actualizar la imagen de la lupa
      setTimeout(() => document.dispatchEvent(new Event('updateMagnifier')), 50);
    });
  });

  // Info
  document.getElementById("p-title").textContent = p.name;
  document.getElementById("p-price").textContent = formatPrice(p.price);
  document.getElementById("p-stock").textContent = p.stock ?? "Disponible";
  document.getElementById("p-desc").textContent = p.description || "Artículo de colección, pieza única para fans.";
  document.getElementById("p-highlights").innerHTML = (p.highlights||[]).map(h=>`<li>${h}</li>`).join("");

  // Acciones (ahora están al final, debajo de la descripción)
  document.getElementById("add-cart").addEventListener("click", ()=>{
    const qty = Math.max(1, parseInt(document.getElementById("qty").value,10) || 1);
    addToCart(p, qty);
  });
  document.getElementById("buy-now").addEventListener("click", ()=>{
    const qty = Math.max(1, parseInt(document.getElementById("qty").value,10) || 1);
    addToCart(p, qty);
    showToast("Llevándote al carrito…","success");
    setTimeout(()=> window.location.href = "carrito.html", 600);
  });
}
  
 

  view.scrollIntoView({behavior:"smooth"});


// ---------- Cantidad limitada por stock ----------
function clampQty(q, stock) {
  let v = Math.floor(parseInt(q, 10) || 0);
  v = Math.min(Math.max(v, 0), Math.max(0, stock || 0));
  return v;
}

document.getElementById("add-cart").addEventListener("click", () => {
  const qty = clampQty(document.getElementById("qty").value, p.stock);
  if (qty <= 0) { showToast("Selecciona al menos 1 unidad.", "error"); return; }
  addToCart(p, qty);
});

document.getElementById("buy-now").addEventListener("click", () => {
  const qty = clampQty(document.getElementById("qty").value, p.stock);
  if (qty <= 0) { showToast("Selecciona al menos 1 unidad.", "error"); return; }
  addToCart(p, qty);
  showToast("Llevándote al carrito…","success");
  setTimeout(() => window.location.href = "carrito.html", 600);
});

// ---------- Carrito ----------
function addToCart(p, qty){
  try{
    const key = "hk_cart";
    const raw = localStorage.getItem(key);
    const cart = raw ? JSON.parse(raw) : [];
    const i = cart.findIndex(x=>x.id===p.id);
    const stock = Math.max(0, Number(p.stock) || 0);
    const current = i >= 0 ? (cart[i].qty || 0) : 0;
    const canAdd = Math.max(0, stock - current);

    if (canAdd <= 0) { showToast("No hay más stock disponible para este producto.", "error"); return; }

    const toAdd = Math.min(qty, canAdd);
    if (i >= 0) cart[i].qty = current + toAdd;
    else cart.push({ id: p.id, name: p.name, price: p.price, qty: toAdd, image: (p.images && p.images[0]) || ph(p.name) });

    localStorage.setItem(key, JSON.stringify(cart));

    if (qty > toAdd) showToast(`Solo puedes agregar ${toAdd} por el stock disponible.`, "error");
    else showToast("Producto agregado al carrito", "success");
  }catch{
    showToast("No se pudo guardar el carrito en este navegador","error");
  }
}

// ---------- Comentarios ----------
function initComments(productId, productName){
  document.getElementById("comments-card").hidden = false;
  renderCommentsList(productId);

  const form = document.getElementById("comment-form");
  if (state.isAuthenticated) enableCommenting(); else disableCommenting();

  form.addEventListener("submit", (e)=>{
    e.preventDefault();

    if (!state.isAuthenticated) {
      showToast("Debes iniciar sesión para comentar.","error");
      document.getElementById("dlg-login")?.showModal();
      return;
    }

    const name = (document.getElementById("c-name").value || "").trim();
    const rating = parseInt(document.getElementById("c-rating").value,10) || 5;
    const text = (document.getElementById("c-text").value || "").trim();

    if(!name || !text){
      showToast("Completa tu nombre y comentario.","error");
      return;
    }

    const newComment = { id: Date.now(), name, rating, text, date: new Date().toISOString() };
    const all = readComments();
    all[productId] = all[productId] || [];
    all[productId].unshift(newComment);
    saveComments(all);

    form.reset();
    renderCommentsList(productId);
    showToast("¡Gracias por tu opinión!","success");
  });
}

function readComments(){
  try{
    return JSON.parse(localStorage.getItem("hk_comments") || "{}");
  }catch{ return {}; }
}

function saveComments(obj){
  try{ localStorage.setItem("hk_comments", JSON.stringify(obj)); }catch{}
}

function renderCommentsList(productId){
  const listEl = document.getElementById("comments-list");
  const all = readComments();
  const list = all[productId] || [];

  if(list.length === 0){
    listEl.innerHTML = `<p class="empty">Aún no hay opiniones para este producto.</p>`;
    return;
  }

  listEl.innerHTML = list.map(c=>{
    const d = new Date(c.date);
    const stars = "★".repeat(Math.max(1, Math.min(5, c.rating))) + "☆".repeat(5 - Math.max(1, Math.min(5, c.rating)));
    return `
      <div class="comment-item">
        <div class="comment-head">
          <span class="comment-name">${escapeHTML(c.name)}</span>
          <span class="stars" aria-label="Calificación">${stars}</span>
          <span class="comment-date">• ${d.toLocaleDateString("es-MX",{year:"numeric",month:"short",day:"numeric"})}</span>
        </div>
        <div class="comment-body">${escapeHTML(c.text)}</div>
      </div>
    `;
  }).join("");
}

// Pequeña utilidad para evitar inyección en HTML de comentarios
function escapeHTML(s){
  return s.replace(/[&<>"']/g, m => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"
  }[m]));
}

// ---------- Toast ----------
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

// ---------- Modales + Auth (igual que antes) ----------
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
  document.querySelectorAll("[data-open]").forEach(btn=>{
    btn.addEventListener("click",()=>{
      const which = btn.getAttribute("data-open");
      if(which==="login") dlgLogin?.showModal();
      if(which==="register") dlgRegister?.showModal();
    });
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
  window.addEventListener("keydown",(e)=>{ if(e.key==="Escape") closeAnyModal(); });
}
function wireAuthForms(){
  const loginForm = document.getElementById("login-form");
  const registerForm = document.getElementById("register-form");

  registerForm?.addEventListener("submit", async (e)=>{
    e.preventDefault();
    const fd = new FormData(registerForm);
    const nombre = (fd.get("nombre")||"").toString().trim();
    const email = (fd.get("email")||"").toString().trim();
    const password = (fd.get("password")||"").toString();
    if(!nombre || !email || !password){ showToast("Todos los campos son obligatorios.","error"); return; }
    try{
      const resp = await fetch("/api/register",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({nombre,email,password})});
      const result = await resp.json();
      if(result?.success){ showToast(result.message||"Cuenta creada.","success"); closeAnyModal(); document.getElementById("dlg-login")?.showModal(); }
      else { showToast(result?.message||"No se pudo registrar.","error"); }
    }catch{
      showToast("Registro simulado (sin backend). Ahora inicia sesión.","success");
      closeAnyModal();
      document.getElementById("dlg-login")?.showModal();
    }
  });

  loginForm?.addEventListener("submit", async (e)=>{
    e.preventDefault();
    const fd = new FormData(loginForm);
    const email = (fd.get("email")||"").toString().trim();
    const password = (fd.get("password")||"").toString();
    if(!email || !password){ showToast("Introduce tu correo y contraseña.","error"); return; }
    try{
      const resp = await fetch("/api/login",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({email,password})});
      const result = await resp.json();
      if(result?.success){
        closeAnyModal();
        state.isAuthenticated = true;
        state.user = result.user || { rol:"usuario", nombre: email };
        updateUIForAuthState();
        enableCommenting();
        showToast(`Bienvenido(a), ${state.user.nombre.split(" ")[0]}!`,"success");
      } else {
        showToast(result?.message || "Credenciales incorrectas.","error");
      }
    }catch{
      closeAnyModal();
      state.isAuthenticated = true;
      state.user = { rol:"usuario", nombre: email || "Usuario" };
      updateUIForAuthState();
      enableCommenting();
      showToast(`Bienvenido(a), ${state.user.nombre.split(" ")[0]}!`,"success");
    }
  });
}

function updateUIForAuthState(){
  const actionsContainer = document.querySelector(".actions");
  if(!actionsContainer) return;
  const cartIcon = `<a href="carrito.html" class="cart-icon" aria-label="Ir al carrito de compras">🛒</a>`;
  if(state.isAuthenticated){
    const userName = state.user.nombre.split(" ")[0] || state.user.rol;
    actionsContainer.innerHTML = `${cartIcon}
      <span class="welcome-message">Hola, ${userName}!</span>
      <button class="btn top-btn ghost" data-action="logout">Cerrar Sesión</button>`;
    actionsContainer.querySelector('[data-action="logout"]')?.addEventListener("click", handleLogout);
  }else{
    actionsContainer.innerHTML = `${cartIcon}
      <button class="btn top-btn" data-open="login">Login</button>
      <button class="btn top-btn" data-open="register">Registrarse</button>`;
    wireTopbarModals();
  }
}

function handleLogout(){
  state.isAuthenticated = false;
  state.user = { rol:"invitado", nombre:"Invitado" };
  updateUIForAuthState();
  disableCommenting();
  showToast("Sesión cerrada correctamente.","success");
}
