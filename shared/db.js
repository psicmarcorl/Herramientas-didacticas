// Capa de datos única para todas las apps.
// Si firebase-config.js está completo usa Firebase (Firestore + Auth);
// si no, usa un almacenamiento local de demostración con la misma interfaz.
//
// Interfaz (todas las rutas son del tipo "coleccion/doc/subcoleccion"):
//   db.get(ruta)                 -> objeto | null
//   db.set(ruta, datos, {merge}) -> void
//   db.add(coleccion, datos)     -> id
//   db.addMany([{col, datos}])   -> void (atómico)
//   db.del(ruta)                 -> void
//   db.delCol(coleccion)         -> void (borra todos los documentos)
//   db.list(coleccion)           -> [{id, ...datos}]
//   db.count(coleccion)          -> número
//   db.onDoc(ruta, cb, onErr)    -> función para cancelar
//   db.onCol(col, cb, onErr)     -> función para cancelar
//   db.TS                        -> marcador de "hora del servidor"
//   db.auth.{onChange, login, logout, cambiarClave, usuario}
import { firebaseConfig } from './firebase-config.js';

export const modoDemo = !(firebaseConfig.apiKey && firebaseConfig.projectId);

const modulo = modoDemo
  ? await import('./db-local.js')
  : await import('./db-firebase.js');

export const db = modulo.default;
