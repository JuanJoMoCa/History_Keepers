// Estado del slider
const state = { index: 0, timer: null, slides: [] };

async function init() {
  const res = await fetch('data/slides.json');
  state.slides = await res.json();
  buildSlider();
  buildMenu();
  startAuto();
  wireTopbarModals();
}

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

document.addEventListener('DOMContentLoaded', ()=>{
  const slider = document.querySelector('.slider');
  slider.addEventListener('mouseenter', stopAuto);
  slider.addEventListener('mouseleave', startAuto);
  document.querySelector('.ctrl.prev').addEventListener('click', prev);
  document.querySelector('.ctrl.next').addEventListener('click', next);

  // Teclado
  window.addEventListener('keydown', (e)=>{
    if(e.key === 'ArrowRight') next();
    if(e.key === 'ArrowLeft') prev();
    if(e.key === 'Escape') closeAnyModal();
  });
});

/* Menú (centrado y sin loggin/registro) */
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
        ].map(p=>`
          <div class="card">
            <strong>${p.name}</strong>
            <p class="small">Precio: ${p.price}</p>
            <button class="btn">Ver</button>
          </div>
        `).join('')}
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

/* Topbar: abrir/cerrar modales */
function wireTopbarModals(){
  const dlgLogin = document.getElementById('dlg-login');
  const dlgRegister = document.getElementById('dlg-register');

  // Abrir
  document.querySelectorAll('.actions [data-open]').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      const which = btn.getAttribute('data-open');
      if(which === 'login') dlgLogin.showModal();
      if(which === 'register') dlgRegister.showModal();
    });
  });

  // Cerrar por click fuera del card
  [dlgLogin, dlgRegister].forEach(dlg=>{
    dlg.addEventListener('click', (e)=>{
      const card = dlg.querySelector('.modal-card').getBoundingClientRect();
      const inside = e.clientX >= card.left && e.clientX <= card.right &&
                     e.clientY >= card.top && e.clientY <= card.bottom;
      if(!inside) dlg.close('cancel');
    });
  });

  // Cerrar por botones "X" o "Cancelar" (sin validar)
  document.querySelectorAll('[data-close]').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      const targetId = btn.getAttribute('data-close');
      const dlg = document.getElementById(targetId);
      if (dlg?.open) dlg.close('cancel');
    });
  });
}


function closeAnyModal(){
  document.querySelectorAll('dialog[open]').forEach(d=>d.close('cancel'));
}

init();
