// Reglas de negocio de Nube de Ideas compartidas entre alumno, proyector y panel docente.
export const LIMITES = { palabra: 25, frase: 60 };

export const ETIQUETA_ESTADO = { programada: 'Programada', abierta: 'Abierta', cerrada: 'Cerrada' };

// Programada → Abierta → Cerrada según horario, salvo que el docente la haya forzado a mano.
export function estadoNube(n, ahora = Date.now()) {
  if (n.forzado === 'abierta') return 'abierta';
  if (n.forzado === 'cerrada') return 'cerrada';
  if (n.abreEn && ahora < n.abreEn) return 'programada';
  if (n.cierraEn && ahora >= n.cierraEn) return 'cerrada';
  return 'abierta';
}

export const rutaNube = (id) => `nubes/${id}`;
export const rutaPublicas = (id) => `nubes/${id}/publicas`;
export const rutaParticipaciones = (id) => `nubes/${id}/participaciones`;

export function instruccion(n) {
  const palabra = n.formato !== 'frase';
  const cant = Number(n.cantidad) || 1;
  if (cant === 1) return palabra ? 'Escribe una palabra' : 'Escribe una frase corta';
  return palabra ? `Escribe hasta ${cant} palabras` : `Escribe hasta ${cant} frases cortas`;
}

// Guardado local de los términos que escribió cada alumno (solo en su propio dispositivo).
export function leerMios(id) {
  try { return new Set(JSON.parse(localStorage.getItem(`nube:${id}:mios`) || '[]')); } catch (e) { return new Set(); }
}
export function guardarMios(id, claves) {
  const s = leerMios(id);
  claves.forEach((k) => s.add(k));
  try { localStorage.setItem(`nube:${id}:mios`, JSON.stringify([...s])); } catch (e) { /* almacenamiento bloqueado */ }
  return s;
}
