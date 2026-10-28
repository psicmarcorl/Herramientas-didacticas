// Backend de DEMOSTRACIÓN: guarda todo en el navegador (localStorage) y sincroniza
// pestañas del mismo navegador. Sirve para probar el sitio sin configurar Firebase.
// No conecta celulares distintos entre sí.
const CLAVE = 'aula:db';
const CLAVE_AUTH = 'aula:auth';
const CLAVE_SESION = 'aula:sesion';
const TS = '__ts__';
const canal = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('aula-db') : null;

const escuchas = new Set();
const escuchasAuth = new Set();

function leer() {
  try { return JSON.parse(localStorage.getItem(CLAVE) || '{}'); } catch (e) { return {}; }
}
function escribir(datos) {
  localStorage.setItem(CLAVE, JSON.stringify(datos));
  if (canal) canal.postMessage('cambio');
  avisar();
}
function avisar() {
  escuchas.forEach((f) => f());
}
if (canal) canal.onmessage = avisar;
window.addEventListener('storage', (e) => {
  if (e.key === CLAVE) avisar();
  if (e.key === CLAVE_SESION) escuchasAuth.forEach((f) => f(usuario()));
});

const clon = (x) => JSON.parse(JSON.stringify(x));
function preparar(datos) {
  const o = {};
  for (const [k, v] of Object.entries(datos)) o[k] = v === TS ? Date.now() : v;
  return o;
}
function hijos(todo, coleccion) {
  const pref = coleccion + '/';
  const out = [];
  for (const [ruta, datos] of Object.entries(todo)) {
    if (ruta.startsWith(pref) && !ruta.slice(pref.length).includes('/')) {
      out.push({ id: ruta.slice(pref.length), ...clon(datos) });
    }
  }
  return out;
}
function idNuevo() {
  const a = new Uint8Array(10);
  crypto.getRandomValues(a);
  return Array.from(a, (b) => (b % 36).toString(36)).join('');
}

async function sha(texto) {
  const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(texto));
  return Array.from(new Uint8Array(b), (x) => x.toString(16).padStart(2, '0')).join('');
}
function usuario() {
  const c = localStorage.getItem(CLAVE_SESION);
  return c ? { email: c } : null;
}

const db = {
  TS,
  async get(ruta) {
    const d = leer()[ruta];
    return d ? clon(d) : null;
  },
  async set(ruta, datos, opc = {}) {
    const todo = leer();
    const nuevo = preparar(datos);
    todo[ruta] = opc.merge && todo[ruta] ? { ...todo[ruta], ...nuevo } : nuevo;
    escribir(todo);
  },
  async add(coleccion, datos) {
    const id = idNuevo();
    const todo = leer();
    todo[`${coleccion}/${id}`] = preparar(datos);
    escribir(todo);
    return id;
  },
  async addMany(items) {
    const todo = leer();
    for (const it of items) todo[`${it.col}/${idNuevo()}`] = preparar(it.datos);
    escribir(todo);
  },
  async del(ruta) {
    const todo = leer();
    delete todo[ruta];
    escribir(todo);
  },
  async delCol(coleccion) {
    const todo = leer();
    for (const h of hijos(todo, coleccion)) delete todo[`${coleccion}/${h.id}`];
    escribir(todo);
  },
  async list(coleccion) {
    return hijos(leer(), coleccion);
  },
  async count(coleccion) {
    return hijos(leer(), coleccion).length;
  },
  onDoc(ruta, cb) {
    const f = () => { const d = leer()[ruta]; cb(d ? clon(d) : null); };
    escuchas.add(f);
    setTimeout(f, 0);
    return () => escuchas.delete(f);
  },
  onCol(coleccion, cb) {
    const f = () => cb(hijos(leer(), coleccion));
    escuchas.add(f);
    setTimeout(f, 0);
    return () => escuchas.delete(f);
  },
  auth: {
    onChange(cb) {
      escuchasAuth.add(cb);
      setTimeout(() => cb(usuario()), 0);
      return () => escuchasAuth.delete(cb);
    },
    usuario,
    async login(correo, clave) {
      if (!correo || !clave) throw new Error('Escribe tu correo y tu contraseña.');
      const guardada = localStorage.getItem(CLAVE_AUTH);
      const h = await sha(clave);
      if (!guardada) {
        // Primer uso en demostración: la contraseña escrita queda definida.
        localStorage.setItem(CLAVE_AUTH, h);
      } else if (guardada !== h) {
        throw new Error('Contraseña incorrecta.');
      }
      localStorage.setItem(CLAVE_SESION, correo);
      escuchasAuth.forEach((f) => f(usuario()));
    },
    async logout() {
      localStorage.removeItem(CLAVE_SESION);
      escuchasAuth.forEach((f) => f(null));
    },
    async cambiarClave(actual, nueva) {
      const guardada = localStorage.getItem(CLAVE_AUTH);
      if (guardada && guardada !== (await sha(actual))) {
        throw new Error('La contraseña actual no es correcta.');
      }
      localStorage.setItem(CLAVE_AUTH, await sha(nueva));
    }
  }
};

export default db;
