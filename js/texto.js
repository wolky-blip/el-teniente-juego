// Texto con borde, al estilo de los subtítulos de la serie. Las medidas van en unidades del mundo (320×180).
'use strict';

const FUENTE = "'Trebuchet MS', 'DejaVu Sans', 'Segoe UI', sans-serif";
const _medidor = document.createElement('canvas').getContext('2d');

function _fuente(op) { return `${op.negrita === false ? '' : 'bold '}${op.tam || 8}px ${FUENTE}`; }

function anchoTexto(str, op) { _medidor.font = _fuente(op || {}); return _medidor.measureText(str).width; }

// op: tam, color, borde (color), sombra (color), alinear ('izq' | 'centro' | 'der'), negrita, alfa
function dibujarTexto(ctx, str, x, y, op) {
  op = op || {};
  ctx.save();
  ctx.font = _fuente(op);
  ctx.textBaseline = 'top';
  ctx.textAlign = op.alinear === 'centro' ? 'center' : op.alinear === 'der' ? 'right' : 'left';
  if (op.alfa != null) ctx.globalAlpha *= op.alfa;
  if (op.sombra) { ctx.fillStyle = op.sombra; ctx.fillText(str, x + 0.7, y + 0.7); }
  if (op.borde) {
    ctx.strokeStyle = op.borde; ctx.lineJoin = 'round';
    ctx.lineWidth = op.grosor || Math.max(1, (op.tam || 8) / 4);
    ctx.strokeText(str, x, y);
  }
  ctx.fillStyle = op.color || '#ffffff';
  ctx.fillText(str, x, y);
  ctx.restore();
}

function partirTexto(str, ancho, op) {
  const lineas = [];
  for (const parrafo of str.split('\n')) {
    let linea = '';
    for (const palabra of parrafo.split(' ')) {
      const prueba = linea ? linea + ' ' + palabra : palabra;
      if (anchoTexto(prueba, op) > ancho && linea) { lineas.push(linea); linea = palabra; } else linea = prueba;
    }
    lineas.push(linea);
  }
  return lineas;
}
