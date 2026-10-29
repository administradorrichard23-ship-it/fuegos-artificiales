const canvas = document.getElementById('lienzo');
const ctx = canvas.getContext('2d');

// ---------- CONFIGURACIÓN DINÁMICA ----------
// Ajusta el lienzo al tamaño real del contenedor en el navegador
function ajustarPantalla() {
  const rect = canvas.getBoundingClientRect();
  canvas.width = rect.width || window.innerWidth;
  canvas.height = rect.height || window.innerHeight;
}
ajustarPantalla();
window.addEventListener('resize', ajustarPantalla);

const reducir = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const GRAVEDAD = reducir ? 0 : 280;
const PARTICULAS_POR_EXPLOSION = reducir ? 12 : 120;
const MAX_PARTICULAS = 2000;

function azar(min, max) { return min + Math.random() * (max - min); }

canvas.setAttribute('aria-label', 'Cielo nocturno interactivo: haz clic para lanzar fuegos artificiales neón');

// ---------- ELEMENTOS DEL CIELO ----------
const estrellas = [];
function generarEstrellas() {
  estrellas.length = 0;
  for (let i = 0; i < 100; i++) {
    estrellas.push({
      x: azar(0, canvas.width),
      y: azar(0, canvas.height * 0.65),
      radio: azar(0.4, 1.5),
      fase: azar(0, Math.PI * 2),
      velocidadBrillo: azar(1, 3)
    });
  }
}
generarEstrellas();

function dibujarFondo(dt) {
  // Dibujar estrellas titilantes
  ctx.fillStyle = '#FFFFFF';
  for (const e of estrellas) {
    e.fase += e.velocidadBrillo * dt;
    ctx.globalAlpha = 0.3 + Math.abs(Math.sin(e.fase)) * 0.7; // Efecto titileo
    ctx.beginPath();
    ctx.arc(e.x, e.y, e.radio, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  // Dibujar Luna en posición relativa (siempre arriba a la derecha, sin importar el tamaño)
  const lunaX = canvas.width - 100;
  const lunaY = 80;
  
  ctx.fillStyle = '#FFF4C2'; // Resplandor de la luna
  ctx.beginPath();
  ctx.arc(lunaX, lunaY, 35, 0, Math.PI * 2);
  ctx.fill();
  
  ctx.fillStyle = '#05060F'; // Sombra para hacerla creciente
  ctx.beginPath();
  ctx.arc(lunaX + 15, lunaY - 10, 32, 0, Math.PI * 2);
  ctx.fill();
}

// ---------- COMETA DINÁMICO ----------
const cometa = { x: 50, y: 120, vx: 180, vy: 90, radio: 6 };
function moverCometa(dt) {
  cometa.x += cometa.vx * dt;
  cometa.y += cometa.vy * dt;

  // Rebotar en los bordes calculados en vivo
  if (cometa.x > canvas.width || cometa.x < 0) cometa.vx *= -1;
  if (cometa.y > canvas.height || cometa.y < 0) cometa.vy *= -1;

  // Dibujo del cometa con destello neón
  ctx.shadowBlur = 15;
  ctx.shadowColor = '#00E5FF';
  ctx.fillStyle = '#00E5FF';
  ctx.beginPath();
  ctx.arc(cometa.x, cometa.y, cometa.radio, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0; // Resetear sombra para no ralentizar el resto
}

// ---------- SISTEMA DE PARTICULAS (FUEGOS ARTIFICIALES) ----------
class Particula {
  constructor(x, y, tono) {
    this.x = x;
    this.y = y;
    this.tono = tono + azar(-20, 20);
    
    const angulo = azar(0, Math.PI * 2);
    const fuerza = azar(50, 280);
    this.vx = Math.cos(angulo) * fuerza;
    this.vy = Math.sin(angulo) * fuerza;
    
    this.radio = azar(1.2, 3);
    this.vidaMax = azar(1.2, 1.8);
    this.vida = this.vidaMax;
  }
  actualizar(dt) {
    this.vy += GRAVEDAD * dt;
    this.vx *= 0.97; // Fricción del aire
    this.vy *= 0.97;
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.vida -= dt;
  }
  dibujar() {
    const alfa = Math.max(this.vida / this.vidaMax, 0);
    ctx.globalAlpha = alfa;
    
    // Efecto brillante neón para cada chispa
    ctx.shadowBlur = 8;
    ctx.shadowColor = `hsl(${this.tono}, 100%, 50%)`;
    ctx.fillStyle = `hsl(${this.tono}, 100%, 65%)`;
    
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radio, 0, Math.PI * 2);
    ctx.fill();
  }
}

const listaPartculas = [];

function crearExplosion(x, y) {
  const colorBase = azar(0, 360);
  for (let i = 0; i < PARTICULAS_POR_EXPLOSION; i++) {
    if (listaPartculas.length < MAX_PARTICULAS) {
      listaPartculas.push(new Particula(x, y, colorBase));
    }
  }
}

// ---------- INTERACCIÓN ----------
function obtenerCoordenadas(e) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: e.clientX - rect.left,
    y: e.clientY - rect.top
  };
}

canvas.addEventListener('pointerdown', (e) => {
  const mouse = obtenerCoordenadas(e);
  crearExplosion(mouse.x, mouse.y);
  reproducirSonido(mouse.y);
});

// ---------- BONUS: SONIDO OPTIMIZADO ----------
let audioCtx = null;
let mutear = false;

function reproducirSonido(y) {
  if (mutear) return;
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  
  const ahora = audioCtx.currentTime;
  const oscilador = audioCtx.createOscillator();
  const ganancia = audioCtx.createGain();
  
  oscilador.type = 'sine'; // Sonido más suave tipo explosión profunda
  // El tono depende de la altura del clic (más abajo = más grave)
  const frecuenciaInicial = 120 + (1 - y / canvas.height) * 400;
  
  oscilador.frequency.setValueAtTime(frecuenciaInicial, ahora);
  oscilador.frequency.exponentialRampToValueAtTime(40, ahora + 0.35);
  
  ganancia.gain.setValueAtTime(0.25, ahora);
  ganancia.gain.exponentialRampToValueAtTime(0.001, ahora + 0.35);
  
  oscilador.connect(ganancia).connect(audioCtx.destination);
  oscilador.start(ahora);
  oscilador.stop(ahora + 0.4);
}

window.addEventListener('keydown', (e) => {
  if (e.key.toLowerCase() === 'm') mutear = !mutear;
});

// ---------- BUCLE DE RENDERIZADO PRINCIPAL ----------
let tiempoAnterior = 0;
let FPS = 60;

function animar(tiempoActual) {
  const dt = Math.min(tiempoAnterior ? (tiempoActual - tiempoAnterior) / 1000 : 0, 0.1);
  tiempoAnterior = tiempoActual;
  
  if (dt > 0) {
    FPS += (1 / dt - FPS) * 0.05;
  }

  // Fondo con rastro (Mela): limpia la pantalla dejando una estela semitransparente
  ctx.shadowBlur = 0; 
  ctx.globalAlpha = reducir ? 1 : 0.15; // 0.15 genera el efecto difuminado hermoso
  ctx.fillStyle = '#05060F';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Dibujar el escenario de fondo
  dibujarFondo(dt);
  moverCometa(dt);

  // Actualizar y pintar fuegos artificiales
  for (let i = listaPartculas.length - 1; i >= 0; i--) {
    const p = listaPartculas[i];
    p.actualizar(dt);
    if (p.vida <= 0 || p.y > canvas.height) {
      listaPartculas.splice(i, 1);
    } else {
      p.dibujar();
    }
  }

  // Interfaz de texto en pantalla
  ctx.shadowBlur = 0;
  ctx.globalAlpha = 1;
  ctx.fillStyle = '#FFFFFF';
  ctx.font = '14px monospace';
  ctx.fillText(`Chispas: ${listaPartculas.length}  |  FPS: ${FPS.toFixed(0)}  |  [M] Sonido: ${mutear ? 'OFF' : 'ON'}`, 20, canvas.height - 20);

  requestAnimationFrame(animar);
}

requestAnimationFrame(animar);
// ============================================================================
// 1. NUEVAS CONFIGURACIONES (Añadir al inicio con tus variables globales)
// ============================================================================
const naves = [];
const MAX_NAVES = 3;
let proximoGenerarNave = 0; // Temporizador para controlar cuándo aparece otra nave

// Objeto para rastrear la posición del mouse en vivo
const posicionMouse = { x: 0, y: 0, activo: false };

// ============================================================================
// 2. SISTEMA DE NAVES ESPACIALES (Añadir al código)
// ============================================================================
class Nave {
  constructor() {
    this.sentido = Math.random() > 0.5 ? 1 : -1; // 1: Izq a Der, -1: Der a Izq
    this.x = this.sentido === 1 ? -60 : canvas.width + 60;
    this.y = azar(canvas.height * 0.1, canvas.height * 0.4); // Vuelan en la zona superior
    this.velocidad = azar(80, 160) * this.sentido;
    this.tono = azar(180, 300); // Colores cian, azul, violeta o magenta
    this.ancho = 24;
    this.alto = 12;
  }

  actualizar(dt) {
    this.x += this.velocidad * dt;
  }

  dibujar() {
    ctx.save();
    ctx.translate(this.x, this.y);
    // Voltear el dibujo de la nave según hacia dónde avanza
    if (this.sentido === -1) ctx.scale(-1, 1);

    // Rastro del propulsor (Fuego/Energía trasero)
    ctx.fillStyle = `hsl(${(this.tono + 180) % 360}, 100%, 60%)`;
    ctx.beginPath();
    ctx.moveTo(-this.ancho / 2, 0);
    ctx.lineTo(-this.ancho / 2 - azar(8, 15), azar(-3, 3));
    ctx.lineTo(-this.ancho / 2, azar(2, 4));
    ctx.fill();

    // Cuerpo de la nave futurista (Geometría limpia)
    ctx.fillStyle = `hsl(${this.tono}, 100%, 50%)`;
    ctx.beginPath();
    ctx.moveTo(-this.ancho / 2, -this.alto / 2); // Esquina trasera superior
    ctx.lineTo(this.ancho / 2, 0);               // Punta delantera
    ctx.lineTo(-this.ancho / 2, this.alto / 2);  // Esquina trasera inferior
    ctx.lineTo(-this.ancho / 4, 0);               // Hendidura de la cabina
    ctx.closePath();
    ctx.fill();

    // Luz de navegación parpadeante en la cabina
    if (Math.floor(Date.now() / 200) % 2 === 0) {
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.arc(this.ancho / 4, 0, 2, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }
}

function gestionarNaves(dt) {
  // Generar nuevas naves espaciadas en el tiempo
  const ahora = Date.now();
  if (naves.length < MAX_NAVES && ahora > proximoGenerarNave) {
    naves.push(new Nave());
    proximoGenerarNave = ahora + azar(4000, 9000); // Esperar entre 4 y 9 segundos
  }

  // Actualizar, dibujar y limpiar naves fuera de pantalla
  for (let i = naves.length - 1; i >= 0; i--) {
    const n = naves[i];
    n.actualizar(dt);
    
    // Si se sale de los bordes del canvas, removerla del array
    if ((n.sentido === 1 && n.x > canvas.width + 100) || (n.sentido === -1 && n.x < -100)) {
      naves.splice(i, 1);
    } else {
      n.dibujar();
    }
  }
}

// ============================================================================
// 3. NUEVOS ESCUCHADORES DE EVENTOS (Reemplazar o añadir junto a pointerdown)
// ============================================================================
canvas.addEventListener('pointermove', (e) => {
  const mouse = obtenerCoordenadas(e);
  posicionMouse.x = mouse.x;
  posicionMouse.y = mouse.y;
  posicionMouse.activo = true;

  // Al pasar el mouse, creamos de 1 a 2 chispitas mágicas muy ligeras
  if (!reducir && listaPartculas.length < MAX_PARTICULAS) {
    const p = new Particula(mouse.x, mouse.y, 45); // Tono 45 = Brillo dorado/amarillo neón
    // Forzamos a que estas chispas de movimiento sean más débiles y caigan rápido
    p.vx = azar(-40, 40);
    p.vy = azar(-10, 50);
    p.vidaMax = azar(0.4, 0.8);
    p.vida = p.vidaMax;
    p.radio = azar(0.8, 1.8);
    listaPartculas.push(p);
  }
});

// Detectar cuando el mouse abandona el canvas para apagar efectos continuos
canvas.addEventListener('pointerleave', () => {
  posicionMouse.activo = false;
});

// 4. ACTUALIZACIÓN DEL BUCLE 

//  el brillo del mouse:

function animar(tiempoActual) {
  const dt = Math.min(tiempoAnterior ? (tiempoActual - tiempoAnterior) / 1000 : 0, 0.1);
  tiempoAnterior = tiempoActual;
  
  if (dt > 0) FPS += (1 / dt - FPS) * 0.05;

  ctx.shadowBlur = 0; 
  ctx.globalAlpha = reducir ? 1 : 0.15;
  ctx.fillStyle = '#05060F';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  //escenario estático/cometa
  dibujarFondo(dt);
  moverCometa(dt);

  // dibujar las naves espaciales ---
  gestionarNaves(dt);

  // fuegos artificiales/chispas de mouse
  for (let i = listaPartculas.length - 1; i >= 0; i--) {
    const p = listaPartculas[i];
    p.actualizar(dt);
    if (p.vida <= 0 || p.y > canvas.height) {
      listaPartculas.splice(i, 1);
    } else {
      p.dibujar();
    }
  }

  if (posicionMouse.activo && !reducir) {
    ctx.save();
    ctx.globalAlpha = 0.2; // Brillo suave disperso
    ctx.fillStyle = '#00E5FF';
    ctx.beginPath();
    ctx.arc(posicionMouse.x, posicionMouse.y, 25, 0, Math.PI * 2); 
    ctx.fill();
    
    ctx.globalAlpha = 0.6;
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.arc(posicionMouse.x, posicionMouse.y, 4, 0, Math.PI * 2); 
    ctx.fill();
    ctx.restore();
  }

  
  ctx.shadowBlur = 0;
  ctx.globalAlpha = 1;
  ctx.fillStyle = '#FFFFFF';
  ctx.font = '14px monospace';
  ctx.fillText(`Chispas: ${listaPartculas.length}  |  Naves: ${naves.length}  |  FPS: ${FPS.toFixed(0)}  |  [M] Sonido: ${mutear ? 'OFF' : 'ON'}`, 20, canvas.height - 20);

  requestAnimationFrame(animar);
}

