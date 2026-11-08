/* =====================================================================
   CÓDIGO MEDIR · escape del consultorio
   CONTENIDO EDITABLE
   ---------------------------------------------------------------------
   Aquí vive TODO el texto del juego: historia, retos, respuestas
   correctas, pistas, retroalimentación y referencias.
   Puedes cambiar textos sin tocar js/app.js. Cuida solo de:
     - conservar las comillas y comas,
     - que en "clasificar" cada tarjeta indique un "cajon" que exista,
     - que en "opciones" haya exactamente una opción con correcta: true,
     - que en "ordenar" los elementos estén en el ORDEN CORRECTO
       (la app los revuelve sola).
   Tipos de reto disponibles: clasificar, ordenar, emparejar, opciones,
   redactar.
   ===================================================================== */

window.CONTENIDO = {
  titulo: 'Código MEDIR',
  subtitulo: 'escape del consultorio',
  encabezado: 'Universidad de Guanajuato · Teoría de la Medida · Licenciatura en Psicología Clínica',
  duracion: 'Por parejas · un dispositivo · aprox. 60 min',

  doctora: {
    nombre: 'Dra. Escala',
    imagen: 'img/dra-escala.jpg',
    alt: 'Ilustración de la Dra. Escala: psicóloga de cabello canoso recogido, lentes redondos dorados y saco oscuro, con un expediente en las manos junto a una lámpara de escritorio.'
  },

  historia: {
    // Se muestra en la pantalla de inicio.
    premisa: 'Viernes, 21:47 h. Hacen sus prácticas en el consultorio de la Dra. Escala, quien les pidió quedarse a ordenar el material de evaluación antes de la revisión del lunes. Se va la luz y la cerradura electrónica se bloquea con ustedes dentro.',
    mensaje: '«Si algún día se quedan encerrados, el código está repartido en el consultorio. Cada sala guarda una letra, pero solo se la entrega a quien sabe medir bien.»',
    // Se muestra al tocar «Leer la historia completa».
    completa: [
      'La Dra. Escala es psicóloga clínica y lleva veinte años construyendo instrumentos de evaluación para estudiantes universitarios. Es famosa por una frase que repite en cada supervisión: «Lo que no se mide bien, no se puede atender bien».',
      'Este fin de semana viajó a un congreso y les encargó a ustedes, su pareja de practicantes, dejar en orden el consultorio: los expedientes, el borrador de su nueva escala, el pizarrón y los ítems pendientes.',
      'A las 21:47 h se fue la luz. La puerta se cerró y en su pantalla, alimentada por batería, apareció un mensaje grabado por la doctora. Para salir deberán recorrer las 5 salas del consultorio, resolver lo que ella dejó pendiente y reunir las 5 letras del código.',
      'Tienen 3 pistas para toda la partida. Úsenlas con cuidado: cada una cuesta puntos. Y observen bien el consultorio: la doctora tiene la costumbre de esconder notas por todas partes.'
    ]
  },

  reglas: {
    puntosPorSala: 20,
    penalizacionIntento: 1,   // por cada «Comprobar» incorrecto dentro de la sala
    penalizacionPista: 3,     // por cada pista usada
    minimoPorSala: 5,
    pistasTotales: 3
  },

  salas: [
    /* ------------------------------------------------------------- SALA 1 */
    {
      id: 1,
      letra: 'M',
      icono: 'archivero',
      titulo: 'El archivero de las técnicas',
      tema: 'Pruebas proyectivas vs. psicométricas',
      intro: 'Los expedientes de evaluación están revueltos: alguien mezcló las técnicas proyectivas con las pruebas psicométricas. Para la revisión del lunes, cada una debe volver a su cajón.',
      notaUV: '«Antes de archivar, pregúntate: ¿la persona elige entre opciones cerradas o responde con libertad?»',
      sintesis: 'Proyectiva = estímulo ambiguo, respuesta libre, interpretación cualitativa. Psicométrica = estructurada, cuantificable, con baremo.',
      retos: [
        {
          id: '1.1',
          tipo: 'clasificar',
          consigna: 'Toca una tarjeta y después el cajón donde va: ¿Proyectiva o Psicométrica?',
          cajones: [
            { id: 'proy', nombre: 'Proyectiva' },
            { id: 'psico', nombre: 'Psicométrica' }
          ],
          tarjetas: [
            { texto: 'Rorschach (manchas de tinta)', cajon: 'proy', porque: 'Las manchas de tinta son un estímulo ambiguo y la persona responde con libertad.' },
            { texto: 'TAT (láminas con escenas, se narra una historia)', cajon: 'proy', porque: 'La persona inventa una historia libre a partir de láminas poco estructuradas.' },
            { texto: 'Test de la figura humana (dibujo)', cajon: 'proy', porque: 'El dibujo es una respuesta libre que se interpreta de forma cualitativa.' },
            { texto: 'Frases incompletas de Rotter', cajon: 'proy', porque: 'La persona completa cada frase con lo que quiera: la respuesta es libre.' },
            { texto: 'PHQ-9', cajon: 'psico', porque: 'Tiene ítems con opciones de respuesta cerradas que se suman en una puntuación.' },
            { texto: 'GAD-7', cajon: 'psico', porque: 'Sus 7 ítems tienen opciones cerradas y dan una puntuación comparable.' },
            { texto: 'Inventario de Depresión de Beck (BDI-II)', cajon: 'psico', porque: 'Se elige entre alternativas cerradas y se obtiene una puntuación total con puntos de corte.' },
            { texto: 'Inventario SISCO SV-21 de estrés académico', cajon: 'psico', porque: 'Usa una escala de respuesta cerrada y produce una puntuación cuantificable.' }
          ],
          pista: 'En cada tarjeta pregúntate: ¿la persona elige entre opciones ya dadas o responde con total libertad (dibuja, narra, completa)?',
          exito: 'Las cuatro técnicas proyectivas usan estímulos ambiguos y respuesta libre; los cuatro instrumentos psicométricos tienen respuestas cerradas y se califican con números.'
        },
        {
          id: '1.2',
          tipo: 'clasificar',
          consigna: 'Ahora clasifica las características. ¿Describen a una técnica proyectiva o a una prueba psicométrica?',
          cajones: [
            { id: 'proy', nombre: 'Proyectiva' },
            { id: 'psico', nombre: 'Psicométrica' }
          ],
          tarjetas: [
            { texto: 'Estímulo ambiguo o poco estructurado', cajon: 'proy', porque: 'La ambigüedad del estímulo es lo que permite que la persona «proyecte» su manera de interpretar.' },
            { texto: 'Se elige entre alternativas de respuesta cerradas', cajon: 'psico', porque: 'Las respuestas cerradas permiten calificar a todas las personas de la misma forma.' },
            { texto: 'Se compara el resultado con un grupo normativo (baremo)', cajon: 'psico', porque: 'El baremo es propio de las pruebas estandarizadas: ubica la puntuación respecto a un grupo de referencia.' },
            { texto: 'Respuesta libre; la interpretación es cualitativa y depende de la formación del evaluador', cajon: 'proy', porque: 'Sin respuestas cerradas, la interpretación depende del juicio y la formación de quien evalúa.' },
            { texto: 'Produce una puntuación numérica estandarizada', cajon: 'psico', porque: 'Cuantificar y estandarizar es la base de la psicometría.' },
            { texto: 'La persona puede no ser plenamente consciente de qué se está evaluando', cajon: 'proy', porque: 'En las técnicas proyectivas el objetivo suele estar «enmascarado» tras un estímulo ambiguo.' }
          ],
          pista: 'Imagina el Rorschach y el PHQ-9 lado a lado: ¿a cuál de los dos le queda cada característica?',
          exito: 'Ambigüedad, respuesta libre e interpretación cualitativa son rasgos proyectivos; respuestas cerradas, baremo y puntuación estandarizada son rasgos psicométricos.'
        },
        {
          id: '1.3',
          tipo: 'opciones',
          consigna: 'Responde las dos preguntas del caso.',
          preguntas: [
            {
              enunciado: 'La coordinación de bienestar universitario quiere tamizar ansiedad en 300 estudiantes en una semana. ¿Qué conviene más?',
              opciones: [
                { texto: 'Un instrumento psicométrico breve como el GAD-7 (estructurado, rápido, cuantificable y comparable).', correcta: true, retro: 'Un instrumento breve y estructurado se aplica y califica rápido, y permite comparar los resultados de 300 personas.' },
                { texto: 'El Rorschach aplicado individualmente.', retro: 'Es individual, lento y de interpretación cualitativa: imposible para 300 personas en una semana.' },
                { texto: 'El dibujo de la figura humana con interpretación libre.', retro: 'La interpretación libre no da puntuaciones comparables, que es lo que necesita un tamizaje.' },
                { texto: 'Una entrevista abierta de 2 horas con cada estudiante.', retro: 'Serían 600 horas de entrevista: no es viable para un tamizaje rápido.' }
              ]
            },
            {
              enunciado: '¿Un resultado de una técnica proyectiva basta por sí solo para diagnosticar?',
              opciones: [
                { texto: 'No; aporta hipótesis de trabajo que deben corroborarse con otras pruebas cuantificables y con la entrevista.', correcta: true, retro: 'Lo proyectivo genera hipótesis; el diagnóstico se construye contrastándolas con otras fuentes.' },
                { texto: 'Sí, si el evaluador tiene experiencia.', retro: 'La experiencia ayuda, pero no sustituye la corroboración con otras pruebas y con la entrevista.' },
                { texto: 'Sí, porque revela el inconsciente.', retro: 'Aunque se interprete así, el resultado sigue siendo una hipótesis que hay que corroborar.' },
                { texto: 'Solo si el estímulo es un dibujo.', retro: 'El tipo de estímulo no cambia que el resultado sea una hipótesis por corroborar.' }
              ]
            }
          ],
          pista: 'Para tamizar a muchas personas busca rapidez y comparabilidad. Y recuerda: lo proyectivo produce hipótesis, no conclusiones.',
          exito: 'Para tamizar se eligen instrumentos breves y comparables; las técnicas proyectivas aportan hipótesis que se corroboran.'
        }
      ]
    },

    /* ------------------------------------------------------------- SALA 2 */
    {
      id: 2,
      letra: 'E',
      icono: 'ensamblaje',
      titulo: 'La línea de ensamblaje',
      tema: 'Pasos para desarrollar una prueba',
      intro: 'Sobre el escritorio está el borrador de la escala que la doctora construía. Los pasos estaban anotados en notas adhesivas… que ahora están desordenadas en el piso.',
      notaUV: '«Primero se decide para qué y qué se mide; después se escribe; al final se prueba, se documenta y se mejora.»',
      sintesis: 'Construir un test es un proceso de decisiones; el piloto va antes del estudio de campo.',
      retos: [
        {
          id: '2.1',
          tipo: 'ordenar',
          consigna: 'Ordena los 10 pasos para desarrollar un test. Usa las flechas para subir o bajar cada paso.',
          elementos: [
            'Delimitar la finalidad del test',
            'Definir los fenómenos psicológicos (constructo) que se medirán',
            'Seleccionar y muestrear los comportamientos observables',
            'Decidir las características del test (formato de respuesta, forma de administración e interpretación de las puntuaciones)',
            'Desarrollar los ítems',
            'Elegir una teoría de los tests',
            'Realizar la prueba piloto',
            'Realizar el estudio de campo (muestra, baremos, confiabilidad y validez)',
            'Elaborar el manual del test',
            'Revisar y mejorar el test'
          ],
          retroError: 'Piensa en la lógica: primero el «para qué» y el «qué», luego cómo se verá el test y sus ítems, después se prueba en pequeño y en grande, y al final se documenta y se mejora.',
          pista: 'Empieza por el «para qué» y el «qué» se mide. Los ítems se escriben antes de probarlos, y el manual va casi al final.',
          exito: 'Nota: en la práctica las fases no siempre son estrictamente secuenciales, pero para este reto se usa el orden del libro (Meneses et al., 2013).'
        },
        {
          id: '2.2',
          tipo: 'emparejar',
          consigna: 'Relaciona cada paso con aquello para lo que sirve.',
          opciones: [
            'Decidir para qué se usará el test (describir, clasificar, diagnosticar o predecir)',
            'Probar con una muestra pequeña si se entienden las instrucciones y los ítems',
            'Aplicar a la población meta para obtener baremos, confiabilidad y validez',
            'Documentar teoría, instrucciones, interpretación y propiedades psicométricas'
          ],
          elementos: [
            { texto: 'Delimitar la finalidad', correcta: 'Decidir para qué se usará el test (describir, clasificar, diagnosticar o predecir)', porque: 'La finalidad responde a «¿para qué se usará?».' },
            { texto: 'Prueba piloto', correcta: 'Probar con una muestra pequeña si se entienden las instrucciones y los ítems', porque: 'El piloto es un ensayo en pequeño para detectar problemas antes de aplicar a muchos.' },
            { texto: 'Estudio de campo', correcta: 'Aplicar a la población meta para obtener baremos, confiabilidad y validez', porque: 'El estudio de campo usa una muestra de la población meta y produce las propiedades psicométricas.' },
            { texto: 'Manual del test', correcta: 'Documentar teoría, instrucciones, interpretación y propiedades psicométricas', porque: 'El manual reúne todo lo que otra persona necesita para usar e interpretar el test.' }
          ],
          pista: '«Piloto» suena a ensayo en pequeño; «campo» suena a la población real.',
          exito: 'Finalidad = para qué; piloto = ensayo pequeño; campo = población meta y propiedades psicométricas; manual = documentación.'
        },
        {
          id: '2.3',
          tipo: 'opciones',
          consigna: 'Lee el caso y elige.',
          preguntas: [
            {
              enunciado: 'Un equipo aplicó su nueva escala a 300 estudiantes y después descubrió que nadie entendía la instrucción 3. ¿Qué paso omitieron o hicieron mal?',
              opciones: [
                { texto: 'La prueba piloto (debe hacerse antes del estudio de campo).', correcta: true, retro: 'El piloto, con pocas personas, sirve justo para detectar instrucciones o ítems confusos antes de aplicar a 300.' },
                { texto: 'Elaborar el manual.', retro: 'El manual documenta el test, pero no habría evitado que la instrucción fuera confusa.' },
                { texto: 'Delimitar la finalidad.', retro: 'Saber para qué sirve el test no detecta si las instrucciones se entienden.' },
                { texto: 'Elegir la teoría de los tests.', retro: 'La teoría de los tests orienta el análisis de las puntuaciones, no la claridad de las instrucciones.' }
              ]
            }
          ],
          pista: '¿Qué paso consiste en probar el test con pocas personas antes de aplicarlo a muchas?',
          exito: 'Saltarse el piloto sale caro: los errores aparecen cuando ya se aplicó a toda la muestra.'
        }
      ]
    },

    /* ------------------------------------------------------------- SALA 3 */
    {
      id: 3,
      letra: 'D',
      icono: 'constructo',
      titulo: 'El mapa del constructo',
      tema: 'Dimensiones, subtemas e indicadores',
      intro: 'En el pizarrón quedó a medio borrar un esquema sobre la ansiedad ante los exámenes. La doctora siempre dice que un ítem sin mapa es un ítem perdido.',
      notaUV: '«Del concepto que no se ve a la frase que se responde: cada nivel es más concreto que el anterior.»',
      apoyo: {
        titulo: 'Cartel del pizarrón',
        texto: 'Jerarquía de lo general a lo específico: Constructo → Dimensión → Subtema → Indicador → Ítem.',
        lista: [
          '<strong>Constructo:</strong> concepto teórico que no se observa directamente.',
          '<strong>Dimensión:</strong> gran componente del constructo.',
          '<strong>Subtema:</strong> aspecto específico de una dimensión.',
          '<strong>Indicador:</strong> manifestación observable o conducta que muestra el subtema.',
          '<strong>Ítem:</strong> enunciado que la persona responde.'
        ]
      },
      sintesis: 'Cada ítem debe poder rastrearse hasta un indicador, un subtema, una dimensión y el constructo.',
      retos: [
        {
          id: '3.1',
          tipo: 'ordenar',
          consigna: 'Ordena los 5 niveles de lo más general (arriba) a lo más específico (abajo).',
          elementos: ['Constructo', 'Dimensión', 'Subtema', 'Indicador', 'Ítem'],
          retroError: 'Vuelve al cartel del pizarrón: el constructo es lo más abstracto y el ítem es lo que la persona lee y responde.',
          pista: 'El ítem es lo que la persona lee y responde; el constructo es lo más abstracto. Entre ellos, cada nivel es un poco más concreto.',
          exito: 'Constructo → Dimensión → Subtema → Indicador → Ítem: de lo que no se ve a lo que se responde.'
        },
        {
          id: '3.2',
          tipo: 'clasificar',
          consigna: 'Constructo: «Ansiedad ante los exámenes». Toca cada tarjeta y después el nivel al que pertenece.',
          cajones: [
            { id: 'con', nombre: 'Constructo' },
            { id: 'dim', nombre: 'Dimensión' },
            { id: 'sub', nombre: 'Subtema' },
            { id: 'ind', nombre: 'Indicador' },
            { id: 'item', nombre: 'Ítem' }
          ],
          tarjetas: [
            { texto: 'Ansiedad ante los exámenes', cajon: 'con', porque: 'Es el concepto teórico general que no se observa directamente.' },
            { texto: 'Manifestaciones físicas', cajon: 'dim', porque: 'Es un gran componente de la ansiedad: lo que pasa en el cuerpo.' },
            { texto: 'Pensamientos de preocupación', cajon: 'dim', porque: 'Es un gran componente de la ansiedad: lo que pasa en la mente.' },
            { texto: 'Molestias digestivas', cajon: 'sub', porque: 'Es un aspecto específico dentro de las manifestaciones físicas.' },
            { texto: 'Anticipación del fracaso', cajon: 'sub', porque: 'Es un aspecto específico dentro de los pensamientos de preocupación.' },
            { texto: 'Dolor o «nudo» en el estómago antes de entrar a un examen', cajon: 'ind', porque: 'Describe una manifestación observable y concreta, pero aún no es una frase para responder.' },
            { texto: 'Piensa que va a reprobar mientras estudia', cajon: 'ind', porque: 'Describe una conducta concreta en tercera persona: es un indicador, no un ítem.' },
            { texto: '«Antes de un examen siento molestias en el estómago.»', cajon: 'item', porque: 'Es un enunciado en primera persona que alguien puede responder.' },
            { texto: '«Mientras estudio para un examen pienso que voy a reprobar.»', cajon: 'item', porque: 'Es un enunciado en primera persona que alguien puede responder.' }
          ],
          pista: 'Hay 1 constructo y 2 tarjetas para cada uno de los demás niveles. Los ítems son frases en primera persona que alguien respondería.',
          exito: 'Cada ítem tiene su ruta completa: ítem → indicador → subtema → dimensión → constructo.'
        },
        {
          id: '3.3',
          tipo: 'opciones',
          consigna: 'Constructo: «Estrés académico».',
          preguntas: [
            {
              enunciado: 'Indicador: «Dolor de cabeza cuando se acerca la fecha de entrega de un trabajo». ¿Qué ítem es congruente con ese indicador?',
              opciones: [
                { texto: '«Siento dolor de cabeza cuando se acerca la fecha de entrega de un trabajo.»', correcta: true, retro: 'Describe exactamente la conducta del indicador, en primera persona y en presente.' },
                { texto: '«Me gusta entregar mis trabajos a tiempo.»', retro: 'Habla de una preferencia por la puntualidad: corresponde a otro indicador.' },
                { texto: '«Mis maestros dejan demasiada tarea.»', retro: 'Habla del contexto, no de la reacción de la persona.' }
              ]
            }
          ],
          pista: 'Busca el ítem que repita la misma conducta del indicador, pero contada por la propia persona.',
          exito: 'Un ítem congruente traduce el indicador a una frase en primera persona.'
        }
      ]
    },

    /* ------------------------------------------------------------- SALA 4 */
    {
      id: 4,
      letra: 'I',
      icono: 'taller',
      titulo: 'El taller de ítems',
      tema: 'Redacción de ítems',
      intro: 'Un paquete de ítems que redactó otro practicante espera revisión. La doctora los marcó todos en rojo con la misma nota: «Así no».',
      notaUV: '«Un ítem, una idea. Si necesitas una "y", probablemente necesitas dos ítems.»',
      apoyo: {
        titulo: 'Reglas del taller',
        lista: [
          'Una sola idea por ítem.',
          'Sin dobles negaciones.',
          'Evitar expresiones extremas (siempre, nunca, todos, nadie).',
          'Lenguaje claro y acorde a quienes responderán.',
          'Frases cortas (máx. ~20 palabras).',
          'Sin ambigüedad ni trivialidad; una sola interpretación posible.',
          'Redactados en presente.'
        ]
      },
      sintesis: 'Un buen ítem es corto, claro, de una sola idea y entendible para quien lo responde.',
      retos: [
        {
          id: '4.1',
          tipo: 'emparejar',
          consigna: 'Identifica el defecto principal de cada ítem.',
          opciones: ['Dos ideas en uno', 'Doble negación', 'Expresión extrema', 'Lenguaje técnico o no apropiado', 'Ambiguo', 'Demasiado largo'],
          elementos: [
            { texto: 'a) «Siento ansiedad y me cuesta dormir cuando tengo exámenes.»', correcta: 'Dos ideas en uno', porque: 'Pregunta por ansiedad y por sueño a la vez: ¿qué responde quien solo tiene una de las dos?' },
            { texto: 'b) «No me pasa que no me preocupe por mis calificaciones.»', correcta: 'Doble negación', porque: 'Dos «no» obligan a hacer una operación lógica para entender la frase.' },
            { texto: 'c) «Siempre me pongo nervioso antes de un examen.»', correcta: 'Expresión extrema', porque: '«Siempre» deja sin sentido las opciones intermedias de la escala.' },
            { texto: 'd) «Experimento somatizaciones ansiógenas ante evaluaciones sumativas.»', correcta: 'Lenguaje técnico o no apropiado', porque: 'Usa jerga técnica que la población estudiantil no tiene por qué conocer.' },
            { texto: 'e) «Me siento mal cuando estudio.»', correcta: 'Ambiguo', porque: '«Mal» puede significar cansancio, tristeza, dolor, aburrimiento…: admite muchas interpretaciones.' },
            { texto: 'f) «Cuando se acercan las fechas de los exámenes finales de cada uno de los semestres que he cursado en la universidad, me siento muy preocupado por la cantidad de contenidos que debo estudiar.»', correcta: 'Demasiado largo', porque: 'Supera por mucho las ~20 palabras: cansa y se pierde la idea central.' }
          ],
          pista: 'Lee cada ítem preguntándote: ¿cuántas ideas tiene?, ¿hay dos «no»?, ¿hay palabras absolutas?, ¿lo entendería cualquier estudiante?, ¿cuántas palabras tiene?',
          exito: 'Cada defecto tiene su señal: «y», dos «no», «siempre», jerga, palabras vagas o frases kilométricas.'
        },
        {
          id: '4.2',
          tipo: 'opciones',
          consigna: 'Elige la mejor reescritura de cada ítem.',
          preguntas: [
            {
              enunciado: 'a) «Siento ansiedad y me cuesta dormir cuando tengo exámenes.»',
              opciones: [
                { texto: '«Me cuesta dormir cuando tengo exámenes.»', correcta: true, retro: 'Queda una sola idea; la ansiedad se evaluaría en otro ítem.' },
                { texto: '«Me cuesta dormir y siento ansiedad cuando tengo exámenes.»', retro: 'Solo cambió el orden: sigue habiendo dos ideas en un ítem.' },
                { texto: '«Siempre me cuesta dormir cuando tengo exámenes.»', retro: 'Quita una idea pero agrega una expresión extrema («siempre»).' }
              ]
            },
            {
              enunciado: 'c) «Siempre me pongo nervioso antes de un examen.»',
              opciones: [
                { texto: '«Me pongo nervioso antes de un examen.»', correcta: true, retro: 'Sin «siempre», la escala de acuerdo puede medir la intensidad.' },
                { texto: '«Nunca me siento tranquilo antes de un examen.»', retro: 'Cambia «siempre» por «nunca»: sigue siendo una expresión extrema.' },
                { texto: '«Siempre me pongo extremadamente nervioso antes de cualquier examen.»', retro: 'Empeora el ítem: suma más expresiones extremas.' }
              ]
            },
            {
              enunciado: 'e) «Me siento mal cuando estudio.»',
              opciones: [
                { texto: '«Siento tensión en el cuerpo cuando estudio para un examen.»', correcta: true, retro: 'Precisa qué se siente y cuándo: tiene una sola interpretación.' },
                { texto: '«Me siento mal cuando estudio y no sé por qué.»', retro: 'Sigue siendo vago y además agrega una segunda idea.' },
                { texto: '«Estudiar me hace sentir como que algo malo pasa.»', retro: 'Continúa siendo ambiguo: ¿qué es «algo malo»?' }
              ]
            }
          ],
          pista: 'La mejor reescritura corrige el defecto sin crear otro nuevo (cuidado con «siempre», «nunca» y con la «y»).',
          exito: 'Corregir un ítem es quitar el defecto sin introducir otro.'
        },
        {
          id: '4.3',
          tipo: 'emparejar',
          consigna: 'Verdadero o falso.',
          opciones: ['Verdadero', 'Falso'],
          elementos: [
            { texto: 'Un ítem puede preguntar por dos cosas si están relacionadas.', correcta: 'Falso', porque: 'Aunque estén relacionadas, la persona puede vivir una y no la otra: un ítem, una idea.' },
            { texto: 'Palabras como «siempre» y «nunca» dejan sin sentido las respuestas intermedias.', correcta: 'Verdadero', porque: 'Con un absoluto, «de acuerdo» o «ni de acuerdo ni en desacuerdo» pierden sentido.' },
            { texto: 'El lenguaje del ítem debe adaptarse a la población que responderá.', correcta: 'Verdadero', porque: 'Si quien responde no entiende el ítem, la respuesta no mide lo que se busca.' },
            { texto: 'Las frases largas y complejas hacen el ítem más preciso.', correcta: 'Falso', porque: 'Las frases largas confunden y cansan; la precisión viene de la claridad.' },
            { texto: 'Cada ítem debe tener una sola interpretación posible.', correcta: 'Verdadero', porque: 'Si se puede leer de dos maneras, dos personas responderían cosas distintas.' }
          ],
          pista: 'Repasa las «Reglas del taller» de esta sala: ahí está casi todo.',
          exito: 'Las reglas de redacción existen para que todas las personas entiendan lo mismo al leer el ítem.'
        }
      ]
    },

    /* ------------------------------------------------------------- SALA 5 */
    {
      id: 5,
      letra: 'R',
      icono: 'likert',
      titulo: 'La puerta Likert',
      tema: 'Escala Likert',
      intro: 'La oficina interior tiene un candado de 5 diales numerados del 1 al 5. Pegado en la puerta está el último encargo de la doctora: un ítem nuevo para su escala de bienestar estudiantil.',
      notaUV: '«En Likert la persona no responde sí o no: indica cuánto está de acuerdo. Y el puntaje se suma.»',
      sintesis: 'Likert = enunciado + 5 opciones de acuerdo; el puntaje es la suma.',
      retos: [
        {
          id: '5.1',
          tipo: 'ordenar',
          consigna: 'Ordena las 5 opciones de respuesta de menor a mayor acuerdo. A cada posición le corresponde un valor del 1 al 5.',
          etiquetasPosicion: ['Valor 1', 'Valor 2', 'Valor 3', 'Valor 4', 'Valor 5'],
          elementos: ['Totalmente en desacuerdo', 'En desacuerdo', 'Ni de acuerdo ni en desacuerdo', 'De acuerdo', 'Totalmente de acuerdo'],
          retroError: 'La escala avanza de forma simétrica: dos opciones de desacuerdo, una neutral en el centro y dos de acuerdo.',
          pista: 'Empieza por el desacuerdo total y termina en el acuerdo total; la opción neutral va justo en medio.',
          exito: 'Totalmente en desacuerdo (1), En desacuerdo (2), Ni de acuerdo ni en desacuerdo (3), De acuerdo (4), Totalmente de acuerdo (5).'
        },
        {
          id: '5.2',
          tipo: 'opciones',
          consigna: 'Calcula e interpreta.',
          preguntas: [
            {
              enunciado: 'Una persona respondió 4 ítems de una escala de ansiedad con los valores 4, 5, 2 y 3. ¿Cuál es su puntaje total y qué significa?',
              opciones: [
                { texto: '14; una puntuación mayor indica mayor presencia de la variable medida (escala de estimación sumatoria).', correcta: true, retro: '4 + 5 + 2 + 3 = 14. En una escala sumatoria, a más puntos, más presencia de la variable.' },
                { texto: '3.5; es el promedio y no requiere interpretación.', retro: 'La escala Likert clásica es sumatoria, y todo puntaje necesita interpretarse.' },
                { texto: '14, pero un puntaje mayor indica menor presencia de la variable.', retro: 'La suma está bien, pero la dirección no: con ítems directos, más puntos = más ansiedad.' },
                { texto: '5; es el valor más alto que eligió.', retro: 'El puntaje no es la respuesta más alta, sino la suma de todas las respuestas.' }
              ]
            }
          ],
          pista: 'En una escala sumatoria se suman los valores de todas las respuestas. Luego piensa: ¿más puntos significa más o menos ansiedad?',
          exito: 'Escala sumatoria: se suman los valores y un total mayor indica más presencia de lo que se mide.'
        },
        {
          id: '5.3',
          tipo: 'redactar',
          consigna: 'Redacten su propio ítem Likert para el indicador que les tocó. Debe cumplir todas las revisiones y la lista de autoverificación.',
          indicadores: [
            'Dificultad para concentrarse al estudiar',
            'Preocupación por las calificaciones',
            'Cansancio al despertar en días de examen'
          ],
          maxPalabras: 20,
          palabrasExtremas: ['siempre', 'nunca', 'todos', 'todas', 'nadie', 'ninguno', 'jamás'],
          conectores: ['y', 'e', 'pero'],
          autoverificacion: [
            'Mide una sola idea',
            'Corresponde al indicador',
            'Es claro para estudiantes universitarios',
            'Se puede responder con la escala de 5 puntos de acuerdo'
          ],
          pista: 'Escriban en primera persona y en presente lo que haría o sentiría alguien con ese indicador, en una sola frase corta que termine en punto.',
          exito: '¡Su ítem quedó guardado y aparecerá en la constancia!'
        }
      ]
    }
  ],

  puertaFinal: {
    titulo: 'La puerta del consultorio',
    pista: 'Verbo central de esta materia: lo que hace un test.',
    palabra: 'MEDIR',
    errorTexto: 'La puerta no cede. Relean la pista: ¿qué hace un test?'
  },

  final: {
    titulo: 'Regresa la luz',
    texto: 'La cerradura hace clic, la puerta se abre y las luces del consultorio se encienden. Sobre el escritorio hay un sobre dorado con su nombre.',
    nota: '«Sabía que lo lograrían. Medir no es poner números: es observar con cuidado para poder ayudar mejor.»',
    firma: '— Dra. Escala'
  },

  constancia: {
    instruccion: 'Toma una captura de esta pantalla y súbela a la plataforma de la materia.'
  },

  referencias: [
    'Meneses, J., Barrios, M., Bonillo, A., Cosculluela, A., Lozano, L. M., Turbany, J., & Valero, S. (2013). <em>Psicometría</em>. Editorial UOC.'
  ]
};
