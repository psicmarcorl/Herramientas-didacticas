// Estructura común del panel docente: acceso con contraseña, encabezado, cambio de contraseña.
import { db, modoDemo } from './db.js';
import { h, vaciar, avisar, dialogo, bannerDemo } from './ui.js';

// opciones: { titulo, subtitulo, menu (href al menú), render(contenedor, usuario) → función de limpieza opcional }
export function iniciarDocente({ raiz, titulo, subtitulo, menu = '../index.html', cabecera = true, render }) {
  bannerDemo();
  let limpiar = null;
  let ultimoCorreo = null;

  const pintar = (usuario) => {
    if (typeof limpiar === 'function') { limpiar(); limpiar = null; }
    vaciar(raiz);
    if (!usuario) {
      ultimoCorreo = null;
      raiz.append(pantallaAcceso({ titulo, menu }));
      return;
    }
    ultimoCorreo = usuario.email;
    if (!cabecera) { limpiar = render(raiz, usuario) || null; return; }
    const cab = h('header', { class: 'docente-cab' },
      h('div', { class: 'docente-cab-izq' },
        h('a', { class: 'enlace-menu', href: menu, 'aria-label': 'Volver al menú de herramientas' }, '← Menú'),
        h('div', {}, h('h1', {}, titulo), subtitulo ? h('p', { class: 'sub' }, subtitulo) : null)),
      h('div', { class: 'docente-cab-der' },
        h('span', { class: 'correo' }, usuario.email),
        h('button', { class: 'btn btn-suave btn-chico', type: 'button', onclick: cambiarClave }, 'Cambiar contraseña'),
        h('button', { class: 'btn btn-suave btn-chico', type: 'button', onclick: () => db.auth.logout() }, 'Salir')));
    const cuerpo = h('main', { class: 'docente-cuerpo' });
    raiz.append(cab, cuerpo);
    limpiar = render(cuerpo, usuario) || null;
  };

  db.auth.onChange((u) => {
    // Evita repintar si el estado no cambió (Firebase puede avisar dos veces).
    if (u && u.email === ultimoCorreo) return;
    pintar(u);
  });
}

function pantallaAcceso({ titulo, menu }) {
  const msg = h('p', { class: 'error', role: 'alert' });
  const correo = h('input', { type: 'email', id: 'ac-correo', autocomplete: 'username', required: true, placeholder: 'tucorreo@ejemplo.com' });
  const clave = h('input', { type: 'password', id: 'ac-clave', autocomplete: 'current-password', required: true, placeholder: 'Contraseña' });
  const boton = h('button', { class: 'btn btn-primario btn-grande', type: 'submit' }, 'Entrar');
  const form = h('form', {
    class: 'tarjeta acceso', novalidate: true,
    onsubmit: async (e) => {
      e.preventDefault();
      msg.textContent = '';
      if (!correo.value.trim() || !clave.value) {
        msg.textContent = 'Escribe tu correo y tu contraseña.';
        return;
      }
      boton.disabled = true;
      boton.textContent = 'Entrando…';
      try {
        await db.auth.login(correo.value.trim(), clave.value);
      } catch (err) {
        msg.textContent = err.message;
        boton.disabled = false;
        boton.textContent = 'Entrar';
      }
    }
  },
  h('h1', {}, 'Acceso docente'),
  h('p', { class: 'sub' }, titulo),
  h('label', { for: 'ac-correo' }, 'Correo'), correo,
  h('label', { for: 'ac-clave' }, 'Contraseña'), clave,
  modoDemo ? h('p', { class: 'nota' }, 'Modo demostración: la primera vez, la contraseña que escribas quedará definida en este navegador.') : null,
  msg, boton,
  h('a', { class: 'enlace-menu centrado', href: menu }, '← Volver al menú'));
  return h('div', { class: 'acceso-fondo' }, form);
}

async function cambiarClave() {
  const actual = h('input', { type: 'password', autocomplete: 'current-password', placeholder: 'Contraseña actual' });
  const nueva = h('input', { type: 'password', autocomplete: 'new-password', placeholder: 'Nueva contraseña (mínimo 8 caracteres)' });
  const rep = h('input', { type: 'password', autocomplete: 'new-password', placeholder: 'Repite la nueva contraseña' });
  const msg = h('p', { class: 'error', role: 'alert' });
  const cuerpo = h('div', { class: 'campos' }, actual, nueva, rep, msg);
  for (;;) {
    const r = await dialogo({
      titulo: 'Cambiar contraseña', cuerpo,
      botones: [{ texto: 'Cancelar', valor: false, clase: 'btn-suave' }, { texto: 'Guardar', valor: true, clase: 'btn-primario' }]
    });
    if (!r) return;
    if (nueva.value.length < 8) { msg.textContent = 'La nueva contraseña debe tener al menos 8 caracteres.'; continue; }
    if (nueva.value !== rep.value) { msg.textContent = 'Las contraseñas nuevas no coinciden.'; continue; }
    try {
      await db.auth.cambiarClave(actual.value, nueva.value);
      avisar('Contraseña actualizada');
      return;
    } catch (e) {
      msg.textContent = e.message;
    }
  }
}
