// Nivel 1 · Pueblo Hundido (1905–1915). Tutorial.
// El mapa se arma con funciones (no a mano casilla por casilla). Coordenadas en casillas de 16 px.
'use strict';

const T = 16;   // tamaño de casilla en unidades del mundo

// tipos de casilla
const C_VACIO = 0, C_ROCA = 1, C_CUEVA = 2, C_TABLON = 3, C_ESCALERA = 4, C_PIEDRA = 5, C_TECHO = 6, C_LITERA = 7, C_ANDEN = 8, C_VIGA = 9,
  C_CONCRETO = 10, C_BALCON = 11,   // escalones de concreto y balcones con baranda blanca, como en el Sewell real
  C_RAMPA_D = 12, C_RAMPA_I = 13,   // tramos de escalera inclinada (suben hacia la derecha / hacia la izquierda): se suben caminando
  C_BUTACA = 14, C_MADERA = 15, C_ZINC = 16,   // butacas del cine, piso de madera encerado y techo de zinc
  C_AZOTEA = 17,   // techo plano de zinc de un edificio, a la vista: se pisa desde arriba y se atraviesa saltando desde abajo
  C_HIELO = 18, C_AGUA = 19;   // suelo helado que resbala y agua de la piscina (se nada)
const SOLIDA = [false, true, true, false, false, true, false, false, true, true, true, false, false, false, false, true, true, false, true, false];
const UN_SENTIDO = [false, false, false, true, false, false, true, true, false, false, false, true, false, false, true, false, false, true, false, false];
// Altura del techo inclinado de cada edificio (fracción de la imagen desde arriba hasta el alero): si el techo se pisa,
// el edificio se dibuja sin esa punta y con una azotea plana a la vista, para que Nato no parezca flotar
const ALERO = { edificio_rojo: 0.214, edificio_verde: 0.155, edificio_azul: 0.195, edificio_naranjo: 0.064, edificio_crema: 0.268,
  edificio_amarillo: 0.25, camarote: 0.441 };

// Textos de los letreros. {saltar}, {golpe}, etc. se cambian según teclado o pantalla táctil.
const NIVEL1 = {
  nombre: 'NIVEL 1 · PUEBLO HUNDIDO',
  nombreCorto: 'Pueblo Hundido',
  epoca: '1905 – 1915',
  ancho: 240, alto: 34,
  apuntes: [
    '1905. En la ladera del Cerro Negro, el superintendente Thomas Hamilton construyó las primeras viviendas antes de que llegara el invierno.',
    'Hamilton levantó su casa de piedra «como una fortaleza al borde de un barranco». El tranvía aéreo pasaba por el frente, y ahí los capachos quedaban a menos de tres metros del suelo.',
    'Durante algunos años, muchos mineros vivieron en cavernas horadadas en la roca, a la entrada de la mina Fortuna. Había literas, sillas y mesas rústicas, y en la primera caverna una anciana tenía algo así como un restaurante.',
    'Fortuna 4 y Fortuna 5 crecieron hasta confundirse y nació Pueblo Hundido, entre los 2.200 y 2.300 metros de altura. Hacia 1915 tenía 1.500 habitantes, con almacén, panadería, escuela, hospital y teatro.',
    'Las primeras locomotoras llegaron en 1907 y pesaban 42 toneladas cada una. El primer tren no tenía coches de pasajeros: los viajeros iban montados sobre la carga de los carros planos.',
  ],
  numero: 1, musica: 'nivel', fondoResumen: 'molino', final: 'tren',
  tarjetaFinal: [
    'Con el tren subieron campesinos de todo el centro y sur de Chile, atraídos por un sueldo en plata, una vivienda con luz y escuela para sus hijos.',
    'En 1915 el campamento de El Molino recibió un nuevo nombre: Sewell.',
  ],
};

function construirNivel1() {
  const N = {
    def: NIVEL1, ancho: NIVEL1.ancho, alto: NIVEL1.alto,
    mapa: new Uint8Array(NIVEL1.ancho * NIVEL1.alto),
    fondo: [],        // decorados detrás de las casillas: {img|tipo, x, y}
    cuevas: [],       // rectángulos (px) con fondo de roca y oscuridad
    luces: [],        // {x, y, r} en px
    entidades: [],    // definiciones para crear al empezar
    inicio: { x: 3 * T, y: 22 * T },
    tren: { parada: 239.5 * T, y: 23 * T },   // la vía va a la altura del andén
    meta: 228 * T,
    puntoFinal: { x: 222 * T, y: 23 * T - 30 },   // para el truco «justo antes del final»
  };
  const pon = (x, y, c) => { if (x >= 0 && x < N.ancho && y >= 0 && y < N.alto) N.mapa[y * N.ancho + x] = c; };
  const llenar = (x0, y0, x1, y1, c) => { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) pon(x, y, c); };
  const suelo = (x0, x1, fila, c) => llenar(x0, fila, x1, N.alto - 1, c || C_ROCA);
  const ent = (tipo, x, y, extra) => N.entidades.push(Object.assign({ tipo, x: x * T, y: y * T }, extra || {}));
  const letrero = (x, texto, textoTactil, fila) => ent('letrero', x, fila || 23, { texto, textoTactil });
  const pepitas = (x0, x1, fila, arco) => {
    for (let x = x0; x <= x1; x++) {
      const k = x1 === x0 ? 0 : (x - x0) / (x1 - x0);
      ent('pepita', x, fila - (arco ? Math.round(Math.sin(k * Math.PI) * arco) : 0), { dx: 4, dy: 4 });
    }
  };
  const decor = (img, x, yAbajo, extra) => N.fondo.push(Object.assign({ img, x: x * T, yAbajo: yAbajo * T }, extra || {}));

  // ---------- A · Cerro Negro, 1905 (x 0–43) ----------
  suelo(0, 43, 24);
  llenar(13, 23, 14, 23, C_ROCA);
  llenar(16, 22, 18, 23, C_ROCA);
  llenar(19, 23, 20, 23, C_ROCA);
  llenar(23, 24, 24, N.alto - 1, C_VACIO);          // primera grieta
  decor('carpa', 5, 24); decor('carpa', 9.5, 24);
  ent('fogata', 1.5, 23, { encendida: true, id: 0 });
  letrero(4, 'Camina con las flechas y salta con Z o ESPACIO (mantenlo para saltar más alto). ¡Ojo con las grietas!',
    'Camina con < y > y salta con A (mantenlo para saltar más alto). ¡Ojo con las grietas!');
  pepitas(12, 15, 21, 1); pepitas(19, 21, 21, 0); pepitas(23, 25, 21, 2);
  ent('apunte', 17, 19, { n: 0 });
  letrero(27, '¡Un minero enojado! Dale un COMBO con X (tres golpes) o salta sobre su casco.', '¡Un minero enojado! Dale un COMBO con B (tres golpes) o salta sobre su casco.');
  ent('minero', 33, 22, { x0: 30 * T, x1: 35 * T });
  decor('casaHamilton', 37, 24, { pisable: true });   // se camina por la cumbrera del techo
  llenar(35, 22, 36, 22, C_TABLON);                 // cajones para subir al techo
  pepitas(38, 41, 19, 0);

  // ---------- B · El barranco y el tranvía aéreo (x 44–71) ----------
  // el barranco queda vacío entre 44 y 61
  suelo(62, 72, 24);
  // tranvía aéreo: torres del suelo al cable; el andén de embarque queda a la altura del mineral dentro del balde
  N.cable = { x0: 43 * T, x1: 62 * T + 8, y: 22 * T - 54 };   // andén = cable + 54; el piso del balde queda 4 px más abajo
  N.fondo.push({ img: 'torre', x: 43 * T, yAbajo: 24 * T }, { img: 'torre', x: 62 * T + 8, yAbajo: 24 * T });
  llenar(41, 22, 42, 22, C_TABLON);                 // andén de embarque: se espera el capacho y se camina hacia él
  ent('andarivel', 43, 0, { cantidad: 4, separacion: 84, vel: 0.65 });
  letrero(40.5, 'Súbete a los capachos del tranvía aéreo para cruzar el barranco: espera uno en el andén de madera y camina hacia él.');
  ent('apunte', 53, 19, { n: 1 });
  pepitas(47, 50, 19, 1); pepitas(56, 59, 19, 1);
  ent('fogata', 63, 23, { id: 1 });
  letrero(64.9, '¡Cóndores! Patéalos en el aire con X; si uno te atrapa, machaca saltar. Cada golpe llena la barra de HÉRCULES: llena, presiona C.',
    '¡Cóndores! Patéalos en el aire con B; si uno te atrapa, machaca A. Cada golpe llena la barra de HÉRCULES: llena, toca el perro.');
  ent('condor', 70, 9, { xa: 62 * T, xb: 82 * T });   // vuela sobre el cerro, no dentro de la roca


  // ---------- C · Las cavernas de la mina Fortuna (x 72–132) ----------
  llenar(72, 12, 132, N.alto - 1, C_CUEVA);
  llenar(72, 19, 100, 23, C_VACIO);                 // galería de Fortuna 4
  llenar(73, 17, 100, 18, C_VACIO);                 // techo alto para las literas
  llenar(72, 12, 72, 18, C_ROCA);
  llenar(100, 19, 102, 23, C_VACIO);                // escalera de El Fraile
  llenar(101, 24, 101, 25, C_VACIO);
  llenar(96, 26, 128, 29, C_VACIO);                 // galería de acarreo Fortuna 5
  llenar(126, 21, 132, 23, C_VACIO);                // salida hacia Pueblo Hundido
  llenar(127, 24, 127, 25, C_VACIO);
  for (let y = 24; y <= 29; y++) pon(101, y, C_ESCALERA);
  for (let y = 24; y <= 29; y++) pon(127, y, C_ESCALERA);
  // la mina es una escena aparte: se entra por la bocamina (fundido a negro) y desde afuera el cerro la tapa entera
  N.cuevas.push({ x: 72 * T, y: 17 * T, w: 61 * T, h: 13 * T, oscuro: 0.6,
    bocas: [{ x: 72 * T, y: 24 * T, lado: -1, alto: 5 * T, portal: true }, { x: 133 * T, y: 24 * T, lado: 1, alto: 3 * T }],
    fuera: { tipo: 'roca', x: 69 * T, y1: N.alto * T } });
  llenar(73, 12, 132, 16, C_ROCA);                  // por fuera, el cerro es roca con nieve encima; adentro empieza la caverna
  llenar(69, 13, 71, 16, C_ROCA);                   // el cerro baja sobre el dintel: la bocamina queda empotrada en la ladera
  N.portales = [{ img: 'bocamina', x: 72 * T, yAbajo: 24 * T, letrero: ['MINA', 'FORTUNA'] }];   // la bocamina de 1905
  N.tunelVagonetas = { x: 103 * T, y: 30 * T };
  // el restaurante de la anciana en la primera caverna
  decor('mesa', 80.5, 24);
  ent('anciana', 77, 22, { id: 2 });
  N.luces.push({ x: 78 * T, y: 22 * T, r: 52 });
  // literas
  llenar(86, 22, 88, 22, C_LITERA); llenar(86, 20, 88, 20, C_LITERA);
  llenar(91, 22, 93, 22, C_LITERA); llenar(91, 20, 93, 20, C_LITERA);
  ent('durmiente', 86, 21, {}); ent('durmiente', 91, 19, {});
  ent('apunte', 92, 19, { n: 2 });
  ent('minero', 95, 22, { x0: 93 * T, x1: 99 * T }); ent('minero', 98, 22, { x0: 93 * T, x1: 99 * T });   // en pareja
  for (const fx of [75, 84, 95, 104, 113, 122]) N.luces.push({ x: fx * T + 8, y: (fx < 100 ? 20 : 26) * T, r: 34, farol: true });
  letrero(99, 'ESCALERA DE EL FRAILE: baja a Fortuna 5 con ABAJO. Allá vienen vagonetas: ¡sáltalas!', 'ESCALERA DE EL FRAILE: baja a Fortuna 5 con el botón ABAJO. Allá vienen vagonetas: ¡sáltalas!');
  pepitas(101, 101, 26, 0);
  // Fortuna 5: rieles, vagonetas y piedras sueltas
  ent('vagonetas', 125, 28, { xFin: 104 * T, cada: 280 });   // se pierden en un túnel lateral antes de la escalera
  ent('piedra', 108, 26, {}); ent('piedra', 117, 26, {});
  ent('minero', 113, 28, { x0: 106 * T, x1: 121 * T });
  pepitas(104, 110, 28, 0); pepitas(114, 120, 27, 1);
  pepitas(127, 127, 23, 0);

  // ---------- D · Pueblo Hundido (x 132–186) ----------
  suelo(132, 240, 24);
  ent('fogata', 134, 23, { id: 3 });
  ent('diego', 136, 22, {});                        // Diego, el amigo de Nato: le regala su chaqueta regalona
  decor('casa0', 137, 24, { pisable: true });
  decor('panaderia', 145, 24, { pisable: true });
  ent('pan', 147, 22.5, {});
  decor('ropa', 141, 21.5, { anim: true });
  ent('mujer', 151, 22, { texto: 'Aquí las mujeres cocinamos y vivimos igual que los hombres, en estos mismos túneles.' });
  decor('casa2', 155, 24, { pisable: true });
  llenar(153, 22, 154, 22, C_TABLON);
  llenar(158, 18, 159, 18, C_TABLON);
  ent('apunte', 159, 15.5, { n: 3 });
  decor('casa1', 164, 24, { pisable: true });
  decor('ropa', 167, 21.5, { anim: true });
  decor('casa3', 172, 24, { pisable: true });
  ent('minero', 151, 22, { x0: 148 * T, x1: 156 * T }); ent('minero', 154, 22, { x0: 148 * T, x1: 156 * T });
  ent('minero', 177, 22, { x0: 175 * T, x1: 186 * T }); ent('minero', 180, 22, { x0: 175 * T, x1: 186 * T }); ent('minero', 183, 22, { x0: 175 * T, x1: 186 * T });   // una cuadrilla de tres
  ent('dinamitero', 157, 17, {});                  // dinamitero sobre la cumbrera de la casa grande
  letrero(143.5, '¡Cuidado! Un minero lanza dinamita desde los techos. Esquívala o devuélvesela de un golpe.');
  ent('rodados', 186, 22, { xFin: 163 * T, cada: 230 });   // piedras que bajan rodando del cerro
  // el «camarote» característico del campamento (lo menciona el libro), a escala de las personas: dos pisos más altos que Nato
  decor('camarote', 176.5, 24, { ancho: 176 });
  ent('condor', 145, 15, { xa: 136 * T, xb: 160 * T });
  ent('condor', 175, 15, { xa: 166 * T, xb: 190 * T });
  pepitas(137, 140, 19, 0); pepitas(155, 159, 18, 0); pepitas(164, 166, 19, 0); pepitas(172, 175, 19, 0); pepitas(178, 184, 22, 1);
  N.paredPueblo = { x0: 130 * T, x1: 190 * T };

  // ---------- E · El Molino, las fundiciones y la estación (x 186–240) ----------
  ent('fogata', 187, 23, { id: 4 });
  decor('edificio_amarillo', 189.5, 24);
  llenar(190, 20, 194, 20, C_BALCON);
  ent('dinamitero', 193, 18, {});                  // otro dinamitero en el balcón del edificio amarillo
  llenar(188, 22, 189, 22, C_TABLON);
  pepitas(190, 194, 18, 0);
  decor('edificio_naranjo', 194.9, 24);
  decor('farol_globo', 197.9, 24);
  decor('edificio_verde', 202.1, 24);               // edificios de madera de colores, como en el Sewell de hoy
  decor('edificio_azul', 233, 24);
  llenar(199, 24, 201, N.alto - 1, C_VACIO); ent('olla', 199, 24, {});
  llenar(206, 24, 208, N.alto - 1, C_VACIO); ent('olla', 206, 24, {});
  llenar(210, 21, 212, 21, C_BALCON);              // balcón del edificio rojo
  ent('apunte', 211, 19, { n: 4 });
  letrero(196, '¡Las ollas de la fundición! Cobre ardiendo: salta por encima.');
  ent('condor', 205, 15, { xa: 194 * T, xb: 214 * T });
  ent('minero', 210, 22, { x0: 209 * T, x1: 213 * T }); ent('minero', 212.5, 22, { x0: 209 * T, x1: 213 * T });
  decor('edificio_rojo', 213, 24);
  // escalera de concreto con baranda blanca hasta el andén
  pon(214, 23, C_CONCRETO); llenar(215, 22, 215, 23, C_CONCRETO); llenar(216, 21, 218, 23, C_CONCRETO);
  decor('farol_globo', 217.4, 21);
  pepitas(199, 201, 21, 2); pepitas(206, 208, 21, 2);
  letrero(211, '¡Llega el tren desde Rancagua! Sube la escalera y corre a la estación de El Molino.');
  llenar(219, 23, 239, 23, C_ANDEN);
  decor('estacion', 224, 23);
  pepitas(221, 226, 22, 0);

  // Sewell creciendo al fondo: edificios de madera de colores lejanos (capa con paralaje y bruma)
  const tipos = ['edificio_rojo', 'edificio_verde', 'edificio_amarillo', 'edificio_azul', 'edificio_naranjo', 'edificio_crema', 'camarote'];
  N.lejanos = [];
  for (let i = 0, tx = 176; tx < 246; i++) {
    const img = tipos[(i * 5 + 3) % tipos.length];
    N.lejanos.push({ img, tx, fila: i % 2, voltear: i % 3 === 0 });
    tx += img === 'camarote' ? 7 : 3.4 + (i % 3) * 0.7;
  }
  return N;
}
