// Catálogo de herramientas del menú principal.
// Para sumar una app nueva: crea su carpeta (por ejemplo "mi-app/") y agrega un bloque aquí.
//   panel    → página del panel docente (o la página principal si no tiene)
//   alumnos  → (opcional) página de entrada de alumnos
//   icono    → SVG pequeño o emoji
//   boton    → (opcional) texto del botón principal; por omisión «Abrir panel docente»
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
  },
  {
    id: 'ruleta',
    nombre: 'Ruleta de participación',
    descripcion: 'Proyecta una ruleta con los nombres de tu grupo para elegir quién participa, sin repetir hasta que pasen todos, y lleva el registro en Excel.',
    etiquetas: ['Proyector', 'Pase de lista', 'Excel'],
    panel: 'ruleta/docente.html',
    color: '#6a3fb5',
    icono: '<svg viewBox="0 0 64 64" aria-hidden="true"><circle cx="32" cy="34" r="27" fill="#2a1a4a"/><path d="M32 34L32 9A25 25 0 0 1 53.7 21.5Z" fill="#6a3fb5"/><path d="M32 34L53.7 21.5A25 25 0 0 1 53.7 46.5Z" fill="#f2b705"/><path d="M32 34L53.7 46.5A25 25 0 0 1 32 59Z" fill="#e4572e"/><path d="M32 34L32 59A25 25 0 0 1 10.3 46.5Z" fill="#17a398"/><path d="M32 34L10.3 46.5A25 25 0 0 1 10.3 21.5Z" fill="#ff8fab"/><path d="M32 34L10.3 21.5A25 25 0 0 1 32 9Z" fill="#2f5de0"/><circle cx="32" cy="34" r="6" fill="#fff"/><path d="M25 2h14l-7 11z" fill="#fff" stroke="#2a1a4a" stroke-width="2" stroke-linejoin="round"/></svg>'
  },
  {
    id: 'escape-consultorio',
    nombre: 'Código MEDIR: escape del consultorio',
    descripcion: 'Escape room de repaso para Teoría de la Medida: por parejas, abren 5 salas del consultorio de la Dra. Escala y obtienen una constancia con su puntaje.',
    etiquetas: ['Escape room', 'Por parejas', 'Teoría de la Medida'],
    panel: 'escape-consultorio/',
    boton: 'Abrir actividad',
    color: '#8A6100',
    icono: '<svg viewBox="0 0 64 64" aria-hidden="true"><rect x="3" y="3" width="58" height="58" rx="12" fill="#1E1B16"/><path d="M22 30v-8a10 10 0 0 1 20 0v8" fill="none" stroke="#E0A800" stroke-width="5" stroke-linecap="round"/><rect x="15" y="29" width="34" height="25" rx="5" fill="#FFC20E"/><circle cx="32" cy="39" r="3.5" fill="#1E1B16"/><path d="M32 41v6" stroke="#1E1B16" stroke-width="3" stroke-linecap="round"/></svg>'
  }
];
