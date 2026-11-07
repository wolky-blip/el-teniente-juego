// Teclado, botones táctiles y entrada virtual (para las pruebas automáticas).
'use strict';

const TECLAS = {
  ArrowLeft: 'izq', KeyA: 'izq', ArrowRight: 'der', KeyD: 'der',
  ArrowUp: 'arriba', KeyW: 'arriba', ArrowDown: 'abajo', KeyS: 'abajo',
  KeyZ: 'saltar', Space: 'saltar', KeyK: 'saltar',
  KeyX: 'golpe', KeyJ: 'golpe',
  KeyC: 'perro', KeyH: 'perro', KeyL: 'perro',
  Escape: 'pausa', KeyP: 'pausa', Enter: 'aceptar', KeyM: 'mudo',
};
const ACCIONES = ['izq', 'der', 'arriba', 'abajo', 'saltar', 'golpe', 'perro', 'pausa', 'aceptar', 'mudo'];

const ENTRADA = {
  teclado: {}, tactil: {}, virtual: {}, toques: {},   // toques: pulsaciones cortas que no se pueden perder
  apretado: {}, antes: {}, presionado: {},
  esTactil: false,
};

window.addEventListener('keydown', e => {
  const a = TECLAS[e.code];
  if (!a) return;
  e.preventDefault();
  ENTRADA.teclado[a] = true;
  ENTRADA.toques[a] = true;
  iniciarAudio();
});
// las últimas letras escritas (para el truco oculto del título)
ENTRADA.letras = '';
window.addEventListener('keydown', e => {
  if (/^Key[A-Z]$/.test(e.code)) ENTRADA.letras = (ENTRADA.letras + e.code[3]).slice(-8);
  else if (/^(Digit|Numpad)[0-9]$/.test(e.code)) ENTRADA.letras = (ENTRADA.letras + e.code.slice(-1)).slice(-8);
});
window.addEventListener('keyup', e => {
  const a = TECLAS[e.code];
  if (!a) return;
  e.preventDefault();
  ENTRADA.teclado[a] = false;
});
window.addEventListener('blur', () => { ENTRADA.teclado = {}; ENTRADA.tactil = {}; });

function prepararTactil() {
  const panel = document.getElementById('tactil');
  if (!panel) return;
  const mostrar = () => {
    if (ENTRADA.esTactil) return;
    ENTRADA.esTactil = true;
    document.body.classList.add('es-tactil');
  };
  if (window.matchMedia && window.matchMedia('(pointer: coarse)').matches) mostrar();
  window.addEventListener('touchstart', () => { mostrar(); iniciarAudio(); }, { passive: true });
  prepararPantallaCompleta();
  // cada botón lleva data-accion; se sigue cada dedo por separado
  const dedos = new Map();
  const recalcular = () => {
    ENTRADA.tactil = {};
    for (const a of dedos.values()) if (a) ENTRADA.tactil[a] = true;
  };
  const accionEn = (x, y) => {
    const el = document.elementFromPoint(x, y);
    const b = el && el.closest ? el.closest('[data-accion]') : null;
    return b ? b.dataset.accion : null;
  };
  const alTocar = e => {
    for (const t of e.changedTouches) {
      const a = accionEn(t.clientX, t.clientY);
      if (a && e.type === 'touchstart') ENTRADA.toques[a] = true;
      dedos.set(t.identifier, a);
    }
    recalcular();
    e.preventDefault();
    iniciarAudio();
  };
  const alSoltar = e => {
    for (const t of e.changedTouches) dedos.delete(t.identifier);
    recalcular();
    e.preventDefault();
  };
  panel.addEventListener('touchstart', alTocar, { passive: false });
  panel.addEventListener('touchmove', alTocar, { passive: false });
  panel.addEventListener('touchend', alSoltar, { passive: false });
  panel.addEventListener('touchcancel', alSoltar, { passive: false });
  // también con mouse (útil en pantallas táctiles con puntero)
  panel.querySelectorAll('[data-accion]').forEach(b => {
    b.addEventListener('mousedown', ev => { ENTRADA.tactil[b.dataset.accion] = true; ENTRADA.toques[b.dataset.accion] = true; ev.preventDefault(); iniciarAudio(); });
    b.addEventListener('mouseup', () => { ENTRADA.tactil[b.dataset.accion] = false; });
    b.addEventListener('mouseleave', () => { ENTRADA.tactil[b.dataset.accion] = false; });
  });
}

// Pantalla completa en el celular: se pide sola al primer toque (sin barra de direcciones) y queda el botón ⛶
// por si el jugador sale. El navegador solo la permite al soltar un toque. En iPhone no existe: ahí se usa
// «Agregar a pantalla de inicio», que abre el juego sin barra gracias a las etiquetas meta de index.html.
function enPantallaCompleta() { return !!(document.fullscreenElement || document.webkitFullscreenElement); }
function pedirPantallaCompleta() {
  const d = document.documentElement, pedir = d.requestFullscreen || d.webkitRequestFullscreen;
  if (!pedir || enPantallaCompleta()) return;
  try {
    Promise.resolve(pedir.call(d, { navigationUI: 'hide' }))
      .then(() => { try { screen.orientation.lock('landscape').catch(() => {}); } catch (e) { /* sin bloqueo de giro */ } })
      .catch(() => {});
  } catch (e) { /* el navegador no la dejó */ }
}
function prepararPantallaCompleta() {
  const d = document.documentElement;
  if (!(d.requestFullscreen || d.webkitRequestFullscreen)) return;
  document.body.classList.add('puede-completa');
  let salio = false;   // si el jugador la cerró, no se vuelve a pedir sola: para eso está el botón
  const cambio = () => { const en = enPantallaCompleta(); document.body.classList.toggle('en-completa', en); if (!en) salio = true; };
  document.addEventListener('fullscreenchange', cambio);
  document.addEventListener('webkitfullscreenchange', cambio);
  window.addEventListener('touchend', () => { if (!salio) pedirPantallaCompleta(); }, { passive: true });
  const boton = document.getElementById('completa');
  if (boton) {
    boton.addEventListener('touchend', ev => { ev.preventDefault(); salio = false; pedirPantallaCompleta(); }, { passive: false });
    boton.addEventListener('click', () => { salio = false; pedirPantallaCompleta(); });
  }
}

// Se llama una vez por cuadro de lógica
function actualizarEntrada() {
  for (const a of ACCIONES) {
    const v = !!(ENTRADA.teclado[a] || ENTRADA.tactil[a] || ENTRADA.virtual[a] || ENTRADA.toques[a]);
    ENTRADA.presionado[a] = v && !ENTRADA.antes[a];
    ENTRADA.apretado[a] = v;
    ENTRADA.antes[a] = v;
  }
  ENTRADA.toques = {};
}
const apretado = a => ENTRADA.apretado[a];
const presionado = a => ENTRADA.presionado[a];
// «aceptar» en menús: Enter, saltar o golpe
const aceptarMenu = () => presionado('aceptar') || presionado('saltar') || presionado('golpe');
