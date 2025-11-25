// ==========================================
// LÓGICA GERENTE (MODO PRODUCCIÓN REAL)
// ==========================================

let allProducts = [];
let cart = [];

document.addEventListener("DOMContentLoaded", () => {
  // Verificar si hay sesión (Opcional, según tu auth)
  // loadAuthFromStorage(); 
  loadData();
});

// --- 1. CARGAR DATOS REALES ---
/*async function loadData() {
  const tableBody = document.getElementById('inventory-list');
  
  try {
    // Petición REAL a tu servidor
    const res = await fetch('/api/products');
    
    if (!res.ok) {
      throw new Error(`Error del Servidor: ${res.status}`);
    }

    allProducts = await res.json();
    
    // Si no hay productos en la BD
    if (allProducts.length === 0) {
      tableBody.innerHTML = `<tr><td colspan="5" class="text-center">La base de datos está vacía.</td></tr>`;
      return;
    }

    // Renderizar datos reales
    renderInventory(allProducts);
    renderPOS(allProducts);
    
  } catch (error) {
    console.error("Error fatal cargando datos:", error);
    tableBody.innerHTML = `
      <tr>
        <td colspan="5" style="text-align:center; color:red; padding:20px;">
          <strong>Error de Conexión:</strong> No se pudo obtener el inventario real.<br>
          <small>Verifica que 'npm start' esté corriendo y conectado a Mongo Atlas.</small>
        </td>
      </tr>
    `;
    alert("⚠️ CRÍTICO: No hay conexión con la Base de Datos.");
  }
}*/

// --- 1. FUNCIÓN DE CARGA (ARREGLADA) ---
async function loadData() {
  const tbody = document.getElementById('inventory-list');
  
  try {
    const res = await fetch('/api/products');
    if (!res.ok) throw new Error("Error de conexión con API");
    
    const data = await res.json();
    
    // ============================================================
    // CORRECCIÓN CLAVE: Detectar si es Lista directa o Objeto
    // ============================================================
    if (Array.isArray(data)) {
      allProducts = data;          // Formato Nuevo
    } else {
      allProducts = data.items || []; // Formato Viejo
    }
    // ============================================================

    if (allProducts.length === 0) {
      tbody.innerHTML = `<tr><td colspan="5" class="text-center">El inventario está vacío.</td></tr>`;
      return;
    }

    // Dibujar la tabla y actualizar el POS
    renderInventory(allProducts);
    if (typeof renderPOS === 'function') renderPOS(allProducts);
    
  } catch (error) {
    console.error(error);
    tbody.innerHTML = `<tr><td colspan="5" class="text-center" style="color:red;">Error cargando datos</td></tr>`;
  }
}

// --- 2. RENDERIZAR TABLA (CON ESTADO REAL DE LA BD) ---
function renderInventory(products) {
  const tbody = document.getElementById('inventory-list');
  
  tbody.innerHTML = products.map(p => {
    // 1. Lógica de Imagen
    const imgUrl = (p.images && p.images.length > 0) ? p.images[0] : 'https://placehold.co/50x50?text=No+Img';

    // 2. Lógica de Estado REAL (Desde la Base de Datos)
    // Obtenemos el valor real que viene del servidor (ej: 'active', 'paused')
    let realStatus = p.status || 'unknown'; 
    
    // Traducción para que se vea bonito en español
    let displayStatus = realStatus;
    let badgeColor = 'badge--off'; // Rojo por defecto

    if (realStatus === 'active') {
      displayStatus = 'Disponible';
      badgeColor = 'badge--ok'; // Verde
    } else if (p.stock === 0) {
      displayStatus = 'Agotado';
      badgeColor = 'badge--off'; // Rojo
    } else {
      // Para cualquier otro estado que venga de la BD
      displayStatus = realStatus.charAt(0).toUpperCase() + realStatus.slice(1);
    }

    return `
    <tr>
      <td>
        <img src="${imgUrl}" class="table-img" onerror="this.src='https://placehold.co/50x50?text=Error'">
      </td>

      <td>
        <div style="font-weight:bold; color:#333;">${p.name}</div>
        <div class="muted" style="font-size:12px; max-width: 400px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
          ${(p.description || "").substring(0, 30)}...
        </div>
      </td>
      
      <td>
        <span style="background:#f0f2f5; padding:4px 8px; border-radius:12px; font-size:0.85rem; color:#666;">
          ${p.category || 'General'}
        </span>
      </td>
      
      <td style="font-weight:bold;">$${Number(p.price).toLocaleString('es-MX')}</td>
      
      <td>
        <span class="status-badge-product ${badgeColor}">
          ${displayStatus}
        </span>
      </td>
      


      <td>
        <button onclick="editProduct('${p._id}')" style="background:#3498db; color:white; border:none; padding:6px 10px; border-radius:4px; cursor:pointer;">
          <i class="fa-solid fa-pen"></i>
        </button>
      </td>
      
    </tr>
  `}).join('');
}

// --- 2. PESTAÑAS ---
window.switchTab = function(tabName) {
  document.querySelectorAll('.panel-section').forEach(el => el.style.display = 'none');
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
  
  document.getElementById('tab-' + tabName).style.display = 'block';
  event.currentTarget.classList.add('active');
}

window.logout = function() {
  window.location.href = '/index.html';
}

// --- 3. INVENTARIO (TABLA) ---
/*function renderInventory(products) {
  const tbody = document.getElementById('inventory-list');
  
  tbody.innerHTML = products.map(p => {
    // Usar imagen real o placeholder si el link está roto
    const img = (p.images && p.images.length > 0) ? p.images[0] : 'https://placehold.co/50x50?text=No+Img';
    
    return `
    <tr>
      <td><img src="${img}" style="width:40px; height:40px; object-fit:cover; border-radius:4px;"></td>
      <td><strong>${p.name}</strong></td>
      <td>${p.category || 'Sin categoría'}</td>
      <td>$${Number(p.price).toLocaleString('es-MX')}</td>
      <td style="color: ${p.stock < 5 ? 'red' : 'green'}; font-weight:bold;">${p.stock}</td>
    </tr>
  `}).join('');
}*/

window.filterInventory = function() {
  const term = document.getElementById('inv-search').value.toLowerCase();
  const filtered = allProducts.filter(p => p.name.toLowerCase().includes(term));
  renderInventory(filtered);
}

// --- 4. PUNTO DE VENTA (POS) ---
function renderPOS(products) {
  const grid = document.getElementById('pos-products');
  
  grid.innerHTML = products.map(p => {
    const img = (p.images && p.images.length > 0) ? p.images[0] : 'https://placehold.co/100x100?text=Producto';
    return `
    <div class="pos-card" onclick="addToCart('${p._id}')">
      <img src="${img}" alt="${p.name}">
      <div class="pos-info">
        <h4>${p.name}</h4>
        <p class="price">$${Number(p.price).toLocaleString('es-MX')}</p>
      </div>
    </div>
  `}).join('');
}

window.addToCart = function(id) {
  const product = allProducts.find(p => p._id === id);
  
  // Verificar stock real
  if (product.stock <= 0) {
    alert("¡Sin stock disponible!");
    return;
  }

  const existing = cart.find(i => i._id === id);
  
  if (existing) {
    if (existing.qty >= product.stock) {
      alert("No puedes vender más del stock disponible.");
      return;
    }
    existing.qty++;
  } else {
    cart.push({ ...product, qty: 1 });
  }
  
  updateTicket();
}

function updateTicket() {
  const container = document.getElementById('ticket-items');
  let total = 0;
  
  if (cart.length === 0) {
    container.innerHTML = '<p class="empty-msg">Ticket vacío</p>';
    document.getElementById('ticket-total-amount').textContent = '$0.00';
    return;
  }

  container.innerHTML = cart.map((item, idx) => {
    total += item.price * item.qty;
    return `
      <div class="ticket-row">
        <span>${item.qty} x ${item.name}</span>
        <span onclick="removeFromCart(${idx})" style="color:red; cursor:pointer; font-weight:bold;">&times;</span>
      </div>
    `;
  }).join('');
  
  document.getElementById('ticket-total-amount').textContent = `$${total.toLocaleString('es-MX', {minimumFractionDigits: 2})}`;
}

window.removeFromCart = function(idx) {
  cart.splice(idx, 1);
  updateTicket();
}

// --- 5. PROCESAR VENTA (REAL) ---
window.processSale = async function() {
  if (cart.length === 0) return alert("No hay productos para cobrar.");
  
  if (!confirm(`¿Confirmar venta por ${document.getElementById('ticket-total-amount').textContent}?`)) return;

  const orderData = {
    items: cart.map(item => ({
      productId: item._id,
      name: item.name,
      price: item.price,
      qty: item.qty
    })),
    total: cart.reduce((sum, i) => sum + (i.price * i.qty), 0),
    date: new Date(),
    status: 'completado' // Venta en tienda es inmediata
  };

  try {
    const btn = document.querySelector('.btn-pay');
    btn.disabled = true;
    btn.textContent = "Procesando...";

    // Enviar a la API Real
    // Asegúrate de que tu server.js tenga una ruta POST /api/orders o similar
    // Si no la tienes, avísame para dártela. Aquí asumo /api/pedidos o similar.
    const res = await fetch('/api/orders', { // OJO: Verifica si tu ruta es 'orders' o 'pedidos'
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(orderData)
    });

    if (res.ok) {
      alert("✅ ¡Venta registrada en la Base de Datos!");
      cart = [];
      updateTicket();
      loadData(); // Recargar inventario para ver el stock bajar
    } else {
      throw new Error("Error en la respuesta del servidor");
    }

  } catch (error) {
    console.error(error);
    alert("❌ Error al guardar la venta. Revisa la consola.");
  } finally {
    const btn = document.querySelector('.btn-pay');
    btn.disabled = false;
    btn.textContent = "COBRAR";
  }
}

// === FUNCIONES DE EDICIÓN (CLONADAS DE ADMIN) ===

// 1. ABRIR MODAL
window.editProduct = function(id) {
  const p = allProducts.find(prod => prod._id === id);
  if (!p) return;

  // Usamos los IDs 'p-...' igual que en el HTML que acabamos de pegar
  document.getElementById('p-id').value = p._id;
  document.getElementById('p-name').value = p.name;
  document.getElementById('p-price').value = p.price;
  document.getElementById('p-stock').value = p.stock;

  // Mostrar modal 'product-modal'
  document.getElementById('product-modal').style.display = 'flex';
}

// 2. CERRAR MODAL
window.closeModal = function() {
  document.getElementById('product-modal').style.display = 'none';
}

// 3. GUARDAR (PUT)
window.saveProduct = async function(e) {
  e.preventDefault();

  const id = document.getElementById('p-id').value;
  
  const updates = {
    price: Number(document.getElementById('p-price').value),
    stock: Number(document.getElementById('p-stock').value)
  };

  try {
    const res = await fetch(`/api/products/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates)
    });

    if (res.ok) {
      alert("✅ Producto actualizado");
      closeModal();
      loadData(); // Recargar la tabla
    } else {
      alert("❌ Error al guardar");
    }
  } catch (error) {
    console.error(error);
    alert("Error de conexión");
  }
}

// Cerrar si clic afuera
window.onclick = function(event) {
  const modal = document.getElementById('product-modal');
  if (event.target == modal) closeModal();
}