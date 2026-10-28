# Herramientas de aula

Sitio web estático con tus actividades interactivas, listo para publicarse en **GitHub Pages**:

| Herramienta | Qué hace |
|---|---|
| **Nube de Ideas** | Nube de palabras o frases en vivo, con enlace/QR único por nube, panel docente, programación de apertura y cierre, cinco paletas, proyector y exportes (CSV, JPEG y PDF). |
| **Boleto de salida** | Los alumnos escanean un QR y "pegan" un aporte (algo que aprendí, cuestión clave o duda) en un tablero de corcho con post-its en vivo. Exporta a Excel. |

Todo corre en el navegador. Los datos se guardan en **Firebase** (gratuito): es la única pieza externa, porque GitHub Pages solo muestra páginas y no puede guardar lo que escriben los alumnos.

> **Modo demostración:** mientras `shared/firebase-config.js` esté vacío, el sitio funciona guardando todo en tu navegador. Sirve para probarlo en tu computadora, pero **no conecta los celulares de tus alumnos**. Para clase real completa los pasos 1 a 5.

---

## Paso 1 · Crear el proyecto en Firebase (≈ 3 min)

1. Entra a <https://console.firebase.google.com> con tu cuenta de Google.
2. **Agregar proyecto** → ponle un nombre (por ejemplo `herramientas-aula`) → desactiva Google Analytics → **Crear proyecto**.

## Paso 2 · Registrar la app web y copiar tus datos (≈ 2 min)

1. En la página principal del proyecto, pulsa el ícono **`</>`** (Web).
2. Ponle un apodo (por ejemplo `aula`). **No** marques Firebase Hosting. Pulsa **Registrar app**.
3. Aparecerá un bloque `const firebaseConfig = { ... }`. Copia solo los valores de `apiKey`, `authDomain`, `projectId` y `appId`.
4. Abre `shared/firebase-config.js` y pégalos entre las comillas:

```js
export const firebaseConfig = {
  apiKey: "AIza...",
  authDomain: "herramientas-aula.firebaseapp.com",
  projectId: "herramientas-aula",
  appId: "1:123456789:web:abc123"
};
```

> La `apiKey` de Firebase **no es una contraseña**: va a estar visible en el sitio. Lo que protege tus datos son las reglas del paso 5.

## Paso 3 · Crear la base de datos (≈ 2 min)

1. Menú **Compilación → Firestore Database → Crear base de datos**.
2. Elige la ubicación más cercana (por ejemplo `nam5 (us-central)`) y **modo de producción**. Pulsa **Habilitar**.

## Paso 4 · Crear tu usuario docente (≈ 2 min)

1. Menú **Compilación → Authentication → Comenzar**.
2. En **Sign-in method** habilita **Correo electrónico/contraseña** y guarda.
3. En la pestaña **Users** pulsa **Agregar usuario**: escribe **tu correo** y **la contraseña** que usarás en los paneles docentes.
4. En **Settings → User actions** desactiva **Enable create (sign-up)** para que nadie más pueda crear cuentas.

Más adelante puedes cambiar tu contraseña desde cualquier panel docente (botón *Cambiar contraseña*).

## Paso 5 · Publicar las reglas de seguridad (≈ 2 min)

1. Abre `firestore.rules` y cambia `TU_CORREO@ejemplo.com` por **el mismo correo** del paso 4.
2. En Firebase: **Firestore Database → pestaña Reglas**. Borra lo que haya, pega **todo** el contenido de `firestore.rules` y pulsa **Publicar**.

Qué garantizan estas reglas:

- Solo tu cuenta puede crear, editar, vaciar o borrar nubes y sesiones, y leer los **nombres** de los alumnos.
- Los alumnos solo pueden **agregar** respuestas, y solo mientras la nube o la sesión esté abierta.
- La nube pública **no contiene nombres**: los nombres van en una colección aparte que solo tú puedes leer.
- Los alumnos no pueden listar nubes ni sesiones: solo entran si conocen el código o el enlace (códigos largos y aleatorios).

## Paso 6 · Subir el sitio a GitHub Pages (≈ 5 min)

1. En <https://github.com> crea un repositorio nuevo (por ejemplo `aula`), **público**.
2. Pulsa **Add file → Upload files** y arrastra **el contenido** de esta carpeta (incluyendo `shared`, `nube`, `boleto`, `index.html`; `README.md` y `firestore.rules` también pueden ir). Pulsa **Commit changes**.
3. **Settings → Pages → Build and deployment**: *Source* = **Deploy from a branch**, *Branch* = **main** y carpeta **/(root)** → **Save**.
4. En uno o dos minutos tu sitio estará en `https://TU-USUARIO.github.io/aula/`.

Si al entrar a un panel docente aparece un error de dominio no autorizado, en Firebase ve a **Authentication → Settings → Authorized domains → Add domain** y agrega `TU-USUARIO.github.io`.

*(Opcional)* Para mayor protección: en Google Cloud Console → **APIs y servicios → Credenciales → tu API key de navegador → Restricciones de sitios web** agrega `https://TU-USUARIO.github.io/*`.

---

## Cómo se usa

### Nube de Ideas
1. Menú principal → **Nube de Ideas → Abrir panel docente** → entra con tu correo y contraseña.
2. **＋ Nueva nube**: tema, pregunta, cantidad de palabras/frases por alumno (1 a 10), palabra o frase, nombre requerido o anónimo, paleta, apertura y cierre (hora de México; en blanco = abre de inmediato).
3. En **Administrar** copia el **enlace único** o proyecta el **QR**; usa **Abrir modo proyector** para mostrar solo la pregunta y la nube.
4. Alumnos: abren el enlace, escriben (contador visible, máx. 25 caracteres por palabra y 60 por frase) y pulsan **Continuar**; ven la nube con sus términos resaltados.
5. Desde el panel: abrir/cerrar a mano (o volver al horario), editar, duplicar, **vaciar** (ofrece respaldo CSV y JPEG antes), tabla de participaciones, **CSV** para Excel, **JPEG** y **PDF**, y eliminar.
6. Palabras casi iguales se unifican (mayúsculas, acentos, espacios y signos); la nube muestra la grafía más escrita.
7. Cuando una nube ya tiene participaciones, quedan bloqueados la cantidad, el formato y la opción de nombre.

### Boleto de salida
1. Menú principal → **Boleto de salida → Abrir panel docente**. Al entrar por primera vez se crea tu primera sesión con un **código de 6 caracteres** y su QR.
2. Edita la **pregunta** (con ideas rápidas y vista previa), el **límite de caracteres** (de 20 en 20) y los **tipos de aporte** activos.
3. Muestra el QR o dicta el código: los alumnos entran con el QR o escribiendo el código en `…/boleto/`.
4. **Presentar tablero de corcho** abre el tablero en otra pestaña (arrástrala al proyector): los post-its aparecen en vivo. Puedes filtrar por tipo en la leyenda.
5. **Exportar aportes (Excel)** descarga un `.xlsx` con nombre, tipo, aporte y hora, más una hoja de resumen.
6. **＋ Nueva sesión** crea otro tablero con código y QR nuevos (cierra el anterior). En **Tableros** puedes presentar, exportar o eliminar los anteriores.
7. El interruptor **Recibiendo aportes** abre o cierra la sesión.

---

## Agregar más herramientas al menú

1. Crea una carpeta nueva (por ejemplo `mi-app/`) con sus páginas. Reutiliza `shared/db.js` (datos), `shared/shell.js` (acceso docente) y `shared/ui.js`.
2. Agrega un bloque a `shared/apps.js`. Aparecerá solo en `index.html`.
3. Si guarda datos, agrega su bloque `match` en `firestore.rules` y vuelve a publicar las reglas.

## Probar en tu computadora

```bash
cd aula-herramientas
python3 -m http.server 8000
# abre http://localhost:8000
```

(No abras los archivos con doble clic: los módulos de JavaScript necesitan un servidor.)

## Costos y límites (plan gratuito Spark, sin tarjeta)

- Firestore gratuito: 50 000 lecturas, 20 000 escrituras y 20 000 borrados al día. Una clase de 40 alumnos con 3 palabras cada uno consume del orden de 8 000 lecturas, así que caben unas **5 clases grandes por día**. Un Boleto de salida consume mucho menos.
- Si algún día te quedas corto, Firebase avisa y puedes pasar al plan de pago por uso (los montos para este tipo de uso suelen ser de centavos).

## Notas honestas de seguridad

- Las reglas validan en el servidor el estado de la nube/sesión, el tamaño de los textos y quién puede leer qué. La **cantidad de palabras por alumno** y el **reenvío** se controlan en el navegador del alumno (igual que antes: no se anuncia ni se promueve el reenvío), por lo que una persona técnica con el enlace podría enviar más respuestas mientras la nube esté abierta. Cierra la nube o usa **Vaciar** si eso ocurriera.
- Los nombres de los alumnos solo se guardan cuando la nube los pide, y solo tu cuenta puede leerlos.
- Los códigos de nube son largos y aleatorios; los códigos de sesión del Boleto son de 6 caracteres (miles de millones de combinaciones) y las sesiones no se pueden listar.

## Estructura

```
index.html            Menú principal
firestore.rules       Reglas de seguridad para pegar en Firebase
shared/               Datos (Firebase y modo demostración), acceso docente, QR, Excel, PDF, estilos
nube/                 Nube de Ideas (alumno, proyector, panel docente)
boleto/               Boleto de salida (alumno, panel docente, tablero de corcho)
```

Librerías incluidas: `qrcode-generator` de Kazuhiko Arase (licencia MIT) en `shared/qrcode.mjs`. El SDK de Firebase se carga desde el CDN oficial de Google. Las tipografías Nunito y Caveat se cargan de Google Fonts; si no hay internet se usan tipografías del sistema.
