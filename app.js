// 📦 Estado Global de la Aplicación
const state = { 
    index: 0, 
    timer: null, 
    slides: [],
    isAuthenticated: false,
    user: { rol: 'invitado', nombre: 'Invitado' }
    // En el futuro: cart: [] para el estado del carrito
};

// =================================================================
// === Funciones de Inicialización CONDICIONAL ===
// =================================================================

async function init() {
    // 1. Lógica COMÚN a todas las páginas (TopBar, Modales, Estado de Auth)
    wireTopbarModals();
    updateUIForAuthState();

    // 2. Lógica ESPECÍFICA de la página actual
    if (document.querySelector('.slider')) { // Estamos en index.html
        const res = await fetch('data/slides.json');
        state.slides = await res.json();
        buildSlider();
        buildMenu();
        startAuto();
    } else if (document.querySelector('.cart-page')) { // Estamos en carrito.html
        initCartPage();
    }
}

function initCartPage() {
    // Esta es la función de inicialización para carrito.html
    console.log("Página del carrito inicializada. ¡Aquí iría la lógica para leer localStorage y renderizar los productos!");
    
    // EJEMPLO FUTURO:
    // const cartItems = getCartFromLocalStorage();
    // renderCartItems(cartItems);
}


// =================================================================
// === Slider Logic (Sin cambios, solo se llama condicionalmente) ===
// =================================================================

function buildSlider(){
    const slidesWrap = document.querySelector('.slides');
    slidesWrap.innerHTML = '';
    state.slides.forEach(s => {
        const el = document.createElement('div');
        el.className = 'slide';
        el.style.backgroundImage = `url(${s.src})`;
        el.innerHTML = `<div class="caption"><h3>${s.title}</h3><p>${s.caption}</p></div>`;
        slidesWrap.appendChild(el);
    });
    buildDots();
    updateSlider();
}

function buildDots(){
    const dots = document.querySelector('.dots');
    dots.innerHTML = '';
    state.slides.forEach((_,i)=>{
        const d = document.createElement('button');
        d.className = 'dot';
        d.setAttribute('aria-label', `Ir a slide ${i+1}`);
        d.addEventListener('click', ()=>{ go(i); });
        dots.appendChild(d);
    });
}

function go(i){
    state.index = (i + state.slides.length) % state.slides.length;
    updateSlider();
    restartAuto();
}

function updateSlider(){
    const slidesWrap = document.querySelector('.slides');
    slidesWrap.style.transform = `translateX(-${state.index*100}%)`;
    document.querySelectorAll('.dot').forEach((d,idx)=>{
        d.classList.toggle('active', idx===state.index);
    });
}

function prev(){ go(state.index - 1); }
function next(){ go(state.index + 1); }

function startAuto(){
    stopAuto();
    state.timer = setInterval(()=> next(), 4500);
}
function stopAuto(){ if(state.timer) clearInterval(state.timer); }
function restartAuto(){ stopAuto(); startAuto(); }


// =================================================================
// === Menu & Content Logic ===
// =================================================================

function createProductCard(product) {
    return `
        <div class="card">
            <strong>${product.name}</strong>
            <p class="small">Precio: ${product.price}</p>
            <button class="btn">Ver</button>
        </div>
    `;
}

const sections = {
    home: `
        <div class="card">
            <h2>Bienvenido a History Keepers</h2>
            <p class="small">Coleccionistas de artículos deportivos — jerseys, balones, tarjetas y memorabilia certificada.</p>
            <p>Explora el catálogo, busca piezas específicas o crea tu cuenta para recibir alertas de nuevas adquisiciones.</p>
            <div class="grid" style="margin-top:10px">
                <div class="card">
                    <h3>Jerseys retro</h3>
                    <p class="small">Ediciones históricas en excelente estado.</p>
                </div>
                <div class="card">
                    <h3>Balones firmados</h3>
                    <p class="small">Con certificado de autenticidad.</p>
                </div>
                <div class="card">
                    <h3>Trading cards</h3>
                    <p class="small">Rookies, series especiales y más.</p>
                </div>
            </div>
        </div>
    `,
    catalogo: `
        <div class="card">
            <h2>Catálogo (demo)</h2>
            <p class="small">Muestra simple para la página principal. La vista completa se implementará en una ruta dedicada.</p>
            <div class="grid" style="margin-top:10px">
                ${[
                    {name:"Jersey Retro 1998", price:"$3,500 MXN"},
                    {name:"Balón Firmado", price:"$6,800 MXN"},
                    {name:"Tarjeta Rookie 1986", price:"$4,200 MXN"},
                    {name:"Guantes de Portero 2005", price:"$2,100 MXN"}
                ].map(createProductCard).join('')}
            </div>
        </div>
    `,
    buscar: `
        <div class="card">
            <h2>Buscar</h2>
            <div style="display:flex; gap:8px; margin-top:8px">
                <input id="q" class="input" placeholder="Ej. jersey, balón, tarjeta..." />
                <button class="btn" onclick="fakeSearch()">Buscar</button>
            </div>
            <div id="results" style="margin-top:12px" class="small"></div>
        </div>
    `
};

function buildMenu(){
    const nav = document.querySelector('nav.menu');
    const items = [
        {key:'home', label:'Home'},
        {key:'catalogo', label:'Catálogo'},
        {key:'buscar', label:'Buscar'}
    ];
    nav.innerHTML = `<ul>${
        items.map(i=>`<li><a href="#" data-key="${i.key}">${i.label}</a></li>`).join('')
    }</ul>`;

    nav.querySelectorAll('a').forEach(a=>{
        a.addEventListener('click', e=>{
            e.preventDefault();
            setActive(a.dataset.key);
        });
    });

    setActive('home');
}

function setActive(key){
    document.querySelectorAll('nav.menu a').forEach(a=>{
        a.classList.toggle('active', a.dataset.key === key);
    });
    const content = document.querySelector('section.content');
    content.innerHTML = sections[key] || '';
}

function fakeSearch(){
    const q = document.getElementById('q').value.trim();
    const res = document.getElementById('results');
    if(!q){ res.textContent = 'Escribe algo para buscar.'; return; }
    const found = state.slides.filter(s => (s.title + ' ' + s.caption).toLowerCase().includes(q.toLowerCase()));
    res.innerHTML = found.length
        ? '<strong>Resultados:</strong><ul>' + found.map(f=>`<li>${f.title}</li>`).join('') + '</ul>'
        : `Sin resultados para "${q}".`;
}

// =================================================================
// === Modals & Toast Logic ===
// =================================================================

let toastTimer;
function showToast(message, type = 'success') {
    const toast = document.getElementById('toast-notification');
    if (!toast) return;

    clearTimeout(toastTimer);

    toast.textContent = message;
    toast.className = 'toast'; 
    toast.classList.add(type); 
    
    toast.classList.add('show');

    toastTimer = setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

function closeAnyModal(){
    document.querySelectorAll('dialog[open]').forEach(d=>{
        const form = d.querySelector('form');
        if(form) form.reset(); 
        d.close('cancel');
    });
}

function wireTopbarModals(){
    const dlgLogin = document.getElementById('dlg-login');
    const dlgRegister = document.getElementById('dlg-register');

    document.querySelectorAll('.actions [data-open]').forEach(btn=>{
        btn.addEventListener('click', ()=>{
            const which = btn.getAttribute('data-open');
            if(which === 'login') dlgLogin.showModal();
            if(which === 'register') dlgRegister.showModal();
        });
    });

    [dlgLogin, dlgRegister].forEach(dlg=>{
        dlg.addEventListener('click', (e)=>{
            const card = dlg.querySelector('.modal-card').getBoundingClientRect();
            const inside = e.clientX >= card.left && e.clientX <= card.right &&
                           e.clientY >= card.top && e.clientY <= card.bottom;
            if(!inside) dlg.close('cancel');
        });
    });

    document.querySelectorAll('[data-close]').forEach(btn=>{
        btn.addEventListener('click', ()=>{
            const targetId = btn.getAttribute('data-close');
            const dlg = document.getElementById(targetId);
            if (dlg?.open) dlg.close('cancel');
        });
    });
}

document.querySelectorAll('[data-switch]').forEach(link => {
    link.addEventListener('click', (e) => {
        e.preventDefault();
        const target = link.dataset.switch;
        closeAnyModal(); 
        document.getElementById(`dlg-${target}`).showModal();
    });
});


// =================================================================
// === Autenticación & Estado de UI ===
// =================================================================

const loginForm = document.getElementById('login-form');
const registerForm = document.getElementById('register-form');

function updateUIForAuthState() {
    const actionsContainer = document.querySelector('.actions');
    
    // Icono del Carrito (apunta a la página carrito.html)
    const cartIcon = `<a href="carrito.html" class="cart-icon" aria-label="Ir al carrito de compras">🛒</a>`;

    if (state.isAuthenticated) {
        const userName = state.user.nombre.split(' ')[0] || state.user.rol; 
        
        actionsContainer.innerHTML = `
            ${cartIcon} 
            <span class="welcome-message">Hola, ${userName}!</span>
            <button class="btn top-btn ghost" data-action="logout">Cerrar Sesión</button>
        `;
        document.querySelector('[data-action="logout"]').addEventListener('click', handleLogout);
    } else {
        actionsContainer.innerHTML = `
            ${cartIcon}
            <button class="btn top-btn" data-open="login">Loggin</button>
            <button class="btn top-btn" data-open="register">Registrarse</button>
        `;
        wireTopbarModals(); 
    }
}

function handleLogout() {
    state.isAuthenticated = false;
    state.user = { rol: 'invitado', nombre: 'Invitado' };
    updateUIForAuthState();
    showToast('Sesión cerrada correctamente.', 'success');
}


// 2. Manejador para el formulario de REGISTRO
registerForm?.addEventListener('submit', async (e) => {
    e.preventDefault(); 
    
    const nombre = registerForm.elements.nombre.value.trim();
    const email = registerForm.elements.email.value.trim();
    const password = registerForm.elements.password.value;

    if (!nombre || !email || !password) {
        showToast('Todos los campos son obligatorios.', 'error');
        return;
    }

    try {
        const response = await fetch('/api/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nombre, email, password })
        });
        const result = await response.json();

        if (result.success) {
            showToast(result.message, 'success');
            closeAnyModal(); 
            document.getElementById('dlg-login').showModal(); 
        } else {
            showToast(result.message, 'error');
        }
    } catch (error) {
        showToast('No se pudo conectar con el servidor.', 'error');
    }
});


// 3. Manejador para el formulario de LOGIN
loginForm?.addEventListener('submit', async (e) => {
    e.preventDefault();

    const email = loginForm.elements.email.value.trim();
    const password = loginForm.elements.password.value;

    if (!email || !password) {
        showToast('Introduce tu correo y contraseña.', 'error');
        return;
    }

    try {
        const response = await fetch('/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        const result = await response.json();

        if (result.success) {
            closeAnyModal(); 
            
            state.isAuthenticated = true;
            state.user = result.user; 
            updateUIForAuthState();
            
            showToast(`Bienvenido(a), ${state.user.nombre.split(' ')[0]}!`, 'success');
            
            setTimeout(() => {
                const userRole = result.user.rol;
                switch (userRole) {
                    case 'usuario comprador':
                        window.location.href = 'comprador.html';
                        break;
                    case 'trabajador':
                        window.location.href = 'trabajador.html';
                        break;
                    case 'gerente':
                        window.location.href = 'gerente.html';
                        break;
                    case 'administrador':
                        window.location.href = 'admin.html';
                        break;
                    default:
                        window.location.href = 'index.html';
                }
            }, 1000);

        } else {
            showToast(result.message, 'error');
        }
    } catch (error) {
        showToast('No se pudo conectar con el servidor.', 'error');
    }
});

// =================================================================
// === Event Listeners Generales (Protegidos) ===
// =================================================================

document.addEventListener('DOMContentLoaded', ()=>{
    const slider = document.querySelector('.slider');
    
    // Lógica para el slider (solo si el elemento existe, i.e., en index.html)
    if (slider) {
        slider.addEventListener('mouseenter', stopAuto);
        slider.addEventListener('mouseleave', startAuto);
        document.querySelector('.ctrl.prev').addEventListener('click', prev);
        document.querySelector('.ctrl.next').addEventListener('click', next);

        // Teclado para slider y escape
        window.addEventListener('keydown', (e) => {
            if(e.key === 'ArrowRight') next();
            if(e.key === 'ArrowLeft') prev();
            if(e.key === 'Escape') closeAnyModal();
        });
    } else {
        // Teclado solo para escape (en carrito.html, etc.)
        window.addEventListener('keydown', (e) => {
            if(e.key === 'Escape') closeAnyModal();
        });
    }
});


init();