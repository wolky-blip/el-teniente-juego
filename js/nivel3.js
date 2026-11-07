// Nivel 3 · El apogeo (años 30 y 40). Una tormenta de invierno: hielo, viento, la piscina temperada, el alud,
// el hospital del Edificio 157 y, al final, el jefe de los mineros. Usa las casillas y la medida T de nivel1.js.
'use strict';

const NIVEL3 = {
  nombre: 'NIVEL 3 · EL APOGEO',
  nombreCorto: 'El apogeo',
  epoca: 'Años 30 y 40',
  numero: 3, musica: 'invierno', fondoResumen: 'tormenta', final: 'jefe',
  ancho: 251, alto: 40,
  hpMinero: 2,          // los mineros de esta época aguantan el doble
  intro: 'Sewell vive sus años de oro, pero llega una tormenta de invierno. El jefe de los mineros espera a Nato en lo alto, junto al hospital. ¡Solo él sabe dónde está el nido del cóndor!',
  apuntes: [
    'El licor estaba desterrado del campamento: introducirlo se castigaba como una contravención a las reglas de la compañía. Para guardar la «ley seca» había una dotación de carabineros.',
    'Sewell funcionaba como una ciudad, con múltiples colegios, plazas, multicanchas y también un gran gimnasio con una gran piscina temperada.',
    'El invierno a veces era riguroso y peligroso: por la topografía de la región, la nieve acumulada se precipitaba por los flancos del cerro en rodados o aludes que solían destruir parte de la propiedad.',
    'En 1919 se inauguró el hospital del campamento, en el Edificio 157: el más moderno de Chile y Latinoamérica. Tenía ascensor, incubadoras, laboratorio farmacéutico, salas de operaciones, cuidados intensivos y rayos X.',
    'La primera locomotora diésel llegó en 1942. Tenía el número 21 y pesaba 65 toneladas.',
  ],
  tarjetaFinal: [
    'Derrotado, el jefe de los mineros confesó dónde está el nido del cóndor: en lo más alto de Sewell.',
    'Pero antes de seguir, la historia de Sewell guarda un día que no se olvida.',
  ],
};

const ZONAS3 = [
  [0, 'INVIERNO EN SEWELL · AÑOS 30', 'tormenta'], [56, 'EL GIMNASIO Y LA PISCINA TEMPERADA', 'tormenta'],
  [101, '¡EL ALUD!', 'tormenta'], [176, 'EL HOSPITAL · EDIFICIO 157', 'tormenta'], [215, 'EL JEFE DE LOS MINEROS', 'tormenta'],
];

function construirNivel3() {
  const N = {
    def: NIVEL3, ancho: NIVEL3.ancho, alto: NIVEL3.alto,
    mapa: new Uint8Array(NIVEL3.ancho * NIVEL3.alto),
    fondo: [], cuevas: [], luces: [], entidades: [],
    inicio: { x: 3 * T, y: 32 * T },
    meta: 9999 * T,                              // el nivel termina al vencer al jefe
    puntoFinal: { x: 217 * T, y: 26 * T - 30 },  // para el truco: justo antes del jefe
    viento: [{ x0: 15 * T, x1: 56 * T, fuerza: 0.55 }, { x0: 101 * T, x1: 176 * T, fuerza: 0.35 }, { x0: 215 * T, x1: 251 * T, fuerza: 0.3 }],
    nieveFuerte: true,
  };
  const pon = (x, y, c) => { if (x >= 0 && x < N.ancho && y >= 0 && y < N.alto) N.mapa[y * N.ancho + x] = c; };
  const llenar = (x0, y0, x1, y1, c) => { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) pon(x, y, c); };
  const terraza = (x0, x1, fila) => llenar(x0, fila, x1, N.alto - 1, C_ROCA);
  const hielo = (x0, x1, fila) => llenar(x0, fila, x1, fila, C_HIELO);
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

  // ---------- A · Invierno en Sewell (x 0–55): hielo, viento y mineros más duros ----------
  terraza(0, 55, 34);
  ent('fogata', 1, 33, { encendida: true, id: 0 });
  decor('edificio_rojo', 3, 34); decor('edificio_amarillo', 29.5, 34); decor('edificio_verde', 46, 34);
  letrero(6, 33, 'Años 30: el invierno es bravo. El HIELO resbala, el VIENTO te empuja en el aire y los mineros aguantan DOS combos.');
  hielo(9, 15, 34);
  llenar(19, 32, 24, 33, C_ROCA); hielo(19, 24, 32);           // un montículo de nieve helada
  ent('apunte', 21.5, 29.4, { n: 0 });
  ent('minero', 31, 32, { x0: 27 * T, x1: 36 * T });
  hoyo(37, 39, 34);
  ent('condor', 44, 24, { xa: 38 * T, xb: 56 * T });
  ent('minero', 46, 32, { x0: 41 * T, x1: 52 * T });
  ent('diego', 49.5, 32, {});
  ent('fogata', 53, 33, { id: 1 });
  pepitas(9, 15, 32, 1); pepitas(19, 24, 30, 0); pepitas(37, 39, 31, 2);

  // ---------- B · El gimnasio y la piscina temperada (x 56–100) ----------
  terraza(56, 100, 34);
  llenar(57, 34, 99, 34, C_MADERA);
  llenar(56, 24, 100, 24, C_ZINC);
  llenar(56, 25, 56, 31, C_MADERA); llenar(100, 25, 100, 31, C_MADERA);   // muros con puertas abajo
  N.cuevas.push({ x: 57 * T, y: 25 * T, w: 43 * T, h: 15 * T, estilo: 'gimnasio', luz: true, musica: 'ciudad',
    bocas: [{ x: 57 * T, y: 34 * T, lado: -1 }, { x: 100 * T, y: 34 * T, lado: 1 }], fuera: { letrero: 'GIMNASIO', piso: 34 * T } });   // hasta el fondo de la piscina
  llenar(65, 34, 87, 39, C_CONCRETO);                          // la piscina: paredes y fondo de concreto
  llenar(66, 34, 86, 38, C_AGUA);
  llenar(63, 31, 65, 31, C_TABLON);                            // trampolín
  N.piscina = { x: 66 * T, y: 34 * T, w: 21 * T, h: 5 * T };
  letrero(58.5, 33, 'El gran gimnasio con su piscina temperada: afuera nieva y adentro se nada. Para NADAR, aprieta SALTAR varias veces.',
    'El gran gimnasio con su piscina temperada: afuera nieva y adentro se nada. Para NADAR, toca A varias veces.');
  ent('minero', 60, 32, { x0: 57 * T, x1: 63 * T });
  ent('apunte', 76, 37.2, { n: 1 });                           // al fondo de la piscina: hay que bucear
  ent('minero', 92, 32, { x0: 88 * T, x1: 98 * T });
  pepitas(68, 84, 36, 1); pepitas(88, 97, 33, 0);
  for (const lx of [64, 76, 88]) N.luces.push({ x: lx * T, y: 25.4 * T, r: 40, lampara: true });

  // ---------- C · El alud (x 101–175): se corre sin parar ----------
  terraza(101, 175, 34);
  ent('fogata', 102, 33, { id: 2 });
  letrero(104.5, 33, '¡Se viene un ALUD! Corre sin parar hasta el hospital. Si la nieve te alcanza, pierdes un corazón.');
  ent('alud', 108, 0, { xFin: 171 * T });
  hielo(110, 115, 34);
  hoyo(119, 121, 34);
  llenar(128, 32, 131, 33, C_ROCA);
  ent('apunte', 129.5, 28.6, { n: 2 });
  hoyo(139, 141, 34);
  hielo(144, 149, 34);
  llenar(151, 31, 153, 33, C_ROCA);
  hoyo(159, 160, 34);
  ent('rodados', 168, 32, { xFin: 108 * T, cada: 210 });
  ent('condor', 150, 22, { xa: 140 * T, xb: 165 * T });
  pepitas(110, 115, 32, 0); pepitas(119, 121, 31, 2); pepitas(128, 131, 30, 0); pepitas(139, 141, 31, 2); pepitas(151, 153, 29, 0);

  // ---------- D · El hospital del Edificio 157 (x 174–214): el ascensor sube al segundo piso ----------
  ent('fogata', 173.5, 33, { id: 3 });
  terraza(176, 214, 34);
  llenar(177, 34, 213, 34, C_MADERA);
  llenar(176, 17, 214, 17, C_ZINC);
  llenar(176, 18, 176, 31, C_MADERA);                          // entrada por abajo a la izquierda
  llenar(214, 18, 214, 23, C_MADERA); llenar(214, 26, 214, 33, C_MADERA);   // salida a la cornisa por el segundo piso
  llenar(177, 26, 203, 26, C_MADERA); llenar(207, 26, 213, 26, C_MADERA);   // el segundo piso, con el hueco del ascensor
  N.cuevas.push({ x: 177 * T, y: 18 * T, w: 37 * T, h: 16 * T, estilo: 'hospital', luz: true, musica: 'cueva',
    bocas: [{ x: 177 * T, y: 34 * T, lado: -1 }, { x: 214 * T, y: 26 * T, lado: 1 }],
    fuera: { letrero: 'HOSPITAL · EDIFICIO 157', cruz: true, pisos: [26 * T, 34 * T] } });
  ent('ascensor', 204, 26, { y1: 34 * T, w: 48 });            // entre el primer piso (fila 34) y el segundo (fila 26)
  // amoblado con cosas de 1919: camas de fierro, biombos, rayos X, botica, incubadoras y la sala de operaciones
  const mueble = (img, x, fila, ancho, extra) => decor(img, x, fila, Object.assign({ mueble: true, ancho }, extra || {}));
  mueble('h_cama', 180.6, 34, 54); mueble('h_biombo', 183.8, 34, 31); mueble('h_cama_paciente', 185.6, 34, 52);
  mueble('h_silla', 189, 34, 24); mueble('h_rayosx', 191.4, 34, 33); mueble('h_botica', 196.4, 34, 31);
  mueble('h_incubadora', 177.6, 26, 31); mueble('h_incubadora', 179.6, 26, 31); mueble('h_operaciones', 182.4, 26, 47);
  mueble('h_cama', 188, 26, 54); mueble('h_biombo', 191.2, 26, 31); mueble('h_cama_paciente', 193, 26, 52); mueble('h_silla', 199.4, 26, 24);
  mueble('h_cama', 207.6, 34, 54); mueble('h_biombo', 211.2, 34, 31); mueble('h_cama_paciente', 208.4, 26, 52);
  ent('mujer', 178.6, 32, { img: 'enfermera', dir: 1, texto: 'Bienvenido al hospital del Edificio 157, el más moderno de Chile: ¡hasta tiene ascensor! Súbete y espera.' });
  ent('mujer', 199.2, 32, { img: 'medico', dir: -1, texto: 'Aquí tenemos incubadoras, laboratorio farmacéutico, salas de operaciones, cuidados intensivos y rayos X.' });
  ent('minero', 192, 32, { x0: 184 * T, x1: 201 * T });
  ent('apunte', 186, 23.4, { n: 3 });
  ent('minero', 186, 24, { x0: 179 * T, x1: 196 * T });   // lejos del ascensor: no embosca a Nato al bajarse
  pepitas(180, 186, 25, 0); pepitas(207, 212, 25, 0); pepitas(184, 200, 33, 0);
  for (const lx of [182, 192, 202, 210]) { N.luces.push({ x: lx * T, y: 18.4 * T, r: 30, lampara: true }); N.luces.push({ x: lx * T, y: 26.6 * T, r: 30, lampara: true }); }

  // ---------- E · La cornisa del jefe (x 215–250) ----------
  terraza(215, 250, 26);
  ent('fogata', 215.6, 25, { id: 4 });
  ent('apunte', 219, 21.6, { n: 4 });
  ent('jefe', 240, 24, { x0: 217 * T, x1: 249 * T });
  letrero(214.6, 25, '¡El jefe de los mineros! Esquiva sus puñetazos y su embestida: cuando choca contra la roca queda aturdido. ¡Ahí, dale combos!');
  return N;
}
