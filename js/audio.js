// Música chiptune y efectos sintetizados en el momento con WebAudio, más la voz real de Nato.
// Las canciones son originales: notas escritas a mano en un formato de tracker
// ('-' alarga la nota anterior, '.' es silencio, '|' solo separa compases).
'use strict';

const CANCIONES = {
  // Pantalla de título: épica, en la menor, con sabor andino (sol sostenido)
  titulo: {
    paso: 0.14, canales: [
      { inst: 'quena', vol: 0.2, notas:
        'A4 - - - E5 - - - | D5 - C5 - B4 - G4 - | A4 - - - C5 - E5 - | A5 - - - - - - - |' +
        'G5 - - - F5 - E5 - | D5 - - - C5 - D5 - | E5 - - - - - B4 - | E5 - - - - - - . |' +
        'C5 - - - E5 - - - | G5 - F5 - E5 - D5 - | C5 - - - D5 - E5 - | F5 - - - - - - - |' +
        'E5 - - - D5 - C5 - | B4 - - - C5 - D5 - | E5 - - - G#4 - - - | A4 - - - - - - . |' },
      { inst: 'triangulo', vol: 0.32, notas:
        'A2 - A3 - A2 - A3 - | G2 - G3 - G2 - G3 - | A2 - A3 - A2 - A3 - | A2 - A3 - E3 - A3 - |' +
        'C3 - C4 - C3 - C4 - | D3 - D4 - D3 - D4 - | E2 - E3 - E2 - E3 - | E2 - E3 - B2 - E3 - |' +
        'C3 - C4 - C3 - C4 - | G2 - G3 - G2 - G3 - | C3 - C4 - C3 - C4 - | F2 - F3 - F2 - F3 - |' +
        'A2 - A3 - A2 - A3 - | G2 - G3 - G2 - G3 - | E2 - E3 - E2 - E3 - | A2 - A3 - E3 - A2 - |' },
      { inst: 'ruido', vol: 0.10, notas: 'K . h . S . h . | K . h K S . h h |'.repeat(8) },
    ] },
  // Nivel al aire libre: 6/8 saltarín, como de cueca chiptune
  nivel: {
    paso: 0.125, canales: [
      { inst: 'quena', vol: 0.19, notas:
        'A4 - C5 E5 - D5 | C5 - A4 G4 - E4 | A4 - C5 E5 - G5 | A5 - - G5 - E5 |' +
        'D5 - E5 G5 - E5 | D5 - C5 A4 - G4 | A4 - C5 D5 - C5 | A4 - - - - . |' +
        'C5 - E5 G5 - E5 | F5 - E5 D5 - C5 | D5 - E5 F5 - D5 | E5 - - - - . |' +
        'C5 - E5 G5 - A5 | G5 - E5 D5 - C5 | D5 - C5 B4 - G4 | A4 - - - - . |' },
      { inst: 'charango', vol: 0.09, notas:
        'E4 . . C4 . . | E4 . . C4 . . | E4 . . C4 . . | E4 . . C4 . . |' +
        'D4 . . B3 . . | F4 . . D4 . . | F4 . . C4 . . | E4 . . C4 . . |' +
        'G4 . . E4 . . | A4 . . F4 . . | A4 . . F4 . . | G#4 . . E4 . . |' +
        'G4 . . E4 . . | G4 . . D4 . . | G4 . . D4 . . | E4 . . C4 . . |' },
      { inst: 'triangulo', vol: 0.34, notas:
        'A2 - - E3 - - | A2 - - E3 - - | A2 - - E3 - - | A2 - - E3 - - |' +
        'G2 - - D3 - - | D3 - - A2 - - | F2 - - C3 - - | A2 - - E3 - - |' +
        'C3 - - G2 - - | F2 - - C3 - - | D3 - - A2 - - | E2 - - B2 - - |' +
        'C3 - - G2 - - | G2 - - D3 - - | G2 - - B2 - - | A2 - - E3 - - |' },
      { inst: 'ruido', vol: 0.10, notas: 'K . h S . h | K . h S h h |'.repeat(8) },
    ] },
  // Nivel 2, la ciudad de las escaleras: alegre, en sol mayor, con aire de los años 20
  ciudad: {
    paso: 0.12, canales: [
      { inst: 'quena', vol: 0.18, notas:
        'G4 - B4 - D5 - B4 - | C5 - E5 - D5 - B4 - | A4 - C5 - B4 - G4 - | A4 - - - D4 - - - |' +
        'G4 - B4 - D5 - G5 - | F#5 - E5 - D5 - C5 - | B4 - A4 - G4 - A4 - | G4 - - - - - . . |' +
        'E5 - - - D5 - C5 - | B4 - C5 - D5 - - - | C5 - - - B4 - A4 - | G4 - A4 - B4 - - - |' +
        'E5 - D5 - C5 - B4 - | A4 - B4 - C5 - E5 - | D5 - - - F#4 - A4 - | G4 - - - - - . . |' },
      { inst: 'charango', vol: 0.085, notas:
        'B3 . D4 . B3 . D4 . | C4 . E4 . C4 . E4 . | C4 . E4 . B3 . D4 . | C4 . D4 . F#4 . D4 . |' +
        'B3 . D4 . B3 . D4 . | C4 . E4 . A3 . C4 . | B3 . D4 . C4 . F#4 . | B3 . D4 . G4 . . . |' +
        'G4 . C4 . G4 . C4 . | G4 . B3 . G4 . B3 . | E4 . A3 . E4 . A3 . | D4 . G3 . D4 . G3 . |' +
        'G4 . C4 . G4 . C4 . | E4 . A3 . E4 . A3 . | F#4 . D4 . F#4 . C4 . | B3 . D4 . G4 . . . |' },
      { inst: 'triangulo', vol: 0.34, notas:
        'G2 - - - D3 - - - | C3 - - - G2 - - - | A2 - - - G2 - - - | D3 - - - D2 - - - |' +
        'G2 - - - B2 - - - | D3 - - - A2 - - - | G2 - - - D3 - - - | G2 - - - G2 - - - |' +
        'C3 - - - G2 - - - | G2 - - - D3 - - - | A2 - - - E3 - - - | G2 - - - D3 - - - |' +
        'C3 - - - G2 - - - | A2 - - - E3 - - - | D3 - - - D2 - - - | G2 - - - G2 - - - |' },
      { inst: 'ruido', vol: 0.10, notas: 'K . h . S . h . | K . h K S . h h |'.repeat(8) },
    ] },
  // Dentro del cine: piano de película muda, juguetón
  cine: {
    paso: 0.11, canales: [
      { inst: 'pulso12', vol: 0.12, notas:
        'E5 . E5 F5 G5 . E5 . | C5 . D5 . E5 - - . | D5 . D5 E5 F5 . D5 . | B4 . C5 . D5 - - . |' +
        'E5 . G5 . C6 . B5 . | A5 . G5 . F5 . E5 . | D5 . E5 . F5 . D5 . | C5 - - - - - . . |' },
      { inst: 'triangulo', vol: 0.3, notas:
        'C3 . G3 . C3 . G3 . | C3 . G3 . C3 . G3 . | G2 . D3 . G2 . D3 . | G2 . D3 . G2 . D3 . |' +
        'C3 . G3 . E3 . G3 . | F2 . C3 . F2 . C3 . | G2 . D3 . G2 . B2 . | C3 . G2 . C3 . . . |' },
      { inst: 'ruido', vol: 0.04, notas: 'h . . . h . . . |'.repeat(8) },
    ] },
  // Nivel 3, la tormenta de invierno: en mi menor, empujada como el viento
  invierno: {
    paso: 0.13, canales: [
      { inst: 'quena', vol: 0.17, notas:
        'E5 - - - B4 - E5 - | G5 - F#5 - E5 - D5 - | C5 - - - G4 - C5 - | E5 - D5 - B4 - - - |' +
        'A4 - C5 - E5 - A5 - | G5 - - - F#5 - E5 - | D#5 - E5 - F#5 - B4 - | E5 - - - - - . . |' },
      { inst: 'charango', vol: 0.085, notas:
        'G4 . B4 . G4 . B4 . | G4 . B4 . A4 . B4 . | E4 . G4 . E4 . G4 . | F#4 . A4 . D#4 . F#4 . |' +
        'E4 . A4 . C5 . A4 . | E4 . G4 . B4 . G4 . | F#4 . B4 . D#5 . B4 . | G4 . B4 . E4 . . . |' },
      { inst: 'triangulo', vol: 0.34, notas:
        'E2 . E3 . E2 . E3 . | E2 . E3 . D2 . D3 . | C2 . C3 . C2 . C3 . | B1 . B2 . B1 . B2 . |' +
        'A1 . A2 . A1 . A2 . | E2 . E3 . E2 . E3 . | B1 . B2 . B1 . B2 . | E2 . E3 . E2 . . . |' },
      { inst: 'ruido', vol: 0.09, notas: 'K . h . S . h h | K . h K S . h . |'.repeat(8) },
    ] },
  // La chaqueta regalona: cueca rápida y brillante, en re mayor
  chaqueta: {
    paso: 0.085, canales: [
      { inst: 'pulso25', vol: 0.15, notas:
        'D5 F#5 A5 D6 - A5 | B5 - A5 F#5 - D5 | E5 G5 B5 E6 - B5 | C#6 - A5 E5 - C#5 |' +
        'D5 F#5 A5 D6 - F#6 | E6 - D6 C#6 - B5 | A5 - G5 F#5 - E5 | D5 - - A4 - . |' },
      { inst: 'charango', vol: 0.09, notas:
        'F#4 . A4 F#4 . A4 | G4 . B4 G4 . B4 | G4 . B4 G4 . B4 | A4 . C#5 A4 . E4 |' +
        'F#4 . A4 F#4 . A4 | G4 . B4 A4 . C#5 | F#4 . A4 E4 . G4 | F#4 . A4 D4 . . |' },
      { inst: 'triangulo', vol: 0.34, notas:
        'D3 - - A2 - - | G2 - - D3 - - | E3 - - B2 - - | A2 - - E3 - - |' +
        'D3 - - A2 - - | G2 - - A2 - - | A2 - - A2 - - | D3 - - D2 - - |' },
      { inst: 'ruido', vol: 0.11, notas: 'K . h S h h | K h h S . h |'.repeat(8) },
    ] },
  // Cavernas de la mina Fortuna: lenta, en re menor
  cueva: {
    paso: 0.2, canales: [
      { inst: 'quena', vol: 0.14, notas:
        'D5 - - - A4 - - - | F5 - E5 - D5 - - - | C5 - - - A4 - - - | D5 - - - - - . . |' +
        'F5 - - - E5 - - - | D5 - C5 - A4 - - - | A#4 - - - C5 - - - | D5 - - - - - . . |' },
      { inst: 'triangulo', vol: 0.32, notas:
        'D2 - - - A2 - - - | D2 - - - A2 - - - | C2 - - - G2 - - - | D2 - - - A2 - - - |' +
        'F2 - - - C3 - - - | D2 - - - A2 - - - | A#1 - - - F2 - - - | A1 - - - D2 - - - |' },
      { inst: 'ruido', vol: 0.05, notas: 'h . . . . . . . | . . . . h . . . |'.repeat(4) },
    ] },
  // Escena de la plaza: tensión cuando llega el jefe
  tension: {
    paso: 0.13, canales: [
      { inst: 'pulso25', vol: 0.13, notas: 'E4 . E4 . F4 . E4 . | E4 . E4 . G4 - F4 . | E4 . E4 . F4 . E4 . | D#4 - - - - - . . |' },
      { inst: 'triangulo', vol: 0.34, notas: 'E2 . E2 . E2 . E2 . | E2 . E2 . E2 . E2 . | F2 . F2 . F2 . F2 . | D#2 . D#2 . D#2 . D#2 . |' },
      { inst: 'ruido', vol: 0.10, notas: 'K . . . S . . . | K . K . S . . . |'.repeat(2) },
    ] },
  // La olla de fundición: chiste rápido
  olla: {
    paso: 0.07, bucle: false, canales: [
      { inst: 'pulso25', vol: 0.15, notas: 'C6 B5 A#5 A5 G#5 G5 F#5 F5 E5 D#5 D5 C#5 C5 - . . C5 . C5 . G4 - - .' },
      { inst: 'triangulo', vol: 0.3, notas: 'C3 . . . C3 . . . C3 . . . C3 . . . C3 . C3 . G2 - - .' },
    ] },
  victoria: {
    paso: 0.11, bucle: false, canales: [
      { inst: 'pulso25', vol: 0.17, notas: 'C5 E5 G5 C6 - - G5 - C6 - - - E6 - - - - - - .' },
      { inst: 'pulso12', vol: 0.08, notas: 'E4 G4 C5 E5 - - E5 - G5 - - - G5 - - - - - - .' },
      { inst: 'triangulo', vol: 0.32, notas: 'C3 . C3 . C3 . G2 . C3 . . . C3 - - - - - - .' },
    ] },
  derrota: {
    paso: 0.18, bucle: false, canales: [
      { inst: 'pulso25', vol: 0.15, notas: 'A4 - G4 - F4 - E4 - - - - .' },
      { inst: 'triangulo', vol: 0.3, notas: 'A2 - - - D2 - - - E2 - - .' },
    ] },
  // Créditos y fin: tranquila y cálida
  creditos: {
    paso: 0.17, canales: [
      { inst: 'quena', vol: 0.17, notas:
        'E5 - - - D5 - C5 - | D5 - - - G4 - - - | C5 - - - D5 - E5 - | G5 - - - - - - - |' +
        'A5 - - - G5 - E5 - | F5 - - - E5 - D5 - | C5 - - - D5 - B4 - | C5 - - - - - - . |' },
      { inst: 'triangulo', vol: 0.3, notas:
        'C3 - G3 - C3 - G3 - | G2 - D3 - G2 - D3 - | A2 - E3 - A2 - E3 - | E2 - B2 - E2 - B2 - |' +
        'F2 - C3 - F2 - C3 - | D3 - A3 - D3 - A3 - | G2 - D3 - G2 - D3 - | C3 - G3 - C3 - . - |' },
    ] },
};

const AUDIO = {
  ctx: null, listo: false, mudo: false, musicaVol: 0.55,
  voces: {}, muestras: {}, cancion: null, nombreCancion: null,
};

function _frec(nota) {
  const m = /^([A-G])(#|b)?(-?\d)$/.exec(nota);
  if (!m) return 0;
  const base = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0);
  const midi = base + (parseInt(m[3], 10) + 1) * 12;
  return 440 * Math.pow(2, (midi - 69) / 12);
}
function _ondaPulso(ctx, ciclo) {
  const n = 32, re = new Float32Array(n), im = new Float32Array(n);
  for (let k = 1; k < n; k++) im[k] = (2 / (k * Math.PI)) * Math.sin(k * Math.PI * ciclo);
  return ctx.createPeriodicWave(re, im);
}

function iniciarAudio() {
  if (AUDIO.ctx) { if (AUDIO.ctx.state === 'suspended') AUDIO.ctx.resume(); return; }
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return;
  const ctx = new AC();
  AUDIO.ctx = ctx;
  AUDIO.maestro = ctx.createGain(); AUDIO.maestro.gain.value = AUDIO.mudo ? 0 : 0.8; AUDIO.maestro.connect(ctx.destination);
  AUDIO.busMusica = ctx.createGain(); AUDIO.busMusica.gain.value = AUDIO.musicaVol; AUDIO.busMusica.connect(AUDIO.maestro);
  AUDIO.busEfectos = ctx.createGain(); AUDIO.busEfectos.gain.value = 0.7; AUDIO.busEfectos.connect(AUDIO.maestro);
  // voz: más fuerte y comprimida para que se entienda sobre la música
  AUDIO.busVoz = ctx.createGain(); AUDIO.busVoz.gain.value = 1.5;
  const comp = ctx.createDynamicsCompressor(); comp.threshold.value = -24; comp.ratio.value = 4;
  AUDIO.busVoz.connect(comp); comp.connect(AUDIO.maestro);
  AUDIO.ondas = { pulso25: _ondaPulso(ctx, 0.25), pulso12: _ondaPulso(ctx, 0.125), pulso50: _ondaPulso(ctx, 0.5) };
  const ruido = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
  const d = ruido.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  AUDIO.ruido = ruido;
  AUDIO.listo = true;
  // voces de Nato (mp3 incrustados)
  for (const clave in VOCES_DATOS) {
    const b64 = VOCES_DATOS[clave].split(',')[1];
    const bin = atob(b64), bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    ctx.decodeAudioData(bytes.buffer, buf => { AUDIO.voces[clave] = buf; }, () => {});
  }
  // sonidos grabados o sintetizados aparte (el ladrido de mastín de Hércules)
  if (typeof SONIDOS_DATOS !== 'undefined') for (const clave in SONIDOS_DATOS) {
    const bin = atob(SONIDOS_DATOS[clave].split(',')[1]), bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    ctx.decodeAudioData(bytes.buffer, buf => { AUDIO.muestras[clave] = buf; }, () => {});
  }
  setInterval(_programador, 25);
  if (AUDIO.pendiente) { const p = AUDIO.pendiente; AUDIO.pendiente = null; tocarMusica(p); }
}

function alternarMudo() {
  AUDIO.mudo = !AUDIO.mudo;
  if (AUDIO.maestro) AUDIO.maestro.gain.value = AUDIO.mudo ? 0 : 0.8;
  return AUDIO.mudo;
}

// ---------- Secuenciador ----------
function _compilar(cancion) {
  return cancion.canales.map(c => {
    const toks = c.notas.split(/\s+/).filter(t => t && t !== '|');
    const eventos = [];
    for (let i = 0; i < toks.length; i++) {
      const t = toks[i];
      if (t === '-' || t === '.') continue;
      let dur = 1;
      while (toks[i + dur] === '-') dur++;
      eventos.push({ paso: i, dur, nota: t });
    }
    return { inst: c.inst, vol: c.vol, largo: toks.length, eventos };
  });
}
function tocarMusica(nombre) {
  if (AUDIO.nombreCancion === nombre && AUDIO.cancion) return;
  if (!AUDIO.listo) { AUDIO.pendiente = nombre; AUDIO.nombreCancion = null; return; }
  pararMusica();
  const c = CANCIONES[nombre];
  if (!c) return;
  AUDIO.nombreCancion = nombre;
  AUDIO.cancion = { def: c, canales: _compilar(c), paso: 0, tiempo: AUDIO.ctx.currentTime + 0.05, bucle: c.bucle !== false };
  AUDIO.cancion.largo = Math.max(...AUDIO.cancion.canales.map(k => k.largo));
}
function pararMusica() {
  AUDIO.cancion = null; AUDIO.nombreCancion = null; AUDIO.pendiente = null;
  if (AUDIO.vivas) AUDIO.vivas.forEach(n => { try { n.stop(); } catch (e) { /* ya terminó */ } });
  AUDIO.vivas = [];
}
function _programador() {
  const s = AUDIO.cancion;
  if (!s) return;
  const ctx = AUDIO.ctx;
  while (s.tiempo < ctx.currentTime + 0.12) {
    if (s.paso >= s.largo) {
      if (!s.bucle) { AUDIO.cancion = null; AUDIO.nombreCancion = null; return; }
      s.paso = 0;
    }
    for (const c of s.canales) {
      const p = s.paso % c.largo;
      for (const ev of c.eventos) if (ev.paso === p) _nota(c.inst, ev.nota, s.tiempo, ev.dur * s.def.paso, c.vol, AUDIO.busMusica, true);
    }
    s.tiempo += s.def.paso;
    s.paso++;
  }
}
function _nota(inst, nota, t, dur, vol, bus, esMusica) {
  const ctx = AUDIO.ctx;
  const g = ctx.createGain();
  g.connect(bus);
  let fuente;
  if (inst === 'ruido') {
    if (nota === 'K') { // bombo
      fuente = ctx.createOscillator();
      fuente.frequency.setValueAtTime(150, t); fuente.frequency.exponentialRampToValueAtTime(40, t + 0.1);
      g.gain.setValueAtTime(vol * 3, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.14);
      fuente.connect(g); fuente.start(t); fuente.stop(t + 0.15);
    } else {
      fuente = ctx.createBufferSource(); fuente.buffer = AUDIO.ruido;
      const f = ctx.createBiquadFilter();
      f.type = nota === 'S' ? 'bandpass' : 'highpass';
      f.frequency.value = nota === 'S' ? 1800 : 7000;
      const largo = nota === 'S' ? 0.12 : 0.04;
      g.gain.setValueAtTime(vol * (nota === 'S' ? 1.6 : 0.8), t); g.gain.exponentialRampToValueAtTime(0.001, t + largo);
      fuente.connect(f); f.connect(g); fuente.start(t, Math.random() * 0.5); fuente.stop(t + largo + 0.01);
    }
  } else if (inst === 'quena') { // flauta andina: triángulo suave con soplo y vibrato
    fuente = ctx.createOscillator(); fuente.type = 'triangle';
    fuente.frequency.setValueAtTime(_frec(nota), t);
    const vib = ctx.createOscillator(), prof = ctx.createGain();
    vib.frequency.value = 5.2; prof.gain.setValueAtTime(0, t); prof.gain.linearRampToValueAtTime(14, t + Math.min(0.25, dur * 0.6));
    vib.connect(prof); prof.connect(fuente.detune); vib.start(t);
    const fin = t + Math.max(0.08, dur - 0.02);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + 0.035);
    g.gain.setValueAtTime(vol * 0.85, t + Math.min(dur * 0.5, 0.12)); g.gain.linearRampToValueAtTime(0, fin);
    const soplo = ctx.createBufferSource(), fs = ctx.createBiquadFilter(), gs = ctx.createGain();
    soplo.buffer = AUDIO.ruido; fs.type = 'bandpass'; fs.frequency.value = _frec(nota) * 2; fs.Q.value = 6;
    gs.gain.setValueAtTime(vol * 0.5, t); gs.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
    soplo.connect(fs); fs.connect(gs); gs.connect(bus); soplo.start(t, Math.random() * 0.5); soplo.stop(t + 0.1);
    fuente.connect(g); fuente.start(t); fuente.stop(fin + 0.01); vib.stop(fin + 0.01);
  } else if (inst === 'charango') { // rasgueo: la nota y su quinta con un desfase corto, pulsadas y breves
    fuente = ctx.createOscillator(); fuente.setPeriodicWave(AUDIO.ondas.pulso12);
    fuente.frequency.setValueAtTime(_frec(nota), t);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.28);
    const quinta = ctx.createOscillator(), gq = ctx.createGain();
    quinta.setPeriodicWave(AUDIO.ondas.pulso25); quinta.frequency.setValueAtTime(_frec(nota) * 1.5, t + 0.018);
    gq.gain.setValueAtTime(0, t); gq.gain.setValueAtTime(vol * 0.7, t + 0.018); gq.gain.exponentialRampToValueAtTime(0.001, t + 0.26);
    quinta.connect(gq); gq.connect(bus); quinta.start(t); quinta.stop(t + 0.3);
    fuente.connect(g); fuente.start(t); fuente.stop(t + 0.3);
  } else {
    fuente = ctx.createOscillator();
    if (inst === 'triangulo') fuente.type = 'triangle';
    else fuente.setPeriodicWave(AUDIO.ondas[inst] || AUDIO.ondas.pulso50);
    fuente.frequency.setValueAtTime(_frec(nota), t);
    const fin = t + Math.max(0.05, dur - 0.015);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + 0.006);
    g.gain.setValueAtTime(vol * 0.8, t + Math.min(dur * 0.5, 0.08));
    g.gain.linearRampToValueAtTime(0, fin);
    fuente.connect(g); fuente.start(t); fuente.stop(fin + 0.01);
  }
  if (esMusica) {
    AUDIO.vivas.push(fuente);
    if (AUDIO.vivas.length > 64) AUDIO.vivas.splice(0, 32);
  }
}

// ---------- Efectos ----------
function _barrido(tipo, f0, f1, dur, vol, cuando) {
  if (!AUDIO.listo) return;
  const ctx = AUDIO.ctx, t = ctx.currentTime + (cuando || 0);
  const o = ctx.createOscillator(), g = ctx.createGain();
  if (AUDIO.ondas[tipo]) o.setPeriodicWave(AUDIO.ondas[tipo]); else o.type = tipo;
  o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
  g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  o.connect(g); g.connect(AUDIO.busEfectos); o.start(t); o.stop(t + dur + 0.02);
}
function _soplo(dur, vol, filtro, frec, cuando) {
  if (!AUDIO.listo) return;
  const ctx = AUDIO.ctx, t = ctx.currentTime + (cuando || 0);
  const s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
  s.buffer = AUDIO.ruido; f.type = filtro; f.frequency.value = frec;
  g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  s.connect(f); f.connect(g); g.connect(AUDIO.busEfectos); s.start(t, Math.random() * 0.5); s.stop(t + dur + 0.02);
}
const EFECTOS = {
  salto: () => _barrido('pulso25', 260, 620, 0.12, 0.18),
  golpe: () => { _soplo(0.06, 0.4, 'bandpass', 900); _barrido('pulso50', 180, 60, 0.08, 0.25); },
  golpeFuerte: () => { _soplo(0.12, 0.6, 'lowpass', 1200); _barrido('pulso50', 220, 40, 0.16, 0.3); },
  aire: () => _soplo(0.08, 0.15, 'highpass', 2500),
  puerta: () => { _soplo(0.18, 0.18, 'lowpass', 500); _barrido('pulso50', 140, 90, 0.1, 0.12); },   // pasos que entran: un golpe sordo de puerta
  tonk: () => { _barrido('pulso12', 900, 880, 0.12, 0.2); _barrido('triangle', 450, 440, 0.18, 0.3); },
  pepita: () => { _barrido('pulso25', 988, 988, 0.06, 0.14); _barrido('pulso25', 1319, 1319, 0.12, 0.14, 0.06); },
  apunte: () => [523, 659, 784, 1047, 1319].forEach((f, i) => _barrido('pulso12', f, f, 0.1, 0.13, i * 0.07)),
  vida: () => [659, 784, 1319, 1047, 1175, 1568].forEach((f, i) => _barrido('pulso25', f, f, 0.08, 0.13, i * 0.07)),
  pan: () => [392, 523, 659].forEach((f, i) => _barrido('triangle', f, f, 0.12, 0.3, i * 0.08)),
  herido: () => { _barrido('pulso50', 400, 90, 0.3, 0.25); _soplo(0.15, 0.3, 'lowpass', 800); },
  caida: () => _barrido('pulso25', 700, 80, 0.6, 0.2),
  fogata: () => { _soplo(0.4, 0.3, 'lowpass', 600); [523, 784].forEach((f, i) => _barrido('pulso12', f, f, 0.12, 0.1, 0.1 + i * 0.1)); },
  chillido: () => { _barrido('pulso12', 1800, 900, 0.35, 0.12); _soplo(0.3, 0.08, 'bandpass', 2600); },
  aleteo: () => _soplo(0.08, 0.12, 'lowpass', 500),
  soltarse: () => _barrido('pulso25', 300, 900, 0.2, 0.18),
  quemado: () => { _soplo(0.8, 0.35, 'highpass', 3000); _barrido('pulso25', 1200, 300, 0.5, 0.15); },
  alerta: () => { _barrido('pulso25', 880, 880, 0.05, 0.12); _barrido('pulso25', 1175, 1175, 0.08, 0.12, 0.06); },
  piedra: () => _soplo(0.25, 0.35, 'lowpass', 400),
  menu: () => _barrido('pulso25', 660, 660, 0.05, 0.12),
  aceptar: () => { _barrido('pulso25', 660, 660, 0.05, 0.12); _barrido('pulso25', 990, 990, 0.08, 0.12, 0.05); },
  silbato: () => { // silbato de vapor: dos tonos con soplido
    if (!AUDIO.listo) return;
    for (const [f, cuando, dur] of [[587, 0, 0.45], [740, 0, 0.45], [587, 0.6, 0.9], [740, 0.6, 0.9]]) _barrido('triangle', f, f * 0.99, dur, 0.18, cuando);
    _soplo(1.5, 0.12, 'bandpass', 1500);
  },
  chu: () => _soplo(0.18, 0.2, 'lowpass', 900),
  mecha: () => _soplo(0.5, 0.12, 'highpass', 4000),
  explosion: () => { _soplo(0.9, 0.7, 'lowpass', 700); _barrido('triangle', 90, 30, 0.6, 0.5); _soplo(0.3, 0.4, 'bandpass', 1600); },
  paso: () => _soplo(0.04, 0.07, 'lowpass', 500),
  aterriza: () => { _soplo(0.1, 0.22, 'lowpass', 300); _barrido('triangle', 120, 60, 0.08, 0.2); },
  ladrido: () => muestra('ladrido', 1.1) || _ladridoSintetico(),   // ¡GUAU, GUAU! de mastín inglés
  ladrido1: () => muestra('ladrido1', 1.1) || _ladridoSintetico(),
  _ladridoViejo: () => { // respaldo: ladrido sintético simple
    for (const c of [0, 0.22]) { _barrido('pulso50', 320, 140, 0.16, 0.3, c); _soplo(0.14, 0.35, 'bandpass', 700, c); }
  },
  energiaLlena: () => [523, 659, 784, 1047].forEach((f, i) => _barrido('pulso25', f, f, 0.07, 0.12, i * 0.05)),
  rueda: () => { _soplo(0.12, 0.16, 'lowpass', 260); _barrido('triangle', 70, 60, 0.1, 0.18); },   // bola de palitroque rodando
  chuza: () => { for (let i = 0; i < 6; i++) _soplo(0.05, 0.25, 'bandpass', 1400 + i * 250, i * 0.035); _barrido('pulso12', 1568, 1568, 0.1, 0.1, 0.25); },
  crujido: () => { _soplo(0.18, 0.25, 'bandpass', 500); _barrido('pulso50', 140, 90, 0.12, 0.15, 0.05); },   // tablón que cede
  proyector: () => { for (let i = 0; i < 8; i++) _soplo(0.02, 0.12, 'highpass', 3000, i * 0.09); },
};
function efecto(nombre) { if (AUDIO.listo && EFECTOS[nombre]) EFECTOS[nombre](); }
function _ladridoSintetico() { EFECTOS._ladridoViejo(); }
// reproduce una muestra (por el canal de efectos); devuelve false si aún no está cargada
function muestra(clave, vol) {
  if (!AUDIO.listo || !AUDIO.muestras[clave]) return false;
  const s = AUDIO.ctx.createBufferSource(), g = AUDIO.ctx.createGain();
  s.buffer = AUDIO.muestras[clave]; g.gain.value = vol || 1;
  s.connect(g); g.connect(AUDIO.busEfectos); s.start();
  return true;
}

// Lo que dice cada frase, para el subtítulo (la voz viene de audios de WhatsApp y no siempre se entiende)
const SUBTITULOS = {
  dandole: '¡Dándole con todo!', imaginate: '¡Imagínate el resultado!', orgulloso: '¡Me siento muy orgulloso!',
  pegacaleta: '¡Pega caleta!', gracias: '¡Muchas gracias!', pucha: '¡Pucha!', yahermano: '¡Ya, hermano!',
  grito: '¡Aaaah!', toma: '¡Toma!', ay: '¡Ay!',
};
let _vozActual = null;
// prioridad: una frase importante no se corta por una exclamación de pelea
function voz(clave, op) {
  op = op || {};
  if (!AUDIO.listo || !AUDIO.voces[clave]) return false;
  const ahora = AUDIO.ctx.currentTime;
  if (_vozActual && op.baja && ahora < _vozActual.fin) return false;
  if (_vozActual) { try { _vozActual.fuente.stop(); } catch (e) { /* ya terminó */ } }
  const s = AUDIO.ctx.createBufferSource();
  s.buffer = AUDIO.voces[clave];
  s.connect(AUDIO.busVoz); s.start();
  const dur = s.buffer.duration;
  _vozActual = { fuente: s, fin: ahora + dur };
  // la música baja mientras Nato habla, para que se le entienda
  const g = AUDIO.busMusica.gain;
  g.cancelScheduledValues(ahora); g.setValueAtTime(g.value, ahora);
  g.linearRampToValueAtTime(AUDIO.musicaVol * 0.18, ahora + 0.08);
  g.setValueAtTime(AUDIO.musicaVol * 0.18, ahora + dur + 0.1);
  g.linearRampToValueAtTime(AUDIO.musicaVol, ahora + dur + 0.6);
  AUDIO.subtitulo = { texto: SUBTITULOS[clave] || '', hasta: performance.now() + dur * 1000 + 900 };
  return true;
}
