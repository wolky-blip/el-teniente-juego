// Nivel 2 · La ciudad de las escaleras (1917–1930). Se recorre subiendo: de la estación de Sewell hasta el cine.
// Usa las casillas y la medida T de nivel1.js. Coordenadas en casillas de 16 px.
'use strict';

const NIVEL2 = {
  nombre: 'NIVEL 2 · LA CIUDAD DE LAS ESCALERAS',
  nombreCorto: 'La ciudad de las escaleras',
  epoca: '1917 – 1930',
  numero: 2, musica: 'ciudad', fondoResumen: 'escaleras', final: 'cine', vertical: true,
  ancho: 241, alto: 54,
  // tarjeta de entrada al nivel
  intro: 'El cóndor se llevó a Pedro hacia lo alto de Sewell. Nato llega en tren y empieza a subir por la ciudad de las escaleras. ¡Hay que llegar al cine antes de la función de las siete!',
  apuntes: [
    'En 1915 el campamento recibió el nombre de Sewell, cuando murió en Nueva York Barton Sewell, presidente de la Braden Copper Company. Ya vivían cerca de 9.000 personas. Como dato anecdótico, Barton Sewell nunca vino a Chile.',
    'En 1917 se inauguró el Bowling del campamento. Con los años, los propios sewellinos bautizaron el juego como «Palitroque».',
    'Sus edificios se levantaron con un sistema de madera conocido como «Cuadrados y Triángulos infinito», adaptable y muy resistente a la montaña. Llegaron a existir 253 edificios, cada uno pintado de un color distinto.',
    'Desde 1922 funcionó la Fundición de Caletones, 6 kilómetros más abajo. Un tranvía aéreo unía ambos campamentos y, solo con la fuerza de gravedad, llevaba el concentrado de cobre desde la planta de Sewell hasta la fundición.',
    'Sewell se construyó y se organizó en torno a una escalera central que unía todos los espacios. Entre 1920 y 1930 vivían ahí más de 13.000 personas, y su cine, para 680 personas, daba los mejores estrenos de la época.',
  ],
  tarjetaFinal: [
    'Sewell funcionaba como una ciudad: colegios, plazas, barrio cívico, multicanchas, el palitroque, el cine y un gran gimnasio con piscina temperada.',
    'En 1919 se inauguró el hospital del Edificio 157, el más moderno de Chile y Latinoamérica. Hacia allá vuela el cóndor…',
  ],
};

const ZONAS2 = [
  [0, 'LA ESTACIÓN DE SEWELL · 1917', 'escaleras'], [44, 'EL PALITROQUE · 1917', 'escaleras'],
  [80, 'TECHOS Y BALCONES', 'tejados'], [100, 'EL TRANVÍA AÉREO A CALETONES · 1922', 'caletones'],
  [132, 'LA ESCALERA CENTRAL', 'escaleras'], [184, 'LOS BALCONES', 'tejados'], [196, 'EL CINE · 680 BUTACAS', 'tejados'],
];

// Las filas del plano se escriben «lógicas»; D filas extra de cielo arriba dejan lugar a la torre y al cine en lo alto
const D2 = 6;
function construirNivel2() {
  const D = D2;
  const N = {
    def: NIVEL2, ancho: NIVEL2.ancho, alto: NIVEL2.alto,
    mapa: new Uint8Array(NIVEL2.ancho * NIVEL2.alto),
    fondo: [], cuevas: [], luces: [], entidades: [],
    inicio: { x: 3 * T, y: (42 + D) * T },
    meta: 230 * T,
    puntoFinal: { x: 225 * T, y: (4 + D) * T - 30 },   // para el truco «justo antes del final»
    reloj: { desde: 18 * 60 + 30, hasta: 19 * 60 },   // la función del cine empieza a las siete
  };
  const pon = (x, y, c) => { y += D; if (x >= 0 && x < N.ancho && y >= 0 && y < N.alto) N.mapa[y * N.ancho + x] = c; };
  const llenar = (x0, y0, x1, y1, c) => { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) pon(x, y, c); };
  const terraza = (x0, x1, fila) => llenar(x0, fila, x1, N.alto - 1 - D, C_ROCA);
  const ent = (tipo, x, y, extra) => N.entidades.push(Object.assign({ tipo, x: x * T, y: (y + D) * T }, extra || {}));
  const letrero = (x, fila, texto, textoTactil) => ent('letrero', x, fila, { texto, textoTactil });
  const pepitas = (x0, x1, fila, arco) => {
    for (let x = x0; x <= x1; x++) {
      const k = x1 === x0 ? 0 : (x - x0) / (x1 - x0);
      ent('pepita', x, fila - (arco ? Math.round(Math.sin(k * Math.PI) * arco) : 0), { dx: 4, dy: 4 });
    }
  };
  const decor = (img, x, yAbajo, extra) => {
    const d = Object.assign({ img, x: x * T, yAbajo: (yAbajo + D) * T }, extra || {});
    if (d.techo != null) d.techo += D;
    N.fondo.push(d);
  };
  // edificio de madera con azotea pisable a la vista (fila «techo»), que ocupa las columnas x … x + cols - 1
  const edificio = (img, x, suelo, techo, cols, extra) => {
    decor(img, x, suelo, Object.assign({ techo, cols, azotea: true }, extra || {}));
    llenar(x, techo, x + cols - 1, techo, C_AZOTEA);
  };
  // tramo de la escalera central: sube hacia la derecha n casillas desde la fila «base»; debajo, concreto
  const escalinata = (x0, base, n, conPepitas) => {
    for (let i = 0; i < n; i++) {
      pon(x0 + i, base - 1 - i, C_RAMPA_D);
      pon(x0 + i, base - i, C_CONCRETO);                    // el escalón de concreto bajo el tramo
      llenar(x0 + i, base - i + 1, x0 + i, N.alto - 1 - D, C_ROCA);   // y debajo, el cerro
      if (conPepitas && i % 2 === 1) ent('pepita', x0 + i, base - 2.4 - i, {});
    }
  };

  // ---------- A · La estación de Sewell, 1917 (x 0–19) ----------
  terraza(0, 13, 44);
  decor('estacion', 1.5, 44, { letrero: 'SEWELL' });
  ent('fogata', 0.2, 43, { encendida: true, id: 0 });
  letrero(9, 43, 'Sewell, 1917: ¡sube por la ciudad de las escaleras! Por ellas bajan bolas del palitroque: sáltalas o rómpelas de un golpe.',
    'Sewell, 1917: ¡sube por la ciudad de las escaleras! Por ellas bajan bolas del palitroque: sáltalas o rómpelas con B.');
  escalinata(14, 44, 6, true);
  ent('bolas', 21, 37, { xFin: 2 * T, cada: 250, primera: 140 });

  // ---------- B · Terraza del edificio rojo (x 20–43) ----------
  terraza(20, 43, 38);
  edificio('edificio_rojo', 21, 38, 32, 5);
  llenar(26, 35, 27, 35, C_TABLON);                 // cajones para subir al techo
  ent('apunte', 22.5, 29.6, { n: 0 });
  pepitas(22, 25, 31, 0);
  ent('minero', 31, 36, { x0: 28 * T, x1: 38 * T }); ent('minero', 34, 36, { x0: 28 * T, x1: 38 * T });   // en pareja
  decor('edificio_verde', 34.5, 38, { techo: 31, cols: 3.5 });
  decor('farol_globo', 39.2, 38);
  ent('fogata', 40, 37, { id: 1 });
  letrero(42, 37, '¡El PALITROQUE! Así le dicen los sewellinos al bowling. Adentro un minero lanza bolas: sáltalas, o súbete a las bancas.');

  // ---------- C · El palitroque (x 44–80): sala larga de madera ----------
  terraza(44, 80, 38);
  llenar(45, 38, 79, 38, C_MADERA);
  llenar(44, 31, 80, 31, C_ZINC);                   // techo de zinc, se camina por encima
  llenar(44, 32, 44, 35, C_MADERA);                 // muro izquierdo con la puerta abajo
  llenar(80, 32, 80, 37, C_MADERA);                 // muro del fondo
  for (let y = 31; y <= 37; y++) pon(79, y, C_ESCALERA);   // escalera de mano hasta el techo
  N.cuevas.push({ x: 45 * T, y: (32 + D) * T, w: 35 * T, h: 6 * T, estilo: 'palitroque', luz: true,   // escena aparte: se entra por la puerta
    bocas: [{ x: 45 * T, y: (38 + D) * T, lado: -1 }, { x: 79.5 * T, y: (32 + D) * T, lado: 'arriba' }],   // y se sale por la escotilla del techo
    fuera: { letrero: 'PALITROQUE' } });
  decor('palos', 45.3, 38);
  llenar(52, 36, 53, 36, C_TABLON); llenar(64, 36, 65, 36, C_TABLON);   // bancas
  ent('bolero', 76.5, 36, {});
  ent('minero', 60, 36, { x0: 55 * T, x1: 72 * T });
  ent('apunte', 64.5, 33.3, { n: 1 });
  pepitas(47, 51, 37, 0); pepitas(56, 62, 36, 1); pepitas(67, 74, 37, 0);
  for (const lx of [50, 58, 66, 74]) N.luces.push({ x: lx * T, y: (32.4 + D) * T, r: 40, lampara: true });
  letrero(78, 37, 'Sube la ESCALERA DE MANO con ARRIBA y salta de techo en techo. Los TABLONES sueltos se caen: ¡no te quedes encima!',
    'Sube la ESCALERA DE MANO con el botón ARRIBA y salta de techo en techo. Los TABLONES sueltos se caen: ¡no te quedes encima!');

  // ---------- D · Techos y balcones (x 80–100) ----------
  // tres techos a la misma altura unidos por tablones sueltos apoyados de techo a techo; abajo queda la calle
  terraza(81, 99, 38);
  edificio('edificio_azul', 81, 38, 30, 5);
  ent('tablon', 86, 30, { w: 48 });                 // del techo azul al rojo
  decor('ropa', 85.6, 28.6, { anim: true });
  terraza(89, 92, 35);                               // base de piedra del edificio rojo
  edificio('edificio_rojo', 89, 35, 30, 4);
  ent('tablon', 93, 30, { w: 32 });                 // del techo rojo al crema
  for (let y = 30; y <= 37; y++) pon(93, y, C_ESCALERA);   // si caes a la calle, se vuelve a subir por aquí
  terraza(95, 99, 33);
  edificio('edificio_crema', 95, 33, 30, 5);
  for (let y = 25; y <= 29; y++) pon(99, y, C_ESCALERA);   // escalera de mano hasta la terraza del tranvía
  ent('minero', 83, 36, { x0: 81 * T, x1: 88 * T }); ent('minero', 86, 36, { x0: 81 * T, x1: 88 * T });
  ent('condor', 89, 20, { xa: 80 * T, xb: 98 * T }); ent('condor', 97, 17, { xa: 86 * T, xb: 106 * T });   // en pareja
  ent('apunte', 93.6, 26.4, { n: 2 });
  pepitas(82, 85, 29, 0); pepitas(86, 88, 28, 1); pepitas(89, 92, 29, 0); pepitas(95, 98, 29, 0);

  // ---------- E · El tranvía aéreo a Caletones (x 100–132) ----------
  terraza(100, 113, 25);
  ent('fogata', 101.5, 24, { id: 2 });
  letrero(105, 24, 'Desde 1922 el tranvía aéreo baja a Caletones solo con la fuerza de gravedad. Súbete a un capacho en el andén.');
  llenar(112, 23, 113, 23, C_TABLON);               // andén de embarque
  N.cable = { x0: 114 * T, x1: 132 * T + 8, y0: (23 + D) * T - 54, y1: (31 + D) * T - 54 };   // baja hacia la derecha
  N.fondo.push({ img: 'torre', x: 114 * T, yAbajo: (25 + D) * T }, { img: 'torre', x: 132 * T + 8, yAbajo: (32 + D) * T });
  ent('andarivel', 114, 0, { cantidad: 4, separacion: 84, vel: 0.9 });
  ent('condor', 104, 16, { xa: 100 * T, xb: 110 * T });   // sobre la terraza, no sobre el barranco: si atrapa a Nato, al soltarse cae en suelo firme
  for (let x = 116; x <= 129; x += 2) ent('pepita', x, (23 + (x - 114) * 8 / 18.5) - 2.6, {});

  // ---------- F · La escalera central (x 132–184) ----------
  terraza(132, 145, 32);
  decor('camarote', 132.6, 32, { ancho: 176 });
  ent('diego', 134.2, 30, {});                     // Diego, el amigo de Nato: le regala su chaqueta regalona     // a escala de las personas: dos pisos más altos que Nato
  ent('apunte', 150.2, 26.2, { n: 3 });            // sobre la escalera: se toma de un salto al subir
  ent('minero', 140, 30, { x0: 135 * T, x1: 145 * T }); ent('minero', 143, 30, { x0: 135 * T, x1: 145 * T });
  escalinata(146, 32, 8, true);
  ent('bolas', 155, 23, { xFin: 133 * T, cada: 230, primera: 90 });
  terraza(154, 175, 24);
  ent('fogata', 155.3, 23, { id: 3 });
  ent('mujer', 158, 22, { texto: '¡Apúrate, mijito! La función del cine empieza a las siete en punto.' });
  ent('pan', 160, 22.5, {});
  edificio('edificio_crema', 160, 24, 20, 5);
  llenar(165, 24, 167, N.alto - 1 - D, C_VACIO);        // un barranco entre los edificios, con un tablón suelto de orilla a orilla
  ent('tablon', 165, 24, { w: 48 });
  decor('edificio_amarillo', 169.4, 24, { techo: 19.5, cols: 5 });
  ent('condor', 166, 15, { xa: 158 * T, xb: 178 * T }); ent('condor', 174, 13, { xa: 162 * T, xb: 184 * T });
  ent('minero', 170, 22, { x0: 168 * T, x1: 175 * T }); ent('minero', 173, 22, { x0: 168 * T, x1: 175 * T });
  escalinata(176, 24, 8, true);
  ent('bolas', 185.5, 15, { xFin: 170 * T, cada: 260, primera: 120 });

  // ---------- G · Los balcones: una torre de madera que se sube saltando de balcón en balcón (x 184–195) ----------
  terraza(184, 194, 16);
  edificio('edificio_azul', 187, 16, 4, 8, { voltear: true });
  llenar(187, 13, 189, 13, C_BALCON); llenar(191, 10, 194, 10, C_BALCON); llenar(187, 7, 190, 7, C_BALCON);
  decor('ropa', 189.6, 9.6, { anim: true });
  ent('dinamitero', 193, 8, {});
  ent('condor', 182, 4, { xa: 176 * T, xb: 196 * T }); ent('condor', 197, 1, { xa: 186 * T, xb: 206 * T });
  letrero(185.2, 15, '¡Sube de BALCÓN en BALCÓN! Arriba está el CINE, con 680 butacas: entra antes de que empiece la función.');
  pepitas(187, 189, 12, 0); pepitas(191, 194, 9, 0); pepitas(187, 190, 6, 0);

  // ---------- H · El cine (x 195–240) ----------
  terraza(195, 240, 4);
  ent('fogata', 195.4, 3, { id: 4 });
  decor('fachadaCine', 200, 4);
  llenar(200, -5, 240, -5, C_ZINC);
  llenar(200, -4, 200, 1, C_MADERA);               // muro de entrada con la puerta abajo
  llenar(201, 4, 239, 4, C_MADERA);
  N.cuevas.push({ x: 201 * T, y: (-4 + D) * T, w: 39 * T, h: 8 * T, estilo: 'cine', musica: 'cine', oscuro: 0.86,
    bocas: [{ x: 201 * T, y: (4 + D) * T, lado: -1 }], fuera: { letrero: 'CINE' } });
  llenar(201, 0, 208, 0, C_BALCON);                // galería del fondo, con el proyector
  for (let y = 0; y <= 3; y++) pon(209, y, C_ESCALERA);
  llenar(213, 3, 216, 3, C_BUTACA); llenar(219, 3, 222, 3, C_BUTACA); llenar(225, 3, 227, 3, C_BUTACA);
  decor('proyector', 202, 0);
  N.pantalla = { x: 233 * T, y: (-3.4 + D) * T, w: 6.4 * T, h: 5 * T };
  N.haz = { x: 203.7 * T, y: (-1.8 + D) * T };
  ent('minero', 217, 2, { x0: 211 * T, x1: 229 * T }); ent('minero', 222, 2, { x0: 211 * T, x1: 229 * T });
  ent('apunte', 204.5, -1.8, { n: 4 });
  pepitas(211, 216, 2, 1); pepitas(219, 227, 1.5, 0);
  for (const lx of [211, 221, 231]) N.luces.push({ x: lx * T, y: (-3.4 + D) * T, r: 22, lampara: true });

  // (sin capa de edificios lejanos: en un nivel que se sube quedarían flotando sobre escaleras y barrancos;
  //  la ciudad ya se ve en los fondos)
  return N;
}
