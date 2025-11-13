/* =========================================================
   History Keepers — OpcionesComprador.js
   Lógica para el panel de "Mi Cuenta"
   ========================================================= */

/********** Utils UI **********/
const $ = (s, c = document) => c.querySelector(s);
const $$ = (s, c = document) => Array.from(c.querySelectorAll(s));

let toastTimer;
function showToast(msg, kind = "ok") {
  const box = $("#toasts");
  if (!box) return;
  const div = document.createElement("div");
  div.className = `toast toast--${kind}`; 
  div.innerHTML = `<i class="fa-solid ${
    kind === 'ok' ? 'fa-circle-check' : 'fa-triangle-exclamation'
  }"></i> ${msg}`;
  box.appendChild(div);
  setTimeout(() => div.remove(), 2500);
}

/********** Estado Global **********/
const state = {
  userId: null,
  user: null
};

/********** API (Frontend) **********/
// Definimos las funciones para hablar con el server.js
const api = {
  async getProfile(id) {
    const r = await fetch(`/api/profile/${id}`);
    if (!r.ok) throw new Error("No se pudieron cargar tus datos");
    return r.json();
  },
  async updateProfile(id, data) {
    const r = await fetch(`/api/profile/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!r.ok) throw new Error((await r.json()).message || "Error al actualizar");
    return r.json();
  },
  async updatePassword(id, newPassword) {
    const r = await fetch(`/api/password/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ newPassword })
    });
    if (!r.ok) throw new Error((await r.json()).message || "Error al cambiar contraseña");
    return r.json();
  }
};

/********** Lógica de Pestañas **********/
function wireTabNavigation() {
  const navLinks = $$('.inv-nav__item[data-tab]');
  const tabContents = $$('.tab-content');

  navLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const tabId = link.dataset.tab;
      
      navLinks.forEach(nav => nav.classList.remove('active'));
      link.classList.add('active');
      
      tabContents.forEach(tab => {
        // Oculta todas las pestañas, excepto el loader
        if (tab.id !== 'loader') {
          tab.classList.add('hidden');
        }
      });
      // Muestra solo la pestaña activa
      $(`#tab-${tabId}`).classList.remove('hidden');

      // (Más adelante) Cargar datos según la pestaña
      // if (tabId === 'pedidos') loadMyOrders();
      // if (tabId === 'direcciones') loadMyAddresses();
    });
  });
}

/********** Lógica de Perfil **********/

/**
 * Carga los datos del usuario desde la API y rellena el formulario
 */
async function loadUserProfile() {
  const loader = $("#loader");
  try {
    const user = await api.getProfile(state.userId);
    state.user = user;
    
    // Rellenar el formulario de perfil
    $("#profile-nombre").value = user.nombre || '';
    $("#profile-email").value = user.email || '';
    $("#profile-telefono").value = user.telefono || '';
    
    // Ocultar el loader y mostrar la pestaña de perfil
    loader.classList.add('hidden');
    $("#tab-perfil").classList.remove('hidden');

  } catch (err) {
    showToast(err.message, 'err');
    // Si falla, redirigir a inicio
    setTimeout(() => window.location.href = '/index.html', 2000);
  }
}

/**
 * Conecta los botones de "Guardar" de la pestaña Perfil
 */
function wireProfileForms() {
  // Guardar Información Personal
  $("#save-profile").addEventListener('click', async () => {
    const data = {
      nombre: $("#profile-nombre").value,
      email: $("#profile-email").value,
      telefono: $("#profile-telefono").value
    };
    
    if (!data.nombre || !data.email) {
      showToast("Nombre y Email son obligatorios.", "err");
      return;
    }
    
    try {
      const result = await api.updateProfile(state.userId, data);
      state.user = result.user; // Actualiza el estado local
      showToast(result.message, 'ok');
    } catch (err) {
      showToast(err.message, 'err');
    }
  });

  // Guardar Nueva Contraseña
  $("#save-password").addEventListener('click', async () => {
    const pass = $("#pass-new").value;
    const confirm = $("#pass-confirm").value;

    if (!pass || pass.length < 6) {
      showToast("La contraseña debe tener al menos 6 caracteres.", "err");
      return;
    }
    if (pass !== confirm) {
      showToast("Las contraseñas no coinciden.", "err");
      return;
    }

    try {
      const result = await api.updatePassword(state.userId, pass);
      showToast(result.message, 'ok');
      // Limpiar campos
      $("#pass-new").value = "";
      $("#pass-confirm").value = "";
    } catch (err) {
      showToast(err.message, 'err');
    }
  });
}


/********** Init **********/
document.addEventListener("DOMContentLoaded", () => {
  // 1. Verificar si el usuario está logueado
  state.userId = localStorage.getItem('hk-user-id');
  if (!state.userId) {
    // Si no hay ID, no puede estar aquí. Redirigir.
    alert("Necesitas iniciar sesión para ver esta página.");
    window.location.href = '/index.html';
    return;
  }

  // 2. Conectar la navegación de pestañas
  wireTabNavigation();
  
  // 3. Conectar los formularios de la pestaña "Perfil"
  wireProfileForms();

  // 4. Cargar los datos del perfil del usuario
  loadUserProfile();
});