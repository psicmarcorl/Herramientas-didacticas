// Backend real: Firebase (Firestore + Authentication), cargado desde el CDN oficial.
import { firebaseConfig } from './firebase-config.js';

const V = '10.12.2';
const base = `https://www.gstatic.com/firebasejs/${V}`;

const { initializeApp } = await import(`${base}/firebase-app.js`);
const {
  getFirestore, doc, getDoc, setDoc, addDoc, deleteDoc, collection, getDocs,
  onSnapshot, writeBatch, serverTimestamp, getCountFromServer
} = await import(`${base}/firebase-firestore.js`);
const {
  getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged,
  reauthenticateWithCredential, EmailAuthProvider, updatePassword
} = await import(`${base}/firebase-auth.js`);

const app = initializeApp(firebaseConfig);
const fs = getFirestore(app);
const au = getAuth(app);

const TS = '__ts__';

// Cambia el marcador TS por la hora del servidor.
function preparar(datos) {
  const o = {};
  for (const [k, v] of Object.entries(datos)) o[k] = v === TS ? serverTimestamp() : v;
  return o;
}
// Convierte Timestamps de Firestore a milisegundos.
function limpiar(datos) {
  const o = {};
  for (const [k, v] of Object.entries(datos)) {
    o[k] = v && typeof v === 'object' && typeof v.toMillis === 'function' ? v.toMillis() : v;
  }
  return o;
}
const ref = (ruta) => doc(fs, ...ruta.split('/'));
const col = (ruta) => collection(fs, ...ruta.split('/'));

async function borrarEnLotes(refs) {
  for (let i = 0; i < refs.length; i += 400) {
    const lote = writeBatch(fs);
    refs.slice(i, i + 400).forEach((r) => lote.delete(r));
    await lote.commit();
  }
}

const db = {
  TS,
  async get(ruta) {
    const s = await getDoc(ref(ruta));
    return s.exists() ? limpiar(s.data()) : null;
  },
  async set(ruta, datos, opc = {}) {
    await setDoc(ref(ruta), preparar(datos), opc.merge ? { merge: true } : {});
  },
  async add(coleccion, datos) {
    const r = await addDoc(col(coleccion), preparar(datos));
    return r.id;
  },
  async addMany(items) {
    const lote = writeBatch(fs);
    for (const it of items) lote.set(doc(col(it.col)), preparar(it.datos));
    await lote.commit();
  },
  async del(ruta) {
    await deleteDoc(ref(ruta));
  },
  async delCol(coleccion) {
    const s = await getDocs(col(coleccion));
    await borrarEnLotes(s.docs.map((d) => d.ref));
  },
  async list(coleccion) {
    const s = await getDocs(col(coleccion));
    return s.docs.map((d) => ({ id: d.id, ...limpiar(d.data()) }));
  },
  async count(coleccion) {
    try {
      const s = await getCountFromServer(col(coleccion));
      return s.data().count;
    } catch (e) {
      const s = await getDocs(col(coleccion));
      return s.size;
    }
  },
  onDoc(ruta, cb, onErr) {
    return onSnapshot(
      ref(ruta),
      (s) => cb(s.exists() ? limpiar(s.data()) : null),
      (e) => onErr && onErr(e)
    );
  },
  onCol(coleccion, cb, onErr) {
    return onSnapshot(
      col(coleccion),
      (s) => cb(s.docs.map((d) => ({ id: d.id, ...limpiar(d.data()) }))),
      (e) => onErr && onErr(e)
    );
  },
  auth: {
    onChange(cb) {
      return onAuthStateChanged(au, (u) => cb(u ? { email: u.email } : null));
    },
    usuario() {
      return au.currentUser ? { email: au.currentUser.email } : null;
    },
    async login(correo, clave) {
      try {
        await signInWithEmailAndPassword(au, correo, clave);
      } catch (e) {
        const c = e && e.code ? e.code : '';
        if (c === 'auth/too-many-requests') {
          throw new Error('Demasiados intentos fallidos. Espera unos minutos e inténtalo de nuevo.');
        }
        if (c === 'auth/network-request-failed') {
          throw new Error('No hay conexión. Revisa tu internet e inténtalo de nuevo.');
        }
        if (c === 'auth/invalid-email') {
          throw new Error('Escribe un correo válido.');
        }
        throw new Error('Contraseña incorrecta.');
      }
    },
    async logout() {
      await signOut(au);
    },
    async cambiarClave(actual, nueva) {
      const u = au.currentUser;
      if (!u) throw new Error('Tu sesión terminó. Vuelve a entrar.');
      try {
        await reauthenticateWithCredential(u, EmailAuthProvider.credential(u.email, actual));
      } catch (e) {
        throw new Error('La contraseña actual no es correcta.');
      }
      try {
        await updatePassword(u, nueva);
      } catch (e) {
        throw new Error('No se pudo cambiar la contraseña. Usa al menos 8 caracteres.');
      }
    }
  }
};

export default db;
