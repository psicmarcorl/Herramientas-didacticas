// Catálogo de herramientas del menú principal.
// Para sumar una app nueva: crea su carpeta (por ejemplo "mi-app/") y agrega un bloque aquí.
//   panel    → página del panel docente (o la página principal si no tiene)
//   alumnos  → (opcional) página de entrada de alumnos
//   icono    → SVG pequeño o emoji
export const APPS = [
  {
    id: 'nube',
    nombre: 'Nube de Ideas',
    descripcion: 'Nube de palabras en vivo: tus alumnos escriben desde su celular y la nube crece con cada participación.',
    etiquetas: ['Palabras o frases', 'Proyector', 'QR'],
    panel: 'nube/docente.html',
    color: '#2f5de0',
    icono: '<svg viewBox="0 0 64 64" aria-hidden="true"><path d="M18 46a12 12 0 0 1-1-24 16 16 0 0 1 31 3 10 10 0 0 1-2 21z" fill="currentColor"/><circle cx="26" cy="35" r="3" fill="#fff"/><circle cx="34" cy="35" r="3" fill="#fff"/><circle cx="42" cy="35" r="3" fill="#fff"/></svg>'
  },
  {
    id: 'boleto',
    nombre: 'Boleto de salida',
    descripcion: 'Al cierre de clase, cada alumno pega en un tablero de corcho lo que aprendió, una cuestión clave o una duda.',
    etiquetas: ['Tablero de corcho', 'Excel', 'QR'],
    panel: 'boleto/docente.html',
    alumnos: 'boleto/',
    color: '#6B4423',
    icono: '<svg viewBox="0 0 64 64" aria-hidden="true"><rect x="3" y="7" width="58" height="50" rx="6" fill="#6B4423"/><rect x="8" y="12" width="48" height="40" rx="3" fill="#C9A26B"/><g transform="rotate(-6 24 28)"><rect x="13" y="17" width="19" height="19" fill="#FFE680"/></g><g transform="rotate(5 42 36)"><rect x="33" y="28" width="17" height="17" fill="#FFB3C7"/></g><circle cx="22" cy="17" r="3" fill="#D64545"/><circle cx="41.5" cy="28" r="3" fill="#D64545"/></svg>'
  }
];
