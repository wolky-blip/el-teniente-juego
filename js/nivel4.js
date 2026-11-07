// Nivel 4 · El cobre es de Chile y el último tren (1967–1981). El final: Sewell se despide, Nato vence al cóndor gigante
// en su nido, rescata a Pedro y alcanza el último tren. Usa las casillas y la medida T de nivel1.js.
'use strict';

const NIVEL4 = {
  nombre: 'NIVEL 4 · EL ÚLTIMO TREN',
  nombreCorto: 'El cobre es de Chile y el último tren',
  epoca: '1967 – 1981',
  numero: 4, musica: 'nivel', fondoResumen: 'sewell1967', final: 'ultimoTren',
  ancho: 432, alto: 44,
  hpMinero: 2,
  intro: 'Sewell empieza a despedirse: las familias bajan a vivir a Rancagua. Nato ya sabe dónde está el nido. Tiene que subir a lo más alto, vencer al cóndor gigante, rescatar a su papá… y alcanzar el último tren.',
  apuntes: [
    'En 1967, durante el gobierno de Eduardo Frei Montalva, se chilenizó el cobre: el Estado adquirió el 49% de las acciones de las compañías mineras de Chuquicamata, Potrerillos (El Salvador) y El Teniente. El acta se presentó en una ceremonia en Sewell, por el propio presidente.',
    'También en 1967 nacieron el Plan de expansión 280 y la Operación Valle, que inició paulatinamente el despoblamiento de Sewell hacia poblaciones construidas especialmente para sus familias en Rancagua.',
    'En 1971, durante el gobierno de Salvador Allende, el cobre se nacionalizó por completo: el Estado adquirió el 51% restante de las acciones. El acta de nacionalización se firmó en la Plaza de Héroes de Rancagua.',
    'En 1971 se inauguró la Carretera del Cobre, que une Rancagua con la mina y sus plantas en unos 64 kilómetros. El alto costo de mantener el campamento, la contaminación de la antigua fundición de Caletones y el viaje diario por carretera aceleraron el despoblamiento.',
    'En 1998 Sewell fue declarado Monumento Nacional, en la categoría de zona típica y pintoresca. Más de 500.000 personas pasaron por Sewell entre 1905 y 1981.',
  ],
  tarjetaFinal: [
    'Sewell fue despoblado por completo en 1981, cuando bajó por última vez el tren desde la estación Sewell hasta Rancagua.',
  ],
};

const ZONAS4 = [
  [0, 'SEWELL, 1967 · LA OPERACIÓN VALLE', 'sewell1967'], [67, 'LA PLANTA · 1971', 'molino'],
  [128, 'LO MÁS ALTO DE SEWELL', 'cumbre'], [154, 'EL NIDO DEL CÓNDOR', 'cumbre'],
  [203, '1981 · EL ÚLTIMO TREN', 'sewell1967'], [253, '1981 · EL ÚLTIMO TREN', 'valle_tren'],
];

function construirNivel4() {
  const N = {
    def: NIVEL4, ancho: NIVEL4.ancho, alto: NIVEL4.alto,
    mapa: new Uint8Array(NIVEL4.ancho * NIVEL4.alto),
    fondo: [], cuevas: [], luces: [], entidades: [],
    inicio: { x: 3 * T, y: 36 * T },
    meta: 9999 * T,                               // termina cuando el tren se va
    puntoFinal: { x: 206 * T, y: 30 * T - 30 },   // para el truco: después del rescate, en los techos de 1981
    tren: { y: 38 * T, x0: 262 * T, fin: 420 * T },   // la vía va sobre el suelo (fila 38)
    rescate: { x: 206 * T, y: 30 * T - 30 },      // donde sigue Nato después del rescate
  };
  const pon = (x, y, c) => { if (x >= 0 && x < N.ancho && y >= 0 && y < N.alto) N.mapa[y * N.ancho + x] = c; };
  const llenar = (x0, y0, x1, y1, c) => { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) pon(x, y, c); };
  const terraza = (x0, x1, fila) => llenar(x0, fila, x1, N.alto - 1, C_ROCA);
  const hoyo = (x0, x1, fila) => llenar(x0, fila, x1, N.alto - 1, C_VACIO);
  const ent = (tipo, x, y, extra) => N.entidades.push(Object.assign({ tipo, x: x * T, y: y * T }, extra || {}));
  const letrero = (x, fila, texto, textoTactil) => ent('letrero', x, fila, { texto, textoTactil });
  const pepitas = (x0, x1, fila, arco) => {
    for (let x = x0; x <= x1; x++) {
      const k = x1 === x0 ? 0 : (x - x0) / (x1 - x0);
      ent('pepita', x, fila - (arco ? Math.round(Math.sin(k * Math.PI) * arco) : 0), {});
    }
  };
  const decor = (img, x, yAbajo, extra) => N.fondo.push(Object.assign({ img, x: x * T, yAbajo: yAbajo * T }, extra || {}));
  const edificio = (img, x, suelo, techo, cols, extra) => {
    decor(img, x, suelo, Object.assign({ techo, cols, azotea: true }, extra || {}));
    llenar(x, techo, x + cols - 1, techo, C_AZOTEA);
  };
  const escalinata = (x0, base, n) => {
    for (let i = 0; i < n; i++) { pon(x0 + i, base - 1 - i, C_RAMPA_D); pon(x0 + i, base - i, C_CONCRETO); llenar(x0 + i, base - i + 1, x0 + i, N.alto - 1, C_ROCA); }
  };

  // ---------- A · Sewell, 1967: las familias se van con sus cajas ----------
  terraza(0, 66, 38);
  ent('fogata', 0.6, 37, { encendida: true, id: 0 });
  decor('escenario', 9, 38);                         // la ceremonia de 1967, con banderas chilenas
  ent('mujer', 5, 36, { texto: '¡Nos vamos a Rancagua, mijito! Con la Operación Valle nos construyeron casas allá abajo.' });
  letrero(15.5, 37, '1967: el cobre se chileniza y empieza la Operación Valle. ¡Sube a lo más alto, al nido del cóndor!');
  decor('cajas', 18.4, 38); llenar(18, 36, 20, 36, C_TABLON);
  ent('minero', 24, 36, { x0: 21 * T, x1: 34 * T }); ent('minero', 27, 36, { x0: 21 * T, x1: 34 * T });
  ent('anciana', 30.5, 36, { texto: 'Aquí nacieron mis hijos… Qué pena dejar Sewell. Tome, mijito, para el camino.' });
  decor('cajas', 33.4, 38); llenar(33, 36, 35, 36, C_TABLON);
  edificio('edificio_azul', 38, 38, 31, 5);
  ent('dinamitero', 41, 29, {});
  ent('apunte', 39.5, 27.6, { n: 0 });
  ent('condor', 36, 24, { xa: 26 * T, xb: 50 * T });
  ent('diego', 47, 36, {});
  decor('cajas', 51.4, 38); llenar(51, 36, 53, 36, C_TABLON);
  ent('minero', 55, 36, { x0: 50 * T, x1: 60 * T });
  ent('fogata', 58.5, 37, { id: 1 });
  escalinata(61, 38, 5);
  pepitas(18, 20, 35, 0); pepitas(33, 35, 35, 0); pepitas(38, 42, 30, 0); pepitas(51, 53, 35, 0); pepitas(61, 65, 34, 0);

  // ---------- B · La planta, 1971: ollas, vagonetas y el tranvía aéreo ----------
  terraza(66, 128, 33);
  letrero(68, 32, '1971: el cobre se nacionaliza. La planta sigue trabajando: ¡cuidado con las ollas y las vagonetas!');
  decor('edificio_amarillo', 70, 33, { techo: 27, cols: 5 });
  hoyo(76, 78, 33); ent('olla', 76, 33, {});
  ent('apunte', 77, 28.4, { n: 1 });
  ent('minero', 82, 31, { x0: 80 * T, x1: 88 * T });
  hoyo(90, 92, 33); ent('olla', 90, 33, {});
  ent('vagonetas', 99, 32, { xFin: 94 * T, cada: 300 });
  // el tranvía aéreo cruza un barranco
  llenar(100, 31, 101, 31, C_TABLON);
  hoyo(102, 113, 33);
  N.cable = { x0: 102 * T, x1: 114 * T + 8, y: 31 * T - 54 };
  N.fondo.push({ img: 'torre', x: 102 * T, yAbajo: 33 * T }, { img: 'torre', x: 114 * T + 8, yAbajo: 33 * T });
  ent('andarivel', 102, 0, { cantidad: 3, separacion: 72, vel: 0.75 });
  ent('apunte', 108, 25.6, { n: 2 });
  ent('minero', 117, 31, { x0: 115 * T, x1: 126 * T }); ent('minero', 120, 31, { x0: 115 * T, x1: 126 * T });
  ent('fogata', 125.5, 32, { id: 2 });
  pepitas(76, 78, 30, 2); pepitas(90, 92, 30, 2); pepitas(103, 112, 28, 1);

  // ---------- C · Lo más alto de Sewell: repisas de roca y una bandada de cóndores ----------
  terraza(128, 131, 33);
  llenar(132, 30, 135, 43, C_ROCA);                    // repisas de roca: cada una tres filas más arriba
  llenar(136, 27, 138, 43, C_ROCA);
  llenar(139, 24, 143, 43, C_ROCA);
  llenar(144, 21, 146, 43, C_ROCA);
  llenar(147, 18, 150, 43, C_ROCA);
  for (let y = 12; y <= 17; y++) pon(150, y, C_ESCALERA);   // y una escalera de mano hasta la cumbre
  letrero(129.5, 32, '¡Sube por las rocas hasta la cumbre! Una BANDADA de cóndores defiende el nido.');
  ent('condor', 133, 14, { xa: 126 * T, xb: 150 * T }); ent('condor', 140, 9, { xa: 130 * T, xb: 154 * T }); ent('condor', 146, 5, { xa: 136 * T, xb: 158 * T });
  ent('apunte', 141, 20.6, { n: 3 });
  pepitas(132, 135, 28, 0); pepitas(139, 143, 22, 0); pepitas(147, 149, 16, 0);

  // ---------- D · El nido del cóndor gigante, en la cumbre ----------
  terraza(151, 202, 12);
  ent('fogata', 152.5, 11, { id: 3 });
  llenar(196, 6, 199, 11, C_ROCA);                    // el peñasco del nido
  N.nido = { x: 197.5 * T, y: 6 * T };
  ent('pedroNido', 197.5, 4, {});
  ent('condorJefe', 180, 3, { x0: 156 * T, x1: 195 * T });
  letrero(154.5, 11, '¡El cóndor gigante! Patéalo en el aire cuando baje en picada, y cuando se pose a descansar, ¡salta y dale con todo!');
  ent('apunte', 165, 7.6, { n: 4 });

  // ---------- E · 1981: los techos hasta la estación y el último tren ----------
  terraza(203, 431, 38);
  ent('fogata', 205, 29, { id: 4 });
  edificio('edificio_rojo', 204, 38, 30, 5);
  ent('tablon', 209, 30, { w: 32 });
  edificio('edificio_verde', 211, 38, 30, 4);
  ent('tablon', 215, 30, { w: 32 });
  edificio('edificio_naranjo', 217, 38, 31, 4);
  edificio('edificio_crema', 222, 38, 33, 5);
  letrero(212, 29, '¡Sewell se despide! Corre por los techos hasta la estación: el último tren está por salir.');
  ent('condor', 215, 22, { xa: 205 * T, xb: 232 * T }); ent('condor', 228, 20, { xa: 215 * T, xb: 240 * T });
  ent('minero', 230, 36, { x0: 228 * T, x1: 236 * T });
  llenar(237, 37, 254, 37, C_ANDEN);                  // el andén de la estación Sewell
  decor('estacion', 239.5, 37, { letrero: 'SEWELL' });
  ent('trenFinal', 262, 0, {});
  pepitas(204, 208, 29, 0); pepitas(211, 214, 29, 0); pepitas(217, 220, 30, 0); pepitas(222, 226, 32, 0);
  return N;
}
