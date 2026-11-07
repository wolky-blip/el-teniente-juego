// El Teniente: Nato y la ciudad de las escaleras · motor del juego y escenas.
// Mundo en unidades de 320×180 (casillas de 16); el lienzo real es de 960×540 y se dibuja escalado ×3.
'use strict';

const W = 320, H = 180, ESC = 3;
const GRAV = 0.3, MAX_CAIDA = 5.5, VEL = 1.65, SALTO = -5.9, CORTE = -1.9;

let lienzo, ctx;
const IMG = {};
const J = { escena: null, nombre: '', t: 0, fundido: null, cuadros: 0, bucleActivo: true };
let P = null;     // partida en curso
let S = null;     // estado del nivel en curso

// ------------------------------------------------------------------ carga de imágenes
const FONDOS = ['cerro', 'hamilton', 'cuevas', 'pueblo', 'molino', 'sewell', 'fundicion', 'noche', 'tex_roca', 'tex_cueva',
  'escaleras', 'palitroque', 'caletones', 'cine', 'tejados', 'tormenta', 'sewell1967', 'cumbre', 'valle_tren', 'sewell_vacio'];
// si falta un fondo nuevo (todavía no generado), se usa uno parecido
const FONDO_ALT = { escaleras: 'sewell', tejados: 'sewell', caletones: 'molino', palitroque: 'pueblo', cine: 'noche', tormenta: 'noche', sewell1967: 'sewell', cumbre: 'noche', valle_tren: 'molino', sewell_vacio: 'noche' };
function imgFondo(n) {
  const im = IMG['f_' + n];
  if (im && im.width) return im;
  const alt = IMG['f_' + FONDO_ALT[n]];
  return alt && alt.width ? alt : null;
}
function cargarImagenes(listo) {
  const nombres = Object.keys(SPRITES_INFO).map(n => ['sprites/' + n + '.png', n])
    .concat(FONDOS.map(n => ['fondos/' + n + '.jpg', 'f_' + n]));
  nombres.push(['logo', 'logo']);
  if (typeof ANIM_INFO !== 'undefined') for (const k in ANIM_INFO) nombres.push(['anim/' + k + '.png', 'a_' + k]);
  // Nato con la chaqueta regalona color cobre (herramientas/tenir_chaqueta.py)
  for (const n of Object.keys(SPRITES_INFO)) if (n.startsWith('nato_')) nombres.push(['sprites/chaqueta/' + n + '.png', 'ch_' + n]);
  if (typeof ANIM_INFO !== 'undefined' && ANIM_INFO.nato_correr) nombres.push(['anim/chaqueta/nato_correr.png', 'ch_a_nato_correr']);
  let faltan = nombres.length;
  const uno = () => { if (--faltan === 0) listo(); };
  for (const [ruta, clave] of nombres) {
    const im = new Image();
    im.onload = uno;
    im.onerror = () => { console.warn('no cargó', ruta); uno(); };
    im.src = ruta === 'logo' ? LOGO_WOLKY : 'assets/' + ruta;
    IMG[clave] = im;
  }
}

// ------------------------------------------------------------------ dibujo de poses
// Cada familia de personajes tiene una escala fija para que todas sus poses midan lo mismo.
const ALTURA = { diego: 35, nato: 34, pedro: 33, minero: 34, jefe: 52, condor: 48, anciana: 30, mujer: 32, hercules: 60 };
function escalaDe(familia) {
  const ref = { nato: 'nato_quieto', pedro: 'pedro_quieto', minero: 'minero_caminar1', jefe: 'jefe_quieto',
    condor: 'condor_vuela', anciana: 'anciana', mujer: 'mujer', hercules: 'hercules_corre1', diego: 'diego_saluda' }[familia];
  const info = SPRITES_INFO[ref];
  if (!info) return 0.1;
  return (familia === 'condor' || familia === 'hercules') ? ALTURA[familia] / info[0] : ALTURA[familia] / info[1];
}
const _escalas = {};
function escalaFam(f) { return _escalas[f] || (_escalas[f] = escalaDe(f)); }
// Tamaño real de cada dibujo en el mundo (alto «h» o ancho «w»), para que todas las poses guarden proporción
// aunque cada imagen generada venga recortada a su contorno.
const TAM_POSE = {
  nato_quieto: { h: 34 }, nato_correr1: { h: 33 }, nato_correr2: { h: 33 }, nato_correr3: { h: 33 }, nato_correr4: { h: 33 },
  nato_saltar: { h: 29 }, nato_caer: { h: 33 }, nato_golpe: { h: 33 }, nato_golpe2: { h: 33.5 }, nato_gancho: { h: 38 },
  nato_patada: { h: 31 }, nato_herido: { h: 32 }, nato_trepar: { h: 34 }, nato_trepar1: { h: 35 }, nato_trepar2: { h: 35 },
  nato_colgado: { h: 39 }, nato_victoria: { h: 39 },
  pedro_quieto: { h: 33 }, pedro_colgado: { h: 38 }, pedro_llevado: { h: 32 }, pedro_llevado2: { h: 31 },
  minero_caminar1: { h: 34 }, minero_caminar2: { h: 34 }, minero_caminar3: { h: 34 }, minero_golpe: { h: 33 }, minero_mareado: { h: 23 },
  jefe_quieto: { h: 52 }, jefe_senala: { h: 52 },
  diego_chaqueta: { h: 36 }, diego_saluda: { h: 40 },   // Diego mide un poco más que Nato (la mano en alto suma al saludar)
  anciana: { h: 30 }, mujer: { h: 32 },
  condor_vuela: { w: 46 }, condor_alas_arriba: { w: 42 }, condor_alas_medio: { w: 46 }, condor_alas_abajo: { w: 44 }, condor_picada: { w: 42 },
  hercules_corre1: { w: 31 }, hercules_corre2: { w: 31 }, hercules_corre3: { w: 30 }, hercules_salta: { w: 32 }, hercules_sentado: { h: 19 },
};
// Dibujos generados que miran a la izquierda (el resto mira a la derecha). El motor los voltea para que miren adonde corresponde.
const MIRA_IZQ = new Set(['diego_chaqueta', 'diego_saluda', 'nato_quieto', 'nato_herido', 'pedro_quieto', 'pedro_llevado2', 'anciana', 'mujer', 'nato_correr']);
const FAMILIA_ANIM = { nato_correr: { h: 34 }, minero_caminar: { h: 34 }, jefe_hablar: { h: 52 }, hercules_correr: { w: 31 }, condor_volar: { w: 46, ax: 0.56 } };
function familiaDe(nombre) { return nombre.split('_')[0]; }
// factor relativo pedido por quien llama (por ejemplo ×1,9 en la escena de inicio)
function factorDe(nombre, esc) { const f = escalaFam(familiaDe(nombre)); return f ? esc / f : 1; }

// Tira de animación (ciclo real generado con video): cuadro i, pies en (x, y)
function anim(clave, i, x, y, dir, esc, op) {
  const ch = op && op.chaqueta && IMG['ch_a_' + clave];
  const im = ch && ch.width ? ch : IMG['a_' + clave], info = (typeof ANIM_INFO !== 'undefined') && ANIM_INFO[clave];
  if (!im || !info || !im.width) return false;
  op = op || {};
  const ref = FAMILIA_ANIM[clave], k = factorDe(clave, esc);
  if (MIRA_IZQ.has(clave)) dir = -dir;
  const s = (ref.h ? ref.h / info.refAlto : ref.w / info.refAncho) * k;
  const w = info.w * s, h = info.h * s, n = ((Math.floor(i) % info.n) + info.n) % info.n;
  ctx.save();
  ctx.translate(x, y);
  if (op.rot) ctx.rotate(op.rot);
  if (dir < 0) ctx.scale(-1, 1);
  if (op.alfa != null) ctx.globalAlpha *= op.alfa;
  if (op.tizne) ctx.filter = 'brightness(0.35) saturate(0.3)';
  else if (op.destello) ctx.filter = 'brightness(2.2)';
  if (op.brillo) { ctx.shadowColor = op.brillo; ctx.shadowBlur = 14; }
  ctx.drawImage(im, n * info.w, 0, info.w, info.h, -(ref.ax || info.ax) * w, op.medio ? -h / 2 : -h, w, h);
  ctx.restore();
  return true;
}
const hayAnim = clave => typeof ANIM_INFO !== 'undefined' && ANIM_INFO[clave] && IMG['a_' + clave] && IMG['a_' + clave].width;

// dibuja la pose con los pies (borde de abajo) en (x, y); dir = 1 mira a la derecha
function pose(nombre, x, y, dir, esc, op) {
  const ch = op && op.chaqueta && IMG['ch_' + nombre];
  const im = ch && ch.width ? ch : IMG[nombre], info = SPRITES_INFO[nombre];
  if (!im || !info) return;
  op = op || {};
  let w = info[0] * esc, h = info[1] * esc;
  const tam = TAM_POSE[nombre];
  if (tam) { // tamaño real × el factor que pidió quien llama
    const k = factorDe(nombre, esc);
    if (tam.h) { h = tam.h * k; w = info[0] * h / info[1]; } else { w = tam.w * k; h = info[1] * w / info[0]; }
  }
  const ax = (op.centrar ? 0.5 : info[2]) * w;
  if (MIRA_IZQ.has(nombre)) dir = -dir;
  ctx.save();
  ctx.translate(x, y);
  if (op.rot) ctx.rotate(op.rot);
  if (dir < 0) ctx.scale(-1, 1);
  if (op.escY) ctx.scale(2 - op.escY, op.escY);
  if (op.alfa != null) ctx.globalAlpha *= op.alfa;
  if (op.tizne) ctx.filter = 'brightness(0.35) saturate(0.3)';
  else if (op.destello) ctx.filter = 'brightness(2.2)';
  if (op.brillo) { ctx.shadowColor = op.brillo; ctx.shadowBlur = 14; }
  ctx.drawImage(im, -ax, op.medio ? -h / 2 : -h, w, h);
  ctx.restore();
}
// imagen de objeto por ancho en el mundo, con el borde de abajo en y
function objeto(nombre, x, y, ancho, op) {
  const im = IMG[nombre], info = SPRITES_INFO[nombre];
  if (!im || !info) return;
  op = op || {};
  const w = ancho, h = info[1] * ancho / info[0];
  ctx.save();
  if (op.alfa != null) ctx.globalAlpha *= op.alfa;
  if (op.voltear) { ctx.translate(x + w, 0); ctx.scale(-1, 1); x = 0; }
  ctx.drawImage(im, x, op.centroY ? y - h / 2 : y - h, w, h);
  ctx.restore();
  return h;
}

// Capacho del tranvía aéreo: la imagen cuelga con la polea en el cable; el balde ocupa del 61 % al 96 % de su alto
const CAPACHO = { ancho: 36, piso: 58 };   // piso = altura del andén de embarque bajo el cable
// altura del cable en x: horizontal (Nivel 1) o en bajada (Nivel 2), con una leve comba al medio
function cableY(cab, x) {
  const k = limitar((x - cab.x0) / (cab.x1 - cab.x0), 0, 1);
  const y0 = cab.y != null ? cab.y : cab.y0, y1 = cab.y != null ? cab.y : cab.y1;
  return y0 + (y1 - y0) * k + 12 * k * (1 - k);
}
function dibujarCapacho(e, soloFrente) {
  const im = IMG.capacho, info = SPRITES_INFO.capacho;
  if (!im || !info) return;
  const w = CAPACHO.ancho, h = info[1] * w / info[0], x = e.x + e.w / 2 - w / 2, y = cableY(e.cable, e.x + e.w / 2) - 3;
  if (!soloFrente) { ctx.drawImage(im, x, y, w, h); return; }
  // borde delantero del balde encima de las piernas de Nato
  const corte = 0.585;
  ctx.drawImage(im, 0, info[1] * corte, info[0], info[1] * (1 - corte), x, y + h * corte, w, h * (1 - corte));
}

// ------------------------------------------------------------------ utilidades
const choca = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
const limitar = (v, a, b) => Math.max(a, Math.min(b, v));
const azarJ = (a, b) => a + Math.random() * (b - a);
function caja(ctx2, x, y, w, h, fondo, borde) {
  ctx2.save();
  ctx2.fillStyle = fondo; ctx2.strokeStyle = borde || '#2a1a10'; ctx2.lineWidth = 0.8;
  ctx2.beginPath();
  if (ctx2.roundRect) ctx2.roundRect(x, y, w, h, 4); else ctx2.rect(x, y, w, h);
  ctx2.fill(); ctx2.stroke();
  ctx2.restore();
}
function textoAdaptado(e) { return (ENTRADA.esTactil && e.textoTactil) || e.texto; }

// ------------------------------------------------------------------ mapa
function casilla(tx, ty) {
  if (tx < 0 || tx >= S.N.ancho) return C_ROCA;
  if (ty < 0 || ty >= S.N.alto) return C_VACIO;
  return S.N.mapa[ty * S.N.ancho + tx];
}
const esSolida = c => SOLIDA[c];
function esPlataforma(tx, ty) { // un sentido, o la punta de arriba de una escalera
  const c = casilla(tx, ty);
  return UN_SENTIDO[c] || (c === C_ESCALERA && casilla(tx, ty - 1) !== C_ESCALERA);
}

const esRampa = c => c === C_RAMPA_D || c === C_RAMPA_I;
// Una casilla sólida bloquea de lado, salvo el escalón escondido bajo una rampa o, subiendo una rampa, el borde del descanso
function bloqueaLado(e, tx, ty) {
  if (!esSolida(casilla(tx, ty))) return false;
  const pie = e.y + e.h;
  if (esRampa(casilla(tx, ty - 1)) && pie <= (ty + 1) * T) return false;
  if (e.enRampa && ty * T >= pie - 6) return false;
  return true;
}
function moverX(e) {
  e.x += e.vx;
  e.chocoX = false;
  const y0 = Math.floor(e.y / T), y1 = Math.floor((e.y + e.h - 1) / T);
  if (e.vx > 0) {
    const tx = Math.floor((e.x + e.w - 0.01) / T);
    for (let ty = y0; ty <= y1; ty++) if (bloqueaLado(e, tx, ty)) { e.x = tx * T - e.w; e.vx = 0; e.chocoX = true; break; }
  } else if (e.vx < 0) {
    const tx = Math.floor(e.x / T);
    for (let ty = y0; ty <= y1; ty++) if (bloqueaLado(e, tx, ty)) { e.x = (tx + 1) * T; e.vx = 0; e.chocoX = true; break; }
  }
}
// Rampas (tramos de escalera): el piso se calcula en el centro de los pies
function superficieRampa(tx, ty, x) {
  const c = casilla(tx, ty);
  if (!esRampa(c)) return null;
  const l = limitar(x - tx * T, 0, T);
  return c === C_RAMPA_D ? ty * T + T - l : ty * T + l;
}
// Cumbreras: líneas de un sentido, levemente inclinadas, que se pisan desde arriba
function lineaBajo(x, y, tol) {
  for (const l of S.N.lineas || []) {
    if (x < l.x0 || x > l.x1) continue;
    const sup = l.y0 + (x - l.x0) / (l.x1 - l.x0) * (l.y1 - l.y0);
    if (Math.abs(y - sup) <= tol) return sup;
  }
  return null;
}
function apoyarLinea(e, estabaEnSuelo, pieAntes, atravesar) {
  e.enLinea = false;
  if (e.vy < 0 || atravesar || !S.N.lineas) return;
  const cx = e.x + e.w / 2, pie = e.y + e.h;
  for (const l of S.N.lineas) {
    if (cx < l.x0 || cx > l.x1) continue;
    const sup = l.y0 + (cx - l.x0) / (l.x1 - l.x0) * (l.y1 - l.y0);
    const margen = estabaEnSuelo ? 4 : 0.5;
    if (pie >= sup - margen && pieAntes <= sup + 2 + (estabaEnSuelo ? 4 : 0)) { e.y = sup - e.h; e.vy = 0; e.enSuelo = true; e.enLinea = true; return; }
  }
}
function apoyarRampa(e, estabaEnSuelo) {
  if (e.vy < 0) { e.enRampa = false; return; }
  const cx = e.x + e.w / 2, pie = e.y + e.h, tx = Math.floor(cx / T);
  const margen = estabaEnSuelo ? 9 : 0.5;
  for (const ty of [Math.floor((pie - 0.01) / T), Math.floor((pie + margen) / T), Math.floor((pie - 9) / T)]) {
    const sup = superficieRampa(tx, ty, cx);
    if (sup == null) continue;
    if (pie >= sup - margen && pie <= sup + 10) { e.y = sup - e.h; e.vy = 0; e.enSuelo = true; e.enRampa = true; e.rampa = casilla(tx, ty); return; }
  }
  e.enRampa = false;
}
function moverY(e, atravesar) {
  const pieAntes = e.y + e.h;
  e.y += e.vy;
  e.enSuelo = false;
  const x0 = Math.floor(e.x / T), x1 = Math.floor((e.x + e.w - 0.01) / T);
  if (e.vy > 0) {
    const ty = Math.floor((e.y + e.h - 0.01) / T), centro = Math.floor((e.x + e.w / 2) / T);
    for (let tx = x0; tx <= x1; tx++) {
      if (tx !== centro && (esRampa(casilla(tx, ty - 1)) || e.enRampa)) continue;   // en la escalera solo cuenta el centro
      // cada personaje necesita apoyar al menos 3 unidades del pie: nadie queda parado en el aire sobre la punta de una orilla
      if (Math.min(e.x + e.w, (tx + 1) * T) - Math.max(e.x, tx * T) < 3) continue;
      const c = casilla(tx, ty);
      if (esSolida(c) || (!atravesar && esPlataforma(tx, ty) && pieAntes <= ty * T + 0.5)) {
        e.y = ty * T - e.h; e.vy = 0; e.enSuelo = true; break;
      }
    }
  } else if (e.vy < 0) {
    const ty = Math.floor(e.y / T);
    for (let tx = x0; tx <= x1; tx++) if (esSolida(casilla(tx, ty))) { e.y = (ty + 1) * T; e.vy = 0; break; }
  }
}
function haySueloEn(x, y) { // para que los mineros no se tiren a las grietas
  const tx = Math.floor(x / T), ty = Math.floor(y / T);
  return esSolida(casilla(tx, ty)) || esPlataforma(tx, ty) || lineaBajo(x, y, 8) != null;
}

// ------------------------------------------------------------------ partículas y textos
function particula(x, y, op) {
  S.part.push(Object.assign({ x, y, vx: azarJ(-1, 1), vy: azarJ(-1.5, -0.3), vida: 40, max: 40, col: '#ffffff', tam: 1.5, grav: 0.05 }, op));
}
function polvo(x, y, n, col) { for (let i = 0; i < n; i++) particula(x, y, { col: col || '#d8d2c6', tam: azarJ(1.5, 3.5), vida: 30, max: 30, grav: -0.01, vx: azarJ(-1.2, 1.2), vy: azarJ(-0.8, 0) }); }
function chispas(x, y, n) { for (let i = 0; i < n; i++) particula(x, y, { col: ['#ffe066', '#ff9a2a', '#ffd58a'][i % 3], tam: azarJ(0.8, 1.6), vida: 35, max: 35, vx: azarJ(-2, 2), vy: azarJ(-3, -0.5), grav: 0.12 }); }
function estrellitas(x, y) { for (let i = 0; i < 5; i++) particula(x, y, { estrella: true, col: '#ffe066', tam: 2.2, vida: 30, max: 30, vx: azarJ(-1.5, 1.5), vy: azarJ(-2, -0.5), grav: 0.08 }); }
function plumas(x, y) { for (let i = 0; i < 8; i++) particula(x, y, { pluma: true, col: i % 3 ? '#1d1b22' : '#f2f0ea', tam: 2.5, vida: 70, max: 70, vx: azarJ(-1.5, 1.5), vy: azarJ(-1.5, 0.5), grav: 0.02 }); }
function rotulo(x, y, txt, col, tam) { S.textos.push({ x, y, txt, col: col || '#ffffff', vida: 75, tam: tam || 7 }); }

// ------------------------------------------------------------------ partida y nivel
// Dificultad: se elige en la portada
const DIFICULTAD = {
  facil: { nombre: 'Fácil', vidas: 5, corazones: 5, hpMinero: 2, persigue: 0.8, carga: 34, aviso: 58, picada: 2.2, lucha: 18, energia: 1.5, dinamita: 190, bola: 1.7, bolero: 210, tablon: 46, reloj: 14, alud: 1.0, jefe: 14, condorJefe: 8, tren: 1.1 },
  normal: { nombre: 'Normal', vidas: 3, corazones: 3, hpMinero: 3, persigue: 0.95, carga: 24, aviso: 42, picada: 2.7, lucha: 13, energia: 1, dinamita: 135, bola: 2.1, bolero: 160, tablon: 30, reloj: 11, alud: 1.18, jefe: 20, condorJefe: 10, tren: 1.25 },
  dificil: { nombre: 'Difícil', vidas: 2, corazones: 3, hpMinero: 4, persigue: 1.15, carga: 17, aviso: 32, picada: 3.2, lucha: 10, energia: 0.8, dinamita: 95, bola: 2.5, bolero: 120, tablon: 22, reloj: 9, alud: 1.32, jefe: 26, condorJefe: 13, tren: 1.4 },
};
const ORDEN_DIF = ['facil', 'normal', 'dificil'];
J.dificultad = 'normal';
const DIF = () => DIFICULTAD[J.dificultad];
// primer nombre de la lista que tenga imagen (si falta un cuadro nuevo, se usa el anterior)
function cuadro(lista, i) {
  const ok = lista.filter(n => SPRITES_INFO[n]);
  return ok[((i % ok.length) + ok.length) % ok.length];
}
const CICLO_NATO = ['nato_correr1', 'nato_correr3', 'nato_correr2', 'nato_correr4'];
const CICLO_MINERO = ['minero_caminar1', 'minero_caminar3', 'minero_caminar2', 'minero_caminar3'];
const CICLO_PERRO = ['hercules_corre1', 'hercules_corre3', 'hercules_corre2', 'hercules_corre3'];
const CICLO_CONDOR = ['condor_alas_arriba', 'condor_alas_medio', 'condor_alas_abajo', 'condor_alas_medio'];

const NIVELES = {
  1: { def: NIVEL1, construir: () => construirNivel1(), zonas: () => ZONAS },
  2: { def: NIVEL2, construir: () => construirNivel2(), zonas: () => ZONAS2 },
  3: { def: NIVEL3, construir: () => construirNivel3(), zonas: () => ZONAS3 },
  4: { def: NIVEL4, construir: () => construirNivel4(), zonas: () => ZONAS4 },
};
function nuevaPartida(nivel) {
  P = { nivel: nivel || 1, invencible: !!J.invencible, energia: 0, vidas: DIF().vidas, corazones: DIF().corazones, corMax: DIF().corazones, pepitas: 0, puntos: 0, apuntes: new Set(), noqueados: 0, condores: 0, inicio: performance.now(), cuadros: 0 };
}
// al pasar al nivel siguiente se conservan vidas, pepitas y puntaje; lo demás es de cada nivel
function pasarDeNivel(n) {
  P.nivel = n; P.apuntes = new Set(); P.noqueados = 0; P.condores = 0; P.cuadros = 0; P.energia = 0;
}
function empezarNivel() {
  const N = NIVELES[P.nivel].construir();
  techosPisables(N);
  S = {
    N, ents: [], part: [], textos: [], cam: { x: 0, y: 0 }, burbuja: null, modal: null, pausa: null,
    checkpoint: { x: N.inicio.x, y: N.inicio.y }, zona: -1, zonaCartel: null, finale: null, nieve: [],
    totalPepitas: 0, enCueva: false, sala: -1, puerta: null, antes: null, sacudir: 0, zonas: NIVELES[P.nivel].zonas(), alud: null, barrera: 0, peleaJefe: false,
  };
  for (let i = 0; i < 50; i++) S.nieve.push({ x: Math.random() * W, y: Math.random() * H, v: azarJ(0.2, 0.6), f: Math.random() * 6 });
  for (const d of N.entidades) {
    const e = crearEntidad(d);
    if (e) S.ents.push(e);
    if (d.tipo === 'pepita') S.totalPepitas++;
  }
  S.jug = crearJugador(N.inicio.x, N.inicio.y);
  S.cam.x = limitar(S.jug.x - W / 2, 0, N.ancho * T - W);
  S.cam.y = limitar(S.jug.y - H * 0.6, 0, N.alto * T - H);
  P.corazones = P.corMax;
}

const ZONAS = [
  [0, 'CERRO NEGRO · 1905', 'cerro'], [43, 'LA CASA DE HAMILTON Y EL TRANVÍA AÉREO', 'hamilton'],
  [72, 'LAS CAVERNAS DE LA MINA FORTUNA', 'cuevas'], [133, 'PUEBLO HUNDIDO', 'pueblo'],
  [186, 'EL MOLINO Y LAS FUNDICIONES', 'molino'],
];

// ------------------------------------------------------------------ jugador
function crearJugador(x, y) {
  return { x, y, w: 11, h: 30, vx: 0, vy: 0, dir: 1, enSuelo: false, coyote: 0, buffer: 0, estado: 'normal', t: 0,
    invul: 0, ataque: null, combo: 0, ventana: 0, sobre: null, atravesar: 0, anim: 0, tizne: 0, seguro: { x, y }, lucha: 0, chaqueta: 0 };
}
function cajaAtaque(p) {
  const a = p.ataque;
  if (!a) return null;
  if (a.tipo === 'patada') {
    if (a.t < 2 || a.t > 16) return null;
    return { x: p.dir > 0 ? p.x + p.w - 2 : p.x - 16, y: p.y + 10, w: 18, h: 12 };
  }
  if (a.t < 3 || a.t > 9) return null;
  const alto = a.tipo === 'gancho';
  return { x: p.dir > 0 ? p.x + p.w : p.x - 15, y: alto ? p.y - 2 : p.y + 6, w: 15, h: alto ? 16 : 10 };
}
function danarJugador(dir, motivo) {
  const p = S.jug;
  if (p.invul > 0 || p.estado === 'atrapado' || S.finale || p.chaqueta > 0) return;
  if (P.invencible) { p.invul = 30; estrellitas(p.x + p.w / 2, p.y + 4); return; }   // truco: sin daño
  P.corazones--;
  efecto('herido');
  if (!voz('ay', { baja: true })) voz('pucha', { baja: true });
  S.sacudir = 8;
  estrellitas(p.x + p.w / 2, p.y + 4);
  if (P.corazones <= 0) { perderVida(motivo || 'golpe'); return; }
  p.estado = 'herido'; p.t = 0; p.vx = dir * 2.4; p.vy = -3; p.invul = 90; p.ataque = null; p.sobre = null;
}
function perderVida(motivo) {
  const p = S.jug;
  p.estado = 'fuera';
  if (!P.invencible) P.vidas--;
  efecto('caida');
  fundir(() => {
    if (P.vidas <= 0) { irA('gameover'); return; }
    P.corazones = P.corMax;
    if (S.alud) { if (S.alud.ent) S.alud.ent.activo = false; S.alud = null; }
    Object.assign(p, crearJugador(S.checkpoint.x, S.checkpoint.y));
    p.invul = 120;
    rotulo(p.x, p.y - 12, motivo === 'olla' ? '-1 VIDA' : '¡Otra vez!', '#ffe066');
  });
}
function actualizarJugador() {
  const p = S.jug;
  p.t++;
  if (p.invul > 0) p.invul--;
  if (p.tizne > 0) p.tizne--;
  if (p.chaqueta > 0 && !S.finale) {
    p.chaqueta--;
    if (J.cuadros % 3 === 0) particula(p.x + azarJ(0, p.w), p.y + azarJ(4, p.h), { col: ['#ffb347', '#ffe066', '#ff7a2a'][J.cuadros % 3], tam: azarJ(0.8, 1.6), vida: 26, max: 26, vx: -p.dir * azarJ(0.2, 0.8), vy: azarJ(-0.8, -0.1), grav: 0 });
    if (p.chaqueta === 0) { efecto('soltarse'); rotulo(p.x - 6, p.y - 12, 'Se acabó la chaqueta', '#ffd58a', 6); pararMusica(); }
  }
  if (p.atravesar > 0) p.atravesar--;
  if (p.estado === 'fuera') return;
  if (p.estado === 'atrapado') return; // lo mueve el cóndor

  // arrastre del capacho
  if (p.sobre) {
    const q = p.sobre;
    if (q.vivo && q.estado !== 'fuera' && Math.abs(p.y + p.h - q.y) < 2 + Math.abs(q.dy || 0) && p.x + p.w > q.x && p.x < q.x + q.w) { p.x += q.dx; p.y += q.dy || 0; }
    else p.sobre = null;
  }

  if (p.estado === 'trepar') { actualizarTrepar(p); return; }

  const izq = apretado('izq'), der = apretado('der');
  let mov = (der ? 1 : 0) - (izq ? 1 : 0);
  const hielo = p.enSuelo && casilla(Math.floor((p.x + p.w / 2) / T), Math.floor((p.y + p.h + 1) / T)) === C_HIELO;
  const enAgua = casilla(Math.floor((p.x + p.w / 2) / T), Math.floor((p.y + p.h * 0.6) / T)) === C_AGUA;
  if (enAgua !== !!p.enAgua) {   // chapuzón al entrar o salir del agua
    p.enAgua = enAgua;
    for (let i = 0; i < 10; i++) particula(p.x + p.w / 2, (S.N.piscina ? S.N.piscina.y : p.y + 10), { col: '#cfe9ff', tam: azarJ(1, 2), vida: 24, max: 24, vx: azarJ(-1.4, 1.4), vy: azarJ(-2.4, -0.6), grav: 0.12 });
    if (enAgua) efecto('chu');
  }
  const controla = p.estado === 'normal' && !S.finale;
  if (!controla) mov = 0;
  if (p.estado === 'herido' && p.t > 20) p.estado = 'normal';
  if (p.ataque && p.ataque.tipo !== 'patada' && p.enSuelo) mov *= 0.25;

  if (controla) {
    // en el hielo cuesta arrancar y frenar; en el agua todo es más lento
    const acel = enAgua ? 0.08 : hielo ? 0.045 : p.enSuelo ? 0.24 : 0.17, freno = enAgua ? 0.05 : hielo ? 0.012 : p.enSuelo ? 0.25 : 0.06;
    const tope = VEL * (p.chaqueta > 0 ? 1.2 : 1) * (enAgua ? 0.62 : hielo ? 1.12 : 1);
    if (mov) { p.vx += limitar(mov * tope - p.vx, -acel, acel); if (!p.ataque) p.dir = mov; }
    else p.vx -= limitar(p.vx, -freno, freno);
    // salto con tolerancia
    if (presionado('saltar')) p.buffer = 7;
    if (p.enSuelo) p.coyote = 6; else if (p.coyote > 0) p.coyote--;
    if (enAgua && presionado('saltar')) {   // brazada: con cada toque de saltar sube; cerca de la superficie, sale de un salto
      const orilla = S.N.piscina && p.y < S.N.piscina.y + 4;
      p.vy = orilla ? SALTO * 0.92 : -2.5; p.buffer = 0; efecto(orilla ? 'salto' : 'aire');
      for (let i = 0; i < 4; i++) particula(p.x + p.w / 2, p.y + 6, { col: '#e8f6ff', tam: 1.2, vida: 30, max: 30, vx: azarJ(-0.3, 0.3), vy: -0.6, grav: -0.01 });
    } else if (p.buffer > 0) {
      p.buffer--;
      if (apretado('abajo') && p.enSuelo && sobrePlataforma(p)) { p.atravesar = 10; p.buffer = 0; p.enSuelo = false; }
      else if (p.coyote > 0) {
        p.arrastre = p.sobre ? p.sobre.dx || 0 : 0;   // al saltar desde un capacho se conserva su impulso
        p.vy = SALTO; p.coyote = 0; p.buffer = 0; p.enSuelo = false; p.sobre = null; efecto('salto');
      }
    }
    if (!apretado('saltar') && p.vy < CORTE) p.vy = CORTE;
    // combos y patada
    if (presionado('golpe') && !p.ataque) {
      if (p.enSuelo) {
        p.combo = p.ventana > 0 ? p.combo + 1 : 1;
        if (p.combo > 3) p.combo = 1;
        p.ataque = { tipo: p.combo === 3 ? 'gancho' : 'golpe', t: 0, dur: p.combo === 3 ? 18 : 12, golpeados: new Set() };
        p.vx += p.dir * 0.8;
        efecto('aire');
      } else {
        p.ataque = { tipo: 'patada', t: 0, dur: 22, golpeados: new Set() };
        p.vx = p.dir * Math.max(Math.abs(p.vx), 1.8);
        efecto('aire');
      }
    }
    if (presionado('perro')) llamarHercules();
    // escaleras
    if ((apretado('arriba') && sobreEscalera(p)) || (apretado('abajo') && p.enSuelo && escaleraBajoPies(p))) {
      p.estado = 'trepar'; p.ataque = null; p.vx = 0; p.vy = 0; p.sobre = null;
      p.x = Math.floor((p.x + p.w / 2) / T) * T + T / 2 - p.w / 2;
      if (apretado('abajo')) p.y += 3;
      return;
    }
  }
  if (p.ataque) {
    p.ataque.t++;
    if (p.ataque.t >= p.ataque.dur || (p.ataque.tipo === 'patada' && p.enSuelo && p.ataque.t > 4)) {
      if (p.ataque.tipo !== 'patada') p.ventana = 18;
      p.ataque = null;
    }
  } else if (p.ventana > 0) p.ventana--;

  if (enAgua) p.vy = Math.min(p.vy + 0.07, 1.25);   // en el agua se hunde despacio
  else p.vy = Math.min(p.vy + GRAV, MAX_CAIDA);
  moverX(p);
  // el viento empuja: en el aire de lleno, en el suelo apenas
  const vto = vientoEn(p.x) + (S.ventarron || 0);
  const choco = p.chocoX;   // los empujes extra no deben borrar el choque del movimiento propio
  if (vto && p.estado === 'normal' && !enAgua) { const v = p.vx; p.vx = vto * (p.enSuelo ? 0.25 : 1); moverX(p); p.vx = v; }
  if (p.arrastre && !p.enSuelo) { const v = p.vx; p.vx = p.arrastre; moverX(p); if (p.chocoX) p.arrastre = 0; p.vx = v; }
  p.chocoX = p.chocoX || choco;
  const pieAntes = p.y + p.h, enAire = !p.enSuelo, vyAntes = p.vy;
  moverY(p, p.atravesar > 0);
  apoyarRampa(p, !enAire);
  if (!p.enSuelo || p.enLinea) apoyarLinea(p, !enAire, pieAntes, p.atravesar > 0);
  if (p.enSuelo || p.estado !== 'normal') p.arrastre = 0;
  if (enAire && p.enSuelo && vyAntes > 2.5) { p.aplasta = 8; polvo(p.x + p.w / 2, p.y + p.h, 5); efecto('aterriza'); }
  if (p.aplasta > 0) p.aplasta--;
  // capachos del andarivel
  if (p.vy >= 0) {   // también desde el andén: si el balde pasa a la altura de los pies, Nato queda dentro
    for (const q of S.ents) {
      if (!q.plataforma || !q.vivo || q.estado === 'fuera') continue;
      if (pieAntes <= q.y + 1 && p.y + p.h >= q.y - 0.5 && p.x + p.w / 2 > q.x + 2 && p.x + p.w / 2 < q.x + q.w - 2) {
        p.y = q.y - p.h; p.vy = 0; p.enSuelo = true; p.sobre = q; break;
      }
    }
  }
  if (S.barrera && p.x < S.barrera) { p.x = S.barrera; if (p.vx < 0) p.vx = 0; }
  if (S.alud && !S.alud.parado && p.x > S.cam.x + W - p.w - 6) { p.x = S.cam.x + W - p.w - 6; if (p.vx > 0) p.vx = 0; }   // no se escapa por delante de la cámara
  // el capacho es un balde: a medio camino solo se sale saltando; en los extremos del cable se baja caminando
  if (p.sobre && p.sobre.tipo === 'capacho' && p.enSuelo) {
    const q = p.sobre, cab = q.cable, c = q.x + q.w / 2;
    if (c > cab.x0 + 6 && c < cab.x1 - 30) {
      const min = q.x + 3 - p.w / 2, max = q.x + q.w - 3 - p.w / 2;
      if (p.x < min) { p.x = min; p.vx = 0; }
      if (p.x > max) { p.x = max; p.vx = 0; }
    }
  }
  if (p.enSuelo && !p.sobre && p.estado === 'normal') {
    const pieY = p.y + p.h + 1;
    // posiciones seguras: se guarda una cada 12 cuadros y al caer se vuelve a una de hace ~1 segundo (lejos del borde)
    if (haySueloEn(p.x - 6, pieY) && haySueloEn(p.x + p.w + 6, pieY) && J.cuadros % 12 === 0) {
      p.seguros = p.seguros || [];
      p.seguros.push({ x: p.x, y: p.y });
      if (p.seguros.length > 6) p.seguros.shift();
      p.seguro = p.seguros[Math.max(0, p.seguros.length - 5)];
    }
  }
  // caída a una grieta o al barranco
  if (p.y > S.N.alto * T + 10) {
    if (!P.invencible) P.corazones--;
    efecto('caida');
    if (P.corazones <= 0) { perderVida('caida'); return; }
    p.x = p.seguro.x; p.y = p.seguro.y; p.vx = 0; p.vy = 0; p.invul = 90; p.ataque = null; p.sobre = null; p.seguros = [p.seguro];
    rotulo(p.x, p.y - 10, '-1', '#ff6a5a');
    if (!voz('grito')) voz('pucha');
  }
}
function sobrePlataforma(p) {
  if (p.enLinea) return true;
  const ty = Math.floor((p.y + p.h + 1) / T);
  for (let tx = Math.floor(p.x / T); tx <= Math.floor((p.x + p.w - 0.01) / T); tx++) {
    if (esSolida(casilla(tx, ty))) return false;
  }
  return true;
}
function sobreEscalera(p) {
  const tx = Math.floor((p.x + p.w / 2) / T);
  return casilla(tx, Math.floor((p.y + p.h / 2) / T)) === C_ESCALERA || casilla(tx, Math.floor((p.y + p.h - 2) / T)) === C_ESCALERA;
}
function escaleraBajoPies(p) { return casilla(Math.floor((p.x + p.w / 2) / T), Math.floor((p.y + p.h + 1) / T)) === C_ESCALERA; }
function actualizarTrepar(p) {
  const tx = Math.floor((p.x + p.w / 2) / T);
  const sube = apretado('arriba'), baja = apretado('abajo');
  p.vy = (baja ? 1.3 : 0) - (sube ? 1.3 : 0);
  if (sube || baja) p.anim++;
  p.y += p.vy;
  const pieTy = Math.floor((p.y + p.h - 1) / T);
  // llegó arriba: se para sobre la punta de la escalera
  if (sube && casilla(tx, pieTy) !== C_ESCALERA && casilla(tx, pieTy + 1) === C_ESCALERA) {
    p.y = (pieTy + 1) * T - p.h; p.estado = 'normal'; p.enSuelo = true; p.vy = 0; return;
  }
  // llegó abajo
  if (baja && esSolida(casilla(tx, Math.floor((p.y + p.h) / T)))) {
    p.y = Math.floor((p.y + p.h) / T) * T - p.h; p.estado = 'normal'; p.vy = 0; return;
  }
  if (!sobreEscalera(p) && !escaleraBajoPies(p)) { p.estado = 'normal'; return; }
  if (presionado('saltar')) { p.estado = 'normal'; p.vy = SALTO * 0.8; p.vx = (apretado('der') ? 1 : apretado('izq') ? -1 : 0) * VEL; efecto('salto'); }
  else if ((apretado('izq') || apretado('der')) && !sube && !baja) { p.estado = 'normal'; }
}

// ------------------------------------------------------------------ entidades
function crearEntidad(d) {
  const e = Object.assign({ vivo: true, t: 0, vx: 0, vy: 0, dir: -1 }, d);
  switch (d.tipo) {
    case 'pepita': e.w = 8; e.h = 8; e.x += 4; e.y += 4; e.fase = Math.random() * 6; return e;
    case 'apunte': e.w = 12; e.h = 14; e.x += 2; return e;
    case 'pan': e.w = 12; e.h = 9; return e;
    case 'fogata': e.w = 16; e.h = 16; e.encendida = !!d.encendida; return e;
    case 'letrero': e.w = 16; e.h = 16; return e;
    case 'anciana': e.w = 14; e.h = 27; e.y = d.y + 32 - e.h; e.usada = false; return e;
    case 'mujer': e.w = 12; e.h = 28; e.y = d.y + 32 - e.h; return e;
    case 'durmiente': return e;
    case 'minero': Object.assign(e, { w: 12, h: 30, hp: DIF().hpMinero * (S.N.def.hpMinero || 1), estado: 'patrulla', vel: 0.45, dir: -1 }); e.y = d.y + 32 - e.h; return e;
    case 'condor': Object.assign(e, { w: 20, h: 10, yBase: d.y, estado: 'vuela', dir: 1, enfriar: 90 }); return e;
    case 'andarivel': {
      const cab = S.N.cable;
      for (let i = 0; i < d.cantidad; i++) {   // Nato se para dentro del balde, sobre el mineral
        const x = cab.x0 + i * d.separacion;
        S.ents.push({ tipo: 'capacho', vivo: true, plataforma: true, w: 22, h: 6, x, y: cableY(cab, x + 11) + CAPACHO.piso, dx: 0, dy: 0, cable: cab, vel: d.vel, t: 0 });
      }
      return null;
    }
    case 'vagonetas': e.cuenta = 60; return e;
    case 'piedra': Object.assign(e, { w: 11, h: 9, estado: 'espera', y0: d.y }); e.x += 2; return e;
    case 'olla': Object.assign(e, { w: 44, h: 20 }); e.x += 2; e.y += 6; return e;
    case 'dinamitero': Object.assign(e, { w: 12, h: 30, hp: 2, estado: 'acecha', dir: -1, espera: 60 }); e.y = d.y + 32 - e.h; return e;
    case 'rodados': e.cuenta = 40; return e;
    case 'pedroNido': Object.assign(e, { w: 16, h: 30, rescatado: false }); return e;
    case 'condorJefe': Object.assign(e, { w: 64, h: 26, hp: DIF().condorJefe, hpMax: DIF().condorJefe, estado: 'espera', dir: -1, llamo: false, recibe: 0, ataques: 0, yBase: d.y }); return e;
    case 'trenFinal': return crearTrenFinal(d);
    case 'ascensor': Object.assign(e, { w: d.w || 48, h: 6, y0: d.y, y1: d.y1, plataforma: true, dx: 0, dy: 0, espera: 60, sube: true }); e.y = d.y1; return e;
    case 'alud': e.activo = false; return e;
    case 'jefe': Object.assign(e, { w: 22, h: 48, hp: DIF().jefe, hpMax: DIF().jefe, estado: 'espera', dir: -1, llamo: false, cuenta: 200, recibe: 0 }); e.y = d.y + 32 - e.h; return e;
    case 'diego': Object.assign(e, { w: 16, h: 32, dio: false, dice: 0 }); e.y = d.y + 32 - e.h; return e;
    case 'tablon': Object.assign(e, { w: d.w || 32, h: 5, x0: d.x, y0: d.y, estado: 'firme', plataforma: true, dx: 0, dy: 0 }); return e;
    case 'bolas': e.cuenta = d.primera || 60; return e;
    case 'bolero': Object.assign(e, { w: 12, h: 30, hp: 2, estado: 'acecha', dir: -1, espera: 90, arma: 'bola' }); e.y = d.y + 32 - e.h; return e;
  }
  return null;
}

function actualizarEntidades() {
  const p = S.jug, golpe = cajaAtaque(p);
  const cuerpo = { x: p.x, y: p.y, w: p.w, h: p.h };
  for (const e of S.ents) {
    if (!e.vivo) continue;
    e.t++;
    switch (e.tipo) {
      case 'pepita':
        if (p.estado !== 'fuera' && choca(cuerpo, e)) {
          e.vivo = false; P.pepitas++; P.puntos += 10; efecto('pepita'); chispas(e.x + 4, e.y + 4, 4);
          if (P.pepitas % 100 === 0) { P.vidas++; efecto('vida'); rotulo(p.x, p.y - 12, '¡+1 VIDA!', '#7dff8a'); }
        }
        break;
      case 'apunte':
        if (p.estado === 'normal' && choca(cuerpo, e)) {
          e.vivo = false; P.apuntes.add(e.n); P.puntos += 500; efecto('apunte'); voz('pegacaleta');
          S.modal = { titulo: `APUNTE ${e.n + 1} DE 5`, texto: S.N.def.apuntes[e.n], t: 0 };
        }
        break;
      case 'pan':
        if (choca(cuerpo, e)) {
          e.vivo = false; efecto('pan');
          if (P.corazones < P.corMax) { P.corazones++; rotulo(e.x, e.y - 6, '+1 ♥', '#ff8a8a'); } else { P.puntos += 100; rotulo(e.x, e.y - 6, '+100', '#ffe066'); }
        }
        break;
      case 'fogata':
        if (!e.encendida && p.x + p.w > e.x) {
          e.encendida = true; S.checkpoint = { x: e.x, y: e.y - 12 }; efecto('fogata'); rotulo(e.x - 4, e.y - 14, '¡Avance guardado!', '#ffd58a', 6);
        }
        break;
      case 'anciana':
        if (!e.usada && Math.abs(p.x - e.x) < 26 && Math.abs(p.y - e.y) < 30) {
          e.usada = true; S.checkpoint = { x: e.x + 18, y: e.y }; P.corazones = P.corMax; efecto('pan');
          rotulo(e.x, e.y - 12, '¡Avance guardado! ♥♥♥', '#ffd58a', 6);
          e.dice = 90 * 4;
        }
        if (e.dice > 0) e.dice--;
        break;
      case 'minero': actualizarMinero(e, golpe, cuerpo); break;
      case 'hercules': actualizarHercules(e); break;
      case 'condor': actualizarCondor(e, golpe, cuerpo); break;
      case 'capacho': {
        const cab = e.cable, antes = e.x, antesY = e.y;
        e.x += e.vel;
        if (e.x > cab.x1 - e.w / 2) e.x = cab.x0 - e.w / 2;
        e.y = cableY(cab, e.x + e.w / 2) + CAPACHO.piso;
        e.dx = e.x - antes; e.dy = e.y - antesY;
        if (Math.abs(e.dx) > 5) { e.dx = 0; e.dy = 0; if (p.sobre === e) p.sobre = null; }
        break;
      }
      case 'tablon':   // tablón suelto entre dos techos: cruje, tiembla y se cae; al rato vuelve a su lugar
        e.dx = 0; e.dy = 0;
        if (e.estado === 'firme') { if (e.aparece > 0) e.aparece--; if (p.sobre === e) { e.estado = 'tiembla'; e.t = 0; efecto('crujido'); } }
        else if (e.estado === 'tiembla') { if (e.t > DIF().tablon) { e.estado = 'cae'; e.t = 0; e.vy = 0; efecto('crujido'); } }
        else if (e.estado === 'cae') { e.vy = Math.min(e.vy + 0.22, 6); e.y += e.vy; e.dy = e.vy; if (e.t > 80) { e.estado = 'fuera'; e.t = 0; } }
        else if (e.estado === 'fuera' && e.t > 150 && !choca(cuerpo, { x: e.x0, y: e.y0 - 4, w: e.w, h: 10 })) {
          e.x = e.x0; e.y = e.y0; e.estado = 'firme'; e.aparece = 24;
        }
        break;
      case 'bolas':   // por la escalera bajan rodando bolas de palitroque
        if (!S.finale && p.x < e.x - 30 && e.x - p.x < 300 && Math.abs(p.y - e.y) < 170 && --e.cuenta <= 0) {
          e.cuenta = e.cada;
          lanzarBola(e.x, e.y + 16 - 10, -0.5, e.xFin, false);
        }
        break;
      case 'bola': actualizarBola(e, golpe, cuerpo); break;
      case 'ascensor': {   // espera en cada piso; si Nato se sube, parte enseguida
        const antes = e.y; e.dy = 0;
        if (e.espera > 0) { e.espera--; if (p.sobre === e && e.espera > 25) e.espera = 25; }
        else {
          const meta = e.sube ? e.y0 : e.y1;
          e.y += Math.sign(meta - e.y) * Math.min(0.9, Math.abs(meta - e.y));
          if (Math.abs(e.y - meta) < 0.01) { e.y = meta; e.sube = !e.sube; e.espera = 150; efecto('menu'); }
        }
        e.dy = e.y - antes;
        break;
      }
      case 'alud':
        if (!e.activo && !S.alud && p.x > e.x && p.estado === 'normal') {
          e.activo = true;
          S.alud = { x: S.cam.x + 6, v: DIF().alud, fin: e.xFin, t: 0, ent: e };   // entra por el borde izquierdo de la pantalla
          efecto('explosion'); S.sacudir = 30; rotulo(p.x - 10, p.y - 16, '¡ALUD! ¡CORRE!', '#ffffff', 9);
        }
        break;
      case 'jefe': actualizarJefe(e, golpe, cuerpo); break;
      case 'condorJefe': actualizarCondorJefe(e, golpe, cuerpo); break;
      case 'trenFinal': actualizarTrenFinal(e); break;
      case 'carroTren': break;
      case 'pedroNido': break;
      case 'diego':
        if (e.dice > 0) e.dice--;
        if (!e.dio && p.estado === 'normal' && !S.finale && Math.abs(p.x + p.w / 2 - (e.x + e.w / 2)) < 30 && Math.abs(p.y + p.h - (e.y + e.h)) < 24) {
          e.dio = true; e.dice = 230; S.regalo = { t: 0, diego: e };   // Nato se detiene a conversar
          p.vx = 0; p.dir = e.x > p.x ? 1 : -1; efecto('aceptar');
        }
        break;
      case 'bolero': actualizarDinamitero(e, golpe, cuerpo); break;
      case 'vagonetas':
        if (p.x < e.x - 30 && e.x - p.x < 420 && --e.cuenta <= 0) {   // nunca aparecen encima de Nato
          e.cuenta = e.cada;
          S.ents.push({ tipo: 'vagoneta', vivo: true, x: e.x, y: e.y + 16 - 15, w: 24, h: 15, vx: -1.45, vy: 0, xFin: e.xFin, t: 0 });
          efecto('piedra'); rotulo(Math.min(e.x - 30, S.cam.x + W - 46), e.y - 8, '¡Vagoneta!', '#ffd25a', 7);   // siempre dentro de la pantalla
        }
        break;
      case 'vagoneta':
        if (e.volcada) { e.t2 = (e.t2 || 0) + 1; e.giro = Math.min(1.3, (e.giro || 0) + 0.12); if (e.t2 > 50) e.vivo = false; break; }
        e.x += e.vx;
        if (e.t % 24 === 0 && Math.abs(e.x - p.x) < 200) efecto('chu');
        if (e.x < e.xFin) e.vivo = false;
        // de un golpe se vuelca
        if (golpe && p.ataque && choca(golpe, e)) {
          e.volcada = true; e.t2 = 0; efecto('golpeFuerte'); S.parada = 4; rotulo(e.x, e.y - 8, '¡CLANK!', '#ffffff', 8);
          polvo(e.x + 12, e.y + 10, 8, '#8b8895'); P.puntos += 40; sumarEnergia(8); break;
        }
        if (p.estado !== 'fuera' && choca(cuerpo, e)) {
          if (p.chaqueta > 0) { e.volcada = true; e.t2 = 0; efecto('golpeFuerte'); rotulo(e.x, e.y - 8, '¡CLANK!', '#ffb347', 8); polvo(e.x + 12, e.y + 10, 8, '#8b8895'); break; }
          if (p.vy > 0 && p.y + p.h - p.vy <= e.y + 4) { p.vy = -4.6; efecto('tonk'); }
          else danarJugador(-1);
        }
        break;
      case 'piedra':
        if (e.estado === 'espera' && Math.abs(p.x + p.w / 2 - (e.x + e.w / 2)) < 22 && p.y > e.y) { e.estado = 'tiembla'; e.t = 0; }
        else if (e.estado === 'tiembla' && e.t > 40) { e.estado = 'cae'; efecto('piedra'); }
        else if (e.estado === 'cae') {
          e.vy = Math.min(e.vy + 0.35, 6); e.y += e.vy;
          if (choca(cuerpo, e)) { danarJugador(p.x < e.x ? -1 : 1); }
          if (esSolida(casilla(Math.floor((e.x + e.w / 2) / T), Math.floor((e.y + e.h) / T)))) {
            e.vivo = false; polvo(e.x + 5, e.y + e.h, 10, '#8b8895'); efecto('piedra');
          }
        }
        break;
      case 'dinamitero': actualizarDinamitero(e, golpe, cuerpo); break;
      case 'dinamita': actualizarDinamita(e, golpe, cuerpo); break;
      case 'rodados':
        if (p.x < e.x - 20 && e.x - p.x < 300 && --e.cuenta <= 0) {
          e.cuenta = e.cada;
          S.ents.push({ tipo: 'rodado', vivo: true, x: e.x, y: e.y + 16 - 14, w: 14, h: 14, vx: -1.35, vy: 0, giro: 0, xFin: e.xFin, t: 0 });
        }
        break;
      case 'rodado': {
        e.vy = Math.min(e.vy + GRAV, MAX_CAIDA); moverX(e); moverY(e); e.giro -= 0.12;
        if (e.chocoX || e.x < e.xFin) { e.vivo = false; polvo(e.x + 7, e.y + 10, 8, '#8b8895'); break; }
        if (e.t % 20 === 0 && Math.abs(e.x - p.x) < 160) efecto('piedra');
        if (golpe && p.ataque && choca(golpe, e)) { e.vivo = false; polvo(e.x + 7, e.y + 7, 12, '#8b8895'); efecto('golpeFuerte'); rotulo(e.x, e.y - 6, '¡CRAC!', '#ffffff', 8); P.puntos += 30; sumarEnergia(6); break; }
        if (p.estado !== 'fuera' && choca(cuerpo, e)) {
          if (p.chaqueta > 0) { e.vivo = false; polvo(e.x + 7, e.y + 7, 12, '#8b8895'); efecto('golpeFuerte'); rotulo(e.x, e.y - 6, '¡CRAC!', '#ffb347', 8); break; }
          if (p.vy > 0 && p.y + p.h - p.vy <= e.y + 5) { p.vy = -4.6; efecto('tonk'); }
          else danarJugador(-1);
        }
        break;
      }
      case 'olla':
        if (p.estado !== 'fuera' && p.estado !== 'atrapado' && choca(cuerpo, { x: e.x + 3, y: e.y + 2, w: e.w - 6, h: 8 })) quemarJugador(e);
        if (e.t % 8 === 0) chispas(e.x + azarJ(4, 40), e.y, 1);
        break;
    }
  }
  S.ents = S.ents.filter(e => e.vivo);
}
// La chaqueta regalona: 20 segundos en que nada le hace daño y noquea a quien toque
const DURA_CHAQUETA = 20 * 60;
function ponerChaqueta(diego) {
  const p = S.jug;
  p.chaqueta = DURA_CHAQUETA;
  efecto('energiaLlena'); efecto('vida'); voz('dandole');
  rotulo(p.x - 14, p.y - 16, '¡CHAQUETA REGALONA!', '#ffb347', 8);
  for (let i = 0; i < 26; i++) particula(p.x + p.w / 2, p.y + 14, { col: ['#ffb347', '#ffe066', '#ff7a2a'][i % 3], tam: azarJ(1, 2.2), vida: 45, max: 45, vx: azarJ(-2.4, 2.4), vy: azarJ(-3, 0.5), grav: 0.06 });
  pararMusica();
}
// lo que toca Nato con la chaqueta puesta sale volando
function chaquetaNoquea(e) {
  const p = S.jug;
  if (!(p.chaqueta > 0) || p.estado === 'fuera') return false;
  if (!choca({ x: p.x - 2, y: p.y, w: p.w + 4, h: p.h }, e)) return false;
  e.hp = 0; e.estado = 'ko'; e.t = 0; e.vy = -3.5; e.vx = (e.x > p.x ? 1 : -1) * 2.8; e.dir = -Math.sign(e.vx) || 1; e.destello = 8;
  P.noqueados++; P.puntos += 200; sumarEnergia(10);
  estrellitas(e.x + 6, e.y); efecto('golpeFuerte'); S.sacudir = 4; rotulo(e.x, e.y - 6, '¡PAF!', '#ffb347', 8);
  return true;
}
// Viento de la tormenta: ráfagas hacia la izquierda (contra Nato), que van y vienen
function vientoEn(x) {
  for (const z of S.N.viento || []) {
    if (x < z.x0 || x > z.x1) continue;
    const r = Math.max(0, Math.sin(J.cuadros / 85)) ** 2;
    return -z.fuerza * (0.25 + 0.75 * r);
  }
  return 0;
}
function actualizarAlud() {
  const A = S.alud, p = S.jug;
  if (!A) return;
  A.t++;
  if (!A.parado) {
    A.x += A.v;
    if (A.t % 3 === 0) particula(A.x + azarJ(-6, 4), sueloBajo(A.x, S.cam.y + 20) - azarJ(0, 40), { col: '#f4f8fd', tam: azarJ(2, 4), vida: 40, max: 40, vx: azarJ(0.5, 2), vy: azarJ(-1.5, 0), grav: 0.03 });
    if (A.t % 40 === 0) efecto('piedra');
    if (A.x >= A.fin) { A.parado = true; A.t = 0; efecto('explosion'); S.sacudir = 12; }
    // si alcanza a Nato: pierde un corazón y la nieve lo lanza hacia adelante
    if (p.estado !== 'fuera' && p.x < A.x + 4) {
      if (!P.invencible && !(p.chaqueta > 0) && p.invul <= 0) {
        P.corazones--; efecto('herido'); voz('grito', { baja: true });
        if (P.corazones <= 0) { perderVida('alud'); return; }
      }
      p.x = A.x + 40; p.vy = -4.2; p.vx = 1.6; p.invul = Math.max(p.invul, 80); S.sacudir = 10;
      rotulo(p.x, p.y - 10, '¡NIEVE!', '#ffffff', 8);
    }
  } else if (A.t > 120) S.alud = null;   // se asienta frente al hospital
}
function dibujarAlud() {   // una ola de nieve que cae por el cerro
  const A = S.alud;
  if (!A) return;
  const fade = A.parado ? Math.max(0, 1 - A.t / 120) : 1;
  if (A.x < S.cam.x - 10) return;
  ctx.save(); ctx.globalAlpha = fade;
  const base = S.cam.y + H + 10, alto = 130;
  const g = ctx.createLinearGradient(A.x - 120, 0, A.x + 10, 0);
  g.addColorStop(0, '#dfe8f2'); g.addColorStop(1, '#ffffff');
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.moveTo(S.cam.x - 10, base); ctx.lineTo(S.cam.x - 10, base - alto);
  for (let k = 0; k <= 10; k++) { const y = base - alto + k * (alto / 10); ctx.lineTo(A.x + Math.sin(A.t / 6 + k) * 6 - (10 - k) * 1.5, y); }
  ctx.lineTo(A.x, base); ctx.fill();
  ctx.fillStyle = '#ffffff';
  for (let k = 0; k < 9; k++) { ctx.beginPath(); ctx.arc(A.x - 4 + Math.sin(A.t / 5 + k * 2) * 5, base - alto + k * 15, 9 + (k % 3) * 3, 0, 7); ctx.fill(); }
  ctx.strokeStyle = '#b9c8d8'; ctx.lineWidth = 0.8;
  for (let k = 0; k < 6; k++) { ctx.beginPath(); ctx.arc(A.x - 30 - k * 16, base - 40 - (k % 2) * 30, 10, 0.3, 2.6); ctx.stroke(); }
  ctx.restore();
}
// El jefe de los mineros: combos lentos que se ven venir, embestida que lo deja aturdido contra la roca y, a media pelea, llama a sus secuaces.
// Solo los golpes fuertes (gancho, patada, Hércules, la chaqueta) le hacen daño de frente; aturdido, todo le duele el doble.
function danarJefe(e, n, txt) {
  if (e.recibe > 0 || e.estado === 'ko') return;
  e.hp -= n; e.recibe = 14; e.destello = 8; S.parada = 5; S.sacudir = 5;
  efecto('golpeFuerte'); sumarEnergia(8); rotulo(e.x + 4, e.y - 6, txt || '¡POW!', '#ffffff', 9);
  if (e.hp <= 0) {
    e.hp = 0; e.estado = 'ko'; e.t = 0; P.puntos += 3000; P.noqueados++;
    for (const o of S.ents) if (o.tipo === 'minero' && !['ko', 'sevan'].includes(o.estado)) { o.estado = 'sevan'; o.t = 0; o.vx = 0.8; }
    S.peleaJefe = false; pararMusica(); efecto('explosion');
  }
}
function actualizarJefe(e, golpe, cuerpo) {
  const p = S.jug, dx = (p.x + p.w / 2) - (e.x + e.w / 2);
  if (e.recibe > 0) e.recibe--;
  e.vy = Math.min(e.vy + GRAV, MAX_CAIDA); moverY(e);
  const andar = v => { e.x = limitar(e.x + v, e.x0, e.x1 - e.w); };
  switch (e.estado) {
    case 'espera':
      if (p.x > e.x0 + 3 * T && p.estado === 'normal') { e.estado = 'reta'; e.t = 0; S.peleaJefe = true; S.barrera = e.x0 - T; pararMusica(); efecto('alerta'); }
      return;
    case 'reta':   // se presenta
      e.dir = dx < 0 ? -1 : 1;
      S.burbuja = { x: e.x + e.w / 2, y: e.y - 6, texto: '¡Así que llegaste hasta aquí, joven! ¡Nadie le quita el libro al jefe de los mineros!' };
      if (e.t > 150) { e.estado = 'camina'; e.t = 0; }
      return;
    case 'camina':
      e.dir = dx < 0 ? -1 : 1;
      andar(e.dir * 0.55 * DIF().persigue);
      if (--e.cuenta <= 0) { e.estado = 'prepara'; e.t = 0; e.cuenta = 260; efecto('alerta'); }
      else if (Math.abs(dx) < 34 && Math.abs(p.y - e.y) < 50) { e.estado = 'carga_golpe'; e.t = 0; }
      if (!e.llamo && e.hp <= e.hpMax / 2) { e.estado = 'llama'; e.t = 0; e.llamo = true; }
      break;
    case 'carga_golpe': if (e.t > DIF().carga + 14) { e.estado = 'golpe'; e.t = 0; efecto('aire'); } break;
    case 'golpe': {
      const caj = { x: e.dir > 0 ? e.x + e.w : e.x - 26, y: e.y + 10, w: 26, h: 22 };
      if (e.t >= 2 && e.t <= 12 && p.estado !== 'fuera' && choca(caj, cuerpo)) danarJugador(e.dir, 'jefe');
      if (e.t > 40) { e.estado = 'camina'; e.t = 0; }
      break;
    }
    case 'prepara':   // escarba el suelo y se lanza
      e.dir = dx < 0 ? -1 : 1;
      if (e.t % 6 === 0) polvo(e.x + e.w / 2 - e.dir * 8, e.y + e.h, 2);
      if (e.t > 50) { e.estado = 'embiste'; e.t = 0; efecto('golpeFuerte'); }
      break;
    case 'embiste':
      andar(e.dir * 3.1);
      if (e.t % 4 === 0) polvo(e.x + e.w / 2 - e.dir * 10, e.y + e.h, 3);
      // embiste con la cabeza gacha: pega abajo, así que se le puede saltar por encima
      if (p.estado !== 'fuera' && choca({ x: e.x, y: e.y + e.h * 0.45, w: e.w, h: e.h * 0.55 }, cuerpo)) danarJugador(e.dir, 'jefe');
      if (e.x <= e.x0 + 0.5 || e.x + e.w >= e.x1 - 0.5) {   // se estrella contra la roca
        e.estado = 'aturdido'; e.t = 0; S.sacudir = 14; efecto('explosion'); rotulo(e.x, e.y - 8, '¡PLAF!', '#ffffff', 10);
        for (let i = 0; i < 6; i++) polvo(e.x + e.w / 2 + e.dir * 10, e.y + 10 + i * 6, 2, '#9a8f84');
      }
      break;
    case 'aturdido': if (e.t > 150) { e.estado = 'camina'; e.t = 0; } break;
    case 'llama':   // a media pelea llama a dos secuaces
      S.burbuja = { x: e.x + e.w / 2, y: e.y - 6, texto: '¡Muchachos, vengan a ayudarme!' };
      if (e.t === 40) for (const k of [0, 1]) {
        const m = crearEntidad({ tipo: 'minero', x: (e.dir < 0 ? e.x1 - T - k * 20 : e.x0 + k * 20), y: e.y + e.h - 32, x0: e.x0, x1: e.x1 - T });
        m.estado = 'persigue'; m.hp = DIF().hpMinero; S.ents.push(m);   // los secuaces llegan con la dureza normal
        if (J.dificultad === 'facil') break;   // en fácil viene uno solo
      }
      if (e.t > 90) { e.estado = 'camina'; e.t = 0; }
      break;
    case 'ko':
      if (e.t % 22 === 0) estrellitas(e.x + e.w / 2, e.y + 6);
      if (e.t === 80) { S.finale = { tipo: 'jefe', t: 0, jefe: e }; retirarEnemigos(); }
      return;
  }
  if (e.estado === 'espera' || e.estado === 'reta') return;
  // golpes de Nato
  if (golpe && p.ataque && !p.ataque.golpeados.has(e) && choca(golpe, e)) {
    p.ataque.golpeados.add(e);
    const fuerte = p.ataque.tipo !== 'golpe';
    if (e.estado === 'aturdido') danarJefe(e, fuerte ? 3 : 2, fuerte ? '¡POW!' : '¡PAF!');
    else if (fuerte) danarJefe(e, 1, '¡PAF!');
    else { rotulo(e.x + 4, e.y - 6, '¡JA!', '#ffd58a', 7); efecto('tonk'); }
  }
  // pisotón en la cabeza
  if (p.vy > 0 && p.estado === 'normal' && choca(cuerpo, e) && p.y + p.h - p.vy <= e.y + 6) { p.vy = -5; danarJefe(e, 1, '¡TONK!'); }
  // con la chaqueta regalona puesta, cada choque le duele
  if (p.chaqueta > 0 && choca(cuerpo, e)) { danarJefe(e, 2, '¡PAF!'); p.vx = -e.dir * 2.5; }
}
// El cóndor gigante, jefe final. Vuela alto; avisa y baja en picada; aletea levantando viento; se posa a descansar junto al nido.
// En picada se le patea en el aire; posado, cualquier golpe le duele más. A media pelea llama a dos cóndores chicos.
function danarCondorJefe(e, n, txt) {
  if (e.recibe > 0 || ['derrotado', 'espera', 'grita'].includes(e.estado)) return;
  e.hp -= n; e.recibe = 18; e.destello = 8; S.parada = 5; S.sacudir = 6; plumas(e.x + e.w / 2, e.y + e.h / 2);
  efecto('golpeFuerte'); efecto('chillido'); sumarEnergia(10); rotulo(e.x + e.w / 2 - 6, e.y - 8, txt || '¡PLUM!', '#ffffff', 9);
  if (e.estado === 'picada') { e.estado = 'remonta'; e.t = 0; }
  if (e.hp <= 0) {
    e.hp = 0; e.estado = 'derrotado'; e.t = 0; P.puntos += 5000; P.condores++;
    S.peleaJefe = false; pararMusica(); efecto('explosion');
    for (const o of S.ents) if (o.tipo === 'condor' && o.estado !== 'golpeado') { o.estado = 'golpeado'; o.t = 0; o.vx = 2; o.vy = -2; }
  }
}
function actualizarCondorJefe(e, golpe, cuerpo) {
  const p = S.jug, suelo = 12 * T, cx = e.x + e.w / 2, px = p.x + p.w / 2, alto = suelo - 110;
  if (e.recibe > 0) e.recibe--;
  const ir = (tx, ty, v) => { const dx = tx - cx, dy = ty - (e.y + e.h / 2), d = Math.hypot(dx, dy) || 1; const k = Math.min(1, v / d); e.x += dx * k; e.y += dy * k; if (Math.abs(dx) > 1) e.dir = dx > 0 ? 1 : -1; return d < v + 0.5; };
  switch (e.estado) {
    case 'espera':
      if (p.x > e.x0 + 3 * T && p.x < e.x1 && p.estado === 'normal') { e.estado = 'grita'; e.t = 0; S.peleaJefe = true; S.barrera = e.x0 - T; pararMusica(); efecto('chillido'); }
      return;
    case 'grita':   // se presenta abriendo las alas sobre el nido
      ir(e.x1 - 30, alto + Math.sin(e.t / 12) * 6, 1.2);
      if (e.t % 30 === 0) efecto('chillido');
      if (e.t > 120) { e.estado = 'vuela'; e.t = 0; }
      return;
    case 'vuela': {
      const objX = px + Math.sin(e.t / 70) * 70;
      ir(limitar(objX, e.x0 + 40, e.x1 - 30), alto + Math.sin(e.t / 25) * 10, 1.4);
      if (!e.llamo && e.hp <= e.hpMax / 2) { e.estado = 'llama'; e.t = 0; e.llamo = true; break; }
      if (e.t > 150) {
        e.ataques++; e.t = 0;
        e.estado = e.ataques % 3 === 0 ? 'posa' : e.ataques % 6 === 4 ? 'aleteo' : 'aviso';   // descansa cada tres ataques
        if (e.estado === 'aviso') efecto('alerta');
      }
      break;
    }
    case 'aviso':   // se pone encima de Nato y chilla: va a bajar
      ir(px, alto - 4, 2.2);
      if (e.t === 10) efecto('chillido');
      if (e.t > DIF().aviso + 10) { e.estado = 'picada'; e.t = 0; e.objX = px; e.objY = p.y + p.h - 10; }
      break;
    case 'picada':
      if (ir(e.objX, e.objY, 2.9 * DIF().picada / 2.7) || e.y + e.h >= suelo - 2) { e.estado = 'remonta'; e.t = 0; polvo(cx, suelo, 10); efecto('aterriza'); }
      if (p.estado !== 'fuera' && choca({ x: e.x + 16, y: e.y + 6, w: e.w - 32, h: e.h - 8 }, cuerpo) && !(p.chaqueta > 0)) danarJugador(e.dir, 'condorJefe');
      break;
    case 'remonta': if (ir(cx + e.dir * 20, alto, 1.6) || e.t > 90) { e.estado = 'vuela'; e.t = 0; } break;
    case 'aleteo': {   // aletea con fuerza: el viento empuja a Nato hacia la orilla
      const lado = px < (e.x0 + e.x1) / 2 ? 1 : -1;   // se pone del lado contrario
      ir(lado > 0 ? e.x0 + 30 : e.x1 - 40, alto + 20, 1.6);
      e.dir = -lado;
      if (e.t > 40 && e.t < 170) {
        S.ventarron = -lado * 0.9 * (DIF().picada / 2.7);
        if (e.t % 4 === 0) particula(cx - lado * 30, e.y + 20 + azarJ(-10, 30), { col: '#e8eef5', tam: 1.4, vida: 40, max: 40, vx: -lado * 3, vy: azarJ(-0.3, 0.3), grav: 0 });
        if (e.t % 24 === 0) efecto('aleteo');
      } else S.ventarron = 0;
      if (e.t > 180) { e.estado = 'vuela'; e.t = 0; S.ventarron = 0; }
      break;
    }
    case 'posa':   // baja a descansar junto al nido
      if (ir(e.x1 - 46, suelo - e.h, 1.5)) { e.estado = 'posado'; e.t = 0; efecto('aterriza'); }
      break;
    case 'posado':
      e.dir = px < cx ? -1 : 1;
      if (e.t % 40 === 0) rotulo(cx - 8, e.y - 6, 'jadea…', '#ffd58a', 6);
      if (e.t > 210) { e.estado = 'remonta'; e.t = 0; efecto('chillido'); }
      break;
    case 'llama':
      ir((e.x0 + e.x1) / 2, alto - 20, 1.4);
      if (e.t === 30) { efecto('chillido'); for (const k of [0, 1]) S.ents.push(crearEntidad({ tipo: 'condor', x: (k ? e.x1 - 20 : e.x0 + 20), y: alto - 30 - k * 20, xa: e.x0, xb: e.x1 })); }
      if (e.t > 80) { e.estado = 'vuela'; e.t = 0; }
      break;
    case 'derrotado':   // se va volando hacia la cordillera y suelta su presa
      e.y -= 1.3; e.x += 1.6; e.dir = 1;
      if (e.t % 8 === 0) plumas(cx, e.y + 10);
      if (e.t === 90) empezarRescate();
      if (e.t > 260) e.vivo = false;
      return;
  }
  if (['espera', 'grita', 'derrotado'].includes(e.estado)) return;
  const caja2 = { x: e.x + 8, y: e.y, w: e.w - 16, h: e.h };
  if (golpe && p.ataque && !p.ataque.golpeados.has(e) && choca(golpe, caja2)) {
    p.ataque.golpeados.add(e);
    const fuerte = p.ataque.tipo !== 'golpe';
    danarCondorJefe(e, e.estado === 'posado' ? (fuerte ? 2 : 1) : 1, fuerte ? '¡PLUM!' : '¡PAF!');
  }
  if (p.vy > 0 && p.estado === 'normal' && choca(cuerpo, caja2) && p.y + p.h - p.vy <= e.y + 6) { p.vy = -5.2; danarCondorJefe(e, 1, '¡TONK!'); }
  if (p.chaqueta > 0 && choca(cuerpo, caja2)) danarCondorJefe(e, 2, '¡PLUM!');
}
function dibujarCondorJefe(e) {
  if (e.estado === 'espera') return;
  const fc = escalaFam('condor') * 2.8, cx = e.x + e.w / 2, cy = e.y + e.h / 2;
  const op = { medio: true, centrar: true, destello: e.destello > 0, rot: e.estado === 'derrotado' ? Math.sin(e.t / 6) * 0.3 : 0 };
  if (e.destello > 0) e.destello--;
  if (e.estado === 'picada') pose('condor_picada', cx, cy, e.dir, fc, Object.assign(op, { rot: 0.35 * e.dir }));
  else if (e.estado === 'posado') pose('condor_alas_abajo', cx, e.y + e.h + 6, e.dir, fc, { centrar: true, destello: op.destello });
  else if (!anim('condor_volar', e.t / (e.estado === 'aleteo' ? 1.2 : 2.6), cx, cy, e.dir, fc, op)) pose('condor_vuela', cx, cy, e.dir, fc, op);
  if (e.estado === 'aviso') {   // su sombra en el suelo y el «!»
    ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.beginPath(); ctx.ellipse(S.jug.x + S.jug.w / 2, 12 * T, 26, 4, 0, 0, 7); ctx.fill();
    dibujarTexto(ctx, '!', cx, e.y - 22, { tam: 14, color: '#ffe066', borde: '#1a1420', alinear: 'centro' });
  }
}
// Pedro en el nido, en lo más alto del peñasco
function dibujarPedroNido(e) {
  const n = S.N.nido;
  if (!n) return;
  if (!e.rescatado) {
    const sube = Math.abs(Math.sin(J.cuadros / 14)) * 1.5;
    pose('pedro_colgado', n.x, n.y + 4 - sube, -1, escalaFam('pedro'));
  }
  objeto('nido', n.x - 34, n.y + 12, 68);
  if (!e.rescatado && n.x > S.cam.x + 10 && n.x < S.cam.x + W - 10 && Math.floor(J.cuadros / 120) % 2 === 0 && !S.burbuja) S.burbuja = { x: n.x, y: n.y - 30, texto: '¡Natooo! ¡Aquí arriba!' };
}
// después de vencer al cóndor: Pedro baja del nido y se abrazan; luego, 1981
function empezarRescate() {
  const p = S.jug, pn = S.ents.find(e => e.tipo === 'pedroNido');
  if (pn) pn.rescatado = true;
  S.rescate = { t: 0, x: S.N.nido.x, y: S.N.nido.y };
  S.barrera = 0;
  p.vx = 0;
}
function actualizarRescate() {
  const R = S.rescate, p = S.jug, suelo = 12 * T;
  R.t++;
  if (!p.enSuelo || p.vy < 0) { p.vx = 0; p.vy = Math.min(p.vy + GRAV, MAX_CAIDA); moverY(p); }   // si estaba saltando, baja al suelo
  if (p.estado !== 'normal' && p.estado !== 'victoria') p.estado = 'normal';
  // Pedro baja del peñasco hasta Nato (por delante del peñasco, nunca metido en la roca)
  const destX = Math.min(p.x + p.w / 2 + 22, S.N.nido.x - 2.2 * T);
  if (R.t < 60) { R.x += (destX - R.x) * 0.06; R.y = Math.min(suelo, R.y + 2.2); }
  else R.x += (destX - R.x) * 0.1;
  p.dir = R.x > p.x ? 1 : -1;
  const frases = [[60, 'pedro', '¡Nato! ¡Sabía que vendrías por mí!'], [240, 'nato', '¡Papá! ¡Vamos a casa!'],
    [380, 'pedro', 'Escucha… hoy baja el último tren de Sewell. Yo me adelanto por la calle con Hércules. ¡Nos vemos en el tren!']];
  S.burbuja = null;
  for (const [t0, quien, txt] of frases) if (R.t >= t0 && R.t < t0 + lectura(txt) + 10) S.burbuja = { x: quien === 'pedro' ? R.x : p.x + p.w / 2, y: (quien === 'pedro' ? suelo - 34 : p.y) - 6, texto: txt };
  if (R.t === 60) { voz('gracias', { baja: true }); efecto('pan'); }
  if (R.t === 240) voz('yahermano', { baja: true });
  if (R.t === 790) {
    fundir(() => {   // salto de tiempo: 1981
      S.rescate = null; S.anuncio1981 = 330;
      const r = S.N.rescate;
      for (const e of S.ents) if (e.tipo === 'fogata' && e.x <= r.x + 4) e.encendida = true;
      S.checkpoint = { x: r.x, y: r.y };
      Object.assign(p, crearJugador(r.x, r.y));
      S.cam.x = limitar(p.x - W / 2, 0, S.N.ancho * T - W); S.cam.y = limitar(p.y - H * 0.6, 0, S.N.alto * T - H);
    });
  }
}
function dibujarRescate() {
  const R = S.rescate;
  if (!R) return;
  pose(R.t < 60 ? 'pedro_colgado' : 'pedro_quieto', R.x, Math.min(12 * T, R.y + 34) + 1, R.x > S.jug.x ? -1 : 1, escalaFam('pedro'));
  if (R.t > 60 && R.t < 240 && R.t % 10 === 0) particula(R.x - 10, 12 * T - 30, { corazon: true, col: '#ff6a7a', tam: 2, vida: 50, max: 50, vx: azarJ(-0.3, 0.3), vy: -0.5, grav: 0 });
}

// ---------- el último tren: locomotora adelante, ténder y tres carros planos con las familias sobre la carga
const CARRO = { ancho: 88, piso: 0.47 };   // Nato se para sobre la carga, a esta fracción del alto del carro
function crearTrenFinal(d) {
  const N = S.N, y = N.tren.y, i = SPRITES_INFO.carro_1981 || SPRITES_INFO.carro_gente || [318, 240];
  const altoCarro = i[1] * CARRO.ancho / i[0];
  const e = { tipo: 'trenFinal', vivo: true, x: d.x, v: 0, estado: 'espera', t: 0, carros: [], altoCarro, w: 1, h: 1, y: y };
  let x = d.x - 112 - 50;
  for (let k = 0; k < 3; k++) {
    x -= CARRO.ancho;
    const c = { tipo: 'carroTren', vivo: true, plataforma: true, x: x + 4, y: y - altoCarro + altoCarro * CARRO.piso, w: CARRO.ancho - 8, h: 6, dx: 0, dy: 0, t: 0, k };
    e.carros.push(c); S.ents.push(c);
  }
  S.tren = e;
  return e;
}
function actualizarTrenFinal(e) {
  const p = S.jug, N = S.N;
  if (S.finale) return;   // en el cierre el tren lo mueve actualizarFinal (y Nato va arriba)
  const subido = e.carros.includes(p.sobre);
  if (e.estado === 'espera') {
    if (e.t % 180 === 0) efecto('chu');
    if (subido && !e.subio) { e.subio = true; e.tSubio = e.t; S.burbuja = null; rotulo(p.x - 10, p.y - 14, '¡Arriba, Nato!', '#ffffff', 7); }
    if (e.subio && e.t - e.tSubio > 70) { e.estado = 'viaja'; efecto('silbato'); pararMusica(); }
  } else if (e.estado === 'viaja') {
    e.v = Math.min(DIF().tren, e.v + 0.012);
    e.x += e.v;
    for (const c of e.carros) { c.x += e.v; c.dx = e.v; }
    if (e.t % Math.max(10, Math.round(30 / Math.max(0.3, e.v))) === 0) efecto('chu');
    if (e.t % 6 === 0) particula(e.x - 20, e.y - 76, { col: '#e9eef2', tam: azarJ(3, 6), vida: 80, max: 80, vx: -0.6 - e.v * 0.4, vy: -0.6, grav: -0.004 });
    // cóndores que persiguen al tren
    if (e.t % 340 === 170 && e.x < N.tren.fin - 200) {
      const c = crearEntidad({ tipo: 'condor', x: S.cam.x + W + 10, y: S.cam.y + 20, xa: S.cam.x + 20, xb: S.cam.x + W - 20 });
      c.sigue = true; S.ents.push(c);
    }
    // si Nato se cae del tren (queda atrás, o en la vía un momento), vuelve al último carro: cuesta un corazón
    const ultimo = e.carros[e.carros.length - 1];   // el carro de más atrás (los carros se crean desde la locomotora hacia atrás)
    e.enVia = p.enSuelo && !e.carros.includes(p.sobre) && p.y + p.h >= N.tren.y - 1 ? (e.enVia || 0) + 1 : 0;
    if (p.estado !== 'fuera' && p.estado !== 'atrapado' && (p.x + p.w < ultimo.x - 30 || p.y > N.tren.y + 10 || e.enVia > 40)) {
      e.enVia = 0;
      if (!P.invencible && !(p.chaqueta > 0)) { P.corazones--; efecto('caida'); if (P.corazones <= 0) { perderVida('tren'); return; } }
      Object.assign(p, { x: ultimo.x + 30, y: ultimo.y - p.h - 20, vx: 0, vy: 0, invul: 90, sobre: null, estado: 'normal' });
      rotulo(p.x, p.y - 10, '¡Arriba otra vez!', '#ffffff', 7);
    }
    if (e.x > N.tren.fin && !S.finale) {
      S.finale = { tipo: 'ultimoTren', t: 0 }; retirarEnemigos();
      for (const o of S.ents) if (o.tipo === 'condor') { o.estado = 'golpeado'; o.t = 0; o.vx = -2; o.vy = -2; }
    }
  }
}
function dibujarTrenFinal(e) {
  const y = e.y, carro = SPRITES_INFO.carro_1981 ? 'carro_1981' : 'carro_gente';
  // la vía
  ctx.fillStyle = '#4b3222'; for (let r = S.cam.x - 20; r < S.cam.x + W + 20; r += 6) ctx.fillRect(Math.floor(r / 6) * 6, y - 1, 3.5, 2);
  ctx.fillStyle = '#8b8895'; ctx.fillRect(S.cam.x - 20, y - 2.2, W + 40, 1);
  objeto('locomotora', e.x - 112, y + 2, 112);
  objeto('tender', e.x - 162, y + 2, 50);
  for (const c of e.carros) {
    const x = c.x - 4;
    objeto(carro, x, y + 2, CARRO.ancho);
    if (c.k === e.carros.length - 1) {   // Pedro y Hércules van en el último carro, sentados sobre la carga
      pose('pedro_quieto', x + 22, c.y + 1, 1, escalaFam('pedro') * 0.95);
      pose('hercules_sentado', x + 54, c.y + 1, 1, escalaFam('hercules') * 0.9, { centrar: true });
    }
  }
}
function quemarJugador(olla) {
  const p = S.jug;
  // sale disparado hacia el borde más cercano de la olla, para no volver a caer en ella
  const lado = p.x + p.w / 2 < olla.x + olla.w / 2 ? -1 : 1;
  p.vy = -7.6; p.vx = lado * 2.2; p.dir = lado; p.estado = 'herido'; p.t = 0; p.tizne = 150; p.ataque = null;
  efecto('quemado'); chispas(p.x + 5, olla.y, 14);
  rotulo(p.x - 6, p.y - 10, '¡AY, AY, AY!', '#ffb02e', 8);
  if (p.invul <= 0 && !P.invencible && !(p.chaqueta > 0)) {
    P.corazones--;
    if (P.corazones <= 0) { perderVida('olla'); return; }
    p.invul = 90;
  }
}

function actualizarMinero(e, golpe, cuerpo) {
  const p = S.jug;
  const dx = p.x - e.x, dy = p.y - e.y;
  const activo = !['ko', 'sevan', 'mareado'].includes(e.estado);
  // en grupo: se separan para no quedar uno encima del otro
  for (const o of S.ents) {
    if (o === e || o.tipo !== 'minero' || !o.vivo || Math.abs(o.y - e.y) > 8) continue;
    const sep = (e.x - o.x);
    if (Math.abs(sep) < 13) e.x += (sep >= 0 ? 1 : -1) * 0.45;
  }
  if (e.y > S.N.alto * T) { e.vivo = false; return; }   // cayó a un hoyo
  // gravedad y movimiento
  e.vy = Math.min(e.vy + GRAV, MAX_CAIDA);
  if (e.estado !== 'sevan') {
    const frente = e.x + (e.vx > 0 ? e.w + 2 : -2);
    if (e.vx !== 0 && e.enSuelo && !haySueloEn(frente, e.y + e.h + 2) && e.estado !== 'herido' && e.estado !== 'ko') e.vx = 0;
    moverX(e);
  } else e.x += e.vx;
  moverY(e);
  switch (e.estado) {
    case 'patrulla':
      e.vx = e.dir * e.vel;
      if (e.x < e.x0) e.dir = 1; else if (e.x > e.x1) e.dir = -1;
      if (e.chocoX) e.dir *= -1;
      if (Math.abs(dx) < 110 && Math.abs(dy) < 30 && p.estado !== 'fuera' && (Math.sign(dx) === e.dir || Math.abs(dx) < 40)) {
        e.estado = 'alerta'; e.t = 0; e.dir = Math.sign(dx) || 1; efecto('alerta');
      }
      break;
    case 'alerta': e.vx = 0; if (e.t > 28) { e.estado = 'persigue'; e.t = 0; } break;
    case 'persigue':
      e.dir = Math.sign(dx) || e.dir;
      e.vx = e.dir * DIF().persigue;
      if (Math.abs(dx) < 17 && Math.abs(dy) < 20) { e.estado = 'carga'; e.t = 0; e.vx = 0; }
      if (Math.abs(dx) > 170 || p.estado === 'fuera') { e.estado = 'patrulla'; }
      break;
    case 'carga': e.vx = 0; if (e.t > DIF().carga) { e.estado = 'golpe'; e.t = 0; efecto('aire'); } break;
    case 'golpe':
      e.vx = 0;
      if (e.t >= 3 && e.t <= 10) {
        const caj = { x: e.dir > 0 ? e.x + e.w : e.x - 15, y: e.y + 7, w: 15, h: 10 };
        if (choca(caj, cuerpo)) danarJugador(e.dir);
      }
      if (e.t > 34) { e.estado = 'persigue'; e.t = 0; }
      break;
    case 'herido': e.vx *= 0.85; if (e.t > 16) { e.estado = 'persigue'; e.t = 0; } break;
    case 'mareado': e.vx = 0; if (e.t % 20 === 0) estrellitas(e.x + 6, e.y - 2); if (e.t > 130) { e.estado = 'persigue'; e.t = 0; } break;
    case 'ko': e.vx *= 0.9; if (e.t % 22 === 0) estrellitas(e.x + 6, e.y + 6); if (e.t > 80) { e.estado = 'sevan'; e.t = 0; e.vx = -e.dir * 0.6; } break;
    case 'sevan': e.alfa = Math.max(0, 1 - e.t / 70); if (e.t > 70) e.vivo = false; break;
  }
  if (!activo) return;
  if (chaquetaNoquea(e)) return;
  // golpes de Nato
  if (golpe && p.ataque && !p.ataque.golpeados.has(e) && choca(golpe, e)) {
    p.ataque.golpeados.add(e);
    const fuerte = p.ataque.tipo !== 'golpe';
    e.hp -= p.ataque.tipo === 'patada' ? 2 : 1;
    e.dir = -p.dir;
    e.vx = p.dir * (fuerte ? 2.6 : 1.3); if (fuerte) e.vy = -2.5;
    e.destello = 6;
    sumarEnergia(fuerte ? 16 : 11);
    efecto(fuerte ? 'golpeFuerte' : 'golpe');
    // Nato habla cuando le pega a un minero (sin repetir la frase a cada golpe)
    if (!J.ultimaFrase || J.cuadros - J.ultimaFrase > 150) {
      const frases = ['toma', 'yahermano', 'dandole'].filter(k => AUDIO.voces[k]);
      if (frases.length && voz(frases[(J.fraseN = (J.fraseN || 0) + 1) % frases.length], { baja: true })) J.ultimaFrase = J.cuadros;
    }
    rotulo(e.x, e.y - 4, ['¡PAF!', '¡POW!', '¡ZAS!'][(p.combo + e.hp + 3) % 3], '#ffffff', 8);
    S.sacudir = fuerte ? 5 : 2;
    S.parada = fuerte ? 5 : 3;
    if (e.hp <= 0) {
      e.estado = 'ko'; e.t = 0; e.vy = -3; P.noqueados++; P.puntos += 100; estrellitas(e.x + 6, e.y);
      if (p.ataque.tipo === 'gancho' && Math.random() < 0.5) voz('dandole');
    } else { e.estado = 'herido'; e.t = 0; }
  }
  // pisotón sobre el casco
  if (p.vy > 0 && p.estado === 'normal' && choca(cuerpo, e) && p.y + p.h - p.vy <= e.y + 6) {
    p.vy = -4.8; e.estado = 'mareado'; e.t = 0; e.vx = 0; efecto('tonk'); sumarEnergia(8); P.puntos += 50; rotulo(e.x, e.y - 6, '¡TONK!', '#ffe066', 8);
  }
}

function actualizarCondor(e, golpe, cuerpo) {
  if (e.sigue && S.tren && S.tren.estado === 'viaja') { const v = S.tren.v; e.x += v; e.xa += v; e.xb += v; }
  if (S.finale && e.estado !== 'agarra') {   // se va volando hacia la cordillera
    e.y -= 1.1; e.x += (e.dir || 1) * 1.3;
    if (e.y < S.cam.y - 70) e.vivo = false;
    return;
  }
  const p = S.jug;
  const cx = e.x + e.w / 2, cy = e.y + e.h / 2, px = p.x + p.w / 2, py = p.y + p.h / 2;
  if (e.enfriar > 0) e.enfriar--;
  if (S.sala >= 0 && (e.estado === 'aviso' || e.estado === 'picada')) { e.estado = 'sube'; e.t = 0; }   // Nato entró a una sala: el cóndor se queda afuera
  switch (e.estado) {
    case 'vuela':
      e.x += e.dir * 0.85;
      e.y = e.yBase + Math.sin(e.t / 22) * 6;
      if (e.x < e.xa) e.dir = 1; else if (e.x > e.xb) e.dir = -1;
      if (e.t % 40 === 0 && Math.abs(cx - S.cam.x - W / 2) < W) efecto('aleteo');
      if (e.enfriar <= 0 && Math.abs(px - cx) < 70 && py > cy + 25 && py - cy < 150 && p.estado !== 'fuera' && !S.finale && !(p.sobre && p.sobre.tipo === 'capacho') &&
        cx > S.cam.x && cx < S.cam.x + W && S.sala < 0) {
        e.estado = 'aviso'; e.t = 0; efecto('chillido'); e.dir = px > cx ? 1 : -1;
      }
      break;
    case 'aviso':
      e.y += Math.sin(e.t / 3) * 0.4;
      if (e.t > DIF().aviso + (e.sigue ? 24 : 0)) {   // los del tren avisan más: Nato tiene poco espacio en el carro
        const ang = Math.atan2(py - cy, px - cx);
        e.vx = Math.cos(ang) * DIF().picada; e.vy = Math.sin(ang) * DIF().picada; e.dir = e.vx > 0 ? 1 : -1;
        e.objetivoY = py; e.estado = 'picada'; e.t = 0;
      }
      break;
    case 'picada':
      e.x += e.vx; e.y += e.vy;
      if (e.t > 95 || cy > e.objetivoY + 34 || esSolida(casilla(Math.floor(cx / T), Math.floor((e.y + e.h) / T)))) { e.estado = 'sube'; e.t = 0; }
      break;
    case 'sube':
      e.y -= 1.3; e.x += e.dir * 0.6;
      if (e.y <= e.yBase) { e.estado = 'vuela'; e.enfriar = 170; e.t = 0; }
      break;
    case 'golpeado':
      e.x += e.vx; e.y += e.vy; e.vy -= 0.04; e.giro = (e.giro || 0) + 0.3;
      if (e.t > 100) e.vivo = false;
      return;
    case 'agarra': {
      e.y -= 0.55; e.x += e.dir * 0.35;
      // colgando de los hombros: las patas del cóndor quedan justo sobre ellos
      p.x = e.x + e.w / 2 - raptoCondorDX(1) * e.dir - p.w / 2 + Math.sin(e.t / 6) * 0.6; p.y = e.y + e.h / 2 + altoCondor(1) * 0.45 - 34 * 0.20; p.vx = 0; p.vy = 0;
      p.lucha = Math.max(0, p.lucha - 0.35);
      if (presionado('saltar') || presionado('golpe')) { p.lucha += DIF().lucha; efecto('aire'); }
      if (presionado('perro')) llamarHercules();
      if (e.t % 30 === 0) efecto('aleteo');
      if (p.lucha >= 100) {
        e.estado = 'golpeado'; e.t = 0; e.vx = -e.dir * 1.6; e.vy = -1.5; plumas(cx, cy);
        p.estado = 'normal'; p.vy = -2.5; p.enSuelo = false; p.invul = 80; efecto('soltarse'); rotulo(p.x, p.y - 8, '¡SUÉLTAME!', '#ffffff', 7);
      } else if (e.t > 170) {
        e.vivo = false; p.estado = 'fuera';
        irA('olla');
      }
      return;
    }
  }
  if (p.estado === 'fuera' || p.estado === 'atrapado') return;
  // patada voladora, combos o pisotón
  const caja2 = { x: e.x - 2, y: e.y - 3, w: e.w + 4, h: e.h + 6 };
  const pisoton = p.vy > 0 && choca(cuerpo, caja2) && p.y + p.h - p.vy <= e.y + 4;
  if ((golpe && p.ataque && choca(golpe, caja2)) || pisoton) {
    e.estado = 'golpeado'; e.t = 0; e.vx = (px < cx ? 1 : -1) * 2.2; e.vy = -1.8;
    plumas(cx, cy); efecto('golpeFuerte'); P.condores++; P.puntos += 200; sumarEnergia(25); S.parada = 6; rotulo(e.x, e.y - 6, '¡PLUM!', '#ffffff', 8);
    if (pisoton) p.vy = -4.8;
    return;
  }
  if (p.chaqueta > 0 && e.estado !== 'golpeado' && choca(cuerpo, caja2)) {
    e.estado = 'golpeado'; e.t = 0; e.vx = (px < cx ? 1 : -1) * 2.4; e.vy = -2;
    plumas(cx, cy); efecto('golpeFuerte'); P.condores++; P.puntos += 200; rotulo(e.x, e.y - 6, '¡PLUM!', '#ffb347', 8);
    return;
  }
  if (e.estado === 'picada' && p.invul <= 0 && choca(cuerpo, caja2) && e.sigue) {   // en el tren picotea, pero no se lo lleva
    const carro = p.sobre || (S.tren && S.tren.carros.find(c => p.x + p.w > c.x && p.x < c.x + c.w && Math.abs(p.y + p.h - c.y) < 6));
    if (!(p.chaqueta > 0)) {
      if (J.dificultad === 'dificil' && !P.invencible) {   // en Difícil cuesta un corazón, pero Nato no sale despedido del carro
        P.corazones--; efecto('herido'); voz('ay', { baja: true }); estrellitas(p.x + p.w / 2, p.y + 4);
        if (P.corazones <= 0) { perderVida('condor'); e.estado = 'sube'; e.t = 0; return; }
      } else {   // en Fácil y Normal le roba pepitas: el viaje final no es para perder vidas
        const n = Math.min(5, P.pepitas); P.pepitas -= n; efecto('herido');
        rotulo(p.x - 8, p.y - 12, n ? `¡Me robó ${n} pepitas!` : '¡Suelta, pajarraco!', '#ffd58a', 7);
      }
      p.invul = 90; S.sacudir = 6; plumas(cx, cy); p.ataque = null;
      if (carro) { p.vx = 0; p.vy = -1.6; p.sobre = null; p.enSuelo = false; p.arrastre = carro.dx || 0; }   // trastabilla, pero sigue con el carro
    }
    e.estado = 'sube'; e.t = 0; return;
  }
  if (e.estado === 'picada' && p.invul <= 0 && choca(cuerpo, caja2)) {
    e.estado = 'agarra'; e.t = 0; e.dir = e.vx > 0 ? 1 : -1;
    p.estado = 'atrapado'; p.lucha = 0; p.ataque = null; p.sobre = null;
    efecto('chillido');
  }
}

// ------------------------------------------------------------------ minero dinamitero (desde los techos)
function actualizarDinamitero(e, golpe, cuerpo) {
  const p = S.jug, dx = (p.x + p.w / 2) - (e.x + e.w / 2), dy = p.y - e.y;
  const pieAntesD = e.y + e.h, enSueloD = e.enSuelo;
  e.vy = Math.min(e.vy + GRAV, MAX_CAIDA); moverY(e);
  if (!e.enSuelo || e.enLinea) apoyarLinea(e, enSueloD, pieAntesD, false);
  if (e.espera > 0) e.espera--;
  switch (e.estado) {
    case 'acecha':
      e.dir = dx >= 0 ? 1 : -1;
      // el de las bolas solo lanza por la pista, cuando Nato está a su izquierda y a su altura
      const apunta = e.arma === 'bola' ? (dx < -20 && dx > -300 && Math.abs(dy) < 40) : (Math.abs(dx) < 175 && dy > -40);
      if (e.espera <= 0 && apunta && p.estado !== 'fuera' && !S.finale && e.x > S.cam.x - 10 && e.x < S.cam.x + W + 10) {
        e.estado = 'prepara'; e.t = 0; efecto(e.arma === 'bola' ? 'alerta' : 'mecha');
      }
      break;
    case 'prepara':
      if (e.t > 32) {
        if (e.arma === 'bola') { lanzarBola(e.x - 6, e.y + e.h - 10, -1.4, 46.4 * T, true); efecto('rueda'); }
        else lanzarDinamita(e);
        e.estado = 'lanza'; e.t = 0;
      }
      break;
    case 'lanza': if (e.t > 20) { e.estado = 'acecha'; e.espera = e.arma === 'bola' ? DIF().bolero : DIF().dinamita; } break;
    case 'mareado': if (e.t % 20 === 0) estrellitas(e.x + 6, e.y - 2); if (e.t > 140) { e.estado = 'acecha'; e.espera = 60; } break;
    case 'ko': if (e.t % 22 === 0) estrellitas(e.x + 6, e.y + 6); if (e.t > 90) { e.estado = 'sevan'; e.t = 0; } break;
    case 'sevan': e.alfa = Math.max(0, 1 - e.t / 50); if (e.t > 50) e.vivo = false; break;
  }
  if (['ko', 'sevan', 'mareado'].includes(e.estado)) return;
  if (chaquetaNoquea(e)) return;
  if (golpe && p.ataque && !p.ataque.golpeados.has(e) && choca(golpe, e)) {
    p.ataque.golpeados.add(e); e.hp -= p.ataque.tipo === 'golpe' ? 1 : 2; e.destello = 6; S.parada = 4;
    efecto('golpe'); sumarEnergia(12); rotulo(e.x, e.y - 4, '¡PAF!', '#ffffff', 8);
    if (e.hp <= 0) { e.estado = 'ko'; e.t = 0; P.noqueados++; P.puntos += 150; estrellitas(e.x + 6, e.y); }
  }
  if (p.vy > 0 && p.estado === 'normal' && choca(cuerpo, e) && p.y + p.h - p.vy <= e.y + 6) {
    p.vy = -4.8; e.estado = 'mareado'; e.t = 0; efecto('tonk'); sumarEnergia(8); rotulo(e.x, e.y - 6, '¡TONK!', '#ffe066', 8);
  }
}
function lanzarBola(x, y, vx, xFin, chuza) {
  S.ents.push({ tipo: 'bola', vivo: true, x, y, w: 10, h: 10, vx, vy: 0, giro: 0, xFin, chuza, t: 0 });
}
function actualizarBola(e, golpe, cuerpo) {
  const p = S.jug, antes = e.enSuelo;
  e.vy = Math.min(e.vy + GRAV, MAX_CAIDA);
  moverX(e); moverY(e); apoyarRampa(e, antes);
  if (e.enRampa) e.vx += e.rampa === C_RAMPA_D ? -0.07 : 0.07;   // cuesta abajo acelera
  e.vx = limitar(e.vx, -DIF().bola, DIF().bola);
  e.giro += e.vx / 5;
  if (e.enSuelo && e.t % 14 === 0 && Math.abs(e.x - p.x) < 170) efecto('rueda');
  const llego = e.vx < 0 ? e.x < e.xFin : e.x > e.xFin;
  if (e.chocoX || llego || e.y > S.N.alto * T) {
    e.vivo = false;
    if (e.chuza && llego) { efecto('chuza'); rotulo(e.x, e.y - 12, '¡CHUZA!', '#ffe066', 8); S.palosT = 40; }
    else polvo(e.x + 5, e.y + 8, 6, '#8b8895');
    return;
  }
  if (golpe && p.ataque && choca(golpe, e)) {
    e.vivo = false; polvo(e.x + 5, e.y + 5, 10, '#8b8895'); efecto('golpeFuerte'); rotulo(e.x, e.y - 6, '¡CRAC!', '#ffffff', 8);
    P.puntos += 30; sumarEnergia(6); return;
  }
  if (p.estado !== 'fuera' && choca(cuerpo, e)) {
    if (p.chaqueta > 0) { e.vivo = false; polvo(e.x + 5, e.y + 5, 10, '#8b8895'); efecto('golpeFuerte'); rotulo(e.x, e.y - 6, '¡CRAC!', '#ffb347', 8); P.puntos += 30; return; }
    if (p.vy > 0 && p.y + p.h - p.vy <= e.y + 5) { p.vy = -4.6; efecto('tonk'); }
    else danarJugador(e.vx < 0 ? -1 : 1, 'bola');
  }
}
function dibujarBola(x, y, giro) {   // bola de palitroque: negra azulada, con brillo y tres agujeros que giran
  ctx.fillStyle = '#1f2a44'; ctx.beginPath(); ctx.arc(x, y, 5, 0, 7); ctx.fill();
  ctx.strokeStyle = '#0c0f18'; ctx.lineWidth = 0.7; ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,0.45)'; ctx.beginPath(); ctx.arc(x - 1.6, y - 1.8, 1.4, 0, 7); ctx.fill();
  ctx.fillStyle = '#05070c';
  for (const a of [0, 0.5, 1.0]) ctx.fillRect(x + Math.cos(giro + a) * 2.6 - 0.6, y + Math.sin(giro + a) * 2.6 - 0.6, 1.2, 1.2);
}
function lanzarDinamita(e) {
  const p = S.jug, T0 = 48, g = 0.2;
  const x0 = e.x + e.w / 2, y0 = e.y + 2;
  const tx = p.x + p.w / 2 + p.vx * 20, ty = p.y + p.h - 4;   // apunta adonde va Nato
  const vx = limitar((tx - x0) / T0, -3.2, 3.2), vy = limitar((ty - y0 - 0.5 * g * T0 * T0) / T0, -6.5, 1);
  S.ents.push({ tipo: 'dinamita', vivo: true, x: x0 - 3, y: y0, w: 6, h: 6, vx, vy, g, mecha: 95, giro: 0, t: 0, dueno: e });
  efecto('aire');
}
function dibujarDinamita(x, y, t, giro) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(giro || 0);
  ctx.fillStyle = '#c8302a'; ctx.fillRect(-2.2, -4.5, 4.4, 9);
  ctx.fillStyle = '#e86050'; ctx.fillRect(-2.2, -4.5, 1.4, 9);
  ctx.strokeStyle = '#1a1420'; ctx.lineWidth = 0.5; ctx.strokeRect(-2.2, -4.5, 4.4, 9);
  ctx.strokeStyle = '#3a3742'; ctx.lineWidth = 0.6; ctx.beginPath(); ctx.moveTo(0, -4.5); ctx.quadraticCurveTo(1.5, -6.5, 0.5, -8); ctx.stroke();
  if (t % 4 < 2) { ctx.fillStyle = '#ffe066'; ctx.beginPath(); ctx.arc(0.5, -8.5, 1.4, 0, 7); ctx.fill(); }
  ctx.restore();
}
function actualizarDinamita(e, golpe, cuerpo) {
  const p = S.jug;
  e.mecha--; e.giro += e.vx * 0.12;
  e.vy = Math.min(e.vy + e.g, 5); e.x += e.vx; e.y += e.vy;
  if (e.t % 3 === 0) particula(e.x + 3, e.y, { col: '#ffd25a', tam: 0.8, vida: 12, max: 12, vx: azarJ(-0.3, 0.3), vy: -0.4, grav: 0 });
  const tx = Math.floor((e.x + 3) / T), ty = Math.floor((e.y + 6) / T);
  if (e.vy > 0 && (esSolida(casilla(tx, ty)) || esPlataforma(tx, ty))) { e.y = ty * T - 6; e.vy *= -0.35; e.vx *= 0.55; if (Math.abs(e.vy) < 0.6) e.vy = 0; }
  if (esSolida(casilla(Math.floor((e.x + (e.vx > 0 ? 6 : 0)) / T), Math.floor((e.y + 3) / T)))) e.vx = -e.vx * 0.4;
  // devolverla de un golpe
  if (golpe && p.ataque && !e.devuelta && choca(golpe, { x: e.x - 4, y: e.y - 4, w: 14, h: 14 })) {
    e.devuelta = true; e.vx = p.dir * 3; e.vy = -3.6; e.mecha = Math.max(e.mecha, 45); efecto('tonk');
    rotulo(e.x, e.y - 8, '¡DE VUELTA!', '#ffe066', 7); sumarEnergia(10);
  }
  if (e.mecha <= 0 || e.y > S.N.alto * T) explotar(e);
}
function explotar(e) {
  e.vivo = false;
  const cx = e.x + 3, cy = e.y + 3;
  efecto('explosion'); S.sacudir = 12; S.parada = 3;
  for (let i = 0; i < 18; i++) particula(cx, cy, { col: ['#ffe066', '#ff9a2a', '#ff5a2a', '#55525c'][i % 4], tam: azarJ(2, 5), vida: 30, max: 30, vx: azarJ(-2.4, 2.4), vy: azarJ(-2.6, 0.6), grav: 0.05 });
  polvo(cx, cy, 10, '#77727c');
  rotulo(cx - 6, cy - 14, '¡BUM!', '#ffd25a', 12);
  const p = S.jug;
  if (p.estado !== 'fuera' && Math.hypot(p.x + p.w / 2 - cx, p.y + p.h / 2 - cy) < 28) { danarJugador(p.x + p.w / 2 < cx ? -1 : 1); p.tizne = Math.max(p.tizne, 90); }
  for (const o of S.ents) {
    if (!o.vivo || !(o.tipo === 'minero' || o.tipo === 'dinamitero') || ['ko', 'sevan'].includes(o.estado)) continue;
    if (Math.hypot(o.x + o.w / 2 - cx, o.y + o.h / 2 - cy) < 30) {
      o.hp = 0; o.estado = 'ko'; o.t = 0; o.tiznado = true; o.vy = -3; P.noqueados++; P.puntos += 200; estrellitas(o.x + 6, o.y);
      rotulo(o.x, o.y - 10, '¡Me tizné!', '#ffffff', 6);
    }
  }
}

// ------------------------------------------------------------------ Hércules, el perro fiel de Nato
function sumarEnergia(n) {
  const antes = P.energia;
  P.energia = Math.min(100, P.energia + n * DIF().energia);
  if (antes < 100 && P.energia >= 100) { efecto('energiaLlena'); rotulo(S.jug.x, S.jug.y - 14, '¡HÉRCULES LISTO!', '#ffb347', 7); }
}
function sueloBajo(x, y) { // primera superficie bajo (x, y), o el fondo del mapa
  const tx = Math.floor(x / T);
  for (let ty = Math.max(0, Math.floor(y / T)); ty < S.N.alto; ty++) if (esSolida(casilla(tx, ty)) || esPlataforma(tx, ty)) return ty * T;
  return S.N.alto * T;
}
function enemigoMasCercano(p) {
  let mejor = null, d = 230;
  if (p.estado === 'atrapado') d = 1000;
  for (const e of S.ents) {
    if (!e.vivo) continue;
    const vale = ((e.tipo === 'minero' || e.tipo === 'dinamitero') && !['ko', 'sevan'].includes(e.estado)) || (e.tipo === 'condor' && e.estado !== 'golpeado') ||
      (e.tipo === 'jefe' && S.peleaJefe && e.estado !== 'ko') || (e.tipo === 'condorJefe' && S.peleaJefe && e.estado !== 'derrotado');
    if (!vale) continue;
    // primero el que está atacando a Nato: el que lo tiene atrapado, el que baja en picada o el minero que viene a golpearlo
    const amenaza = e.estado === 'agarra' ? 400 : ['picada', 'aviso', 'carga', 'golpe', 'persigue', 'alerta'].includes(e.estado) ? 120 : 0;
    const dd = Math.hypot(e.x - p.x, (e.y - p.y) * 0.7) - amenaza;
    if (dd < d && e.x > S.cam.x - 20 && e.x < S.cam.x + W + 20) { d = dd; mejor = e; }
  }
  return mejor;
}
function llamarHercules() {
  const p = S.jug;
  if (P.energia < 100 || S.ents.some(e => e.tipo === 'hercules')) return;
  const obj = enemigoMasCercano(p);
  if (!obj) { rotulo(p.x, p.y - 12, 'No hay enemigos cerca', '#ffffff', 6); return; }
  P.energia = 0;
  const dir = obj.x >= p.x ? 1 : -1;
  // entra corriendo desde detrás de Nato, desde el borde de la pantalla
  const x = dir > 0 ? S.cam.x - 30 : S.cam.x + W + 10;
  S.ents.push({ tipo: 'hercules', vivo: true, x, y: sueloBajo(p.x + p.w / 2, p.y + p.h - 4) - 20, w: 26, h: 20, vx: 0, vy: 0, dir, estado: 'corre', t: 0, obj });
  efecto('ladrido');   // el ladrido de mastín se oye solo, sin la voz encima
  rotulo(p.x, p.y - 14, '¡HÉRCULES, AL ATAQUE!', '#ffb347', 7);
}
function actualizarHercules(e) {
  const o = e.obj;
  if (e.estado === 'corre') {
    if (!o.vivo || ((o.tipo === 'minero' || o.tipo === 'dinamitero') && ['ko', 'sevan'].includes(o.estado)) || (o.tipo === 'condor' && o.estado === 'golpeado')) { e.estado = 'sevan'; e.t = 0; return; }
    e.dir = o.x + o.w / 2 > e.x + e.w / 2 ? 1 : -1;
    e.x += e.dir * 3.4;
    e.y = sueloBajo(e.x + e.w / 2, e.y + 4) - e.h; // corre pegado al suelo
    const dx = (o.x + o.w / 2) - (e.x + e.w / 2), dy = (o.y + o.h / 2) - (e.y + e.h / 2);
    if (Math.abs(dx) < 40 || e.t > 150) { // salto guiado hacia el enemigo
      const n = Math.max(12, Math.hypot(dx, dy) / 4.5);
      e.vx = dx / n; e.vy = dy / n - 1.2; e.estado = 'salta'; e.t = 0; efecto('ladrido1');   // un guau al lanzarse
    }
  } else if (e.estado === 'salta') {
    e.x += e.vx; e.y += e.vy;
    if (choca({ x: e.x - 2, y: e.y - 2, w: e.w + 4, h: e.h + 4 }, o) || e.t > 40) {
      // ¡mordisco de caricatura! quita mucha más vida que Nato
      if (o.tipo === 'minero' || o.tipo === 'dinamitero') {
        o.hp = 0; o.estado = 'ko'; o.t = 0; o.vy = -3.5; o.vx = e.dir * 3; o.destello = 8;
        P.noqueados++; P.puntos += 150; estrellitas(o.x + 6, o.y);
      } else if (o.tipo === 'condorJefe') {
        danarCondorJefe(o, 3, '¡GUAU!');
      } else if (o.tipo === 'jefe') {
        danarJefe(o, 4, '¡GUAU!'); if (o.estado !== 'ko') { o.estado = 'aturdido'; o.t = 60; }
      } else if (o.tipo === 'condor') {
        if (o.estado === 'agarra') { S.jug.estado = 'normal'; S.jug.vy = -2; S.jug.invul = 80; }
        o.estado = 'golpeado'; o.t = 0; o.vx = e.dir * 2.6; o.vy = -2; plumas(o.x + 10, o.y + 5); P.condores++; P.puntos += 250;
      }
      if (choca({ x: e.x - 2, y: e.y - 2, w: e.w + 4, h: e.h + 4 }, o)) {
        efecto('golpeFuerte'); S.sacudir = 8; S.parada = 7; rotulo(o.x, o.y - 8, '¡GUAU!', '#ffb347', 10);
      }
      e.estado = 'sevan'; e.t = 0; e.vy = -2;
    }
  } else if (e.estado === 'sevan') { // vuelve corriendo y se retira
    e.dir = -e.dir || -1; e.estado = 'retira';
  } else if (e.estado === 'retira') {
    e.vy = Math.min(e.vy + GRAV, MAX_CAIDA);
    e.x += e.dir * 3.6; e.y += e.vy;
    const suelo = sueloBajo(e.x + e.w / 2, e.y + 4) - e.h;
    if (e.y > suelo) { e.y = suelo; e.vy = 0; }
    if (e.x < S.cam.x - 60 || e.x > S.cam.x + W + 60) e.vivo = false;
  }
}

// ------------------------------------------------------------------ final del nivel: llega el tren
const horaActual = () => S.N.reloj.desde + Math.floor(S.minutos || 0);
const textoHora = m => `${Math.floor(m / 60)}:${String(m % 60).padStart(2, '0')}`;
// al terminar el nivel los enemigos se retiran: nadie sigue peleando durante la celebración
function retirarEnemigos() {
  const p = S.jug;
  for (const e of S.ents) {
    if (['minero', 'dinamitero', 'bolero'].includes(e.tipo) && !['ko', 'sevan'].includes(e.estado)) {
      e.estado = 'sevan'; e.t = 0; e.dir = e.x < p.x ? 1 : -1; e.vx = -e.dir * 0.7;
    }
    if (['bola', 'dinamita', 'vagoneta', 'rodado', 'piedra'].includes(e.tipo)) { e.vivo = false; polvo(e.x + 4, e.y + 4, 4, '#8b8895'); }
  }
}
function empezarFinal() {
  const N = S.N;
  retirarEnemigos();
  if (N.def.final === 'cine') {   // llega al cine: se apagan las luces y en la pantalla aparece el noticiario
    S.finale = { tipo: 'cine', t: 0, aTiempo: horaActual() < N.reloj.hasta, hora: horaActual() };
    pararMusica(); efecto('proyector');
    return;
  }
  S.finale = { t: 0, tren: { x: N.ancho * T - W - 340, v: 2.6, parado: false }, fase: 'tren' };
  pararMusica();
  efecto('silbato');
}
function actualizarFinalCine() {
  const F = S.finale, p = S.jug;
  F.t++;
  const destino = S.N.meta + 22;
  if (p.estado === 'normal' || p.estado === 'herido') {
    if (p.x < destino) { p.vx = 1.1; p.dir = 1; } else { p.vx = 0; p.dir = 1; }
    p.vy = Math.min(p.vy + GRAV, MAX_CAIDA); moverX(p); moverY(p);
  }
  if (F.t === 70) {
    tocarMusica('victoria'); voz('orgulloso'); p.estado = 'victoria'; F.listo = true; F.tListo = F.t;
    if (F.aTiempo) { P.puntos += 2000; rotulo(p.x, p.y - 14, '+2000 ¡A TIEMPO!', '#ffe066', 7); }
  }
  if (F.listo && F.t - F.tListo > 330) fundir(() => irA('resumen'));
}
function actualizarFinalJefe() {
  const F = S.finale, p = S.jug;
  F.t++;
  if (p.estado === 'normal' || p.estado === 'herido') { p.vx *= 0.8; p.vy = Math.min(p.vy + GRAV, MAX_CAIDA); moverX(p); moverY(p); p.dir = F.jefe.x > p.x ? 1 : -1; }
  if (F.t < 400) S.burbuja = { x: F.jefe.x + F.jefe.w / 2, y: F.jefe.y + 4, texto: '¡Ya, ya, me rindo! El nido del cóndor está en lo más alto de Sewell, arriba de todo. ¡Ahí tiene a tu papá!' };
  if (F.t === 400) { tocarMusica('victoria'); voz('orgulloso'); p.estado = 'victoria'; F.listo = true; F.tListo = F.t; }
  if (F.listo && F.t - F.tListo > 330) fundir(() => irA('resumen'));
}
function actualizarFinal() {
  if (S.finale.tipo === 'ultimoTren') {   // sin celebración: el tren se aleja y Sewell queda en silencio
    const F = S.finale; F.t++;
    if (S.tren) {
      const v = S.tren.v, p = S.jug;
      S.tren.x += v; for (const c of S.tren.carros) { c.x += v; c.dx = v; }
      if (!S.tren.carros.includes(p.sobre)) {   // si justo iba en el aire, cae sobre el carro más cercano
        const c = S.tren.carros.reduce((m, c) => Math.abs(c.x + c.w / 2 - p.x) < Math.abs(m.x + m.w / 2 - p.x) ? c : m);
        Object.assign(p, { x: limitar(p.x, c.x + 4, c.x + c.w - p.w - 4), y: c.y - p.h, vy: 0, sobre: c, enSuelo: true });
      }
      { p.x += v; p.vx = 0; p.estado = 'normal'; p.dir = -1; }   // Nato se va con el tren, mirando a Sewell
    }
    if (F.t === 160) fundir(() => irA('silencio'));
    return;
  }
  if (S.finale.tipo === 'cine') { actualizarFinalCine(); return; }
  if (S.finale.tipo === 'jefe') { actualizarFinalJefe(); return; }
  const F = S.finale, p = S.jug, tr = F.tren;
  F.t++;
  // Nato camina hasta el andén y se queda mirando el tren
  const destino = S.N.meta + 40;
  if (p.estado === 'normal' || p.estado === 'herido') {
    if (p.x < destino) { p.vx = 1.1; p.dir = 1; } else { p.vx = 0; p.dir = -1; }
    p.vy = Math.min(p.vy + GRAV, MAX_CAIDA); moverX(p); moverY(p);
  }
  if (!tr.parado) {
    const resta = S.N.tren.parada - tr.x;
    tr.v = Math.max(0.25, Math.min(2.6, resta / 60));
    tr.x += tr.v;
    if (F.t % Math.max(8, Math.round(26 / tr.v)) === 0) { efecto('chu'); }
    if (F.t % 6 === 0) particula(tr.x - 20, chimeneaY(), { col: '#e9eef2', tam: azarJ(3, 6), vida: 80, max: 80, vx: -0.5 - tr.v * 0.3, vy: -0.7, grav: -0.005 });
    if (resta < 1) {
      tr.parado = true; tr.x = S.N.tren.parada; F.tParado = F.t;
      efecto('silbato'); tocarMusica('victoria'); voz('orgulloso');
      p.estado = 'victoria';
    }
  } else if (F.t % 30 === 0) particula(tr.x - 20, chimeneaY(), { col: '#e9eef2', tam: 4, vida: 90, max: 90, vx: -0.2, vy: -0.5, grav: -0.004 });
  if (tr.parado && F.t - F.tParado > 300) fundir(() => irA('resumen'));
}
function chimeneaY() { // alto de la chimenea de la locomotora (dibujada con 112 de ancho)
  const i = SPRITES_INFO.locomotora || [400, 160];
  return S.N.tren.y + 2 - i[1] * 112 / i[0] + 4;
}
function dibujarTren() {
  const F = S.finale;
  if (!F || !F.tren) return;
  const tr = F.tren, y = S.N.tren.y;
  const saluda = tr.parado && Math.floor(F.t / 15) % 2 === 0;
  // vía detrás del andén, a la altura de su piso, para que el tren se vea entero
  ctx.fillStyle = '#4b3222'; for (let r = S.cam.x - 20; r < S.cam.x + W + 20; r += 6) ctx.fillRect(Math.floor(r / 6) * 6, y - 1, 3.5, 2);
  ctx.fillStyle = '#8b8895'; ctx.fillRect(S.cam.x - 20, y - 2.2, W + 40, 1);
  let x = tr.x;
  // locomotora adelante, mirando a la derecha; detrás el ténder y tres carros planos con gente sobre la carga
  const anchoLoco = 112, anchoTender = 50, anchoCarro = 88;
  objeto('locomotora', x - anchoLoco, y + 2, anchoLoco);
  x -= anchoLoco;
  objeto('tender', x - anchoTender, y + 2, anchoTender);
  x -= anchoTender;
  for (let i = 0; i < 3; i++) {
    objeto('carro_gente', x - anchoCarro, y + 2 + (saluda && i === 1 ? -0.5 : 0), anchoCarro);
    x -= anchoCarro;
  }
}

// ------------------------------------------------------------------ escena: jugar
const ESC_JUEGO = {
  entrar() {
    J.mostrarMusica = true;
    voz('dandole');
  },
  actualizar() {
    if (S.modal) {
      S.modal.t++;
      if (S.modal.t > 25 && aceptarMenu()) { S.modal = null; efecto('aceptar'); }
      return;
    }
    if (S.pausa) { actualizarPausa(); return; }
    if (S.regalo) {
      const r = S.regalo; r.t++;
      if (r.t === 300) ponerChaqueta(r.diego);
      if (r.t > 325) S.regalo = null;
      for (const q of S.part) { q.x += q.vx; q.y += q.vy; q.vy += q.grav; q.vida--; }
      S.part = S.part.filter(q => q.vida > 0);
      for (const q of S.textos) { q.y -= 0.35; q.vida--; }
      S.textos = S.textos.filter(q => q.vida > 0);
      if (r.t < 300) S.burbuja = { x: r.diego.x + 8, y: r.diego.y - 6, texto: '¡Nato, amigo! Toma mi chaqueta regalona, la de cuando era flaco. ¡A ver si te queda!' };
      return;
    }
    if (presionado('pausa') && !S.finale) { S.pausa = { sel: 0 }; efecto('menu'); pararMusica(); return; }
    if (presionado('mudo')) alternarMudo();
    if (S.parada > 0) { S.parada--; return; }   // pausa de impacto: el golpe se siente
    if (S.puerta) { actualizarPuerta(); return; }   // cruzando una puerta: fundido a negro y otra escena
    P.cuadros++;
    actualizarEntrada2();
    if (S.anuncio1981 > 0) S.anuncio1981--;
    if (S.rescate) actualizarRescate();
    if (S.finale) actualizarFinal(); else if (!S.rescate) actualizarJugador();
    actualizarEntidades();
    actualizarAlud();
    revisarPuerta();
    if (!S.finale && S.jug.estado !== 'fuera' && S.jug.x >= S.N.meta) empezarFinal();
    // zonas y música
    const tx = S.jug.x / T;
    let z = 0;
    for (let i = 0; i < S.zonas.length; i++) if (tx >= S.zonas[i][0]) z = i;
    if (z !== S.zona) {
      S.fondoAnterior = S.zona >= 0 ? S.zonas[S.zona][2] : null; S.fondoMezcla = 0;
      S.zona = z; S.zonaCartel = { txt: S.zonas[z][1], t: 0 };
    }
    if (S.fondoMezcla < 1) S.fondoMezcla = Math.min(1, S.fondoMezcla + 0.035);   // fundido corto entre fondos de zona
    const dentro = S.sala >= 0 ? S.N.cuevas[S.sala] : null;
    const cueva = !!dentro;
    if (!S.finale) tocarMusica(S.jug.chaqueta > 0 ? 'chaqueta' : (S.alud && !S.alud.parado) || S.peleaJefe ? 'tension' : dentro ? (dentro.estilo ? dentro.musica || S.N.def.musica : 'cueva') : S.N.def.musica);
    if (S.N.reloj && !S.finale) S.minutos = (S.minutos || 0) + 1 / (60 * DIF().reloj);
    S.enCueva = cueva;
    S.oscuro = dentro && !dentro.luz ? 1 : 0;   // adentro de la mina está oscuro desde el primer cuadro: es otra escena
    if (S.zonaCartel) S.zonaCartel.t++;
    // cámara
    const p = S.jug;
    let objX = p.x + p.w / 2 - W / 2 + p.dir * 24, objY = p.y - H * (S.N.def.vertical ? 0.64 : 0.58);   // subiendo, se ve más hacia arriba
    if (S.finale && S.finale.tipo !== 'jefe') { const pa = S.N.pantalla; objX = pa ? pa.x + pa.w + 14 - W : S.N.ancho * T - W; }
    if (S.tren && S.tren.estado === 'viaja') objY = S.N.tren.y - H * 0.8;   // el tren entero a la vista
    if (S.alud && !S.alud.parado) objX = S.alud.x - 34;   // la cámara avanza al paso del alud: siempre se ve la ola de nieve
    if (S.barrera) objX = Math.max(objX, S.barrera - 8);
    const jefeReta = S.peleaJefe && S.ents.find(e => e.tipo === 'jefe' && e.estado === 'reta');
    if (jefeReta) objX = (p.x + jefeReta.x + jefeReta.w) / 2 - W / 2;   // al retar se ven los dos
    const salaCam = S.sala >= 0 && S.N.cuevas[S.sala];
    if (salaCam) [objX, objY] = encuadreSala(salaCam, objX, objY);   // adentro, la cámara no se asoma afuera
    S.cam.x += (limitar(objX, 0, S.N.ancho * T - W) - S.cam.x) * 0.1;
    S.cam.y += (limitar(objY, 0, S.N.alto * T - H) - S.cam.y) * 0.1;
    if (S.sacudir > 0) S.sacudir--;
    // partículas y textos
    for (const q of S.part) { q.x += q.vx; q.y += q.vy; q.vy += q.grav; q.vida--; }
    S.part = S.part.filter(q => q.vida > 0);
    for (const q of S.textos) { q.y -= 0.35; q.vida--; }
    S.textos = S.textos.filter(q => q.vida > 0);
    // burbuja del letrero más cercano (el jefe habla en su propio turno)
    if (!S.peleaJefe || !['reta', 'llama'].includes((S.ents.find(e => e.tipo === 'jefe') || {}).estado)) if (!(S.finale && S.finale.tipo === 'jefe' && S.finale.t < 400) && !S.rescate) S.burbuja = null;
    for (const e of S.ents) {
      if (e.tipo === 'letrero' && Math.abs(p.x + p.w / 2 - (e.x + 8)) < 22 && Math.abs(p.y - e.y) < 40) S.burbuja = { x: e.x + 8, y: e.y - 14, texto: textoAdaptado(e) };
      if (e.tipo === 'diego' && e.dio && e.dice > 0 && Math.abs(p.x - e.x) < 110) S.burbuja = { x: e.x + 8, y: e.y - 6, texto: '¡Te queda pintada! Dura poquito: ¡aprovecha, compadre!' };
      if (e.tipo === 'mujer' && Math.abs(p.x - e.x) < 28 && Math.abs(p.y - e.y) < 30) S.burbuja = { x: e.x + 6, y: e.y - 8, texto: e.texto };
      if (e.tipo === 'anciana' && e.dice > 0 && Math.abs(p.x - e.x) < 110) S.burbuja = { x: e.x + 7, y: e.y - 8, texto: e.texto || '¡Coma algo, mijito! Aquí comen todos los mineros.' };
    }
  },
  dibujar() { dibujarNivel(); },
};
function actualizarEntrada2() { /* gancho para pruebas */ }

function actualizarPausa() {
  const op = opcionesPausa();
  if (presionado('arriba')) { S.pausa.sel = (S.pausa.sel + op.length - 1) % op.length; efecto('menu'); }
  if (presionado('abajo')) { S.pausa.sel = (S.pausa.sel + 1) % op.length; efecto('menu'); }
  if (presionado('pausa')) { S.pausa = null; return; }
  if (presionado('aceptar') || presionado('saltar') || presionado('golpe')) {
    efecto('aceptar');
    const k = op[S.pausa.sel][0];
    if (k === 'seguir') S.pausa = null;
    else if (k === 'musica') alternarMudo();
    else if (k === 'reiniciar') { const n = P.nivel; fundir(() => { nuevaPartida(n); empezarNivel(); irA('juego'); }); S.pausa = null; }
    else if (k === 'salir') { fundir(() => irA('titulo')); S.pausa = null; }
  }
}
function opcionesPausa() {
  return [['seguir', 'Continuar'], ['musica', 'Sonido: ' + (AUDIO.mudo ? 'NO' : 'SÍ')], ['reiniciar', 'Reiniciar el nivel'], ['salir', 'Salir al título']];
}

// ------------------------------------------------------------------ dibujo del nivel
let _patronRoca = null, _patronCueva = null;
function patron(img) {
  if (!img || !img.width) return '#555';
  const p = ctx.createPattern(img, 'repeat');
  if (p.setTransform) p.setTransform(new DOMMatrix().scale(112 / img.width));
  return p;
}
function dibujarFondo() {
  const nombre = S.zonas[Math.max(0, S.zona)][2];
  const dib = (n, alfa) => {
    const im = imgFondo(n);
    if (!im) return;
    // ligera paralaje: el fondo avanza más lento que la cámara
    const ancho = W * 1.3, alto = ancho * 9 / 16;
    const zx = S.zonas.find(z => z[2] === n)[0] * T;
    const des = limitar((S.cam.x - zx) * 0.08, 0, ancho - W);
    // en un nivel que se sube, al subir se ve más cielo
    const dy = S.N.def.vertical ? (S.cam.y / Math.max(1, S.N.alto * T - H)) * (alto - H) * 0.6   // sin llegar al primer plano de la ilustración
      : limitar((S.cam.y - 14 * T) * 0.05, -10, alto - H);
    ctx.globalAlpha = alfa;
    ctx.drawImage(im, -des, -dy - 6, ancho, alto);
    ctx.globalAlpha = 1;
  };
  if (S.fondoAnterior && S.fondoMezcla < 1) dib(S.fondoAnterior, 1);
  dib(nombre, S.fondoAnterior ? S.fondoMezcla : 1);
  // velo suave para que el primer plano destaque
  ctx.fillStyle = 'rgba(20,24,40,0.12)'; ctx.fillRect(0, 0, W, H);
}
function dibujarCasillas() {
  const N = S.N;
  if (!_patronRoca) { _patronRoca = patron(IMG.f_tex_roca); _patronCueva = patron(IMG.f_tex_cueva); }
  const x0 = Math.floor(S.cam.x / T), x1 = Math.ceil((S.cam.x + W) / T), y0 = Math.floor(S.cam.y / T), y1 = Math.ceil((S.cam.y + H) / T);
  // rellenos con textura pintada: toda la roca visible es una sola figura (casilla por casilla quedaban costuras que cuadriculaban el suelo)
  const roca = new Path2D(), cueva = new Path2D();
  for (let ty = y0; ty <= y1; ty++) {
    for (let tx = x0; tx <= x1; tx++) {
      const c = casilla(tx, ty);
      if (c !== C_ROCA && c !== C_CUEVA && c !== C_PIEDRA && c !== C_VIGA) continue;
      let fin = tx;   // tramos seguidos del mismo tipo en la fila: un solo rectángulo
      const tipo = c === C_CUEVA ? 1 : 0;
      while (fin + 1 <= x1) { const d = casilla(fin + 1, ty); if (!(d === C_ROCA || d === C_CUEVA || d === C_PIEDRA || d === C_VIGA) || (d === C_CUEVA ? 1 : 0) !== tipo) break; fin++; }
      (tipo ? cueva : roca).rect(tx * T, ty * T, (fin - tx + 1) * T, T);
      tx = fin;
    }
  }
  ctx.fillStyle = _patronRoca; ctx.fill(roca);
  ctx.fillStyle = _patronCueva; ctx.fill(cueva);
  ctx.fillStyle = 'rgba(25,15,25,0.35)'; ctx.fill(cueva);
  // bordes con línea negra, nieve arriba al aire libre y piso de tierra en la caverna
  ctx.lineWidth = 0.7; ctx.strokeStyle = '#1a1420';
  for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) {
    const c = casilla(tx, ty);
    const X = tx * T, Y = ty * T;
    if (c === C_ROCA || c === C_CUEVA || c === C_PIEDRA || c === C_VIGA) {
      const arriba = !SOLIDA[casilla(tx, ty - 1)], izq = !SOLIDA[casilla(tx - 1, ty)], der = !SOLIDA[casilla(tx + 1, ty)], abajo = !SOLIDA[casilla(tx, ty + 1)];
      if (arriba) {
        if (c === C_CUEVA) {
          ctx.fillStyle = '#7b6455'; ctx.fillRect(X, Y, T, 3); ctx.fillStyle = '#a08672'; ctx.fillRect(X, Y, T, 1);
        } else {
          // la nieve sigue una ola continua en el mundo: de casilla a casilla no quedan muescas
          const ola = x => Y + 3.4 + Math.sin(x * 0.43) * 0.9 + Math.sin(x * 0.17) * 0.5;
          ctx.fillStyle = '#c9d7ea';
          ctx.beginPath(); ctx.moveTo(X - 0.5, Y - 0.6);
          for (let x = X - 0.5; x <= X + T + 0.5; x += 2) ctx.lineTo(x, ola(x) + 0.8);
          ctx.lineTo(X + T + 0.5, ola(X + T + 0.5) + 0.8); ctx.lineTo(X + T + 0.5, Y - 0.6); ctx.fill();
          ctx.fillStyle = '#f4f8fd';
          ctx.beginPath(); ctx.moveTo(X - 0.5, Y - 0.6);
          for (let x = X - 0.5; x <= X + T + 0.5; x += 2) ctx.lineTo(x, ola(x));
          ctx.lineTo(X + T + 0.5, ola(X + T + 0.5)); ctx.lineTo(X + T + 0.5, Y - 0.6); ctx.fill();
        }
        ctx.beginPath(); ctx.moveTo(X, Y - 0.3); ctx.lineTo(X + T, Y - 0.3); ctx.stroke();
      }
      ctx.beginPath();
      if (izq) { ctx.moveTo(X, Y); ctx.lineTo(X, Y + T); }
      if (der) { ctx.moveTo(X + T, Y); ctx.lineTo(X + T, Y + T); }
      if (abajo) { ctx.moveTo(X, Y + T); ctx.lineTo(X + T, Y + T); }
      ctx.stroke();
    } else if (c === C_ANDEN) {
      ctx.fillStyle = '#8b6038'; ctx.fillRect(X, Y, T + 0.3, T);
      ctx.fillStyle = '#a87a4a'; ctx.fillRect(X, Y, T + 0.3, 2.5);
      ctx.fillStyle = '#5a391f'; for (let k = 5; k < T; k += 5) ctx.fillRect(X, Y + k, T + 0.3, 0.7);
      ctx.strokeRect(X, Y, T, T);
    } else if (c === C_CONCRETO && esRampa(casilla(tx, ty - 1))) {   // bajo un tramo de escalera: el cuerpo de concreto
      ctx.fillStyle = '#a9a59d'; ctx.fillRect(X - 0.3, Y - 0.3, T + 0.9, T + 0.6);
      ctx.fillStyle = '#8a867e'; ctx.fillRect(X - 0.3, Y + T - 2, T + 0.9, 2);
      ctx.beginPath(); ctx.moveTo(X, Y + T); ctx.lineTo(X + T, Y + T); ctx.stroke();
      if (!esRampa(casilla(tx - 1, ty - 1)) && !SOLIDA[casilla(tx - 1, ty)]) { ctx.beginPath(); ctx.moveTo(X, Y); ctx.lineTo(X, Y + T); ctx.stroke(); }
    } else if (c === C_CONCRETO) {
      ctx.fillStyle = '#a9a59d'; ctx.fillRect(X, Y, T + 0.3, T + 0.3);
      ctx.fillStyle = '#c4c0b8'; ctx.fillRect(X, Y, T + 0.3, 2);
      ctx.fillStyle = '#8a867e'; ctx.fillRect(X, Y + T - 1.5, T + 0.3, 1.5);
      if (!SOLIDA[casilla(tx, ty - 1)] && !esRampa(casilla(tx, ty - 1))) { // baranda blanca de tubo
        ctx.fillStyle = '#f4f4f0'; ctx.fillRect(X + 1, Y - 9, 1.2, 9); ctx.fillRect(X, Y - 9, T + 0.3, 1.1); ctx.fillRect(X, Y - 5, T + 0.3, 0.9);
      }
      ctx.strokeRect(X, Y, T, T);
    } else if (c === C_BALCON) {
      ctx.fillStyle = '#8b6038'; ctx.fillRect(X, Y, T + 0.3, 3); ctx.fillStyle = '#5a391f'; ctx.fillRect(X, Y + 3, T + 0.3, 1.5);
      ctx.fillStyle = '#f4f4f0'; ctx.fillRect(X, Y - 8, T + 0.3, 1.2);
      for (let k = 1; k < T; k += 3) ctx.fillRect(X + k, Y - 8, 0.9, 8);
      ctx.beginPath(); ctx.moveTo(X, Y); ctx.lineTo(X + T, Y); ctx.stroke();
    } else if (c === C_TABLON) {
      // postes de apoyo en los extremos de cada tablón, hasta lo que haya debajo
      const extremo = casilla(tx - 1, ty) !== C_TABLON || casilla(tx + 1, ty) !== C_TABLON;
      if (extremo && casilla(tx, ty + 1) === C_VACIO) {
        let fondo = ty + 1;
        while (fondo < ty + 3 && casilla(tx, fondo) === C_VACIO) fondo++;
        if (fondo < ty + 3) {   // solo postes cortos (más largos parecerían otra cosa)
          const px = casilla(tx - 1, ty) !== C_TABLON ? X + 2 : X + T - 4;
          ctx.fillStyle = '#6d4626'; ctx.fillRect(px, Y + 4, 2.2, (fondo - ty) * T - 4);
          ctx.fillStyle = '#4b3222'; ctx.fillRect(px + 1.4, Y + 4, 0.8, (fondo - ty) * T - 4);
          // andamio: crucetas entre el poste izquierdo y el derecho (se lee como obra en construcción)
          if (casilla(tx - 1, ty) !== C_TABLON && casilla(tx + 1, ty) === C_TABLON) {
            let fin = tx + 1; while (casilla(fin + 1, ty) === C_TABLON) fin++;
            const x2 = fin * T + T - 4, alto = (fondo - ty) * T - 4;
            ctx.strokeStyle = '#5a391f'; ctx.lineWidth = 1.1;
            ctx.beginPath(); ctx.moveTo(px + 1, Y + 4); ctx.lineTo(x2 + 1, Y + 4 + alto); ctx.moveTo(x2 + 1, Y + 4); ctx.lineTo(px + 1, Y + 4 + alto); ctx.stroke();
            ctx.strokeStyle = '#1a1420'; ctx.lineWidth = 0.7;
          }
        }
      }
      ctx.fillStyle = '#9c6a3c'; ctx.fillRect(X, Y, T + 0.3, 4.5); ctx.fillStyle = '#c99a62'; ctx.fillRect(X, Y, T + 0.3, 1.2);
      ctx.fillStyle = '#5a391f'; ctx.fillRect(X + 2, Y + 4.5, 2, 3); ctx.fillRect(X + 12, Y + 4.5, 2, 3);
      ctx.beginPath(); ctx.moveTo(X, Y); ctx.lineTo(X + T, Y); ctx.moveTo(X, Y + 4.5); ctx.lineTo(X + T, Y + 4.5); ctx.stroke();
    } else if (c === C_LITERA) {
      ctx.fillStyle = '#7a5333'; ctx.fillRect(X, Y + 3, T + 0.3, 3); ctx.fillStyle = '#d9d1bf'; ctx.fillRect(X, Y, T + 0.3, 3);
      ctx.fillStyle = '#6d4626'; if (casilla(tx - 1, ty) !== C_LITERA) ctx.fillRect(X, Y - 4, 1.6, T + 4); if (casilla(tx + 1, ty) !== C_LITERA) ctx.fillRect(X + T - 1.6, Y - 4, 1.6, T + 4);
      ctx.beginPath(); ctx.moveTo(X, Y + 6); ctx.lineTo(X + T, Y + 6); ctx.stroke();
    } else if (c === C_RAMPA_D || c === C_RAMPA_I) {
      // tramo de escalera de concreto: cuatro peldaños por casilla y la baranda blanca siguiendo la pendiente
      const d = c === C_RAMPA_D;
      ctx.save();
      if (!d) { ctx.translate(X * 2 + T, 0); ctx.scale(-1, 1); }
      ctx.fillStyle = '#a9a59d';
      ctx.beginPath(); ctx.moveTo(X, Y + T);
      for (let k = 0; k < 4; k++) { ctx.lineTo(X + k * 4, Y + T - (k + 1) * 4); ctx.lineTo(X + (k + 1) * 4, Y + T - (k + 1) * 4); }
      ctx.lineTo(X + T, Y + T); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#c9c5bd'; for (let k = 0; k < 4; k++) ctx.fillRect(X + k * 4, Y + T - (k + 1) * 4, 4, 0.9);
      ctx.strokeStyle = '#f4f4f0'; ctx.lineWidth = 1.1;
      ctx.beginPath(); ctx.moveTo(X, Y + T - 10); ctx.lineTo(X + T, Y - 10); ctx.moveTo(X, Y + T - 5.5); ctx.lineTo(X + T, Y - 5.5); ctx.stroke();
      ctx.fillStyle = '#f4f4f0'; ctx.fillRect(X + 7, Y + T - 18, 1.1, 10);
      ctx.restore();
      ctx.lineWidth = 0.7; ctx.strokeStyle = '#1a1420';
    } else if (c === C_MADERA) {   // piso y muros de madera encerada
      ctx.fillStyle = '#a8713f'; ctx.fillRect(X, Y, T + 0.3, T + 0.3);
      ctx.fillStyle = '#c99a62'; ctx.fillRect(X, Y, T + 0.3, 1.5);
      ctx.fillStyle = '#7a4f2a'; for (let k = 4; k < T; k += 4) ctx.fillRect(X, Y + k, T + 0.3, 0.6);
      ctx.fillRect(X + ((tx * 7) % 13), Y + 1.5, 0.6, T - 1.5);
      ctx.strokeRect(X, Y, T, T);
    } else if (c === C_ZINC) {     // techo de zinc acanalado, rojo óxido, con nieve encima
      ctx.fillStyle = '#9c3b2a'; ctx.fillRect(X, Y + 2, T + 0.3, 7);
      ctx.fillStyle = '#c0573f'; for (let k = 0; k < T; k += 2.5) ctx.fillRect(X + k, Y + 2, 1, 7);
      ctx.fillStyle = '#5a2418'; ctx.fillRect(X, Y + 9, T + 0.3, 1.2);
      if (casilla(tx, ty - 1) === C_VACIO) { ctx.fillStyle = '#f4f8fd'; ctx.fillRect(X, Y, T + 0.3, 2.4); }
      ctx.beginPath(); ctx.moveTo(X, Y); ctx.lineTo(X + T, Y); ctx.moveTo(X, Y + 10.2); ctx.lineTo(X + T, Y + 10.2); ctx.stroke();
    } else if (c === C_AZOTEA) {   // azotea plana de zinc con cornisa blanca: se ve dónde se pisa
      const ini = casilla(tx - 1, ty) !== C_AZOTEA, fin = casilla(tx + 1, ty) !== C_AZOTEA;
      const x0 = X - (ini ? 3 : 0), x1 = X + T + (fin ? 3 : 0.3);
      ctx.fillStyle = '#8c3a2c'; ctx.fillRect(x0, Y, x1 - x0, 4);
      ctx.fillStyle = '#b4523d'; for (let k = 1; k < T; k += 2.5) ctx.fillRect(X + k, Y + 0.6, 0.8, 3.2);
      ctx.fillStyle = '#f2efe6'; ctx.fillRect(x0, Y + 4, x1 - x0, 1.6);
      ctx.fillStyle = '#5a2418'; ctx.fillRect(x0, Y + 5.6, x1 - x0, 0.8);
      if (casilla(tx, ty - 1) === C_VACIO) { ctx.fillStyle = '#f4f8fd'; ctx.fillRect(x0, Y - 0.8, x1 - x0, 1.6); }
      ctx.beginPath(); ctx.moveTo(x0, Y - 0.8); ctx.lineTo(x1, Y - 0.8); ctx.moveTo(x0, Y + 6.4); ctx.lineTo(x1, Y + 6.4); ctx.stroke();
      if (ini) { ctx.beginPath(); ctx.moveTo(x0, Y - 0.8); ctx.lineTo(x0, Y + 6.4); ctx.stroke(); }
      if (fin) { ctx.beginPath(); ctx.moveTo(x1, Y - 0.8); ctx.lineTo(x1, Y + 6.4); ctx.stroke(); }
    } else if (c === C_HIELO) {   // hielo: azul pálido con brillo, sobre la roca
      ctx.fillStyle = _patronRoca; ctx.fillRect(X, Y, T + 0.3, T + 0.3);
      ctx.fillStyle = 'rgba(190,225,250,0.85)'; ctx.fillRect(X, Y, T + 0.3, 5);
      ctx.fillStyle = 'rgba(255,255,255,0.9)'; ctx.fillRect(X + 2 + (tx * 5) % 7, Y + 1, 4, 0.9);
      ctx.fillStyle = 'rgba(120,175,215,0.9)'; ctx.fillRect(X, Y + 5, T + 0.3, 0.8);
      ctx.beginPath(); ctx.moveTo(X, Y); ctx.lineTo(X + T, Y); ctx.stroke();
    } else if (c === C_BUTACA) {   // fila de butacas de terciopelo rojo
      for (let k = 0; k < 2; k++) {
        const bx = X + k * 8 + 0.6;
        ctx.fillStyle = '#7a1820'; ctx.beginPath(); ctx.moveTo(bx, Y + 12); ctx.lineTo(bx, Y + 2); ctx.quadraticCurveTo(bx + 3.4, Y - 1, bx + 6.8, Y + 2); ctx.lineTo(bx + 6.8, Y + 12); ctx.fill(); ctx.stroke();
        ctx.fillStyle = '#a3262f'; ctx.fillRect(bx + 1, Y + 3, 4.8, 6);
        ctx.fillStyle = '#d9a640'; ctx.fillRect(bx - 0.3, Y + 12, 7.4, 1); ctx.fillRect(bx + 1, Y + 13, 1, 3); ctx.fillRect(bx + 5, Y + 13, 1, 3);
      }
    } else if (c === C_ESCALERA) {
      ctx.fillStyle = '#8b5e36'; ctx.fillRect(X + 2, Y, 2, T); ctx.fillRect(X + 12, Y, 2, T);
      ctx.fillStyle = '#b07c4c'; for (let k = 2; k < T; k += 5) ctx.fillRect(X + 3, Y + k, 10, 1.6);
    }
  }
}
const ANCHO = { cajas: 34, carpa: 40, casaHamilton: 104, casa0: 70, casa1: 54, casa2: 88, casa3: 70, panaderia: 70, torre: 22, estacion: 120,
  edificio_amarillo: 84, edificio_rojo: 80, edificio_verde: 62, edificio_azul: 66, edificio_naranjo: 40, edificio_crema: 70, camarote: 128, farol_globo: 9 };
const SPR = { cajas: 'cajas', carpa: 'carpa', casaHamilton: 'casa_hamilton', casa0: 'casa_piedra', casa1: 'casa_piedra', casa2: 'casa_piedra', casa3: 'casa_piedra',
  panaderia: 'panaderia', torre: 'torre', estacion: 'estacion', edificio_amarillo: 'edificio_amarillo', edificio_rojo: 'edificio_rojo', edificio_verde: 'edificio_verde', edificio_azul: 'edificio_azul', edificio_naranjo: 'edificio_naranjo', edificio_crema: 'edificio_crema', camarote: 'camarote', farol_globo: 'farol_globo' };
// Casas de piedra del Nivel 1: cada una mide justo hasta su fila de techo y su ancho sale de la proporción de la imagen
const CASA_TECHO = { casaHamilton: [20, 6], casa0: [21, 4], casa1: [21, 3], casa2: [20, 5], casa3: [21, 4], panaderia: [21, 4] };
function geometriaCasa(d) {
  const spr = SPR[d.img], i = SPRITES_INFO[spr];
  if (!i) return null;
  const ct = CASA_TECHO[d.img];
  let w = d.ancho || ANCHO[d.img], x = d.x;
  if (ct) { w = (d.yAbajo + 1 - (ct[0] * T - 3)) * i[0] / i[1]; x = d.x - (w - ct[1] * T) / 2; }
  const h = i[1] * w / i[0];
  return { spr, x, w, h, arriba: d.yAbajo + 1 - h, voltear: d.img === 'casa1' || d.img === 'casa3' };
}
// Cumbrera de cada techo, medida en la imagen (fracciones de ancho y alto): en vista de tres cuartos sube un poco hacia la derecha.
// Nato camina justo sobre esa línea, así nunca pisa el aire más allá del techo.
const CUMBRERA = { casa_piedra: [0.23, 0.115, 0.85, 0.005], panaderia: [0.27, 0.15, 0.85, 0.15], casa_hamilton: [0.27, 0.145, 0.85, 0.01] };
function techosPisables(N) {
  N.lineas = [];
  for (const d of N.fondo) {
    if (!d.pisable) continue;
    const g = geometriaCasa(d), c = g && CUMBRERA[g.spr];
    if (!c) continue;
    let [a, ya, b, yb] = c;
    if (g.voltear) [a, ya, b, yb] = [1 - b, yb, 1 - a, ya];
    N.lineas.push({ x0: g.x + a * g.w, y0: g.arriba + ya * g.h + 1, x1: g.x + b * g.w, y1: g.arriba + yb * g.h + 1 });
  }
}
function dibujarDecorados() {
  const N = S.N;
  for (const d of N.fondo) {
    if (d.x > S.cam.x + W + 140 || d.x + 160 < S.cam.x) continue;
    if (d.img === 'torre' && !N.cable) continue;
    if (d.techo != null && d.azotea && SPRITES_INFO[d.img] && IMG[d.img]) {   // edificio sin su punta, bajo la azotea pisable
      const i = SPRITES_INFO[d.img], corte = (ALERO[d.img] || 0) * i[1];
      const h = d.yAbajo + 1 - (d.techo * T + 3), w = h * i[0] / (i[1] - corte), x = d.x + (d.cols * T - w) / 2;
      ctx.save();
      if (d.voltear) { ctx.translate(x * 2 + w, 0); ctx.scale(-1, 1); }
      ctx.drawImage(IMG[d.img], 0, corte, i[0], i[1] - corte, x, d.techo * T + 3, w, h);
      ctx.restore();
      continue;
    }
    if (d.techo != null && SPRITES_INFO[d.img]) {   // edificio de adorno que llega justo hasta la fila «techo»
      const i = SPRITES_INFO[d.img], h = d.yAbajo + 1 - (d.techo * T - 3), w = h * i[0] / i[1];
      objeto(d.img, d.x + (d.cols * T - w) / 2, d.yAbajo + 1, w, { voltear: d.voltear });
      continue;
    }
    if (d.mueble) { if (SPRITES_INFO[d.img]) objeto(d.img, d.x, d.yAbajo + 1, d.ancho, { voltear: d.voltear }); continue; }   // muebles de época de los interiores
    if (d.img === 'palos') { dibujarPalos(d.x, d.yAbajo); continue; }
    if (d.img === 'proyector') { dibujarProyector(d.x, d.yAbajo); continue; }
    if (d.img === 'fachadaCine') { dibujarFachadaCine(d.x, d.yAbajo); continue; }
    if (d.img === 'escenario') { dibujarEscenario(d.x, d.yAbajo); continue; }
    const ancho = ANCHO[d.img];
    if (ancho && SPR[d.img]) {
      if (d.img === 'torre') { // del suelo hasta un poco más arriba del cable, centrada en el extremo del cable
        const i = SPRITES_INFO.torre, h = d.yAbajo + 1 - (cableY(N.cable, d.x) - 6), w = i[0] * h / i[1];
        ctx.drawImage(IMG.torre, d.x - w / 2, d.yAbajo + 1 - h, w, h);
        continue;
      }
      if (d.img === 'farol_globo' || d.img.startsWith('edificio') || d.img === 'cajas') { objeto(SPR[d.img], d.x, d.yAbajo + 1, d.ancho || ancho); continue; }
      const g = geometriaCasa(d), x = g.x;
      objeto(g.spr, g.x, d.yAbajo + 1, g.w, { voltear: g.voltear });
      if (d.img === 'panaderia') {   // letrero en la fachada, justo bajo el alero (no tapa el techo)
        const ly = g.arriba + g.h * 0.37, lx = g.x + g.w / 2;
        caja(ctx, lx - 24, ly, 48, 9, '#f4e7c8', '#4b3222');
        dibujarTexto(ctx, 'PANADERÍA', lx, ly + 1, { tam: 6.2, color: '#4b3222', alinear: 'centro' });
      }
      if (d.img === 'estacion') { // el nombre va escrito en el tablero blanco del frente del edificio
        const i = SPRITES_INFO.estacion, h = i[1] * ancho / i[0], arriba = d.yAbajo + 1 - h;
        const bx = x + ancho * 0.295, bw = ancho * 0.41, by = arriba + h * 0.334, bh = h * 0.088;
        ctx.fillStyle = '#f7f4ec'; ctx.fillRect(bx, by, bw, bh);
        dibujarTexto(ctx, d.letrero || 'EL MOLINO', bx + bw / 2, by + bh / 2 - 3.6, { tam: 7.2, color: '#15131b', alinear: 'centro' });
      }
    } else if (d.img === 'mesa') {
      ctx.fillStyle = '#9c6a3c'; ctx.fillRect(d.x, d.yAbajo - 12, 40, 3); ctx.fillStyle = '#6d4626';
      ctx.fillRect(d.x + 3, d.yAbajo - 9, 2, 9); ctx.fillRect(d.x + 35, d.yAbajo - 9, 2, 9);
      ctx.fillStyle = '#e8e0cf'; ctx.fillRect(d.x + 8, d.yAbajo - 14, 6, 2); ctx.fillRect(d.x + 24, d.yAbajo - 14, 6, 2);
    } else if (d.img === 'ropa') {
      ctx.strokeStyle = '#d9d4c7'; ctx.lineWidth = 0.5;
      ctx.beginPath(); ctx.moveTo(d.x, d.yAbajo - 6); ctx.quadraticCurveTo(d.x + 32, d.yAbajo + 2, d.x + 64, d.yAbajo - 6); ctx.stroke();
      const cols = ['#d8432f', '#f4f1ea', '#3d6db9', '#f6cf3a', '#5f8f3e'];
      for (let i = 0; i < 5; i++) {
        const xx = d.x + 6 + i * 11, yy = d.yAbajo - 4 + Math.sin(i / 4 * Math.PI) * 3;
        const sw = Math.sin(J.cuadros / 15 + i) * 1;
        ctx.fillStyle = cols[i]; ctx.beginPath(); ctx.moveTo(xx, yy); ctx.lineTo(xx + 8, yy); ctx.lineTo(xx + 8 + sw, yy + 10); ctx.lineTo(xx + sw, yy + 10); ctx.fill();
      }
    }
  }
  // cable del tranvía aéreo
  const cab = N.cable;
  if (cab) {
    ctx.strokeStyle = '#1a1420'; ctx.lineWidth = 0.8;
    ctx.beginPath(); for (let x = cab.x0; x <= cab.x1; x += 8) ctx.lineTo(x, cableY(cab, x)); ctx.lineTo(cab.x1, cableY(cab, cab.x1)); ctx.stroke();
  }
  // la pantalla del cine, con su telón rojo
  const pa = N.pantalla;
  if (pa) {
    ctx.fillStyle = '#5a0f16'; ctx.fillRect(pa.x - 10, pa.y - 8, pa.w + 20, pa.h + 18);
    const brillo = S.finale ? 1 : 0.86 + Math.sin(J.cuadros / 7) * 0.03;
    ctx.fillStyle = `rgba(${Math.round(236 * brillo)},${Math.round(232 * brillo)},${Math.round(214 * brillo)},1)`; ctx.fillRect(pa.x, pa.y, pa.w, pa.h);
    if (S.finale && S.finale.tipo === 'cine') dibujarNoticiario(pa, S.finale.t);
    ctx.fillStyle = '#8e1d24';
    for (const lado of [0, 1]) {   // cortinas recogidas a los lados
      const cx = lado ? pa.x + pa.w + 10 : pa.x - 10, s2 = lado ? -1 : 1;
      ctx.beginPath(); ctx.moveTo(cx, pa.y - 8); ctx.lineTo(cx + s2 * 16, pa.y - 8); ctx.quadraticCurveTo(cx + s2 * 6, pa.y + pa.h * 0.5, cx + s2 * 3, pa.y + pa.h + 10); ctx.lineTo(cx, pa.y + pa.h + 10); ctx.fill(); ctx.stroke();
    }
    ctx.fillStyle = '#8e1d24'; ctx.fillRect(pa.x - 10, pa.y - 12, pa.w + 20, 6); ctx.fillStyle = '#d9a640'; ctx.fillRect(pa.x - 10, pa.y - 6.5, pa.w + 20, 1);
  }
}
// Palitroque: los palos blancos al fondo de la pista (se tambalean con cada chuza)
function dibujarPalos(x, suelo) {
  const sac = S.palosT > 0 ? Math.sin(S.palosT) * 0.25 * S.palosT / 40 : 0;
  if (S.palosT > 0) S.palosT--;
  ctx.fillStyle = '#5a391f'; ctx.fillRect(x - 4, suelo - 2, 26, 2);
  for (const [dx, fila] of [[0, 0], [7, 0], [14, 0], [3.5, 1], [10.5, 1], [7, 2]]) {
    const px = x + dx + fila * 1.5, py = suelo - 1 - fila * 0.6;
    ctx.save(); ctx.translate(px, py); ctx.rotate(sac * (dx % 2 ? 1 : -1));
    ctx.fillStyle = '#f4f1ea'; ctx.beginPath(); ctx.ellipse(0, -4, 2, 4, 0, 0, 7); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.arc(0, -9.5, 1.3, 0, 7); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#c0392b'; ctx.fillRect(-1.6, -7.6, 3.2, 0.8);
    ctx.restore();
  }
}
// La ceremonia de 1967: un escenario de madera con banderas chilenas
function bandera(x, y, w, ondea) {
  const h = w * 2 / 3;
  ctx.save(); ctx.translate(x, y);
  ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, w, h / 2); ctx.fillStyle = '#d52b1e'; ctx.fillRect(0, h / 2, w, h / 2);
  ctx.fillStyle = '#0039a6'; ctx.fillRect(0, 0, w / 3, h / 2);
  ctx.fillStyle = '#ffffff'; ctx.beginPath();
  for (let i = 0; i < 10; i++) { const r = i % 2 ? 0.6 : 1.5, a = -Math.PI / 2 + i * Math.PI / 5; ctx.lineTo(w / 6 + Math.cos(a) * r, h / 4 + Math.sin(a) * r); }
  ctx.fill();
  ctx.strokeStyle = '#1a1420'; ctx.lineWidth = 0.4; ctx.strokeRect(0, 0, w, h);
  ctx.restore();
}
function dibujarEscenario(x, suelo) {
  ctx.fillStyle = '#7a4f2a'; ctx.fillRect(x, suelo - 10, 80, 10); ctx.fillStyle = '#9c6a3c'; ctx.fillRect(x, suelo - 10, 80, 2);
  ctx.strokeStyle = '#1a1420'; ctx.lineWidth = 0.6; ctx.strokeRect(x, suelo - 10, 80, 10);
  for (let k = 0; k < 6; k++) { ctx.fillStyle = k % 2 ? '#d52b1e' : '#ffffff'; ctx.fillRect(x + k * 13.3, suelo - 9, 13.3, 3); }   // guirnalda
  for (const bx of [x + 4, x + 72]) { ctx.fillStyle = '#5a391f'; ctx.fillRect(bx, suelo - 44, 1.2, 34); bandera(bx + 1.2, suelo - 44, 13, true); }
  caja(ctx, x + 18, suelo - 34, 44, 10, '#f4efe2', '#3a2a1a');
  dibujarTexto(ctx, 'SEWELL · 1967', x + 40, suelo - 32.6, { tam: 5.4, color: '#7a1820', alinear: 'centro' });
  ctx.fillStyle = '#3b3a42'; ctx.fillRect(x + 38, suelo - 22, 1, 12); ctx.beginPath(); ctx.arc(x + 38.5, suelo - 23, 1.6, 0, 7); ctx.fill();   // micrófono
}
// El proyector del cine en la galería
function dibujarProyector(x, suelo) {
  ctx.fillStyle = '#2b2a30'; ctx.fillRect(x + 4, suelo - 8, 2, 8); ctx.fillRect(x + 12, suelo - 8, 2, 8);
  ctx.fillStyle = '#3b3a42'; ctx.fillRect(x + 2, suelo - 16, 16, 8); ctx.strokeRect(x + 2, suelo - 16, 16, 8);
  ctx.fillStyle = '#4a4952';
  for (const cx of [x + 6, x + 14]) { ctx.beginPath(); ctx.arc(cx, suelo - 19, 3.5, 0, 7); ctx.fill(); ctx.stroke(); }
  ctx.fillStyle = '#ffe9a8'; ctx.fillRect(x + 18, suelo - 14, 2.5, 4);
}
// Fachada del cine: marquesina con ampolletas y el letrero vertical
function dibujarFachadaCine(x, suelo) {
  const X = x * 1, base = suelo + 1;
  ctx.fillStyle = '#9c2a2a'; ctx.fillRect(X - 5, base - 9 * T, 5, 9 * T);
  ctx.strokeRect(X - 5, base - 9 * T, 5, 9 * T);
  // marquesina sobre la puerta
  const mw = 6 + anchoTexto('FUNCIÓN 19:00', { tam: 4.8 });   // la marquesina se ajusta a su texto
  ctx.fillStyle = '#f2e6c8'; ctx.fillRect(X - mw, base - 2.9 * T, mw, 10); ctx.strokeRect(X - mw, base - 2.9 * T, mw, 10);
  dibujarTexto(ctx, 'FUNCIÓN 19:00', X - mw / 2, base - 2.9 * T + 2.2, { tam: 4.8, color: '#7a1820', alinear: 'centro' });
  for (let k = 0; k * 3.7 < mw - 3; k++) {
    const on = Math.floor(J.cuadros / 10 + k) % 2;
    ctx.fillStyle = on ? '#ffe680' : '#a8873a'; ctx.beginPath(); ctx.arc(X - mw + 2 + k * 3.7, base - 2.9 * T + 11.5, 0.9, 0, 7); ctx.fill();
  }
  // letrero vertical CINE
  ctx.fillStyle = '#1d2a44'; ctx.fillRect(X - 13, base - 8.4 * T, 10, 44); ctx.strokeRect(X - 13, base - 8.4 * T, 10, 44);
  'CINE'.split('').forEach((l, i) => dibujarTexto(ctx, l, X - 8, base - 8.4 * T + 2 + i * 10.5, { tam: 8.5, color: Math.floor(J.cuadros / 18) % 2 ? '#ffd25a' : '#ffefb0', alinear: 'centro', borde: '#5a1c10', grosor: 1.2 }));
  // afiches
  for (const [ax, col] of [[X - 26, '#3d6db9'], [X - 50, '#d8432f']]) {
    ctx.fillStyle = '#d9a640'; ctx.fillRect(ax, base - 30, 12, 17); ctx.fillStyle = col; ctx.fillRect(ax + 1.2, base - 28.8, 9.6, 14.6);
    ctx.fillStyle = '#f2e6c8'; ctx.fillRect(ax + 2.5, base - 26, 7, 1.2); ctx.fillRect(ax + 3, base - 20, 6, 4);
  }
}
// En la pantalla, al llegar: el noticiario en sepia muestra al cóndor llevándose a Pedro hacia lo alto
function dibujarNoticiario(pa, t) {
  const k = limitar((t - 50) / 300, 0, 1);
  if (t < 50) return;
  ctx.save();
  ctx.beginPath(); ctx.rect(pa.x, pa.y, pa.w, pa.h); ctx.clip();
  ctx.fillStyle = '#d8c79a'; ctx.fillRect(pa.x, pa.y, pa.w, pa.h);
  ctx.fillStyle = 'rgba(90,70,40,0.35)';   // edificios de Sewell en silueta
  for (let i = 0; i < 9; i++) ctx.fillRect(pa.x + i * 12, pa.y + pa.h - 12 - (i * 7) % 18, 10, 30);
  ctx.filter = 'sepia(1) contrast(1.1)';
  dibujarRapto(pa.x + 10 + k * (pa.w + 20), pa.y + pa.h - 6 - k * (pa.h + 30), 0.62, t);
  ctx.filter = 'none';
  if (t % 8 < 2) { ctx.fillStyle = 'rgba(40,30,20,0.35)'; ctx.fillRect(pa.x + (t * 37) % pa.w, pa.y, 0.6, pa.h); }   // rayas de película vieja
  ctx.restore();
}
// Edificios de Sewell lejanos: más chicos, con paralaje (se mueven más lento que el primer plano) y un velo de bruma
function dibujarLejanos() {
  const L = S.N.lejanos;
  if (!L) return;
  const anchos = { edificio_rojo: 46, edificio_verde: 34, edificio_amarillo: 48, edificio_azul: 36, edificio_naranjo: 26, edificio_crema: 40, camarote: 80 };
  for (const b of L) {
    const sx = (b.tx * T - S.cam.x) * 0.5 + 40 + b.fila * 22;     // posición en pantalla
    if (sx < -90 || sx > W + 10) continue;
    const esc = b.fila ? 0.62 : 0.8, ancho = anchos[b.img] * esc;
    const x = S.cam.x + sx, base = (b.suelo || 24) * T - 10 - b.fila * 14;
    ctx.save();
    ctx.filter = b.fila ? 'saturate(0.55) brightness(1.12) contrast(0.7)' : 'saturate(0.7) brightness(1.06) contrast(0.82)';   // bruma
    objeto(b.img, x, base, ancho, { voltear: b.voltear, alfa: b.fila ? 0.8 : 0.9 });
    ctx.restore();
  }
}
// ---------- interiores: la mina, el palitroque, el cine, el gimnasio y el hospital son escenas aparte
// Nato entra por una puerta (o la bocamina): fundido a negro y aparece adentro, sin ver nada del exterior. Al salir, lo mismo.
// Desde afuera, la sala queda tapada por su «cubierta»: el cerro de roca o la fachada del edificio, con sus puertas.
const MEDIA_PUERTA = 14;
function salaDe(p, actual) {
  const cx = p.x + p.w / 2, cy = p.y + p.h / 2, salas = S.N.cuevas;
  for (let i = 0; i < salas.length; i++) {
    const c = salas[i], m = i === actual ? 3 : -2;   // holgura: no se entra y sale en el mismo umbral
    if (cx > c.x - m && cx < c.x + c.w + m && cy > c.y - m && cy < c.y + c.h + m) return i;
  }
  return -1;
}
function enSalaOculta(x, y) {   // desde afuera no se ve nada de lo que hay dentro de una sala, y desde adentro nada de afuera
  const dentro = c => x > c.x && x < c.x + c.w && y > c.y && y < c.y + c.h;
  if (S.sala >= 0) return !dentro(S.N.cuevas[S.sala]);
  return S.N.cuevas.some(dentro);
}
function vistaSala(c) { return { x: c.x - T, y: c.y - T, w: c.w + 2 * T, h: c.h + 2 * T }; }   // la sala y sus muros
function encuadreSala(c, objX, objY) {
  const v = vistaSala(c);
  return [v.w <= W ? v.x + v.w / 2 - W / 2 : limitar(objX, v.x, v.x + v.w - W),
    v.h <= H ? v.y + v.h / 2 - H / 2 : limitar(objY, v.y, v.y + v.h - H)];
}
function cambiarSala(i) {
  const c = S.N.cuevas[i], p = S.jug;
  S.sala = i; S.enCueva = !!c; S.oscuro = c && !c.luz ? 1 : 0;
  let ox = p.x + p.w / 2 - W / 2 + p.dir * 24, oy = p.y - H * 0.58;   // la cámara salta al nuevo encuadre: es otra escena
  if (c) [ox, oy] = encuadreSala(c, ox, oy);
  S.cam.x = limitar(ox, 0, S.N.ancho * T - W); S.cam.y = limitar(oy, 0, S.N.alto * T - H);
}
function revisarPuerta() {
  const p = S.jug, n = salaDe(p, S.sala);
  const salto = !S.antes || Math.abs(p.x - S.antes.x) + Math.abs(p.y - S.antes.y) > 2 * T;   // reaparecer en una fogata no es cruzar una puerta
  S.antes = { x: p.x, y: p.y };
  if (n === S.sala) return;
  if (salto || p.estado === 'fuera') cambiarSala(n);
  else { S.puerta = { t: 0, a: n }; efecto('puerta'); }
}
function actualizarPuerta() {
  const D = S.puerta;
  D.t++;
  if (D.t === MEDIA_PUERTA) { cambiarSala(D.a); S.antes = { x: S.jug.x, y: S.jug.y }; }
  if (D.t >= MEDIA_PUERTA * 2) S.puerta = null;
}
// la cubierta de una sala vista desde afuera
function dibujarCubiertas() {
  if (!_patronRoca) return;
  for (const c of S.N.cuevas) {
    const f = c.fuera || {};
    const x0 = f.x != null ? f.x : c.x, x1 = c.x + c.w, y0 = c.y, y1 = f.y1 || c.y + c.h, piso = f.piso || c.y + c.h;
    if (x0 > S.cam.x + W || x1 < S.cam.x) continue;
    if (f.tipo === 'roca' || !c.estilo) {   // el cerro sigue entero: la mina queda adentro
      ctx.fillStyle = _patronRoca; ctx.fillRect(x0, y0 - 0.6, x1 - x0, y1 - y0 + 0.6);
      ctx.lineWidth = 0.7; ctx.strokeStyle = '#1a1420';
      for (const b of c.bocas || []) {
        if (b.portal) continue;   // la bocamina tiene su propio dibujo
        dibujarBocaTunel(b.lado > 0 ? x1 : x0, b.y, b.alto || 2 * T, b.lado);
      }
      continue;
    }
    // edificio: su fachada hasta el piso, y roca bajo el piso (la piscina del gimnasio no se ve desde la calle)
    if (y1 > piso + T) { ctx.fillStyle = _patronRoca; ctx.fillRect(x0, piso + T - 0.5, x1 - x0, y1 - piso - T + 0.5); }
    dibujarFachada(c, f, x0, y0, x1, piso);
  }
}
function dibujarBocaTunel(x, piso, alto, lado) {   // boca de túnel con marco de troncos en la cara del cerro
  const w = 2 * T, X = lado > 0 ? x - w : x;
  ctx.fillStyle = '#0b070b';
  ctx.beginPath(); ctx.moveTo(X + 2, piso); ctx.lineTo(X + 2, piso - alto + 6); ctx.quadraticCurveTo(X + w / 2, piso - alto - 2, X + w - 2, piso - alto + 6); ctx.lineTo(X + w - 2, piso); ctx.fill();
  ctx.fillStyle = '#6d4626'; ctx.fillRect(X, piso - alto, 3, alto); ctx.fillRect(X + w - 3, piso - alto, 3, alto); ctx.fillRect(X - 2, piso - alto - 3, w + 4, 4);
  ctx.fillStyle = '#4a2e18'; ctx.fillRect(X - 2, piso - alto + 1, w + 4, 1);
}
const COLOR_FACHADA = { palitroque: '#b5563f', cine: '#d9a441', gimnasio: '#4f7fa8', hospital: '#e9dfc8' };
function dibujarFachada(c, f, x0, y0, x1, piso) {
  const base = f.color || COLOR_FACHADA[c.estilo] || '#9b7a55', w = x1 - x0, h = piso - y0;
  ctx.save();
  ctx.beginPath(); ctx.rect(x0, y0, w, h); ctx.clip();
  ctx.fillStyle = base; ctx.fillRect(x0, y0, w, h);
  ctx.fillStyle = 'rgba(0,0,0,0.13)'; for (let y = y0 + 3; y < piso; y += 3.2) ctx.fillRect(x0, y, w, 0.5);   // tablas de la pared
  const g = ctx.createLinearGradient(0, y0, 0, y0 + 10); g.addColorStop(0, 'rgba(0,0,0,0.35)'); g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g; ctx.fillRect(x0, y0, w, 10);   // sombra del alero
  // ventanas por piso (cada piso mide 8 casillas o lo que alcance), sin tapar las puertas
  const pisos = f.pisos || [piso];
  const libres = x => !(c.bocas || []).some(b => b.lado !== 'arriba' && Math.abs(x - b.x) < 2.2 * T);
  for (const pp of pisos) {
    const yv = Math.max(y0 + 6, pp - 2.6 * T);
    for (let x = x0 + 18; x < x1 - 14; x += 30) {
      if (!libres(x + 5) || yv + 12 > pp - 2) continue;
      ctx.fillStyle = '#f4f1e8'; ctx.fillRect(x - 1, yv - 1, 12, 14);
      ctx.fillStyle = J.cuadros % 400 < 380 || (x | 0) % 3 ? '#ffd98a' : '#e8b860'; ctx.fillRect(x, yv, 10, 12);
      ctx.fillStyle = 'rgba(120,70,20,0.35)'; ctx.fillRect(x, yv + 7, 10, 5);
      ctx.fillStyle = '#f4f1e8'; ctx.fillRect(x + 4.5, yv, 1, 12); ctx.fillRect(x, yv + 5.5, 10, 1);
      ctx.strokeStyle = '#2a1a14'; ctx.lineWidth = 0.6; ctx.strokeRect(x - 1, yv - 1, 12, 14);
    }
    if (pp !== piso) { ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.fillRect(x0, pp - 1, w, 2); }   // línea del entrepiso
  }
  ctx.restore();
  // el letrero con el nombre, sobre la puerta de entrada (así se lee al llegar)
  if (f.letrero) {
    const b = (c.bocas || []).find(o => o.lado === -1) || (c.bocas || [])[0];
    const op = { tam: 7 }, tw = anchoTexto(f.letrero, op) + 10;
    const lx = limitar(b ? b.x + T * 0.6 + tw / 2 - 6 : (x0 + x1) / 2, x0 + tw / 2 + 4, x1 - tw / 2 - (f.cruz ? 26 : 4));
    const ly = Math.max(y0 + 4, b ? b.y - (b.alto || 2 * T) - 20 : y0 + 6);
    caja(ctx, lx - tw / 2, ly, tw, 11, '#3a2416', '#d9a441');
    dibujarTexto(ctx, f.letrero, lx, ly + 2, { tam: 7, color: '#ffe9b8', alinear: 'centro' });
    if (f.cruz) {   // la cruz roja del hospital, junto al letrero
      const cx = lx + tw / 2 + 12, cy = ly + 5.5;
      ctx.fillStyle = '#ffffff'; ctx.fillRect(cx - 8, cy - 8, 16, 16); ctx.strokeStyle = '#2a1a14'; ctx.lineWidth = 0.6; ctx.strokeRect(cx - 8, cy - 8, 16, 16);
      ctx.fillStyle = '#c8262c'; ctx.fillRect(cx - 2.2, cy - 6, 4.4, 12); ctx.fillRect(cx - 6, cy - 2.2, 12, 4.4);
    }
  }
  // las puertas
  for (const b of c.bocas || []) {
    if (b.lado === 'arriba') continue;
    const alto = (b.alto || 2 * T) + 2, X = b.lado > 0 ? b.x - 1.6 * T : b.x - T * 0.4, ancho = 2 * T;
    ctx.fillStyle = '#3b2414'; ctx.fillRect(X - 2, b.y - alto - 3, ancho + 4, alto + 3);
    const gd = ctx.createLinearGradient(0, b.y - alto, 0, b.y);
    gd.addColorStop(0, '#1a0f0a'); gd.addColorStop(1, '#5a3a1c');
    ctx.fillStyle = gd; ctx.fillRect(X, b.y - alto, ancho, alto);
    ctx.fillStyle = 'rgba(255,210,120,0.25)'; ctx.fillRect(X + 2, b.y - 5, ancho - 4, 5);   // luz de adentro en el umbral
    ctx.fillStyle = '#6d4626'; ctx.fillRect(X - 3, b.y - alto - 5, ancho + 6, 3);
  }
}
// adentro: la luz del día entra por las puertas, así se ve por dónde se sale
function dibujarBocasDentro(c) {
  for (const b of c.bocas || []) {
    if (b.lado === 'arriba') {
      const g = ctx.createLinearGradient(0, c.y - T, 0, c.y + 2 * T);
      g.addColorStop(0, 'rgba(255,248,225,0.85)'); g.addColorStop(1, 'rgba(255,248,225,0)');
      ctx.fillStyle = g; ctx.fillRect(b.x - T * 0.8, c.y - T, 1.6 * T, 3 * T);
      continue;
    }
    const alto = b.alto || 2 * T, fuera = b.lado > 0 ? b.x : b.x - T, dentro = b.lado > 0 ? b.x - 2 * T : b.x + 2 * T;
    ctx.fillStyle = '#fff4dc'; ctx.fillRect(fuera, b.y - alto, T, alto);   // el vano: afuera es de día
    const g = ctx.createLinearGradient(b.x, 0, dentro, 0);
    g.addColorStop(0, 'rgba(255,240,205,0.7)'); g.addColorStop(1, 'rgba(255,240,205,0)');
    ctx.fillStyle = g; ctx.fillRect(Math.min(b.x, dentro), b.y - alto, 2 * T, alto);
  }
}
function dibujarCuevas() {
  for (const c of S.N.cuevas) {
    if (S.N.cuevas.indexOf(c) !== S.sala) continue;   // solo el fondo de la sala donde está Nato
    if (c.estilo) { dibujarInterior(c); continue; }
    const im = IMG.f_cuevas;
    if (!im) continue;
    ctx.save();
    ctx.beginPath(); ctx.rect(c.x, c.y, c.w, c.h); ctx.clip();
    // la ilustración de las cavernas de la serie, repetida y oscurecida
    const anchoIm = 300, altoIm = anchoIm * 9 / 16;
    for (let x = c.x - ((S.cam.x * 0.3) % anchoIm); x < c.x + c.w; x += anchoIm) {
      for (let y = c.y - 10; y < c.y + c.h; y += altoIm) ctx.drawImage(im, x + S.cam.x * 0.3 - (S.cam.x * 0.3) % 1, y, anchoIm, altoIm);
    }
    ctx.fillStyle = 'rgba(15,8,18,0.45)'; ctx.fillRect(c.x, c.y, c.w, c.h);
    ctx.restore();
  }
}
// Interior de un edificio: la ilustración generada, o paneles de madera pintados si todavía no existe
function dibujarInterior(c) {
  if (c.x > S.cam.x + W || c.x + c.w < S.cam.x) return;
  ctx.save();
  ctx.beginPath(); ctx.rect(c.x, c.y - T, c.w, c.h + T); ctx.clip();   // también bajo el techo: sin franja negra
  // el cine se dibuja aquí (su ilustración trae otra pantalla y otro proyector, que se verían repetidos)
  const im = c.estilo === 'cine' ? null : IMG['f_' + c.estilo];
  if (im && im.width) {
    // una sola ilustración que cubre la pantalla y se desliza un poco al recorrer la sala (paralaje): sin copias ni costuras
    const altoSala = c.h + T, k = Math.max(W * 1.1 / im.width, Math.min(altoSala, H) / im.height);
    const iw = im.width * k, ih = im.height * k;
    const kx = limitar((S.cam.x - c.x) / Math.max(1, c.w - W), 0, 1);
    const ix = S.cam.x - kx * (iw - W);
    const iy = altoSala <= H ? c.y + c.h - ih : S.cam.y - limitar((S.cam.y - c.y + T) / Math.max(1, altoSala - H), 0, 1) * (ih - H);
    ctx.drawImage(im, Math.round(ix), Math.round(iy), iw, ih);
    ctx.fillStyle = 'rgba(30,20,10,0.18)'; ctx.fillRect(c.x, c.y - T, c.w, c.h + T);
  } else if (c.estilo === 'gimnasio') {   // gimnasio de madera con espalderas y ventanales con nieve
    ctx.fillStyle = '#d9c9a6'; ctx.fillRect(c.x, c.y, c.w, c.h);
    ctx.fillStyle = '#c4b28c'; for (let x = c.x; x < c.x + c.w; x += 7) ctx.fillRect(x, c.y, 1, c.h);
    for (let x = c.x + 30; x < c.x + c.w - 30; x += 90) {   // ventanales
      ctx.fillStyle = '#9fb7cf'; ctx.fillRect(x, c.y + 10, 36, 34); ctx.fillStyle = '#f4f8fd'; for (let k = 0; k < 8; k++) ctx.fillRect(x + (k * 13 + J.cuadros * 0.3) % 34, c.y + 12 + (k * 7 + J.cuadros * 0.5) % 30, 1.4, 1.4);
      ctx.strokeStyle = '#6b4a2a'; ctx.lineWidth = 2; ctx.strokeRect(x, c.y + 10, 36, 34); ctx.beginPath(); ctx.moveTo(x + 18, c.y + 10); ctx.lineTo(x + 18, c.y + 44); ctx.stroke();
    }
    ctx.fillStyle = '#8b5e36'; for (let x = c.x + 6; x < c.x + 26; x += 4) ctx.fillRect(x, c.y + 8, 1.5, c.h - 12);   // espalderas
    for (let y = c.y + 12; y < c.y + c.h - 6; y += 6) ctx.fillRect(c.x + 6, y, 18, 1.2);
    dibujarTexto(ctx, 'GIMNASIO', c.x + c.w / 2, c.y + 2, { tam: 7, color: '#5a2e12', alinear: 'centro', borde: '#f4e7c8', grosor: 1.2 });
    const pi = S.N.piscina;
    if (pi) {   // el fondo de la piscina: azulejos celestes
      ctx.fillStyle = '#bfe4ef'; ctx.fillRect(pi.x, pi.y, pi.w, pi.h);
      ctx.fillStyle = '#a3d3e2'; for (let x = pi.x; x < pi.x + pi.w; x += 6) ctx.fillRect(x, pi.y, 0.6, pi.h);
      for (let y = pi.y; y < pi.y + pi.h; y += 6) ctx.fillRect(pi.x, y, pi.w, 0.6);
      ctx.fillStyle = '#2f6f8f'; for (let k = 1; k < 4; k++) ctx.fillRect(pi.x, pi.y + pi.h - 3, pi.w, 1);   // líneas de las pistas en el fondo
    }
  } else if (c.estilo === 'hospital') {   // hospital: muros claros, zócalo de azulejos verdes y la cruz roja
    ctx.fillStyle = '#eef0e6'; ctx.fillRect(c.x, c.y, c.w, c.h);
    for (const yb of [c.y + 8 * T - 14, c.y + c.h - 14]) { ctx.fillStyle = '#8fc0a4'; ctx.fillRect(c.x, yb, c.w, 14); ctx.fillStyle = '#7aae92'; for (let x = c.x; x < c.x + c.w; x += 5) ctx.fillRect(x, yb, 0.6, 14); }
    for (let x = c.x + 24; x < c.x + c.w - 20; x += 70) for (const yv of [c.y + 10, c.y + 8 * T + 10]) {
      ctx.fillStyle = '#9fb7cf'; ctx.fillRect(x, yv, 22, 26); ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2; ctx.strokeRect(x, yv, 22, 26);
    }
    ctx.fillStyle = '#c0392b'; ctx.fillRect(c.x + 40, c.y + 8 * T + 6, 4, 12); ctx.fillRect(c.x + 36, c.y + 8 * T + 10, 12, 4);
    // en los muros, cosas de 1919: relojes, cuadros, avisos y repisas con frascos
    for (const yb of [c.y + 4, c.y + 8 * T + 4]) for (let x = c.x + 58, k = 0; x < c.x + c.w - 20; x += 70, k++) {
      const tipo = (k + (yb > c.y + 10 ? 1 : 0)) % 4;
      if (tipo === 0) {   // reloj de pared
        ctx.fillStyle = '#5a3a1e'; ctx.beginPath(); ctx.arc(x, yb + 12, 7, 0, 7); ctx.fill();
        ctx.fillStyle = '#f7f1df'; ctx.beginPath(); ctx.arc(x, yb + 12, 5.6, 0, 7); ctx.fill();
        ctx.strokeStyle = '#2a1a14'; ctx.lineWidth = 0.7; ctx.beginPath(); ctx.moveTo(x, yb + 12); ctx.lineTo(x, yb + 8); ctx.moveTo(x, yb + 12); ctx.lineTo(x + 3, yb + 13); ctx.stroke();
      } else if (tipo === 1) {   // cuadro de un paisaje de la cordillera
        ctx.fillStyle = '#7a5226'; ctx.fillRect(x - 10, yb + 4, 20, 15); ctx.fillStyle = '#a9c6dc'; ctx.fillRect(x - 8, yb + 6, 16, 11);
        ctx.fillStyle = '#7d8a96'; ctx.beginPath(); ctx.moveTo(x - 8, yb + 17); ctx.lineTo(x - 2, yb + 9); ctx.lineTo(x + 3, yb + 14); ctx.lineTo(x + 6, yb + 11); ctx.lineTo(x + 8, yb + 17); ctx.fill();
        ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.moveTo(x - 4, yb + 12); ctx.lineTo(x - 2, yb + 9); ctx.lineTo(x, yb + 12); ctx.fill();
      } else if (tipo === 2) {   // aviso con la cruz roja
        ctx.fillStyle = '#f4ecd2'; ctx.fillRect(x - 7, yb + 3, 14, 18); ctx.strokeStyle = '#8a7a5a'; ctx.lineWidth = 0.6; ctx.strokeRect(x - 7, yb + 3, 14, 18);
        ctx.fillStyle = '#c0392b'; ctx.fillRect(x - 1.2, yb + 5, 2.4, 7); ctx.fillRect(x - 3.5, yb + 7.3, 7, 2.4);
        ctx.fillStyle = '#9a8f78'; for (let l = 0; l < 3; l++) ctx.fillRect(x - 5, yb + 14 + l * 2, 10, 0.6);
      } else {   // repisa con frascos
        ctx.fillStyle = '#6b4a2a'; ctx.fillRect(x - 12, yb + 16, 24, 2);
        const cols = ['#7fb3c9', '#c98f5a', '#9bc49a', '#d9d2b0'];
        for (let f = 0; f < 5; f++) { ctx.fillStyle = cols[f % 4]; ctx.fillRect(x - 10 + f * 4.5, yb + 9 + (f % 2), 3, 7 - (f % 2)); ctx.fillStyle = '#4a3a2a'; ctx.fillRect(x - 10 + f * 4.5, yb + 8 + (f % 2), 3, 1); }
      }
    }
    dibujarTexto(ctx, 'HOSPITAL · EDIFICIO 157', c.x + c.w / 2, c.y + 8 * T + 2, { tam: 6, color: '#2a4a3a', alinear: 'centro', borde: '#ffffff', grosor: 1.2 });
  } else if (c.estilo === 'palitroque') {
    ctx.fillStyle = '#9fc4a8'; ctx.fillRect(c.x, c.y, c.w, c.h);
    ctx.fillStyle = '#86ad90'; for (let x = c.x; x < c.x + c.w; x += 6) ctx.fillRect(x, c.y, 1, c.h);
    ctx.fillStyle = '#7a4f2a'; ctx.fillRect(c.x, c.y + c.h - 26, c.w, 26);   // zócalo de madera
    ctx.fillStyle = '#5a391f'; ctx.fillRect(c.x, c.y + c.h - 26, c.w, 1.5);
    ctx.fillStyle = '#2b2a30'; ctx.fillRect(c.x + 40, c.y + 14, 60, 26);    // pizarra de puntajes
    ctx.fillStyle = '#d9a640'; ctx.strokeStyle = '#5a391f'; ctx.lineWidth = 1.5; ctx.strokeRect(c.x + 40, c.y + 14, 60, 26);
    dibujarTexto(ctx, 'PALITROQUE', c.x + 70, c.y + 5, { tam: 7, color: '#5a2e12', alinear: 'centro', borde: '#f4e7c8', grosor: 1.2 });
  } else {   // sala de cine de los años 20: muros de terciopelo, pilastras doradas, friso y zócalo de madera
    ctx.fillStyle = '#4a1019'; ctx.fillRect(c.x, c.y, c.w, c.h);
    for (let x = c.x; x < c.x + c.w; x += 8) { ctx.fillStyle = '#3a0c14'; ctx.fillRect(x + 4, c.y, 2.5, c.h); ctx.fillStyle = '#5a1620'; ctx.fillRect(x + 1, c.y, 1, c.h); }
    ctx.fillStyle = '#2b1810'; ctx.fillRect(c.x, c.y + c.h - 22, c.w, 22);
    ctx.fillStyle = '#6b4226'; ctx.fillRect(c.x, c.y + c.h - 22, c.w, 1.5);
    ctx.fillStyle = '#b8892f'; ctx.fillRect(c.x, c.y + 3, c.w, 2); ctx.fillStyle = '#7a5a1e'; ctx.fillRect(c.x, c.y + 5, c.w, 1);
    for (let x = c.x + 24; x < c.x + c.w - 60; x += 64) {   // pilastras con capitel
      ctx.fillStyle = '#8a6a26'; ctx.fillRect(x - 3, c.y + 6, 6, c.h - 28);
      ctx.fillStyle = '#d6aa4a'; ctx.fillRect(x - 2, c.y + 6, 1.4, c.h - 28); ctx.fillRect(x - 5, c.y + 6, 10, 2.5); ctx.fillRect(x - 5, c.y + c.h - 24, 10, 2);
    }
  }
  if (c.luz) for (const l of S.N.luces) if (l.lampara) {   // lámparas colgantes con su luz cálida
    const g = ctx.createRadialGradient(l.x, l.y + 6, 1, l.x, l.y + 6, l.r);
    g.addColorStop(0, 'rgba(255,220,150,0.35)'); g.addColorStop(1, 'rgba(255,220,150,0)');
    ctx.fillStyle = g; ctx.fillRect(l.x - l.r, l.y + 6 - l.r, l.r * 2, l.r * 2);
    ctx.fillStyle = '#2b2a30'; ctx.fillRect(l.x - 0.4, c.y, 0.8, l.y - c.y + 2);
    ctx.fillStyle = '#3d6b4a'; ctx.beginPath(); ctx.moveTo(l.x - 5, l.y + 6); ctx.lineTo(l.x - 2, l.y + 2); ctx.lineTo(l.x + 2, l.y + 2); ctx.lineTo(l.x + 5, l.y + 6); ctx.fill();
    ctx.fillStyle = '#ffe9a8'; ctx.beginPath(); ctx.arc(l.x, l.y + 6.5, 1.6, 0, 7); ctx.fill();
  }
  ctx.restore();
}
function dibujarTunel() {
  const tv = S.N.tunelVagonetas;
  if (!tv || tv.x < S.cam.x - 40 || tv.x > S.cam.x + W + 40) return;
  ctx.fillStyle = '#0c080c'; ctx.beginPath(); ctx.moveTo(tv.x - 6, tv.y); ctx.lineTo(tv.x - 6, tv.y - 18); ctx.quadraticCurveTo(tv.x + 4, tv.y - 26, tv.x + 14, tv.y - 18); ctx.lineTo(tv.x + 14, tv.y); ctx.fill();
  ctx.fillStyle = '#6d4626'; ctx.fillRect(tv.x - 8, tv.y - 22, 2.5, 22); ctx.fillRect(tv.x + 14, tv.y - 22, 2.5, 22); ctx.fillRect(tv.x - 8, tv.y - 24, 25, 3);
}
function dibujarPortales() {
  for (const pt of S.N.portales || []) {
    const im = IMG[pt.img], info = SPRITES_INFO[pt.img];
    if (!im || !info) continue;
    // bocamina: marco de troncos con su túnel negro, centrada en la cara del cerro; el túnel mide lo mismo que la galería
    const h = 122, w = h * info[0] / info[1], x = pt.x - w / 2, y = pt.yAbajo + 1 - h;
    ctx.drawImage(im, x, y, w, h);
    if (pt.letrero) {   // el nombre en el tablero clavado al dintel
      dibujarTexto(ctx, pt.letrero[0], pt.x + w * 0.02, y + h * 0.072, { tam: 4.6, color: '#2a1a10', alinear: 'centro' });
      dibujarTexto(ctx, pt.letrero[1], pt.x + w * 0.02, y + h * 0.118, { tam: 5.6, color: '#2a1a10', alinear: 'centro' });
    }
    if (J.cuadros % 9 === 0) particula(x + w * 0.83, y + h * 0.27, { col: '#ffcf6a', tam: 0.8, vida: 20, max: 20, vx: azarJ(-0.2, 0.2), vy: -0.3, grav: 0 });   // el farol titila
  }
}
function dibujarEntidades() {
  const p = S.jug;
  const fz = escalaFam('nato'), fm = escalaFam('minero'), fc = escalaFam('condor');
  if (S.tren) dibujarTrenFinal(S.tren);   // el tren es largo: se dibuja aunque la locomotora ya esté fuera de pantalla
  for (const e of S.ents) {
    if (e.x > S.cam.x + W + 60 || e.x + 60 < S.cam.x) continue;
    if (enSalaOculta(e.x + (e.w || 12) / 2, e.y + (e.h || 16) / 2) || (S.sala >= 0 && e.tipo === 'condor')) continue;   // cada escena ve solo lo suyo
    switch (e.tipo) {
      case 'pepita': objeto('pepita', e.x - 1, e.y + 9 + Math.sin(J.cuadros / 12 + e.fase) * 1.2, 10); break;
      case 'apunte': {
        const b = Math.sin(J.cuadros / 15) * 2;
        ctx.save(); ctx.globalAlpha = 0.35 + Math.sin(J.cuadros / 10) * 0.15; ctx.fillStyle = '#ffd58a';
        ctx.beginPath(); ctx.arc(e.x + 6, e.y + 7 + b, 11, 0, 7); ctx.fill(); ctx.restore();
        objeto('apunte', e.x - 1, e.y + 16 + b, 14);
        break;
      }
      case 'pan': objeto('pan', e.x - 1, e.y + 10, 14); break;
      case 'fogata': objeto(e.encendida ? 'fogata' : 'fogata_apagada', e.x - 2, e.y + 17, 20); if (e.encendida && J.cuadros % 10 === 0) particula(e.x + 8, e.y + 4, { col: '#ffb02e', tam: 1, vida: 30, max: 30, vx: azarJ(-0.2, 0.2), vy: -0.6, grav: 0 }); break;
      case 'letrero': {
        const hL = objeto('letrero', e.x - 4, e.y + 17, 24) || 24;
        const cerca = S.burbuja && Math.abs(S.burbuja.x - (e.x + 8)) < 1;
        if (!cerca) dibujarTexto(ctx, '?', e.x + 8, e.y + 17 - hL * 0.93 + Math.sin(J.cuadros / 12) * 0.6, { tam: 7, color: '#5a2e12', alinear: 'centro' });
        break;
      }
      case 'anciana': pose('anciana', e.x + 7, e.y + e.h + 1, -1, escalaFam('anciana')); break;   // mira hacia la entrada
      case 'diego': dibujarDiego(e); break;
      case 'ascensor': {   // jaula de fierro colgada de su cable
        ctx.strokeStyle = '#3b3a42'; ctx.lineWidth = 0.8;
        ctx.beginPath(); ctx.moveTo(e.x + e.w / 2, e.y0 - 9 * T); ctx.lineTo(e.x + e.w / 2, e.y - 34); ctx.stroke();
        ctx.fillStyle = '#5a5a63'; ctx.fillRect(e.x, e.y - 36, e.w, 3);
        for (let x = e.x; x <= e.x + e.w; x += 6) ctx.fillRect(x, e.y - 34, 1, 34);
        ctx.fillStyle = '#7a6a52'; ctx.fillRect(e.x, e.y, e.w, 4); ctx.strokeRect(e.x, e.y, e.w, 4);
        break;
      }
      case 'jefe': dibujarJefe(e); break;
      case 'condorJefe': dibujarCondorJefe(e); break;
      case 'pedroNido': dibujarPedroNido(e); break;
      case 'mujer': pose(e.img && SPRITES_INFO[e.img] ? e.img : 'mujer', e.x + 6, e.y + e.h + 1, e.dir || -1, escalaFam('mujer')); break;   // vecina, enfermera, médico
      case 'durmiente':
        objeto('durmiente', e.x, e.y + 16, 40);
        if (J.cuadros % 50 < 35) dibujarTexto(ctx, J.cuadros % 100 < 50 ? 'z' : 'Z z', e.x + 8, e.y - 6 - (J.cuadros % 50) / 10, { tam: 6, color: '#cfe6ff', borde: '#1a1420' });
        break;
      case 'minero': {
        let nom = 'minero_caminar1';
        if (e.estado === 'patrulla' || e.estado === 'persigue') nom = cuadro(CICLO_MINERO, Math.floor(e.t / (e.estado === 'persigue' ? 6 : 9)));
        else if (e.estado === 'golpe' && e.t < 18) nom = 'minero_golpe';
        else if (e.estado === 'ko' || e.estado === 'mareado') nom = 'minero_mareado';
        else if (e.estado === 'sevan') nom = cuadro(CICLO_MINERO, Math.floor(e.t / 10));
        const rot = e.estado === 'carga' ? -0.18 : e.estado === 'herido' ? 0.15 * e.dir : 0;
        const brinco = e.estado === 'alerta' ? -Math.max(0, 4 - e.t / 3) : 0;
        if (e.destello > 0) e.destello--;
        const boteM = nom.startsWith('minero_caminar') ? -Math.abs(Math.sin(e.t / 9 * Math.PI)) * 0.9 : 0;
        const opM = { rot, alfa: e.alfa, destello: e.destello > 0 || (e.estado === 'carga' && e.t % 6 < 3) };
        const dirM = e.estado === 'sevan' ? -e.dir : e.dir;
        const camina = ['patrulla', 'persigue', 'sevan'].includes(e.estado);
        if (!(camina && anim('minero_caminar', e.t / (e.estado === 'persigue' ? 2.6 : 3.6), e.x + e.w / 2, e.y + e.h + 1, dirM, fm, opM)))
          pose(nom, e.x + e.w / 2, e.y + e.h + 1 + brinco + boteM, dirM, fm, opM);
        if (e.estado === 'alerta') dibujarTexto(ctx, '!', e.x + 6, e.y - 14, { tam: 12, color: '#ff4a3a', borde: '#ffffff', alinear: 'centro' });
        if (e.estado === 'carga') dibujarTexto(ctx, '¡Oiga!', e.x + 6, e.y - 12, { tam: 6, color: '#ffffff', borde: '#1a1420', alinear: 'centro' });
        break;
      }
      case 'condor': {
        let nom = 'condor_vuela';
        if (e.estado === 'picada') nom = 'condor_picada';
        else nom = cuadro(CICLO_CONDOR.concat(SPRITES_INFO.condor_alas_medio ? [] : ['condor_vuela']), Math.floor(e.t / (e.estado === 'aviso' ? 4 : 9)));
        const opC = { medio: true, centrar: true, rot: e.giro || (e.estado === 'picada' ? Math.atan2(e.vy, Math.abs(e.vx)) * 0.5 * e.dir : (e.estado === 'vuela' ? Math.sin(e.t / 22) * 0.06 : 0)) };
        // vuelo con el ciclo real de aleteo (un solo dibujo, sin parpadeo); en picada, las alas plegadas
        if (nom === 'condor_picada' || !anim('condor_volar', e.t / (e.estado === 'aviso' ? 1.6 : 2.6), e.x + e.w / 2, e.y + e.h / 2, e.dir, fc, opC))
          pose(nom, e.x + e.w / 2, e.y + e.h / 2, e.dir, fc, opC);
        if (e.estado === 'aviso') {
          // sombra en el suelo bajo el cóndor
          dibujarTexto(ctx, '!', e.x + e.w / 2, e.y - 16, { tam: 10, color: '#ffe066', borde: '#1a1420', alinear: 'centro' });
        }
        break;
      }
      case 'hercules': {
        const nom = e.estado === 'salta' ? 'hercules_salta' : cuadro(CICLO_PERRO, Math.floor(e.t / 4));
        if (e.estado === 'salta' || !anim('hercules_correr', e.t / 1.8, e.x + e.w / 2, e.y + e.h + 1, e.dir, escalaFam('hercules'), {}))
          pose(nom, e.x + e.w / 2, e.y + e.h + 1, e.dir, escalaFam('hercules'), { centrar: true });
        break;
      }
      case 'capacho': dibujarCapacho(e, false); break;
      case 'vagoneta':
        if (e.volcada) { ctx.save(); ctx.translate(e.x + 12, e.y + e.h); ctx.rotate(-e.giro); objeto('vagoneta', -13, 0, 26, { alfa: Math.max(0, 1 - (e.t2 - 30) / 20) }); ctx.restore(); }
        else objeto('vagoneta', e.x - 1, e.y + e.h + 1, 26);
        break;
      case 'piedra': objeto('piedra', e.x + (e.estado === 'tiembla' ? Math.sin(e.t) * 0.8 : 0), e.y + e.h + 1, 12); break;
      case 'olla': objeto('olla', e.x, e.y + 26, 44); break;
      case 'bolero':
      case 'dinamitero': {
        const nomD = e.estado === 'ko' || e.estado === 'mareado' ? 'minero_mareado' : e.estado === 'lanza' && e.t < 10 ? 'minero_golpe' : 'minero_caminar1';
        if (e.destello > 0) e.destello--;
        pose(nomD, e.x + e.w / 2, e.y + e.h + 1, e.estado === 'sevan' ? -e.dir : e.dir, fm, { alfa: e.alfa, destello: e.destello > 0, tizne: e.tiznado, rot: e.estado === 'prepara' ? -0.12 * e.dir : 0 });
        if (e.estado === 'prepara' && e.arma === 'bola') {   // agachado, con la bola lista para lanzar por la pista
          dibujarBola(e.x + e.w / 2 + e.dir * 6, e.y + e.h - 9 - Math.min(6, e.t / 4), 0);
          if (e.t < 24) dibujarTexto(ctx, '¡Allá va!', e.x + 6, e.y - 14, { tam: 6, color: '#ffffff', borde: '#1a1420', alinear: 'centro' });
        } else if (e.estado === 'prepara') { // el cartucho encendido en la mano, sobre la cabeza
          const hx = e.x + e.w / 2 - e.dir * 4, hy = e.y - 6;
          dibujarDinamita(hx, hy, e.t, -0.6 * e.dir);
          if (e.t < 24) dibujarTexto(ctx, '¡Toma esto!', e.x + 6, e.y - 22, { tam: 6, color: '#ffffff', borde: '#1a1420', alinear: 'centro' });
        }
        break;
      }
      case 'dinamita': dibujarDinamita(e.x + 3, e.y + 3, e.t, e.giro); break;
      case 'bola': dibujarBola(e.x + 5, e.y + 5, e.giro); break;
      case 'tablon': {
        if (e.estado === 'fuera') break;
        const tb = e.estado === 'tiembla' ? Math.sin(e.t * 1.7) * 0.8 : 0, X = e.x + tb, Y = e.y;
        ctx.save();
        if (e.aparece > 0) ctx.globalAlpha = 1 - e.aparece / 24;
        if (e.estado === 'cae') { ctx.translate(X + e.w / 2, Y + 2); ctx.rotate(Math.min(0.5, e.t * 0.012)); ctx.translate(-X - e.w / 2, -Y - 2); }
        const L = e.w;
        ctx.fillStyle = '#9c6a3c'; ctx.fillRect(X, Y, L, 4.5); ctx.fillStyle = '#c99a62'; ctx.fillRect(X, Y, L, 1.2);
        ctx.fillStyle = '#5a391f'; for (let k = 9; k < L - 4; k += 12) ctx.fillRect(X + k, Y + 0.6, 0.7, 3.5);
        ctx.strokeStyle = '#1a1420'; ctx.lineWidth = 0.7; ctx.strokeRect(X, Y, L, 4.5);
        if (e.estado !== 'firme') { ctx.strokeStyle = '#2a1a10'; ctx.beginPath(); ctx.moveTo(X + L / 2 - 1, Y); ctx.lineTo(X + L / 2 + 1, Y + 2.5); ctx.lineTo(X + L / 2 - 0.5, Y + 4.5); ctx.stroke(); }
        ctx.restore();
        break;
      }
      case 'rodado': {
        const im = IMG.piedra;
        if (im) { ctx.save(); ctx.translate(e.x + 7, e.y + 7); ctx.rotate(e.giro); ctx.drawImage(im, -8, -8, 16, 16); ctx.restore(); }
        break;
      }
    }
  }
  // Nato
  if (p.estado !== 'fuera' && !(p.invul > 0 && p.estado !== 'victoria' && Math.floor(p.invul / 4) % 2)) {
    let nom = 'nato_quieto', rot = 0;
    if (p.estado === 'trepar') nom = SPRITES_INFO.nato_trepar1 ? (Math.floor(p.anim / 7) % 2 ? 'nato_trepar2' : 'nato_trepar1') : 'nato_trepar';
    else if (p.estado === 'atrapado') nom = SPRITES_INFO.nato_caer ? 'nato_caer' : 'nato_colgado';   // piernas sueltas, pataleando
    else if (p.estado === 'herido') nom = 'nato_herido';
    else if (p.estado === 'victoria') nom = Math.floor(J.cuadros / 30) % 2 ? 'nato_victoria' : 'nato_quieto';
    else if (p.ataque) {
      if (p.ataque.tipo === 'patada') nom = 'nato_patada';
      else if (p.ataque.tipo === 'gancho') { nom = SPRITES_INFO.nato_gancho ? 'nato_gancho' : 'nato_golpe'; if (nom === 'nato_golpe') rot = -0.35; }
      else nom = p.combo === 2 && SPRITES_INFO.nato_golpe2 ? 'nato_golpe2' : 'nato_golpe';
    }
    else if (p.enAgua) { nom = 'nato_caer'; rot = Math.sin(J.cuadros / 12) * 0.12; }   // nadando
    else if (!p.enSuelo) nom = p.vy > 0.8 && SPRITES_INFO.nato_caer ? 'nato_caer' : 'nato_saltar';
    else if (Math.abs(p.vx) > 0.3) {
      const antes = Math.floor(p.anim / 9);
      p.anim += Math.abs(p.vx); nom = cuadro(CICLO_NATO, Math.floor(p.anim / 9));
      if (Math.floor(p.anim / 9) !== antes && Math.floor(p.anim / 9) % 2 === 0) efecto('paso');
      if (Math.floor(p.anim / 9) !== antes && Math.abs(p.vx) > 1.2 && !S.enCueva) polvo(p.x + p.w / 2 - p.dir * 4, p.y + p.h, 1);
    }
    const corre = nom.startsWith('nato_correr');
    const bote = corre ? -Math.abs(Math.sin(p.anim / 18 * Math.PI)) * 1.3 : 0;
    const pieY = p.y + p.h + 1 + bote;
    let escY = 1;
    if (p.aplasta > 0) escY = 1 - p.aplasta * 0.016;                         // aplastado al aterrizar
    else if (!p.enSuelo && p.vy < -3) escY = 1.05;                              // estirado al saltar
    else if (nom === 'nato_quieto') escY = 1 + Math.sin(J.cuadros / 22) * 0.008;  // respira
    const conCh = p.chaqueta > 0 && (p.chaqueta > 180 || Math.floor(p.chaqueta / 8) % 2 === 0);
    const opN = { rot: rot * p.dir + (corre ? 0.04 * p.dir : 0), tizne: p.tizne > 0, escY, chaqueta: conCh, brillo: conCh ? 'rgba(255,170,60,0.9)' : null };
    // carrera con el ciclo real (piernas y brazos que se mueven); si no hay tira, las poses fijas
    if (!(corre && anim('nato_correr', p.anim / 4.2, p.x + p.w / 2, p.y + p.h + 1, p.dir, fz, opN)))
      pose(nom, p.x + p.w / 2, pieY, p.dir, fz, opN);
    if (p.tizne > 0 && J.cuadros % 5 === 0) particula(p.x + 5, p.y, { col: '#55525c', tam: 2.5, vida: 40, max: 40, vx: azarJ(-0.3, 0.3), vy: -0.6, grav: -0.01 });
  }
  if (p.sobre && p.sobre.tipo === 'capacho') dibujarCapacho(p.sobre, true);
  // cóndor que lleva a Nato: se dibuja encima
}
// Diego, el amigo de Nato: su dibujo (si ya se generó) o una figura provisoria
function dibujarDiego(e) {
  const entregando = S.regalo && S.regalo.diego === e && S.regalo.t < 300;   // tiene la chaqueta en las manos hasta entregarla
  const nom = e.dio && !entregando ? 'diego_saluda' : 'diego_chaqueta', pie = e.y + e.h + 1, cx = e.x + e.w / 2;
  if (SPRITES_INFO[nom] && IMG[nom] && IMG[nom].width) {
    pose(nom, cx, pie, -1, escalaFam('diego'));
    if (!e.dio) dibujarTexto(ctx, 'Diego', cx, pie - 46, { tam: 5, color: '#ffe8b0', borde: '#1a1420', alinear: 'centro' });
    return;
  }
  const sal = e.dio && Math.floor(J.cuadros / 15) % 2;
  ctx.save(); ctx.strokeStyle = '#1a1420'; ctx.lineWidth = 0.7;
  ctx.fillStyle = '#7a4f2a'; ctx.fillRect(cx - 5, pie - 2, 4, 2); ctx.fillRect(cx + 1, pie - 2, 4, 2);           // zapatos
  ctx.fillStyle = '#c8a46a'; ctx.fillRect(cx - 5, pie - 13, 4.5, 11); ctx.fillRect(cx + 0.5, pie - 13, 4.5, 11);   // pantalón caqui
  ctx.fillStyle = '#6b3d1e'; ctx.fillRect(cx - 6, pie - 14.5, 12, 1.8);                                            // cinturón
  ctx.fillStyle = '#f4efe2'; ctx.beginPath(); ctx.ellipse(cx, pie - 21, 8, 8, 0, 0, 7); ctx.fill(); ctx.stroke();   // camisa y guatita
  ctx.fillStyle = '#e8b98d'; ctx.beginPath(); ctx.arc(cx - 0.5, pie - 32, 4.2, 0, 7); ctx.fill(); ctx.stroke();       // cara
  ctx.fillStyle = '#8a8378'; ctx.beginPath(); ctx.ellipse(cx - 1.4, pie - 29.5, 3, 2.2, 0, 0, Math.PI); ctx.fill();   // barba
  ctx.fillStyle = '#2a1d16'; ctx.beginPath(); ctx.ellipse(cx - 0.5, pie - 35, 4.3, 2, 0, Math.PI, 0); ctx.fill();     // pelo
  ctx.fillStyle = '#f4efe2';
  if (!e.dio) { ctx.fillStyle = '#b8653a'; ctx.fillRect(cx - 12, pie - 25, 8, 9); ctx.strokeRect(cx - 12, pie - 25, 8, 9); }   // la chaqueta en las manos
  else { ctx.save(); ctx.translate(cx + 6, pie - 26); ctx.rotate(sal ? -0.9 : -0.5); ctx.fillStyle = '#f4efe2'; ctx.fillRect(0, -1.5, 8, 3); ctx.restore(); }   // saluda
  ctx.restore();
  dibujarTexto(ctx, 'Diego', cx, pie - 46, { tam: 5, color: '#ffe8b0', borde: '#1a1420', alinear: 'centro' });
}
function dibujarAgua() {
  const pi = S.N.piscina;
  if (!pi || pi.x > S.cam.x + W || pi.x + pi.w < S.cam.x) return;
  ctx.save();
  ctx.fillStyle = 'rgba(70,160,215,0.5)'; ctx.fillRect(pi.x, pi.y + 2, pi.w, pi.h - 2);
  ctx.fillStyle = 'rgba(200,235,255,0.75)';
  ctx.beginPath(); ctx.moveTo(pi.x, pi.y + 2);
  for (let x = pi.x; x <= pi.x + pi.w; x += 4) ctx.lineTo(x, pi.y + 1.5 + Math.sin(x / 9 + J.cuadros / 14) * 0.9);
  ctx.lineTo(pi.x + pi.w, pi.y + 3.5); ctx.lineTo(pi.x, pi.y + 3.5); ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.lineWidth = 0.6;   // cuerdas de las pistas
  for (let k = 1; k < 3; k++) { ctx.setLineDash([2, 2]); ctx.beginPath(); ctx.moveTo(pi.x, pi.y + 3 + k * 0.6); ctx.lineTo(pi.x + pi.w, pi.y + 3 + k * 0.6); ctx.stroke(); }
  ctx.setLineDash([]);
  if (J.cuadros % 6 === 0) particula(pi.x + Math.random() * pi.w, pi.y, { col: 'rgba(255,255,255,0.5)', tam: azarJ(2, 4), vida: 50, max: 50, vx: azarJ(-0.1, 0.1), vy: -0.35, grav: -0.002 });
  ctx.restore();
}
function dibujarJefe(e) {
  const pie = e.y + e.h + 1, cx = e.x + e.w / 2, ej = escalaFam('jefe');
  const op = { destello: e.destello > 0 && e.estado !== 'ko' };
  if (e.destello > 0) e.destello--;
  if (e.estado === 'reta' || e.estado === 'llama') { if (!anim('jefe_hablar', e.t / 3.2, cx, pie, e.dir, ej, op)) pose('jefe_senala', cx, pie, e.dir, ej, op); }
  else if (e.estado === 'carga_golpe') pose('jefe_senala', cx - e.dir * 3, pie, e.dir, ej, Object.assign(op, { rot: -0.12 * e.dir, destello: e.t % 8 < 4 }));
  else if (e.estado === 'golpe') pose('jefe_senala', cx + e.dir * 6, pie, e.dir, ej, Object.assign(op, { rot: 0.1 * e.dir }));
  else if (e.estado === 'prepara') pose('jefe_quieto', cx + Math.sin(e.t) * 1.2, pie, e.dir, ej, Object.assign(op, { rot: -0.08 * e.dir }));
  else if (e.estado === 'embiste') pose('jefe_quieto', cx, pie, e.dir, ej, Object.assign(op, { rot: 0.28 * e.dir }));
  else if (e.estado === 'aturdido' || e.estado === 'ko') pose('jefe_quieto', cx, pie + 6, e.dir, ej, Object.assign(op, { rot: (e.estado === 'ko' ? -1.2 : -0.35) * e.dir }));
  else pose('jefe_quieto', cx, pie - Math.abs(Math.sin(e.t / 10)) * 1.5, e.dir, ej, op);
  if (e.estado === 'carga_golpe') dibujarTexto(ctx, '!', cx, e.y - 18, { tam: 12, color: '#ff4a3a', borde: '#ffffff', alinear: 'centro' });
  if (e.estado === 'prepara') dibujarTexto(ctx, '¡Ahí voy!', cx, e.y - 16, { tam: 6.5, color: '#ffffff', borde: '#1a1420', alinear: 'centro' });
  if (e.estado === 'aturdido' && e.t % 18 === 0) estrellitas(cx, e.y + 4);
}
function dibujarParticulas() {
  for (const q of S.part) {
    ctx.globalAlpha = Math.min(1, q.vida / q.max * 1.5);
    ctx.fillStyle = q.col;
    if (q.estrella) {
      ctx.beginPath();
      for (let i = 0; i < 10; i++) { const r = i % 2 ? q.tam * 0.45 : q.tam, a = i * Math.PI / 5 + q.vida / 6; ctx.lineTo(q.x + Math.cos(a) * r, q.y + Math.sin(a) * r); }
      ctx.fill();
    } else if (q.pluma) {
      ctx.save(); ctx.translate(q.x, q.y); ctx.rotate(Math.sin(q.vida / 8)); ctx.beginPath(); ctx.ellipse(0, 0, q.tam, q.tam * 0.35, 0, 0, 7); ctx.fill(); ctx.restore();
    } else { ctx.beginPath(); ctx.arc(q.x, q.y, q.tam / 2, 0, 7); ctx.fill(); }
  }
  ctx.globalAlpha = 1;
}
function dibujarOscuridad() {   // solo dentro de una sala oscura (la mina, el cine): cubre toda la pantalla
  const c = S.sala >= 0 ? S.N.cuevas[S.sala] : null;
  if (!c) return;
  if (!c.luz && (S.oscuro || 0) >= 0.02) {
    if (!J.sombra) { J.sombra = document.createElement('canvas'); J.sombra.width = W * ESC; J.sombra.height = H * ESC; }
    const sc = J.sombra.getContext('2d');
    sc.setTransform(1, 0, 0, 1, 0, 0); sc.clearRect(0, 0, W * ESC, H * ESC);
    sc.setTransform(ESC, 0, 0, ESC, -Math.round(S.cam.x * ESC), -Math.round(S.cam.y * ESC));
    sc.globalCompositeOperation = 'source-over';
    sc.fillStyle = `rgba(6,3,10,${(c.oscuro || 0.72) * S.oscuro})`;
    sc.fillRect(S.cam.x - 4, S.cam.y - 4, W + 8, H + 8);
    sc.globalCompositeOperation = 'destination-out';
    const luz = (x, y, r) => {
      const g = sc.createRadialGradient(x, y, r * 0.2, x, y, r);
      g.addColorStop(0, 'rgba(0,0,0,1)'); g.addColorStop(1, 'rgba(0,0,0,0)');
      sc.fillStyle = g; sc.beginPath(); sc.arc(x, y, r, 0, 7); sc.fill();
    };
    luz(S.jug.x + S.jug.w / 2, S.jug.y + 10, 82);
    for (const l of S.N.luces) luz(l.x, l.y, l.r + Math.sin(J.cuadros / 9 + l.x) * 2);
    for (const e of S.ents) if (e.tipo === 'fogata' && e.encendida) luz(e.x + 8, e.y + 8, 50);
    for (const b of c.bocas || []) if (b.lado !== 'arriba') luz(b.x, b.y - (b.alto || 2 * T) / 2, 46);   // la luz del día en la entrada
    const hz = S.N.haz, pa = S.N.pantalla;
    if (hz && pa && c.estilo === 'cine') {   // el haz del proyector ilumina las butacas y la pantalla
      const g = sc.createLinearGradient(hz.x, hz.y, pa.x, hz.y);
      g.addColorStop(0, 'rgba(0,0,0,0.9)'); g.addColorStop(1, 'rgba(0,0,0,0.55)');
      sc.fillStyle = g; sc.beginPath(); sc.moveTo(hz.x, hz.y - 1.5); sc.lineTo(pa.x, pa.y); sc.lineTo(pa.x, pa.y + pa.h); sc.lineTo(hz.x, hz.y + 1.5); sc.fill();
      sc.fillStyle = 'rgba(0,0,0,1)'; sc.fillRect(pa.x - 2, pa.y - 2, pa.w + 4, pa.h + 4);
      luz(pa.x + pa.w / 2, pa.y + pa.h / 2, 80);
    }
    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.drawImage(J.sombra, 0, 0); ctx.restore();
    if (hz && pa && c.estilo === 'cine') {   // polvo brillando en el haz
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = 'rgba(255,240,200,0.06)';
      ctx.beginPath(); ctx.moveTo(hz.x, hz.y - 1.5); ctx.lineTo(pa.x, pa.y); ctx.lineTo(pa.x, pa.y + pa.h); ctx.lineTo(hz.x, hz.y + 1.5); ctx.fill();
      ctx.fillStyle = 'rgba(255,240,200,0.35)';
      for (let i = 0; i < 12; i++) { const k = ((J.cuadros * 0.003 + i * 0.083) % 1), yy = hz.y + (pa.y + pa.h * ((i * 7) % 10) / 10 - hz.y) * k; ctx.fillRect(hz.x + (pa.x - hz.x) * k, yy + Math.sin(J.cuadros / 20 + i) * 2, 0.6, 0.6); }
      ctx.restore();
    }
  }
  {   // faroles
    for (const l of S.N.luces) if (l.lampara) {   // apliques de pared
      ctx.fillStyle = 'rgba(255,214,140,0.95)'; ctx.beginPath(); ctx.arc(l.x, l.y, 1.8, Math.PI, 0); ctx.fill();
      ctx.fillStyle = '#b8892f'; ctx.fillRect(l.x - 2.2, l.y, 4.4, 1);
    }
    for (const l of S.N.luces) if (l.farol) {
      ctx.fillStyle = 'rgba(255,200,90,0.9)'; ctx.fillRect(l.x - 2, l.y - 3, 4, 5);
      ctx.strokeStyle = '#1a1420'; ctx.lineWidth = 0.6; ctx.strokeRect(l.x - 2, l.y - 3, 4, 5);
    }
  }
}
function dibujarNieve() {
  if (S.enCueva) return;
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  for (const f of S.nieve) {
    f.y += f.v; f.x += Math.sin((J.cuadros + f.f * 50) / 60) * 0.2 - 0.1 + vientoEn(S.cam.x + W / 2) * 4;
    if (f.y > H) { f.y = -2; f.x = Math.random() * W; }
    ctx.beginPath(); ctx.arc(((f.x % W) + W) % W, f.y, 0.6 + f.v * 0.6, 0, 7); ctx.fill();
  }
}
function burbujaTexto(x, y, texto, ancho) {   // chica, para que no tape el juego
  ancho = ancho || 126;
  const op = { tam: 5.8 };
  const lineas = partirTexto(texto, ancho - 8, op);
  const h = lineas.length * 7 + 5;
  const w = Math.min(ancho, Math.max(...lineas.map(l => anchoTexto(l, op))) + 9);
  let bx = limitar(x - w / 2, 4, W - w - 4), by = Math.max(18, y - h - 5);
  caja(ctx, bx, by, w, h, 'rgba(255,250,238,0.92)', '#2a1a10');
  lineas.forEach((l, i) => dibujarTexto(ctx, l, bx + 4.5, by + 3 + i * 7, { tam: 5.8, color: '#2a1a10' }));
}
// cara recortada de un sprite dentro de un círculo (íconos del marcador)
function iconoCara(nombre, [sx, sy, sw, sh], x, y, r) {
  const im = IMG[nombre];
  if (!im || !im.width) return;
  ctx.save();
  ctx.fillStyle = '#d9c7a5'; ctx.beginPath(); ctx.arc(x, y, r + 0.6, 0, 7); ctx.fill();
  ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.clip();
  const lado = r * 2.3;
  ctx.drawImage(im, sx, sy, sw, sh, x - lado / 2, y - lado / 2, lado, lado * sh / sw);
  ctx.restore();
  ctx.strokeStyle = '#1a1420'; ctx.lineWidth = 0.6; ctx.beginPath(); ctx.arc(x, y, r + 0.6, 0, 7); ctx.stroke();
}
function dibujarHUD() {
  // corazones, vidas, pepitas y apuntes
  caja(ctx, 3, 3, 172, 15, 'rgba(10,14,28,0.55)', 'rgba(255,255,255,0.25)');
  for (let i = 0; i < P.corMax; i++) dibujarTexto(ctx, '♥', 8 + i * (P.corMax > 3 ? 6.4 : 9), 4.5, { tam: P.corMax > 3 ? 7.5 : 9, color: i < P.corazones ? '#ff4a5a' : '#555060', borde: '#1a1420', grosor: 1.2 });
  iconoCara('nato_quieto', [4, 0, 44, 44], 45, 10.5, 5.6);
  dibujarTexto(ctx, '×' + P.vidas, 52, 5, { tam: 8, color: '#ffffff', borde: '#1a1420' });
  objeto('pepita', 72, 16, 10);
  dibujarTexto(ctx, String(P.pepitas), 84, 5, { tam: 8, color: '#ffd58a', borde: '#1a1420' });
  objeto('apunte', 106, 17, 10);
  dibujarTexto(ctx, P.apuntes.size + '/5', 118, 5, { tam: 8, color: '#f4e7c8', borde: '#1a1420' });
  // barra de energía de Hércules
  caja(ctx, 3, 20, 92, 9, 'rgba(10,14,28,0.55)', 'rgba(255,255,255,0.25)');
  iconoCara('hercules_sentado', [96, 0, 100, 92], 10, 24.5, 4.4);
  const llena = P.energia >= 100;
  ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(17, 22.5, 74, 4);
  ctx.fillStyle = llena ? (Math.floor(J.cuadros / 8) % 2 ? '#ffd25a' : '#ff8a2a') : '#d9853b'; ctx.fillRect(17, 22.5, 74 * P.energia / 100, 4);
  if (llena) dibujarTexto(ctx, ENTRADA.esTactil ? '🐕 ¡Llama a Hércules!' : 'C: ¡Llama a Hércules!', 98, 21, { tam: 6, color: '#ffd25a', borde: '#1a1420' });
  dibujarTexto(ctx, String(P.puntos).padStart(6, '0'), 171, 5, { tam: 7, color: '#ffffff', borde: '#1a1420', alinear: 'der' });
  if (S.jug.chaqueta > 0) {   // tiempo que le queda a la chaqueta regalona
    const k = S.jug.chaqueta / DURA_CHAQUETA, parpadea = S.jug.chaqueta < 180 && Math.floor(J.cuadros / 8) % 2;
    const yc = H - 16;   // abajo a la izquierda: no choca con los carteles de zona ni con la vida del jefe
    caja(ctx, 3, yc, 92, 12, 'rgba(10,14,28,0.6)', '#ffb347');
    dibujarTexto(ctx, 'CHAQUETA REGALONA', 49, yc + 0.8, { tam: 5, color: '#ffd58a', alinear: 'centro' });
    ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(7, yc + 7.5, 84, 3);
    ctx.fillStyle = parpadea ? '#ffffff' : '#ff9a2a'; ctx.fillRect(7, yc + 7.5, 84 * k, 3);
  }
  if (P.invencible) dibujarTexto(ctx, 'TRUCO: INVENCIBLE', W - 3, H - 8, { tam: 5, color: '#7dff8a', borde: '#1a1420', alinear: 'der' });
  const jefe = S.peleaJefe && S.ents.find(e => e.tipo === 'jefe' || e.tipo === 'condorJefe');
  if (jefe && jefe.estado !== 'ko' && jefe.estado !== 'derrotado') {
    caja(ctx, W / 2 - 70, H - 20, 140, 15, 'rgba(10,14,28,0.7)', '#ff6a5a');
    dibujarTexto(ctx, jefe.tipo === 'jefe' ? 'JEFE DE LOS MINEROS' : 'EL CÓNDOR GIGANTE', W / 2, H - 19.5, { tam: 5.5, color: '#ffd5cc', alinear: 'centro' });
    ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(W / 2 - 66, H - 11.5, 132, 4);
    ctx.fillStyle = '#e8402f'; ctx.fillRect(W / 2 - 66, H - 11.5, 132 * Math.max(0, jefe.hp) / jefe.hpMax, 4);
  }
  // reloj: la función del cine empieza a las siete
  if (S.N.reloj) {
    const m = S.finale && S.finale.hora ? S.finale.hora : horaActual(), tarde = m >= S.N.reloj.hasta;
    caja(ctx, W - 50, 3, 47, 21, 'rgba(10,14,28,0.55)', 'rgba(255,255,255,0.25)');
    dibujarTexto(ctx, textoHora(Math.min(m, 24 * 60 - 1)), W - 26.5, 4.2, { tam: 8.5, color: tarde ? '#ff8a6a' : '#ffffff', borde: '#1a1420', alinear: 'centro' });
    dibujarTexto(ctx, tarde ? '¡ya empezó!' : 'función 19:00', W - 26.5, 15.2, { tam: 5, color: tarde ? '#ff8a6a' : '#ffd58a', borde: '#1a1420', alinear: 'centro' });
  }
  if (S.anuncio1981 > 0) {
    const a = Math.min(1, S.anuncio1981 / 30, (330 - S.anuncio1981) / 20);
    dibujarTexto(ctx, '1981', W / 2, 50, { tam: 22, color: '#ffffff', borde: '#1a1420', alinear: 'centro', alfa: a, grosor: 3.5 });
    dibujarTexto(ctx, 'Sewell se despide. Hoy baja el último tren.', W / 2, 78, { tam: 8, color: '#ffe8b0', borde: '#1a1420', alinear: 'centro', alfa: a });
  }
  // cartel de zona
  if (S.zonaCartel && S.zonaCartel.t < 230) {
    const a = Math.min(1, S.zonaCartel.t / 20, (230 - S.zonaCartel.t) / 20);
    dibujarTexto(ctx, S.zonaCartel.txt, W / 2, 28, { tam: 10, color: '#ffe8b0', borde: '#1a1420', alinear: 'centro', alfa: a, grosor: 2.2 });
  }
  // atrapado por el cóndor
  if (S.jug.estado === 'atrapado') {
    dibujarTexto(ctx, '¡MACHACA SALTAR O GOLPE!', W / 2, H - 52, { tam: 9, color: '#ffffff', borde: '#b3201a', alinear: 'centro', grosor: 2.5 });
    caja(ctx, W / 2 - 50, H - 39, 100, 7, 'rgba(0,0,0,0.6)', '#ffffff');
    ctx.fillStyle = '#ffd25a'; ctx.fillRect(W / 2 - 49, H - 38, 98 * Math.min(1, S.jug.lucha / 100), 5);
  }
}
function dibujarModal() {
  const m = S.modal;
  ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.fillRect(0, 0, W, H);
  // ficha del apunte: más chica que la pantalla y del alto justo de su texto
  const lineas = partirTexto(m.texto, 178, { tam: 6.5, negrita: false });
  const h = 40 + lineas.length * 8.5, y0 = Math.round((H - h) / 2);
  caja(ctx, 46, y0, 228, h, '#f4e7c8', '#4b3222');
  caja(ctx, 49, y0 + 3, 222, h - 6, 'rgba(0,0,0,0)', '#a07a4a');
  objeto('apunte', 54, y0 + 34, 18);
  dibujarTexto(ctx, m.titulo, 160, y0 + 7, { tam: 8, color: '#7a3b1a', alinear: 'centro' });
  dibujarTexto(ctx, '«Apuntes Históricos de El Mineral El Teniente»', 160, y0 + 17, { tam: 5, color: '#7a5333', alinear: 'centro', negrita: false });
  lineas.forEach((l, i) => dibujarTexto(ctx, l, 78, y0 + 27 + i * 8.5, { tam: 6.5, color: '#2a1a10', negrita: false }));
  if (m.t > 25 && Math.floor(J.cuadros / 25) % 2) dibujarTexto(ctx, ENTRADA.esTactil ? 'Toca A para seguir' : 'X o ENTER para seguir', 160, y0 + h - 11, { tam: 5.5, color: '#7a3b1a', alinear: 'centro' });
}
function dibujarPausa() {
  ctx.fillStyle = 'rgba(5,8,20,0.65)'; ctx.fillRect(0, 0, W, H);
  dibujarTexto(ctx, 'PAUSA', W / 2, 36, { tam: 16, color: '#ffe8b0', borde: '#1a1420', alinear: 'centro', grosor: 3 });
  opcionesPausa().forEach(([, txt], i) => {
    const sel = i === S.pausa.sel;
    dibujarTexto(ctx, (sel ? '▶ ' : '') + txt, W / 2, 70 + i * 16, { tam: 9, color: sel ? '#ffd25a' : '#ffffff', borde: '#1a1420', alinear: 'centro' });
  });
  dibujarTexto(ctx, ENTRADA.esTactil ? '▲ ▼ para elegir · A para aceptar' : '↑ ↓ para elegir · ENTER para aceptar', W / 2, 150, { tam: 6, color: '#c9d7ea', alinear: 'centro' });
}
function dibujarNivel() {
  const sx = S.sacudir > 0 ? azarJ(-1, 1) : 0, sy = S.sacudir > 0 ? azarJ(-1, 1) : 0;
  const sala = S.sala >= 0 ? S.N.cuevas[S.sala] : null;   // adentro de una sala solo se ve la sala: es otra escena
  ctx.setTransform(ESC, 0, 0, ESC, 0, 0);
  if (sala) { ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H); } else dibujarFondo();
  ctx.setTransform(ESC, 0, 0, ESC, Math.round((-S.cam.x + sx) * ESC), Math.round((-S.cam.y + sy) * ESC));
  if (sala) { const v = vistaSala(sala); ctx.save(); ctx.beginPath(); ctx.rect(v.x, v.y, v.w, v.h); ctx.clip(); }
  else dibujarLejanos();
  dibujarCuevas();
  dibujarDecorados();
  dibujarTunel();
  dibujarTren();
  dibujarCasillas();
  if (sala) dibujarBocasDentro(sala); else dibujarCubiertas();
  if (!sala) dibujarPortales();
  dibujarEntidades();
  if (!S.N.piscina || !enSalaOculta(S.N.piscina.x + 8, S.N.piscina.y + 8)) dibujarAgua();
  if (!sala) dibujarAlud();
  dibujarRescate();
  dibujarParticulas();
  dibujarOscuridad();
  if (sala) ctx.restore();
  for (const q of S.textos) dibujarTexto(ctx, q.txt, q.x + 6, q.y, { tam: q.tam, color: q.col, borde: '#1a1420', alinear: 'centro', alfa: Math.min(1, q.vida / 15) });
  ctx.setTransform(ESC, 0, 0, ESC, 0, 0);
  if (!sala) dibujarNieve();
  if (S.puerta) { ctx.fillStyle = `rgba(0,0,0,${1 - Math.abs(S.puerta.t / MEDIA_PUERTA - 1)})`; ctx.fillRect(0, 0, W, H); }   // fundido de la puerta
  if (S.burbuja) {
    burbujaTexto(S.burbuja.x - S.cam.x, S.burbuja.y - S.cam.y, S.burbuja.texto);
  }
  dibujarHUD();
  const F = S.finale;
  if (F && F.tipo === 'jefe' && F.t > 400) {   // el cóndor cruza el cielo con Pedro, hacia lo alto
    const k = Math.min(1, (F.t - 400) / 300);
    dibujarRapto(-30 + k * (W + 80), 120 - k * 110, 0.9, F.t);
  }
  if (F && (F.tren ? F.tren.parado : F.listo)) {
    const a = Math.min(1, (F.t - (F.tren ? F.tParado : F.tListo)) / 30);
    const sub = F.tren ? 'Llegó el tren desde Rancagua' : F.tipo === 'jefe' ? 'El jefe de los mineros confesó dónde está el nido'
      : F.aTiempo ? `¡Llegaste a las ${textoHora(F.hora)}, antes de la función!` : 'Llegaste con la función ya empezada';
    dibujarTexto(ctx, `¡NIVEL ${S.N.def.numero} COMPLETADO!`, W / 2, 32, { tam: 17, color: '#ffd25a', borde: '#5a1c10', alinear: 'centro', alfa: a, grosor: 3.5 });
    dibujarTexto(ctx, sub, W / 2, 53, { tam: 8, color: '#ffffff', borde: '#1a1420', alinear: 'centro', alfa: a });
  }
  if (S.modal) dibujarModal();
  if (S.pausa) dibujarPausa();
}

// ------------------------------------------------------------------ escenas de historia
function fondoCompleto(nombre, oscuro) {
  const im = imgFondo(nombre);
  if (im) ctx.drawImage(im, 0, 0, W, H);
  if (oscuro) { ctx.fillStyle = `rgba(5,8,20,${oscuro})`; ctx.fillRect(0, 0, W, H); }
}
// cuadros que un diálogo queda en pantalla: lo que pide la escena, pero nunca menos de lo que toma leerlo con calma
function lectura(texto, base) { return Math.max(base || 0, 60 + (texto || '').length * 3); }
function narracion(texto, alfa) {
  const lineas = partirTexto(texto, 270, { tam: 7.5 });
  const h = lineas.length * 10 + 8;
  ctx.save(); ctx.globalAlpha = alfa == null ? 1 : alfa;
  caja(ctx, 18, H - h - 8, W - 36, h, 'rgba(10,12,24,0.78)', '#d9853b');
  lineas.forEach((l, i) => dibujarTexto(ctx, l, W / 2, H - h - 4 + i * 10, { tam: 7.5, color: '#fff3dc', alinear: 'centro' }));
  ctx.restore();
}

// Título
const ESC_TITULO = {
  entrar() { this.sel = 0; this.t = 0; tocarMusica('titulo'); },
  opciones() { return [['jugar', 'Jugar'], ['dificultad', 'Dificultad: ' + DIF().nombre], ['creditos', 'Créditos'], ['sonido', 'Sonido: ' + (AUDIO.mudo ? 'NO' : 'SÍ')]]; },
  actualizar() {
    this.t++;
    // truco oculto: escribir NATO, o la secuencia ↑ ↑ ↓ ↓ ← → ← →
    const LETRA = { arriba: 'U', abajo: 'D', izq: 'L', der: 'R' };
    for (const a in LETRA) if (presionado(a)) this.secuencia = ((this.secuencia || '') + LETRA[a]).slice(-8);
    // NATO + número (NATO1, NATO2, NATO3) parte directo en ese nivel; NATO solo abre el menú (espera un instante por el número)
    const atajo = ENTRADA.letras.match(/NATO([1-9])$/);
    if (atajo && NIVELES[+atajo[1]]) {
      const n = +atajo[1]; ENTRADA.letras = ''; this.nato = 0; efecto('vida');
      J.invencible = false;
      fundir(() => { nuevaPartida(n); if (n === 1) irA('intro'); else irA('tarjeta'); });
      return;
    }
    if (ENTRADA.letras.endsWith('NATO') && !this.nato) this.nato = 1;
    if (this.nato && ++this.nato > 45) { ENTRADA.letras = ''; this.nato = 0; this.secuencia = ''; efecto('vida'); fundir(() => irA('trucos')); return; }
    if (this.secuencia === 'UUDDLRLR') {
      ENTRADA.letras = ''; this.secuencia = ''; efecto('vida'); fundir(() => irA('trucos')); return;
    }
    const op = this.opciones();
    if (presionado('arriba')) { this.sel = (this.sel + op.length - 1) % op.length; efecto('menu'); }
    if (presionado('abajo')) { this.sel = (this.sel + 1) % op.length; efecto('menu'); }
    if (presionado('mudo')) alternarMudo();
    if (aceptarMenu() || J.toque) {
      J.toque = false;
      iniciarAudio(); efecto('aceptar');
      const k = op[this.sel][0];
      if (k === 'jugar') { J.invencible = false; voz('imaginate'); nuevaPartida(); fundir(() => irA('intro')); }
      else if (k === 'creditos') fundir(() => irA('creditos'));
      else if (k === 'sonido') alternarMudo();
      else if (k === 'dificultad') J.dificultad = ORDEN_DIF[(ORDEN_DIF.indexOf(J.dificultad) + 1) % 3];
    }
    // izquierda y derecha también cambian la dificultad
    if (op[this.sel][0] === 'dificultad' && (presionado('izq') || presionado('der'))) {
      J.dificultad = ORDEN_DIF[(ORDEN_DIF.indexOf(J.dificultad) + (presionado('der') ? 1 : 2)) % 3]; efecto('menu');
    }
  },
  dibujar() {
    ctx.setTransform(ESC, 0, 0, ESC, 0, 0);
    const im = IMG.f_sewell;
    const z = 1.08 + Math.sin(this.t / 300) * 0.03;
    if (im) ctx.drawImage(im, -(W * z - W) / 2, -(H * z - H) / 2, W * z, H * z);
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, 'rgba(10,14,30,0.15)'); g.addColorStop(0.55, 'rgba(10,14,30,0.25)'); g.addColorStop(1, 'rgba(10,14,30,0.85)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    // cóndor que cruza el cielo
    const cx = ((this.t * 0.6) % (W + 120)) - 60;
    if (!anim('condor_volar', this.t / 3, cx, 30 + Math.sin(this.t / 30) * 5, 1, escalaFam('condor') * 0.8, { medio: true }))
      pose(cuadro(CICLO_CONDOR, Math.floor(this.t / 10)), cx, 30 + Math.sin(this.t / 30) * 5, 1, escalaFam('condor') * 0.8, { medio: true, centrar: true });
    dibujarTexto(ctx, 'EL TENIENTE', W / 2, 18, { tam: 30, color: '#ffcf6a', borde: '#3a1608', alinear: 'centro', grosor: 5 });
    dibujarTexto(ctx, 'Nato y la ciudad de las escaleras', W / 2, 52, { tam: 10, color: '#ffffff', borde: '#1a1420', alinear: 'centro', grosor: 2.6 });
    pose('pedro_quieto', 40, 170, 1, escalaFam('pedro') * 1.9);
    pose('hercules_sentado', 64, 170, 1, escalaFam('hercules') * 1.9, { centrar: true });
    pose('nato_quieto', 90, 170, -1, escalaFam('nato') * 1.9);
    this.opciones().forEach(([, txt], i) => {
      const sel = i === this.sel;
      dibujarTexto(ctx, (sel ? '▶ ' : '') + txt, W / 2, 92 + i * 13, { tam: 10, color: sel ? '#ffd25a' : '#ffffff', borde: '#1a1420', alinear: 'centro', grosor: 2.2 });
    });
    if (Math.floor(this.t / 30) % 2) dibujarTexto(ctx, ENTRADA.esTactil ? 'Toca para empezar' : 'ENTER para elegir · flechas para moverte', W / 2, 146, { tam: 6, color: '#e8e0cf', alinear: 'centro', borde: '#1a1420' });
    if (ES_IOS && !esApp()) {   // en iPhone el navegador no deja pantalla completa: se instala en la pantalla de inicio
      caja(ctx, W / 2 - 108, 153, 216, 11, 'rgba(10,12,24,0.75)', '#d9853b');
      dibujarTexto(ctx, 'Pantalla completa: toca Compartir ⬆ y «Agregar a inicio»', W / 2, 155, { tam: 5.6, color: '#ffd58a', alinear: 'centro' });
    }
    dibujarTexto(ctx, 'Un juego de Wolky Tech · basado en el libro de Pedro Villagra Díaz', W / 2, 166, { tam: 5.5, color: '#cfd8e8', alinear: 'centro', borde: '#1a1420' });
  },
};

// Escena de la plaza de Sewell: el secuestro de Pedro
const GUION_INTRO = [
  // [duración en cuadros, quién habla, texto]
  [170, 'nato', '¡Hola, amigos! Aquí estamos con mi papá, Pedro, presentando su libro en la plaza de Sewell.'],
  [170, 'pedro', '«Apuntes Históricos de El Mineral El Teniente». Llevo más de cuarenta años estudiando esta historia.'],
  [110, null, null],
  [160, 'jefe', '¡Yo soy el jefe de los mineros! Ese libro cuenta todos los secretos de la mina.'],
  [170, 'jefe', '¡Muchachos, denle una paliza al joven! ¡Y tú, cóndor, llévate al escritor a tu nido!'],
  [150, null, null],
  [150, 'pedro', '¡Natoooo!'],
  [140, 'jefe', '¡Al nido, en lo más alto de Sewell! ¡JA, JA, JA!'],
  [170, 'nato', '¡Papá! ¡Voy por ti! ¡Vamos, Hércules, a buscarlo!'],
  [250, 'narra', 'El libro brilla con luz de cobre... Para llegar al nido, Nato y su perro Hércules tendrán que recorrer la historia de Sewell, página por página.'],
  [170, 'tarjeta', null],
];
const ESC_INTRO = {
  entrar() { this.paso = 0; this.t = 0; this.tt = 0; tocarMusica('creditos'); },
  actualizar() {
    this.t++; this.tt++;
    if (presionado('pausa')) { this.fin(); return; }
    const dur = lectura(GUION_INTRO[this.paso][2], GUION_INTRO[this.paso][0]);
    if (this.t >= dur || (aceptarMenu() && this.t > 20)) {
      this.paso++; this.t = 0;
      if (this.paso === 2) { tocarMusica('tension'); }
      if (this.paso === 5) efecto('chillido');
      if (this.paso === 3 || this.paso === 5 || this.paso === 8) efecto('ladrido');
      if (this.paso === 8) tocarMusica('creditos');
      if (this.paso === 9) { efecto('apunte'); }
      if (this.paso >= GUION_INTRO.length) { this.fin(); return; }
    }
    if (this.paso === 5 && this.t % 12 === 0) { efecto(this.t % 24 ? 'golpe' : 'golpeFuerte'); }
    if (this.paso === 6 && this.t % 80 === 0) efecto('ladrido');
  },
  fin() { if (this.saliendo) return; this.saliendo = true; fundir(() => { this.saliendo = false; empezarNivel(); irA('juego'); }); },
  dibujar() {
    ctx.setTransform(ESC, 0, 0, ESC, 0, 0);
    const [, quien, texto] = GUION_INTRO[this.paso];
    const paso = this.paso, t = this.t;
    if (quien === 'tarjeta') {
      // la misma tarjeta de entrada que los demás niveles
      fondoCompleto(NIVEL1.fondoTarjeta || 'cerro', 0.45);
      const a = Math.min(1, t / 30);
      dibujarTexto(ctx, 'NIVEL 1', W / 2, 22, { tam: 12, color: '#ffffff', borde: '#1a1420', alinear: 'centro', alfa: a, grosor: 2.5 });
      dibujarTexto(ctx, 'PUEBLO HUNDIDO', W / 2, 40, { tam: 16, color: '#ffd25a', borde: '#3a1608', alinear: 'centro', alfa: a, grosor: 3.5 });
      dibujarTexto(ctx, NIVEL1.epoca, W / 2, 62, { tam: 9, color: '#ffe8b0', borde: '#1a1420', alinear: 'centro', alfa: a });
      return;
    }
    fondoCompleto('sewell', paso >= 9 ? 0.3 : 0.05);
    const suelo = 168, ez = escalaFam('nato') * 1.9, ep = escalaFam('pedro') * 1.9, em = escalaFam('minero') * 1.9, ej = escalaFam('jefe') * 1.9;
    // jefe y secuaces entran por la derecha
    const entra = paso < 2 ? 1 : paso === 2 ? 1 - Math.min(1, t / 100) : 0;
    const sevan = paso >= 7 ? (paso === 7 ? limitar((t - 80) / 60, 0, 1) : 1) : 0;   // se van cuando el jefe termina su frase
    const xJefe = 282 + entra * 120 + sevan * 160;
    if (paso >= 2) {
      // un solo dibujo del jefe: quieto o con el ciclo de gestos cuando habla
      const habla = (paso === 3 || paso === 4 || paso === 7) && t > 6;
      if (!anim('jefe_hablar', habla ? this.tt / 3 : 0, xJefe, suelo, -1, ej)) pose('jefe_quieto', xJefe, suelo, -1, ej);
    }
    // Pedro, Hércules y Nato empiezan juntos. El cóndor baja, toma a Pedro de los hombros y se lo lleva fuera de cuadro.
    // Todos con el mismo tamaño que en el menú (factor 1,9), sin achicarse.
    const xPedro0 = 152;
    let xPedro = xPedro0, yPedro = suelo;
    if (paso === 5) {
      const k = Math.min(1, t / 80);                                  // el cóndor baja en picada hacia Pedro
      const cx = -40 + (xPedro0 + 40) * k, cy = -40 + (raptoCondorY(suelo, 1.9) - 8 + 40) * k * k;   // termina justo sobre la cabeza
      if (k < 1) {
        pose('pedro_quieto', xPedro, yPedro, 1, ep);
        pose('condor_picada', cx, cy, 1, escalaFam('condor') * 1.9, { medio: true, centrar: true, rot: 0.25 * (1 - k) });
      } else {                                                          // lo agarra y empieza a subir
        const sube = Math.max(0, t - 95) * 0.35;
        dibujarRapto(xPedro, suelo - sube, 1.9, this.tt);
      }
    } else if (paso === 6) {                                           // se lo lleva volando, fuera de cuadro arriba a la derecha
      const k = t / 150, e = k * k;
      xPedro = xPedro0 + e * 210; yPedro = suelo - 19 - e * 330;
      dibujarRapto(xPedro, yPedro, 1.9, this.tt);
    }
    if (paso < 5) pose('pedro_quieto', xPedro, yPedro, 1, ep);
    // Hércules, el perro fiel de Nato: gruñe al jefe, salta contra el cóndor, lo persigue y vuelve con Nato (mismo factor)
    const eh = escalaFam('hercules') * 1.9;
    const perroCorre = (x, dir) => { if (!anim('hercules_correr', this.tt / 1.8, x, suelo, dir, eh)) pose(cuadro(CICLO_PERRO, Math.floor(this.tt / 5)), x, suelo, dir, eh, { centrar: true }); };
    if (paso <= 4) {
      pose('hercules_sentado', 176, suelo, 1, eh, { centrar: true });
      if (paso >= 3 && Math.floor(this.tt / 20) % 2) dibujarTexto(ctx, '¡GRRR!', 179, suelo - 48, { tam: 8, color: '#ffffff', borde: '#7a3b1a', alinear: 'centro' });
    } else if (paso === 5) {
      // corre por detrás hacia la izquierda de Pedro y salta contra el cóndor que baja
      if (t < 24) perroCorre(176 - t * 3.2, -1);
      else pose('hercules_salta', 100, suelo - 4 - Math.abs(Math.sin(t / 9)) * 18, 1, eh, { centrar: true });
      if (t >= 24 && Math.floor(t / 12) % 2) dibujarTexto(ctx, '¡GUAU!', 100, suelo - 58, { tam: 9, color: '#ffffff', borde: '#7a3b1a', alinear: 'centro' });
    } else if (paso === 6) {
      const x = 104 + t * 1.1;
      if (Math.floor(t / 16) % 2) pose('hercules_salta', x, suelo - 4 - Math.abs(Math.sin(t / 8)) * 20, 1, eh, { centrar: true });
      else perroCorre(x, 1);
      if (Math.floor(t / 12) % 2) dibujarTexto(ctx, '¡GUAU! ¡GUAU!', x, suelo - 62, { tam: 9, color: '#ffffff', borde: '#7a3b1a', alinear: 'centro' });
    } else if (paso === 7) {
      perroCorre(255 + t * 1.8, 1);   // corre tras el cóndor
    } else if (paso === 8) {
      const x = Math.max(228, 380 - t * 2.4);
      if (x > 228) perroCorre(x, -1); else pose('hercules_sentado', 228, suelo, -1, eh, { centrar: true });
    } else {
      pose('hercules_sentado', 228, suelo, -1, eh, { centrar: true });
    }
    // Nato y la paliza de caricatura
    const xNato = 200;
    if (paso === 5) {
      for (let i = 0; i < 3; i++) pose(Math.floor((t + i * 7) / 8) % 2 ? 'minero_golpe' : 'minero_caminar1', xNato + 30 + i * 14 - Math.min(1, t / 30) * 20, suelo, -1, em);
      ctx.fillStyle = 'rgba(225,215,195,0.92)';
      for (let i = 0; i < 9; i++) {
        const a = i / 9 * Math.PI * 2 + t / 7;
        ctx.beginPath(); ctx.arc(xNato + 4 + Math.cos(a) * 18, suelo - 26 + Math.sin(a) * 12, 12 + Math.sin(t / 3 + i) * 3, 0, 7); ctx.fill();
      }
      for (const [dx, dy, txt] of [[-20, -54, '¡PAF!'], [16, -60, '¡POW!'], [-4, -10, '¡ZAS!']]) {
        if ((t / 10 + dx) % 3 < 1.6) dibujarTexto(ctx, txt, xNato + dx, suelo + dy, { tam: 10, color: '#ffffff', borde: '#b3201a', alinear: 'centro', grosor: 2.5 });
      }
    } else {
      if (paso >= 2 && paso <= 4) for (let i = 0; i < 3; i++) { // los secuaces, delante del jefe y a la vista
        const xs = xJefe - 62 + i * 19, caminando = paso === 2 && t < 100;
        if (!(caminando && anim('minero_caminar', this.tt / 3.4 + i * 5, xs, suelo + i * 2, -1, em))) pose('minero_caminar1', xs, suelo + i * 2, -1, em);
      }
      if (paso >= 6 && paso <= 7) for (let i = 0; i < 3; i++) pose(Math.floor((this.tt + i * 9) / 10) % 2 ? 'minero_caminar1' : 'minero_caminar2', xNato + 30 + i * 16 + sevan * 180, suelo, 1, em);
      if (paso >= 6 && paso <= 7) {
        pose('nato_herido', xNato, suelo + 2, -1, ez, { rot: -1.45 });
        if (this.tt % 30 === 0) estrellasIntro.push([xNato - 10, suelo - 14, 30]);
      } else {
        const libroEnSuelo = paso >= 6 && paso < 8;
        pose(paso >= 9 ? 'nato_victoria' : 'nato_quieto', xNato, suelo, paso >= 8 ? -1 : -1, ez);
        if (paso >= 9) { // el libro brilla
          const r = 22 + Math.sin(this.tt / 6) * 4;
          const g = ctx.createRadialGradient(xNato + 10, suelo - 54, 2, xNato + 10, suelo - 54, r);
          g.addColorStop(0, 'rgba(255,220,140,0.95)'); g.addColorStop(1, 'rgba(217,133,59,0)');
          ctx.fillStyle = g; ctx.beginPath(); ctx.arc(xNato + 10, suelo - 54, r, 0, 7); ctx.fill();
          if (this.tt % 3 === 0) estrellasIntro.push([xNato + 10 + azarJ(-20, 20), suelo - 54 + azarJ(-20, 20), 25]);
        }
        if (libroEnSuelo) objeto('apunte', 158, suelo, 14);
      }
    }
    for (const s of estrellasIntro) {
      s[2]--; s[1] -= 0.3;
      dibujarTexto(ctx, '✦', s[0], s[1], { tam: 7, color: '#ffe066', alfa: s[2] / 30 });
    }
    estrellasIntro = estrellasIntro.filter(s => s[2] > 0);
    // diálogos
    if (texto && quien !== 'narra') {
      const pos = { nato: [xNato, suelo - 66], pedro: [xPedro, Math.max(30, yPedro - 64)], jefe: [xJefe, suelo - 98] }[quien];
      const nombre = { nato: 'NATO', pedro: 'PEDRO', jefe: 'JEFE DE LOS MINEROS' }[quien];
      burbujaTexto(pos[0], pos[1], nombre + ': ' + texto, 160);
    }
    if (quien === 'narra') narracion(texto);
    dibujarTexto(ctx, ENTRADA.esTactil ? 'A: siguiente · ❚❚: saltar escena' : 'ENTER: siguiente · ESC: saltar escena', W - 4, 3, { tam: 5, color: 'rgba(255,255,255,0.7)', alinear: 'der' });
  },
};
let estrellasIntro = [];
// El cóndor llevando a Pedro de los hombros: Pedro colgando (patalea), el cuerpo del cóndor por encima de su cabeza
// y las garras estiradas hasta los hombros. k = factor de tamaño (el mismo del menú), pies de Pedro en (x, y).
// alto del dibujo del cóndor (ciclo de aleteo) a un factor k, y altura de su centro para que no tape a quien lleva
function altoCondor(k) {
  const i = (typeof ANIM_INFO !== 'undefined') && ANIM_INFO.condor_volar;
  return i ? 46 * k * i.h / i.w : 41 * k;
}
// en el ciclo de aleteo las patas están abajo (95 % del alto) y un poco adelante del cuerpo: se ponen sobre los hombros
function hombrosDe(piesY, k) { return piesY - 32 * k * 0.80; }
function raptoCondorY(piesY, k) { return hombrosDe(piesY, k) - altoCondor(k) * 0.45; }
function raptoCondorDX(k) { return -46 * k * 0.05; }
function dibujarRapto(x, y, k, tt) {
  const ep = escalaFam('pedro') * k, ec = escalaFam('condor') * k;
  const kick = Math.floor(tt / 10) % 2;
  // primero el cóndor (sus patas quedan en los hombros) y Pedro delante: así se ve que lo sujeta, sin dibujar garras aparte
  const cy = raptoCondorY(y, k), cx = x + raptoCondorDX(k);
  if (!anim('condor_volar', tt / 1.7, cx, cy, 1, ec, { medio: true })) pose('condor_vuela', cx, cy, 1, ec, { medio: true, centrar: true });
  pose(kick ? 'pedro_llevado2' : (SPRITES_INFO.pedro_llevado ? 'pedro_llevado' : 'pedro_colgado'), x, y + (kick ? 0.6 * k : 0), 1, ep);
}

// El cóndor lanza a Nato a la olla de fundición (chiste de caricatura)
const ESC_OLLA = {
  entrar() { this.t = 0; pararMusica(); tocarMusica('olla'); },
  actualizar() {
    this.t++;
    if (this.t === 95) efecto('quemado');
    if (this.t > 260 || (this.t > 100 && aceptarMenu())) {
      if (this.saliendo) return;
      this.saliendo = true;
      J.escena = ESC_JUEGO; J.nombre = 'juego';
      S.jug.estado = 'fuera';
      perderVida('olla');
      this.saliendo = false;
    }
  },
  dibujar() {
    ctx.setTransform(ESC, 0, 0, ESC, 0, 0);
    fondoCompleto('fundicion', 0.35);
    ctx.fillStyle = 'rgba(120,30,10,0.25)'; ctx.fillRect(0, 0, W, H);
    const t = this.t, ollaX = 160;
    objeto('olla', ollaX - 50, 176, 100);
    const ez = escalaFam('nato') * 1.6, ec = escalaFam('condor') * 1.3;
    if (t < 70) { // el cóndor cruza con Nato
      const k = t / 70, cx = -30 + k * 190, cy = 30 + Math.sin(k * 3) * 6;
      pose('nato_colgado', cx, cy + 58, 1, ez);
      pose('condor_picada', cx, cy, 1, ec, { medio: true, centrar: true });
    } else if (t < 95) { // lo suelta y cae
      const k = (t - 70) / 25;
      pose('nato_colgado', ollaX, 88 + k * 60, 1, ez, { rot: k * 2 });
      pose('condor_vuela', 160 + (t - 70) * 3, 30 - (t - 70), 1, ec, { medio: true, centrar: true });
    } else if (t < 120) { // ¡splash!
      if (t % 2 === 0) for (let i = 0; i < 3; i++) estrellasIntro.push([ollaX + azarJ(-30, 30), 120 + azarJ(-10, 5), 20]);
      dibujarTexto(ctx, '¡FSSSSHHH!', ollaX, 70, { tam: 16, color: '#ffe066', borde: '#b3201a', alinear: 'centro', grosor: 3 });
    } else { // sale disparado, tiznado y con los pantalones humeando
      const k = (t - 120) / 140;
      const x = ollaX + Math.sin(k * 14) * 60 + k * 160, y = 160 - Math.abs(Math.sin(k * 20)) * 10;
      pose(Math.floor(t / 6) % 2 ? 'nato_correr1' : 'nato_correr2', x, y, Math.cos(k * 14) > 0 ? 1 : -1, ez, { tizne: true });
      for (let i = 0; i < 2; i++) estrellasIntro.push([x - 4 + azarJ(-3, 3), y - 22, 25]);
      dibujarTexto(ctx, '¡AY, AY, AY!', x, y - 72, { tam: 11, color: '#ffffff', borde: '#b3201a', alinear: 'centro', grosor: 2.5 });
    }
    for (const s of estrellasIntro) { s[2]--; s[1] -= 0.6; ctx.fillStyle = `rgba(90,85,95,${s[2] / 25})`; ctx.beginPath(); ctx.arc(s[0], s[1], 3, 0, 7); ctx.fill(); }
    estrellasIntro = estrellasIntro.filter(s => s[2] > 0);
    dibujarTexto(ctx, 'El cóndor lanzó a Nato a la olla de fundición', W / 2, 8, { tam: 7.5, color: '#ffffff', borde: '#1a1420', alinear: 'centro' });
    if (t > 130) dibujarTexto(ctx, '-1 VIDA', W / 2, 22, { tam: 12, color: '#ff6a5a', borde: '#1a1420', alinear: 'centro', grosor: 2.5 });
  },
};

// Resumen del nivel
const ESC_RESUMEN = {
  entrar() { this.t = 0; tocarMusica('creditos'); this.seg = Math.round(P.cuadros / 60); },
  actualizar() { this.t++; if (this.t > 40 && aceptarMenu()) fundir(() => irA(P.nivel === 4 ? 'creditos' : 'continuara')); },
  dibujar() {
    ctx.setTransform(ESC, 0, 0, ESC, 0, 0);
    const def = S.N.def;
    fondoCompleto(def.fondoResumen, 0.6);
    dibujarTexto(ctx, def.numero === 4 ? '¡JUEGO COMPLETADO!' : `¡NIVEL ${def.numero} COMPLETADO!`, W / 2, 10, { tam: 15, color: '#ffd25a', borde: '#3a1608', alinear: 'centro', grosor: 3 });
    dibujarTexto(ctx, `${def.nombreCorto || 'Pueblo Hundido'} · ${def.epoca}`, W / 2, 30, { tam: 7.5, color: '#ffffff', borde: '#1a1420', alinear: 'centro' });
    const filas = [
      ['Pepitas de cobre', `${P.pepitas} de ${S.totalPepitas}`], ['Apuntes del libro', `${P.apuntes.size} de 5`],
      ['Mineros noqueados', String(P.noqueados)], ['Cóndores pateados', String(P.condores)],
      ['Tiempo', `${Math.floor(this.seg / 60)}:${String(this.seg % 60).padStart(2, '0')}`], ['Puntaje', String(P.puntos)],
    ];
    caja(ctx, 40, 42, 240, 66, 'rgba(10,12,24,0.7)', '#d9853b');
    filas.forEach(([a, b], i) => {
      if (this.t < 10 + i * 8) return;
      dibujarTexto(ctx, a, 52, 47 + i * 10, { tam: 7, color: '#e8e0cf' });
      dibujarTexto(ctx, b, 268, 47 + i * 10, { tam: 7, color: '#ffd58a', alinear: 'der' });
    });
    let y = 114;
    for (const parr of S.N.def.tarjetaFinal) {
      for (const l of partirTexto(parr, 270, { tam: 6.5, negrita: false })) { dibujarTexto(ctx, l, W / 2, y, { tam: 6.5, color: '#ffffff', alinear: 'centro', negrita: false, borde: '#1a1420', grosor: 1.4 }); y += 8.5; }
      y += 3;
    }
    if (this.t > 40 && Math.floor(this.t / 25) % 2) dibujarTexto(ctx, ENTRADA.esTactil ? 'Toca A para seguir' : 'ENTER para seguir', W / 2, 168, { tam: 6, color: '#ffd58a', alinear: 'centro' });
  },
};

// Continuará: el cóndor sube con Pedro hacia el nido
const ESC_CONTINUARA = {
  entrar() { this.t = 0; },
  actualizar() {
    this.t++;
    if (this.t > 60 && aceptarMenu()) {
      if (P.nivel < 3) { const n = P.nivel + 1; fundir(() => { pasarDeNivel(n); irA('tarjeta'); }); }
      else fundir(() => irA('memoria'));
    }
  },
  dibujar() {
    ctx.setTransform(ESC, 0, 0, ESC, 0, 0);
    const uno = P.nivel === 1, tres = P.nivel === 3;
    fondoCompleto(uno ? 'sewell' : tres ? 'tormenta' : 'tejados', 0.25);
    const k = Math.min(1, this.t / 360);
    if (!tres) dibujarRapto(30 + k * 330, 150 - k * 210, 1.2, this.t);   // antes de la memoria de 1945, nada de caricatura
    narracion(uno ? 'El cóndor sigue subiendo con Pedro hacia su nido, en lo más alto de Sewell. Nato no se rinde: ¡la persecución continúa por la ciudad de las escaleras!'
      : tres ? 'Nato ya sabe dónde está el nido. Pero antes de seguir, la historia de Sewell guarda un día que no se olvida.'
        : 'El cóndor sigue volando con Pedro hacia lo más alto de Sewell. Nato no se rinde: ¡la persecución continúa en los años de oro de la ciudad!');
    dibujarTexto(ctx, tres ? 'ANTES DE SEGUIR' : 'SIGUIENTE NIVEL', W / 2, 8, { tam: 14, color: '#ffd25a', borde: '#3a1608', alinear: 'centro', grosor: 3 });
    dibujarTexto(ctx, uno ? 'Nivel 2: La ciudad de las escaleras (1917 – 1930)' : tres ? '19 de junio de 1945' : 'Nivel 3: El apogeo (años 30 y 40)', W / 2, 28, { tam: 7, color: '#ffffff', borde: '#1a1420', alinear: 'centro' });
    if (this.t > 60 && Math.floor(this.t / 25) % 2) dibujarTexto(ctx, ENTRADA.esTactil ? 'Toca A para seguir' : 'ENTER para seguir', W / 2, 40, { tam: 6, color: '#ffd58a', alinear: 'centro', borde: '#1a1420' });
  },
};

// Menú de trucos (oculto): se abre en el título escribiendo NATO, o con ↑ ↑ ↓ ↓ ← → ← →.
// Sirve para probar: elegir nivel, punto de partida (cada fogata o justo antes del final) y jugar sin recibir daño.
function puntosDePartida(n) {
  const N = NIVELES[n].construir(), zonas = NIVELES[n].zonas();
  const zonaDe = x => { let z = zonas[0][1]; for (const q of zonas) if (x / T >= q[0]) z = q[1]; return z; };
  const lista = N.entidades.filter(d => d.tipo === 'fogata').sort((a, b) => a.x - b.x)
    .map((d, i) => ({ x: d.x, y: d.y - 14, nombre: i === 0 ? 'El comienzo' : zonaDe(d.x + 5 * T) }));   // la fogata está justo antes de su zona
  if (N.puntoFinal) lista.push({ x: N.puntoFinal.x, y: N.puntoFinal.y, nombre: 'Justo antes del final' });
  return lista;
}
function partirEn(punto) {   // deja a Nato en ese punto, con las fogatas anteriores ya encendidas
  for (const e of S.ents) if (e.tipo === 'fogata' && e.x <= punto.x + 4) e.encendida = true;
  S.checkpoint = { x: punto.x, y: punto.y };
  // si se parte después de la arena de un jefe, ese jefe ya quedó atrás (y Pedro ya fue rescatado)
  for (const e of S.ents) if ((e.tipo === 'condorJefe' || e.tipo === 'jefe') && e.x1 < punto.x) e.vivo = false;
  for (const e of S.ents) if (e.tipo === 'pedroNido' && S.N.rescate && punto.x >= S.N.rescate.x - T) e.rescatado = true;
  Object.assign(S.jug, crearJugador(punto.x, punto.y));
  S.cam.x = limitar(S.jug.x - W / 2, 0, S.N.ancho * T - W);
  S.cam.y = limitar(S.jug.y - H * 0.6, 0, S.N.alto * T - H);
}
const ESC_TRUCOS = {
  entrar() { this.t = 0; this.sel = 0; this.nivel = this.nivel || 1; this.punto = 0; this.invencible = !!this.invencible; this.puntos = puntosDePartida(this.nivel); },
  opciones() {
    const p = this.puntos[this.punto];
    return [['nivel', 'Nivel: ' + this.nivel + ' · ' + NIVELES[this.nivel].def.nombreCorto],
      ['punto', 'Partir en: ' + p.nombre + ' (' + (this.punto + 1) + ' de ' + this.puntos.length + ')'],
      ['invencible', 'Invencible: ' + (this.invencible ? 'SÍ' : 'NO')], ['dificultad', 'Dificultad: ' + DIF().nombre],
      ['jugar', '¡Jugar!'], ['inicio', 'Ver la escena de inicio'], ['volver', 'Volver al título']];
  },
  cambiar(k, d) {
    if (k === 'nivel') { this.nivel = (this.nivel - 1 + d + 4) % 4 + 1; this.puntos = puntosDePartida(this.nivel); this.punto = 0; }
    else if (k === 'punto') this.punto = (this.punto + d + this.puntos.length) % this.puntos.length;
    else if (k === 'invencible') this.invencible = !this.invencible;
    else if (k === 'dificultad') J.dificultad = ORDEN_DIF[(ORDEN_DIF.indexOf(J.dificultad) + d + 3) % 3];
    efecto('menu');
  },
  actualizar() {
    this.t++;
    const op = this.opciones(), k = op[this.sel][0];
    if (presionado('arriba')) { this.sel = (this.sel + op.length - 1) % op.length; efecto('menu'); }
    if (presionado('abajo')) { this.sel = (this.sel + 1) % op.length; efecto('menu'); }
    if (presionado('izq')) this.cambiar(k, -1);
    if (presionado('der')) this.cambiar(k, 1);
    if (presionado('pausa')) { fundir(() => irA('titulo')); return; }
    const dig = ENTRADA.letras.match(/([1-9])$/);
    if (dig && NIVELES[+dig[1]] && +dig[1] !== this.nivel) { this.nivel = +dig[1]; this.puntos = puntosDePartida(this.nivel); this.punto = 0; efecto('menu'); }
    ENTRADA.letras = '';
    if (this.t > 10 && (aceptarMenu() || J.toque)) {
      J.toque = false; iniciarAudio(); efecto('aceptar');
      if (k === 'jugar') {
        const n = this.nivel, punto = this.puntos[this.punto], inv = this.invencible;
        J.invencible = inv; fundir(() => { nuevaPartida(n); empezarNivel(); partirEn(punto); irA('juego'); });
      } else if (k === 'inicio') { const inv = this.invencible; J.invencible = inv; fundir(() => { nuevaPartida(1); irA('intro'); }); }
      else if (k === 'volver') fundir(() => irA('titulo'));
      else this.cambiar(k, 1);
    }
  },
  dibujar() {
    ctx.setTransform(ESC, 0, 0, ESC, 0, 0);
    fondoCompleto(NIVELES[this.nivel].def.fondoResumen, 0.7);
    dibujarTexto(ctx, 'TRUCOS', W / 2, 10, { tam: 18, color: '#7dff8a', borde: '#10301a', alinear: 'centro', grosor: 3 });
    dibujarTexto(ctx, 'Para probar el juego sin pasarlo entero', W / 2, 32, { tam: 6.5, color: '#e8e0cf', borde: '#1a1420', alinear: 'centro' });
    this.opciones().forEach(([, txt], i) => {
      const sel = i === this.sel;
      dibujarTexto(ctx, (sel ? '▶ ' : '') + txt, W / 2, 48 + i * 15, { tam: 8.5, color: sel ? '#ffd25a' : '#ffffff', borde: '#1a1420', alinear: 'centro', grosor: 2 });
    });
    dibujarTexto(ctx, ENTRADA.esTactil ? '▲ ▼ elegir · ◀ ▶ cambiar · A aceptar' : '↑ ↓ elegir · ← → cambiar · ENTER aceptar · ESC volver',
      W / 2, 166, { tam: 6, color: '#c9d7ea', borde: '#1a1420', alinear: 'centro' });
  },
};

// Memoria · 19 de junio de 1945. No es un nivel: nieve, silencio, un casco con flores y un texto sobrio.
// Después, un fundido a negro y el salto de tiempo explícito antes del Nivel 4 (nada de lo que sigue celebra esas muertes).
const ESC_MEMORIA = {
  entrar() { this.t = 0; pararMusica(); this.copos = []; for (let i = 0; i < 70; i++) this.copos.push([Math.random() * W, Math.random() * H, 0.15 + Math.random() * 0.35]); },
  actualizar() { this.t++; if ((this.t > 420 && aceptarMenu()) || this.t > 1500) fundir(() => irA('saltoTiempo')); },
  dibujar() {
    ctx.setTransform(ESC, 0, 0, ESC, 0, 0);
    fondoCompleto('noche', 0.72);
    ctx.fillStyle = 'rgba(255,255,255,0.8)';
    for (const c of this.copos) { c[1] += c[2]; c[0] += Math.sin((this.t + c[1]) / 60) * 0.1; if (c[1] > H) c[1] = -2; ctx.beginPath(); ctx.arc(c[0], c[1], 0.7, 0, 7); ctx.fill(); }
    // casco de minero con flores, sobre la nieve
    const x = W / 2, y = 118;
    ctx.fillStyle = '#e8eef5'; ctx.beginPath(); ctx.ellipse(x, y + 8, 60, 6, 0, 0, 7); ctx.fill();
    ctx.fillStyle = '#d9a640'; ctx.beginPath(); ctx.arc(x, y, 14, Math.PI, 0); ctx.fill(); ctx.fillRect(x - 18, y - 1, 36, 4);
    ctx.fillStyle = '#7a5a1e'; ctx.fillRect(x - 3, y - 13, 6, 5); ctx.fillStyle = '#fff3b0'; ctx.fillRect(x - 2, y - 12, 4, 3);
    for (const [fx, fc] of [[-26, '#f2f2f2'], [-20, '#e8c8d8'], [22, '#f2f2f2'], [28, '#f4e2a0'], [-14, '#ffffff']]) {
      ctx.fillStyle = '#4a6a3a'; ctx.fillRect(x + fx, y - 2, 0.8, 9);
      ctx.fillStyle = fc; for (let k = 0; k < 5; k++) { ctx.beginPath(); ctx.arc(x + fx + Math.cos(k * 1.25) * 1.8, y - 3 + Math.sin(k * 1.25) * 1.8, 1.2, 0, 7); ctx.fill(); }
    }
    const a = t0 => Math.max(0, Math.min(1, (this.t - t0) / 60));
    dibujarTexto(ctx, '19 de junio de 1945', W / 2, 14, { tam: 11, color: '#e8eef5', borde: '#10121a', alinear: 'centro', alfa: a(20), grosor: 2 });
    const lineas = ['Un incendio en un taller del nivel Teniente Uno llenó de humo las galerías de la mina.',
      'Murieron 355 trabajadores. Quedaron 150 viudas y más de 400 niños huérfanos.',
      'De aquel dolor nacieron los departamentos de seguridad industrial y de bienestar para los trabajadores y sus familias.'];
    let yy = 36;
    lineas.forEach((l, i) => { for (const s2 of partirTexto(l, 280, { tam: 7 })) { dibujarTexto(ctx, s2, W / 2, yy, { tam: 7, color: '#d9dde6', borde: '#10121a', alinear: 'centro', alfa: a(80 + i * 100) }); yy += 9.5; } yy += 3; });
    if (this.t > 420 && Math.floor(this.t / 30) % 2) dibujarTexto(ctx, ENTRADA.esTactil ? 'Toca A para seguir' : 'ENTER para seguir', W / 2, 166, { tam: 5.5, color: '#9aa3b5', alinear: 'centro' });
  },
};
const ESC_SALTO_TIEMPO = {
  entrar() { this.t = 0; },
  actualizar() { this.t++; if ((this.t > 120 && aceptarMenu()) || this.t > 420) fundir(() => { pasarDeNivel(4); irA('tarjeta'); }); },
  dibujar() {
    ctx.setTransform(ESC, 0, 0, ESC, 0, 0);
    ctx.fillStyle = '#07060b'; ctx.fillRect(0, 0, W, H);
    const a = Math.min(1, this.t / 60);
    dibujarTexto(ctx, 'Años después…', W / 2, 62, { tam: 12, color: '#e8e0cf', alinear: 'centro', alfa: a });
    dibujarTexto(ctx, '1967', W / 2, 84, { tam: 20, color: '#ffffff', alinear: 'centro', alfa: Math.min(1, Math.max(0, (this.t - 60) / 60)), borde: '#1a1420', grosor: 3 });
  },
};
const ESC_PROXIMAMENTE = {
  entrar() { this.t = 0; },
  actualizar() { this.t++; if ((this.t > 60 && aceptarMenu()) || this.t > 600) fundir(() => irA('creditos')); },
  dibujar() {
    ctx.setTransform(ESC, 0, 0, ESC, 0, 0);
    fondoCompleto('sewell', 0.45);
    dibujarTexto(ctx, 'CONTINUARÁ...', W / 2, 30, { tam: 14, color: '#ffd25a', borde: '#3a1608', alinear: 'centro', grosor: 3 });
    dibujarTexto(ctx, 'Nivel 4: El cobre es de Chile y el último tren (1967 – 1981)', W / 2, 52, { tam: 7, color: '#ffffff', borde: '#1a1420', alinear: 'centro' });
    dibujarTexto(ctx, 'Próximamente', W / 2, 66, { tam: 8, color: '#ffe8b0', borde: '#1a1420', alinear: 'centro' });
    if (this.t > 60 && Math.floor(this.t / 25) % 2) dibujarTexto(ctx, ENTRADA.esTactil ? 'Toca A para seguir' : 'ENTER para seguir', W / 2, 160, { tam: 6, color: '#ffd58a', alinear: 'centro', borde: '#1a1420' });
  },
};

// ---------- El cierre del juego
// 1981: el último tren se fue y Sewell queda en silencio (sin música, sin puntaje)
const ESC_SILENCIO = {
  entrar() { this.t = 0; pararMusica(); this.copos = []; for (let i = 0; i < 60; i++) this.copos.push([Math.random() * W, Math.random() * H, 0.15 + Math.random() * 0.3]); },
  actualizar() { this.t++; if ((this.t > 360 && aceptarMenu()) || this.t > 900) fundir(() => irA('patrimonio')); },
  dibujar() {
    ctx.setTransform(ESC, 0, 0, ESC, 0, 0);
    fondoCompleto('sewell_vacio', 0.35);
    ctx.fillStyle = 'rgba(255,255,255,0.75)';
    for (const c of this.copos) { c[1] += c[2]; if (c[1] > H) c[1] = -2; ctx.beginPath(); ctx.arc(c[0], c[1], 0.7, 0, 7); ctx.fill(); }
    const a = t0 => Math.max(0, Math.min(1, (this.t - t0) / 60));
    dibujarTexto(ctx, '1981', W / 2, 30, { tam: 16, color: '#e8eef5', borde: '#10121a', alinear: 'centro', alfa: a(10), grosor: 2.5 });
    let y = 58;
    for (const [t0, l] of [[70, 'Baja por última vez el tren desde la estación Sewell hasta Rancagua.'], [190, 'Después de 76 años, Sewell queda en silencio.']]) {
      for (const s2 of partirTexto(l, 270, { tam: 8 })) { dibujarTexto(ctx, s2, W / 2, y, { tam: 8, color: '#d9dde6', borde: '#10121a', alinear: 'centro', alfa: a(t0) }); y += 11; }
      y += 6;
    }
    if (this.t > 360 && Math.floor(this.t / 30) % 2) dibujarTexto(ctx, ENTRADA.esTactil ? 'Toca A para seguir' : 'ENTER para seguir', W / 2, 166, { tam: 5.5, color: '#9aa3b5', alinear: 'centro' });
  },
};
// 2006: Patrimonio de la Humanidad (el salto de tiempo antes de la alegría del final)
const ESC_PATRIMONIO = {
  entrar() { this.t = 0; tocarMusica('titulo'); },
  actualizar() { this.t++; if ((this.t > 300 && aceptarMenu()) || this.t > 1100) fundir(() => irA('plazaFinal')); },
  dibujar() {
    ctx.setTransform(ESC, 0, 0, ESC, 0, 0);
    fondoCompleto('sewell', 0.5);
    const a = t0 => Math.max(0, Math.min(1, (this.t - t0) / 50));
    dibujarTexto(ctx, '13 de julio de 2006', W / 2, 14, { tam: 10, color: '#ffffff', borde: '#1a1420', alinear: 'centro', alfa: a(10) });
    dibujarTexto(ctx, 'SEWELL, PATRIMONIO DE LA HUMANIDAD', W / 2, 30, { tam: 12, color: '#ffd25a', borde: '#3a1608', alinear: 'centro', alfa: a(40), grosor: 3 });
    dibujarTexto(ctx, 'declarado por la UNESCO por tres valores:', W / 2, 52, { tam: 7, color: '#ffe8b0', borde: '#1a1420', alinear: 'centro', alfa: a(90) });
    ['Minero e industrial', 'Arquitectónico: los «Cuadrados y Triángulos» de sus 253 edificios de colores', 'Cultural: la vida en común de mineros norteamericanos y campesinos chilenos']
      .forEach((l, i) => dibujarTexto(ctx, '· ' + l, W / 2, 66 + i * 11, { tam: 6.6, color: '#ffffff', borde: '#1a1420', alinear: 'centro', alfa: a(130 + i * 30) }));
    dibujarTexto(ctx, 'En 1998 ya había sido declarado Monumento Nacional.', W / 2, 110, { tam: 6.4, color: '#e8e0cf', borde: '#1a1420', alinear: 'centro', alfa: a(230) });
    dibujarTexto(ctx, 'Más de 500.000 personas pasaron por Sewell entre 1905 y 1981.', W / 2, 122, { tam: 6.4, color: '#e8e0cf', borde: '#1a1420', alinear: 'centro', alfa: a(260) });
    if (this.t > 300 && Math.floor(this.t / 30) % 2) dibujarTexto(ctx, ENTRADA.esTactil ? 'Toca A para seguir' : 'ENTER para seguir', W / 2, 166, { tam: 5.5, color: '#ffd58a', alinear: 'centro', borde: '#1a1420' });
  },
};
// Hoy, en la plaza de Sewell: Nato y su papá terminan la presentación del libro
const GUION_PLAZA = [
  [180, 'pedro', 'Como les decía antes de que nos interrumpieran… ¡esta es la historia de Sewell!'],
  [150, 'nato', '¡Imagínate el resultado!', 'imaginate'],
  [130, 'diego', '¡Bravo, Nato! ¡Bravo, don Pedro!'],
  [170, 'nato', '¡Me siento muy orgulloso!', 'orgulloso'],
  [170, 'pedro', 'Gracias a todos los sewellinos y sewellinas. Este libro es para ellos.'],
  [200, 'fin', null],
];
const ESC_PLAZA_FINAL = {
  entrar() { this.t = 0; this.paso = 0; this.tt = 0; tocarMusica('creditos'); },
  actualizar() {
    this.t++; this.tt++;
    const [base, , texto, vozClave] = GUION_PLAZA[this.paso], dur = lectura(texto, base);
    if (this.t === 1 && vozClave) voz(vozClave);
    if (this.t > dur || (this.t > 30 && aceptarMenu())) {
      if (this.paso < GUION_PLAZA.length - 1) { this.paso++; this.t = 0; }
      else fundir(() => irA('resumen'));
    }
  },
  dibujar() {
    ctx.setTransform(ESC, 0, 0, ESC, 0, 0);
    fondoCompleto('sewell', 0.05);
    const suelo = 168, k = 1.9;
    // el público aplaude
    for (const [nom, x, d] of [['mujer', 22, 1], ['mujer', 48, 1], ['mujer', 294, -1]]) pose(nom, x, suelo + Math.abs(Math.sin((this.tt + x) / 8)) * -1.5, d, escalaFam(nom) * k);
    pose('pedro_quieto', 132, suelo, 1, escalaFam('pedro') * k);
    pose('hercules_sentado', 168, suelo, 1, escalaFam('hercules') * k, { centrar: true });
    pose('nato_quieto', 200, suelo, -1, escalaFam('nato') * k);
    if (SPRITES_INFO.diego_saluda) pose(Math.floor(this.tt / 40) % 2 ? 'diego_saluda' : 'diego_chaqueta', 252, suelo, -1, escalaFam('diego') * k);
    const [, quien, texto] = GUION_PLAZA[this.paso];
    if (quien === 'fin') {
      const a = Math.min(1, this.t / 40);
      dibujarTexto(ctx, 'FIN', W / 2, 30, { tam: 26, color: '#ffcf6a', borde: '#3a1608', alinear: 'centro', grosor: 4, alfa: a });
      dibujarTexto(ctx, 'Nato y la ciudad de las escaleras', W / 2, 62, { tam: 9, color: '#ffffff', borde: '#1a1420', alinear: 'centro', alfa: a });
    } else if (texto) {
      const xb = { pedro: 132, nato: 200, diego: 252 }[quien];
      burbujaTexto(xb, suelo - 70, (quien === 'diego' ? 'DIEGO: ' : quien === 'pedro' ? 'PEDRO: ' : 'NATO: ') + texto, 160);
    }
    if (Math.floor(this.tt / 12) % 3 === 0) for (const x of [22, 48, 294]) dibujarTexto(ctx, '¡clap!', x, suelo - 74, { tam: 5, color: '#ffffff', borde: '#1a1420', alinear: 'centro' });
  },
};

// Tarjeta de entrada a un nivel: nombre, época y de qué se trata
const ESC_TARJETA = {
  entrar() { this.t = 0; pararMusica(); },
  actualizar() {
    this.t++;
    if ((this.t > 50 && aceptarMenu()) || this.t > 720) fundir(() => { empezarNivel(); irA('juego'); });
  },
  dibujar() {
    ctx.setTransform(ESC, 0, 0, ESC, 0, 0);
    const def = NIVELES[P.nivel].def;
    fondoCompleto(def.fondoResumen, 0.45);
    const a = Math.min(1, this.t / 30);
    dibujarTexto(ctx, 'NIVEL ' + def.numero, W / 2, 22, { tam: 12, color: '#ffffff', borde: '#1a1420', alinear: 'centro', alfa: a, grosor: 2.5 });
    const tamT = Math.min(16, 16 * 290 / anchoTexto(def.nombreCorto.toUpperCase(), { tam: 16 }));   // que el nombre quepa en pantalla
    dibujarTexto(ctx, def.nombreCorto.toUpperCase(), W / 2, 40 + (16 - tamT) / 2, { tam: tamT, color: '#ffd25a', borde: '#3a1608', alinear: 'centro', alfa: a, grosor: 3.5 });
    dibujarTexto(ctx, def.epoca, W / 2, 62, { tam: 9, color: '#ffe8b0', borde: '#1a1420', alinear: 'centro', alfa: a });
    if (this.t > 30 && def.intro) narracion(def.intro, Math.min(1, (this.t - 30) / 30));
    if (this.t > 50 && Math.floor(this.t / 25) % 2) dibujarTexto(ctx, ENTRADA.esTactil ? 'Toca A para empezar' : 'ENTER para empezar', W / 2, 78, { tam: 6, color: '#ffd58a', alinear: 'centro', borde: '#1a1420' });
  },
};

// Créditos de Wolky Tech
const CREDITOS = [
  ['t', 'EL TENIENTE'], ['s', 'Nato y la ciudad de las escaleras'], ['e', ''],
  ['c', 'Un juego de'], ['logo', ''], ['t2', 'WOLKY TECH'], ['e', ''],
  ['c', 'Basado en el libro'], ['s', '«Apuntes Históricos de El Mineral El Teniente»'], ['c', 'de Pedro Villagra Díaz'], ['e', ''],
  ['c', 'y en la serie documental anime «El Teniente»'], ['e', ''],
  ['c', 'Protagonista y voz'], ['s', 'Ignacio «Nato» Villagra'], ['e', ''],
  ['c', 'Diseño, programación, ilustración y música'], ['s', 'Wolky Tech, con inteligencia artificial local'], ['e', ''],
  ['c', 'YouTube'], ['s', '@wolkytech'], ['c', 'Instagram'], ['s', '@wolky_ia'],
  ['c', 'Web y contacto'], ['s', 'wolky.cl · ventas@wolky.cl'], ['e', ''],
  ['c', 'Dedicado a todos los sewellinos y sewellinas.'], ['e', ''], ['s', '¡Gracias por jugar!'],
];
const ESC_CREDITOS = {
  entrar() { this.t = 0; tocarMusica('creditos'); this.dijo = false; },
  actualizar() {
    this.t++;
    if (this.t === 30) voz('gracias');
    if ((this.t > 30 && aceptarMenu()) || presionado('pausa') || this.t > 1500) fundir(() => irA('titulo'));
  },
  dibujar() {
    ctx.setTransform(ESC, 0, 0, ESC, 0, 0);
    fondoCompleto('noche', 0.55);
    let y = H + 10 - this.t * 0.32;
    const fin = 40;
    for (const [tipo, txt] of CREDITOS) {
      const yy = Math.max(y, fin + (tipo === 's' && txt.startsWith('¡Gracias') ? 0 : -9999));
      if (tipo === 'logo') { if (IMG.logo && IMG.logo.width) ctx.drawImage(IMG.logo, W / 2 - 16, y, 32, 32); y += 36; continue; }
      const op = { t: { tam: 18, color: '#ffcf6a', borde: '#3a1608', grosor: 3.5 }, t2: { tam: 14, color: '#8ec9ff', borde: '#14213d', grosor: 3 },
        s: { tam: 8.5, color: '#ffffff', borde: '#1a1420' }, c: { tam: 6.5, color: '#d9c7a5', borde: '#1a1420' }, e: null }[tipo];
      if (op && yy > -20 && yy < H + 10) dibujarTexto(ctx, txt, W / 2, yy, Object.assign({ alinear: 'centro' }, op));
      y += tipo === 'e' ? 8 : op.tam + 4;
    }
  },
};

// Fin del juego
const ESC_GAMEOVER = {
  entrar() { this.t = 0; this.sel = 0; pararMusica(); tocarMusica('derrota'); },
  actualizar() {
    this.t++;
    if (presionado('arriba') || presionado('abajo')) { this.sel = 1 - this.sel; efecto('menu'); }
    if (this.t > 40 && aceptarMenu()) {
      efecto('aceptar');
      if (this.sel === 0) { const n = P.nivel; fundir(() => { nuevaPartida(n); empezarNivel(); irA('juego'); }); }
      else fundir(() => irA('titulo'));
    }
  },
  dibujar() {
    ctx.setTransform(ESC, 0, 0, ESC, 0, 0);
    fondoCompleto('noche', 0.7);
    dibujarTexto(ctx, 'FIN DEL JUEGO', W / 2, 40, { tam: 20, color: '#ff8a6a', borde: '#3a1608', alinear: 'centro', grosor: 3.5 });
    pose('nato_herido', W / 2, 120, 1, escalaFam('nato') * 1.4, { rot: -1.45 });
    ['Reintentar el nivel', 'Volver al título'].forEach((txt, i) => dibujarTexto(ctx, (i === this.sel ? '▶ ' : '') + txt, W / 2, 130 + i * 14, { tam: 9, color: i === this.sel ? '#ffd25a' : '#ffffff', borde: '#1a1420', alinear: 'centro' }));
  },
};

const ESCENAS = { titulo: ESC_TITULO, trucos: ESC_TRUCOS, silencio: ESC_SILENCIO, patrimonio: ESC_PATRIMONIO, plazaFinal: ESC_PLAZA_FINAL, memoria: ESC_MEMORIA, saltoTiempo: ESC_SALTO_TIEMPO, proximamente: ESC_PROXIMAMENTE, tarjeta: ESC_TARJETA, intro: ESC_INTRO, juego: ESC_JUEGO, olla: ESC_OLLA, resumen: ESC_RESUMEN, continuara: ESC_CONTINUARA, creditos: ESC_CREDITOS, gameover: ESC_GAMEOVER };
function irA(nombre) { J.nombre = nombre; J.escena = ESCENAS[nombre]; if (J.escena.entrar) J.escena.entrar(); }
function fundir(alMedio) { if (!J.fundido) J.fundido = { t: 0, dur: 36, alMedio, hecho: false }; }

// ------------------------------------------------------------------ bucle principal
function paso() {
  actualizarEntrada();
  J.cuadros++;
  if (J.fundido) {
    J.fundido.t++;
    if (!J.fundido.hecho && J.fundido.t >= J.fundido.dur / 2) { J.fundido.hecho = true; J.fundido.alMedio(); }
    if (J.fundido.t >= J.fundido.dur) J.fundido = null;
    if (J.fundido && !J.fundido.hecho) return;
  }
  J.escena.actualizar();
  J.toque = false;
}
function dibujar() {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = '#000'; ctx.fillRect(0, 0, lienzo.width, lienzo.height);
  J.escena.dibujar();
  // subtítulo de lo que dice Nato
  const sub = AUDIO.subtitulo;
  if (sub && sub.texto && performance.now() < sub.hasta) {
    ctx.setTransform(ESC, 0, 0, ESC, 0, 0);
    const txt = 'NATO: ' + sub.texto, op = { tam: 8 };
    const w = anchoTexto(txt, op) + 14;
    caja(ctx, W / 2 - w / 2, H - 24, w, 13, 'rgba(10,12,24,0.78)', '#d9853b');
    dibujarTexto(ctx, txt, W / 2, H - 22, { tam: 8, color: '#fff3dc', alinear: 'centro' });
  }
  if (J.fundido) {
    const k = J.fundido.t / J.fundido.dur;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = `rgba(0,0,0,${1 - Math.abs(k * 2 - 1)})`; ctx.fillRect(0, 0, lienzo.width, lienzo.height);
  }
}
let _ultimo = 0, _acum = 0;
function bucle(ahora) {
  requestAnimationFrame(bucle);
  if (!J.bucleActivo) return;
  if (!_ultimo) _ultimo = ahora;
  _acum += Math.min(100, ahora - _ultimo);
  _ultimo = ahora;
  let n = 0;
  while (_acum >= 1000 / 60 && n < 5) { paso(); _acum -= 1000 / 60; n++; }
  dibujar();
}
function ajustarTamano() {
  // el área que de verdad se ve (en el celular, sin las barras del navegador)
  const vv = window.visualViewport, ancho = vv ? vv.width : window.innerWidth, alto = vv ? vv.height : window.innerHeight;
  const r = Math.min(ancho / (W * ESC), alto / (H * ESC));
  lienzo.style.width = Math.floor(W * ESC * r) + 'px';
  lienzo.style.height = Math.floor(H * ESC * r) + 'px';
}

window.addEventListener('load', () => {
  lienzo = document.getElementById('pantalla');
  lienzo.width = W * ESC; lienzo.height = H * ESC;
  ctx = lienzo.getContext('2d');
  ctx.imageSmoothingQuality = 'high';
  ajustarTamano();
  window.addEventListener('resize', ajustarTamano);
  if (window.visualViewport) window.visualViewport.addEventListener('resize', ajustarTamano);
  window.addEventListener('orientationchange', () => setTimeout(ajustarTamano, 350));   // el iPhone tarda en informar el tamaño nuevo
  prepararTactil();
  lienzo.addEventListener('pointerdown', () => { iniciarAudio(); if (['titulo', 'trucos', 'tarjeta', 'resumen', 'continuara', 'creditos', 'memoria', 'saltoTiempo', 'proximamente', 'silencio', 'patrimonio', 'plazaFinal'].includes(J.nombre)) J.toque = true; });
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.fillStyle = '#000'; ctx.fillRect(0, 0, lienzo.width, lienzo.height);
  cargarImagenes(() => { irA('titulo'); requestAnimationFrame(bucle); });
});

// Ganchos para las pruebas automáticas (no afectan el juego normal)
window.PRUEBA = {
  J, get P() { return P; }, get S() { return S; }, ENTRADA, irA, nuevaPartida, empezarNivel,
  pausarBucle(v) { J.bucleActivo = !v; },
  // solo con el servidor de pruebas: manda la imagen del lienzo para guardarla
  async capturar(n) { await fetch('/captura?n=' + n, { method: 'POST', body: lienzo.toDataURL('image/png') }); return n; },
  // lista de [cuadros, teclas] → resumen del estado tras cada tramo
  seq(lista) {
    return lista.map(([n, k]) => { const e = this.pasos(n, k); return `${e.x},${e.y} ${e.est} c${e.cor} v${e.vidas} p${e.pep} a${e.ap}${e.modal ? ' MODAL' : ''}${e.escena !== 'juego' ? ' ' + e.escena : ''}`; });
  },
  // piloto automático simple: corre a la derecha, salta vagonetas y ollas, da combos y patea cóndores
  bot(hastaX, maxF) {
    let f = 0; const log = [];
    while (f < maxF) {
      const p = S.jug;
      if (p.x / T >= hastaX || S.finale) break;
      const k = { der: true };
      const vag = S.ents.find(e => e.tipo === 'vagoneta' && e.x > p.x - 4 && e.x - p.x < 46 && Math.abs(e.y - p.y) < 30);
      const min = S.ents.find(e => e.tipo === 'minero' && !['ko', 'sevan', 'mareado'].includes(e.estado) && Math.abs(e.x - p.x) < 22 && Math.abs(e.y - p.y) < 20);
      const cond = S.ents.find(e => e.tipo === 'condor' && e.estado === 'picada' && Math.abs(e.x - p.x) < 50 && Math.abs(e.y - p.y) < 55);
      const olla = S.ents.find(e => e.tipo === 'olla' && e.x - p.x < 30 && e.x - p.x > 8);
      if ((vag || olla) && p.enSuelo) k.saltar = true;
      if (min) { k.der = false; if (f % 9 === 0) k.golpe = true; }
      if (cond) { k.saltar = true; if (!p.enSuelo) k.golpe = true; }
      if (p.estado === 'atrapado') k.saltar = f % 3 === 0;
      if (S.modal) { k.der = false; k.aceptar = f % 30 === 0; }
      // dinamita cerca: devolverla de un golpe o alejarse; Hércules cuando la barra está llena
      const din = S.ents.find(e => e.tipo === 'dinamita' && Math.abs(e.x - p.x) < 44 && Math.abs(e.y - p.y) < 40);
      if (din) { if (Math.abs(din.x - (p.x + p.dir * 10)) < 16 && f % 5 === 0) k.golpe = true; else if (din.mecha < 40) { k.der = false; k.izq = true; } }
      const rod = S.ents.find(e => e.tipo === 'rodado' && e.x > p.x && e.x - p.x < 36);
      if (rod && p.enSuelo) k.saltar = true;
      if (P.energia >= 100 && (min || cond) && f % 30 === 0) k.perro = true;
      if (p.chocoX && p.enSuelo) k.saltar = true;
      if (p.enSuelo && !haySueloEn(p.x + p.w + 8, p.y + p.h + 2) && !haySueloEn(p.x + p.w + 8, p.y + p.h + 18)) k.saltar = true;
      if (!p.enSuelo && p.vy < 0) k.saltar = true;
      const c0 = P.corazones, v0 = P.vidas;
      ENTRADA.virtual = k; paso(); f++;
      if (P.corazones < c0 || P.vidas < v0) log.push(`daño en x=${(S.jug.x / T).toFixed(1)} c${P.corazones} v${P.vidas}`);
      if (J.nombre !== 'juego') { log.push('escena ' + J.nombre); break; }
    }
    ENTRADA.virtual = {}; dibujar();
    return [f, JSON.stringify(this.estado()), ...log];
  },
  empezar(nivel) { this.pausarBucle(true); nuevaPartida(nivel); empezarNivel(); irA('juego'); return this.estado(); },
  ir(tx, ty) { S.jug.x = tx * T; S.jug.y = ty * T; S.jug.vy = 0; S.cam.x = limitar(S.jug.x - W / 2, 0, S.N.ancho * T - W); return this.pasos(2); },
  pasos(n, teclas) { ENTRADA.virtual = teclas || {}; for (let i = 0; i < n; i++) paso(); ENTRADA.virtual = {}; dibujar(); return this.estado(); },
  estado() {
    const p = S && S.jug;
    return p ? { escena: J.nombre, x: +(p.x / T).toFixed(2), y: +(p.y / T).toFixed(2), est: p.estado, suelo: p.enSuelo, vidas: P.vidas, cor: P.corazones, pep: P.pepitas, ap: P.apuntes.size, modal: !!S.modal, fin: !!S.finale } : { escena: J.nombre };
  },
};
