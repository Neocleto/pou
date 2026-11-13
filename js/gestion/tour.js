// ==============================
// Función principal del tour
// ==============================
function iniciarAsistenteWizard() {
  const intro = introJs();

  intro.setOptions({
    tooltipClass: 'customTooltip',
    nextLabel: 'Siguiente',
    prevLabel: 'Atrás',
    skipLabel: '',
    doneLabel: 'Hecho',
    showBullets: true,
    scrollToElement: true,
    overlayOpacity: 0.6
  });

  // Aquí agregas los pasos que quieres usar en este tour
  intro.addSteps([
    paso1_DatosGenerales(),
    paso2_Informacion(),
    paso3_Fases(),
    paso4_Documentos(),
    paso5_Participacion(),
    paso6_Noticias(),
    paso7_FAQs()
  ]);


  // Clase opcional para “modal alta” look en pasos largos
  const TALL_CLASS = 'customTooltip--tall';
  const TALL_HEIGHT = 520;
  const MOBILE_TALL_HEIGHT = 460;

  // Botón × 
  function asegurarBotonCerrar(tooltip) {
    if (!tooltip || tooltip.querySelector('.btn-cerrar-tour')) return;
    const btn = document.createElement('button');
    btn.innerHTML = '&times;';
    btn.className = 'btn-cerrar-tour';
    btn.setAttribute('aria-label', 'Cerrar');
    Object.assign(btn.style, {
      position: 'absolute', top: '0.75rem', right: '1rem',
      background: 'none', border: 'none', fontSize: '1.5rem',
      color: '#6c757d', cursor: 'pointer', lineHeight: '1',
      fontWeight: 'bold', transition: 'color .2s ease'
    });
    btn.addEventListener('mouseenter', () => (btn.style.color = '#dc3545'));
    btn.addEventListener('mouseleave', () => (btn.style.color = '#6c757d'));
    btn.addEventListener('click', () => intro.exit());
    tooltip.appendChild(btn);
  }

  /**
   * Ajusta SIEMPRE el área scrolleable del cuerpo para que:
   * - En pasos cortos: el tooltip se ve pequeño (altura auto).
   * - En pasos largos: el tooltip nunca se desborda; el scroll va dentro del cuerpo.
   */
  function ajustarAlturaYScroll(tooltip) {
    if (!tooltip) return;

    const textEl    = tooltip.querySelector('.introjs-tooltiptext');
    const buttonsEl = tooltip.querySelector('.introjs-tooltipbuttons');
    if (!textEl) return;

    // 1) Calcula el alto máximo permitido del tooltip en pantalla
    const isMobile = window.matchMedia('(max-width: 576px)').matches;
    const tallH    = isMobile ? MOBILE_TALL_HEIGHT : TALL_HEIGHT;

    // El tooltip tiene max-height en CSS (85vh). Usamos el mínimo entre 85vh y el “tall”
    const vhLimit   = Math.floor(window.innerHeight * (isMobile ? 0.80 : 0.85));
    const contLimit = Math.max(320, Math.min(vhLimit, tallH)); // margen de seguridad

    // 2) Paddings del tooltip (para restarlos del área disponible)
    const cs = getComputedStyle(tooltip);
    const padTop = parseFloat(cs.paddingTop) || 0;
    const padBot = parseFloat(cs.paddingBottom) || 0;

    // 3) Altura de botones (footer)
    const buttonsH = buttonsEl ? buttonsEl.offsetHeight : 48;

    // 4) Alto disponible para el cuerpo scrolleable
    const disponible = contLimit - padTop - padBot - buttonsH - 8; // 8px colchón

    // 5) Fijar el área de scroll interna
    textEl.style.maxHeight = disponible + 'px';
    textEl.style.overflowY = 'auto';

    // 6) (Opcional) aplica la “estética modal alta” si el contenido es muy largo
    const needsTall = textEl.scrollHeight > disponible;
    tooltip.classList.toggle(TALL_CLASS, needsTall);
  }

  // Re-ajustar también en resize (por cambios de viewport)
  const onResize = () => {
    const tooltip = document.querySelector('.introjs-tooltip');
    ajustarAlturaYScroll(tooltip);
  };
  window.addEventListener('resize', onResize);

  // En cada paso: botón ×, ajuste inmediato, post-reflow e imágenes
  intro.onafterchange(function () {
    const tooltip = document.querySelector('.introjs-tooltip');
    if (!tooltip) return;

    asegurarBotonCerrar(tooltip);

    ajustarAlturaYScroll(tooltip);
    requestAnimationFrame(() => ajustarAlturaYScroll(tooltip));

    const textEl = tooltip.querySelector('.introjs-tooltiptext');
    if (textEl) {
      textEl.querySelectorAll('img').forEach(img => {
        if (!img.complete) {
          img.addEventListener('load', () => ajustarAlturaYScroll(tooltip), { once: true });
        }
      });
    }
  });

  intro.onexit(() => window.removeEventListener('resize', onResize));

  intro.start();
}


/* ============================
 * TOUR DEL WIZARD (Intro.js)
 * Versión modular: 1 función por paso
 * ============================ */

// Helpers: selecciona el elemento del step (círculo de la cabecera)
const elStep = (n) => document.querySelector(`[data-step="${n}"]`);

/* Paso 1 – Datos Generales */
function paso1_DatosGenerales() {
  return {
    element: elStep(1),
    intro: `
      <div>
        <div style='padding-bottom:5px;'>
          En esta sección introduces la información básica del municipio que se gestionará dentro del POU.
          Estos datos son esenciales para identificar el municipio, establecer los contactos de referencia
          y configurar la comunicación con el Buzón de Participación.
        </div>

        <ul style='margin-top:5px;'>
          <li>
            <b>Nombre del Municipio</b> se mostrará en la página pública
            y en todas las secciones del POU.
          </li>
          <li>
            <b>Correo del Arquitecto</b> y <b>'Correo del Gestor'</b>
            permiten definir las direcciones de contacto principales.
            El gestor suele ser un técnico del Ayuntamiento
            y el arquitecto el responsable del POU.
          </li>
          <li>
            El campo <b>URL Política de Privacidad del Ayuntamiento</b>
            debe enlazar a la política específica publicada por el propio Ayuntamiento
            (obligatorio por RGPD).
          </li>
          <li>
            Puedes marcar si los documentos referentes a la participación
            deben enviarse también al arquitecto responsable.
          </li>
          <li>
            Finalmente, el interruptor <b>Activar/Desactivar Buzón de Participación</b>
            permite habilitar o pausar temporalmente la recepción de mensajes ciudadanos.
          </li>
        </ul>
      </div>
    `,
    tooltipClass: 'customTooltip'
  };
}

/* Paso 2 – Información */
function paso2_Informacion() {
  return {
    element: elStep(2),
    intro: `
      <div>
        <div style='padding-bottom:5px;'>Aquí defines el texto que aparecerá en la web pública del municipio.</div>
        <ul>
          <li>El campo <b>Título</b> se mostrará como encabezado principal.</li>
          <li>La <b>Descripción</b> aparecerá justo debajo, como el texto explicativo.</li>
        </ul><br>
        <div style='margin-top:10px; text-align:center;'>
          <img src='images/ayuda/ejemplo-informacion.png'
               alt='Vista pública de la información del municipio'
               style='max-width:100%; border-radius:8px; box-shadow:0 0 6px rgba(0,0,0,0.2);'>
          <p style='font-size:0.9rem; color:#555; margin-top:5px;'>Ejemplo de cómo se mostrará en la página pública</p>
        </div>
      </div>
    `,
    tooltipClass: 'customTooltip'
  };
}

/* Paso 3 – Fases */
function paso3_Fases() {
  return {
    element: elStep(3),
    intro: `
      <div>
        <div style='padding-bottom:5px;'>Aquí defines la fase en la que se encuentra actualmente el municipio dentro del proceso del POU.</div>
        <ul>
          <li>El campo <b>Fase actual</b> marca qué fase aparecerá resaltada en la línea temporal de la página pública.</li>
          <li>La <b>Fecha de inicio</b> sirve como referencia interna para el seguimiento del avance.</li>
          <li>El <b>Estado de la tramitación</b> muestra el texto que aparece debajo del gráfico, indicando en qué punto exacto del proceso se encuentra el municipio.</li>
        </ul><br>
        <div style='margin-top:10px; text-align:center;'>
          <img src='images/ayuda/ejemplo-fases.png'
               alt='Vista pública de las fases del POU'
               style='max-width:100%; border-radius:8px; box-shadow:0 0 6px rgba(0,0,0,0.2);'>
          <p style='font-size:0.9rem; color:#555; margin-top:5px;'>Ejemplo de cómo se mostrará en la página pública</p>
        </div>
      </div>
    `,
    tooltipClass: 'customTooltip'
  };
}

/* Paso 4 – Documentos */
function paso4_Documentos() {
  return {
    element: elStep(4),
    intro: `
      <div>
        <div style='padding-bottom:5px;'>
          Aquí podrás subir y gestionar los documentos asociados a cada fase del POU.
        </div>
        <ul>
          <li>El campo <b>Categoría</b> clasifica los documentos (p. ej. Memoria, Planos, Estudios...). Puedes crear nuevas con el botón <b>+</b>.</li>
          <li>El campo <b>Fase del documento</b> indica a qué fase del proceso pertenece cada archivo.</li>
          <li>Con <b>Subir documento</b> guardas el archivo; aparecerá en la tabla inferior.</li>
          <li>En la tabla podrás <b>ver</b> o <b>eliminar</b> documentos. En la web pública se mostrarán agrupados por <b>fase</b> y <b>categoría</b>.</li>
        </ul><br>
        <div style='margin-top:10px; text-align:center;'>
          <img
            src='images/ayuda/ejemplo-documentos.png'
            alt='Vista pública de documentos por fase y categoría'
            style='max-width:100%; border-radius:8px; box-shadow:0 0 6px rgba(0,0,0,0.2);'
          >
          <p style='font-size:0.9rem; color:#555; margin-top:5px;'>
            Ejemplo de cómo se agrupan en la página pública
          </p>
        </div>
      </div>
    `,
    tooltipClass: 'customTooltip'
  };
}

/* Paso 5 – Participación */
function paso5_Participacion() {
  return {
    element: elStep(5),
    intro: `
      <div>
        <div style='padding-bottom:5px;'>
          En esta sección configuras toda la información que aparecerá en el apartado de 
          <b>Participación ciudadana</b> de la web pública del municipio.
        </div>

        <ul>
          <li>
            El campo <b>Título principal</b> define el encabezado principal de la sección (por ejemplo, 
            “La participación ciudadana”).
          </li>
          <li>
            La <b>Descripción principal</b> permite redactar un texto explicativo, con formato enriquecido (negrita, cursiva, enlaces, etc.), 
            donde se destaca la importancia de la implicación ciudadana en el proceso del POU.
          </li>

          <li>
            El <b>Título secundario</b> y su <b>Descripción secundaria</b> permiten incluir un segundo bloque informativo, 
            por ejemplo, para destacar una fase concreta de participación o anunciar nuevos cuestionarios.
          </li>

          <li>
            En el bloque de <b>Botones de Participación</b> puedes crear enlaces a cuestionarios o documentos descargables relacionados con la participación. 
            Cada botón aparecerá en la página pública al lado del texto principal, con un diseño destacado.
          </li>
        </ul>

        <div style='margin-top:8px; margin-left:20px; text-align:justify; font-size:0.92rem;'>
          <p style='margin-bottom:5px;'>
            Para añadir un nuevo botón:
          </p>
          <ol style='padding-left:20px; margin:0;'>
            <li>Escribe el <b>texto del botón</b> (por ejemplo: “Encuesta de participación” o “Guía del POU”).</li>
            <li>Selecciona un archivo PDF o documento relacionado desde tu equipo.</li>
            <li>Pulsa <b>Subir</b> para añadirlo a la tabla inferior.</li>
            <li>Desde la tabla puedes <b>ver el archivo</b> para comprobarlo o <b>eliminarlo</b> si ya no deseas mostrarlo.
            Los cambios se reflejarán automáticamente en la web pública.</li>
          </ol>
        </div><br>

        <div style='margin-top:10px; text-align:center;'>
          <img
            src='images/ayuda/ejemplo-participacion.png'
            alt='Vista pública de la sección de participación ciudadana con botones laterales'
            style='max-width:100%; border-radius:8px; box-shadow:0 0 6px rgba(0,0,0,0.2);'
          >
          <p style='font-size:0.9rem; color:#555; margin-top:5px;'>
            Ejemplo de cómo se mostrará en la página pública: texto explicativo con los botones de participación en la parte lateral.
          </p>
        </div>
      </div>
    `,
    tooltipClass: 'customTooltip'
  };
}

/* Paso 6 – Noticias */
function paso6_Noticias() {
  return {
    element: elStep(6),
    intro: `
      <div>
        <div style='padding-bottom:5px;'>
          En este paso puedes gestionar las <b>Noticias</b> relacionadas con el POU del municipio. 
          Estas publicaciones informan a la ciudadanía sobre los avances, anuncios o hitos del proceso 
          y se muestran en la sección <b>“Últimas noticias”</b> de nuestra web.
        </div>

        <div style='margin-top:8px; margin-left:20px; text-align:justify; font-size:0.92rem;'>
          <p style='margin-bottom:5px;'>
            Para crear una nueva noticia sigue estos pasos:
          </p>
          <ol style='padding-left:20px; margin:0;'>
            <li>
              Escribe el <b>Título</b> (máximo 60 caracteres). Debe reflejar claramente el tema de la noticia, 
              tal y como se mostrará en la tarjeta visible en la web.
            </li>
            <li>
              En <b>Fecha de publicación</b> indica la <u>fecha real de la noticia original</u> 
              (por ejemplo, la fecha en la que fue publicada por el Ayuntamiento o el medio oficial).
            </li>
            <li>
              En el campo <b>Resumen</b> redacta una breve descripción del contenido de la noticia. 
              Este texto aparecerá en la vista previa de la tarjeta y debe sintetizar la información principal.
            </li>
            <li>
              Sube la <b>imagen</b> (formato JPG o PNG), que es <u>obligatoria</u> y sirve como cabecera visual de la noticia. 
              Asegúrate de que tenga buena resolución y esté relacionada con el contenido.
            </li>
            <li>
              En el campo <b>Enlace a más información</b> introduce la <u>URL completa</u> de la noticia original 
              (por ejemplo, la publicada por el Ayuntamiento). Este enlace se abrirá al pulsar el botón 
              <b>“Leer más”</b>.
            </li>
            <li>
              Activa la casilla <b>“Activar noticia”</b> para que sea visible en la web. 
              <b>OJO:</b> Solo las noticias activas se mostrarán en el carrusel público.
            </li>
          </ol>
        </div><br>

        <div style='margin-top:8px; text-align:justify; font-size:0.92rem;'>
          <p style='margin-bottom:5px;'>
            Una vez guardadas, todas las noticias se mostrarán en la tabla inferior, desde donde puedes gestionarlas fácilmente:
          </p>
          <ul style='padding-left:20px; margin:0;'>
            <li>
              Si marcas o desmarcas la casilla de <b>“Activa”</b>, la noticia se 
              <u>activará o desactivará automáticamente en la web</u> sin necesidad de volver a guardar.
            </li>
            <li>
              Pulsa <b>Eliminar</b> para borrar definitivamente una noticia del sistema. 
              Al eliminarla dejará de mostrarse inmediatamente en la web.
            </li>
          </ul>
        </div><br>

        <div style='margin-top:10px; text-align:center;'>
          <img
            src='images/ayuda/ejemplo-noticias.png'
            alt='Vista pública de las noticias del POU'
            style='max-width:100%; border-radius:8px; box-shadow:0 0 6px rgba(0,0,0,0.2);'
          >
          <p style='font-size:0.9rem; color:#555; margin-top:5px;'>
            Ejemplo de cómo se muestra una noticia activa en la web pública: 
            imagen superior, título, fecha, resumen y botón <b>“Leer más”</b> 
            que redirige al enlace original.
          </p>
        </div>
      </div>
    `,
    tooltipClass: 'customTooltip'
  };
}


/* Paso 7 – Preguntas Frecuentes (FAQs) */
function paso7_FAQs() {
  return {
    element: elStep(7),
    intro: `
      <div>
        <div style='padding-bottom:5px;'>
          En este paso puedes gestionar las <b>Preguntas Frecuentes (FAQ)</b> que aparecerán en nuestra web. 
          Estas preguntas ayudan a resolver las dudas más comunes sobre el POU y facilitan que la ciudadanía entienda mejor el proceso.
        </div>

        <div style='margin-top:8px; margin-left:20px; text-align:justify; font-size:0.92rem;'>
          <p style='margin-bottom:5px;'>
            Para crear o asignar preguntas al municipio sigue estos pasos:
          </p>
          <ol style='padding-left:20px; margin:0;'>
            <li>
              En el desplegable <b>“Buscar pregunta existente”</b> puedes seleccionar una pregunta que ya haya sido creada previamente 
              en el sistema. Esto permite reutilizar las mismas preguntas en distintos municipios.
            </li>
            <li>
              Si la pregunta que necesitas no existe, pulsa <b>“Crear pregunta”</b> para añadir una nueva. 
              Se abrirá un pequeño formulario donde deberás escribir el <b>texto de la pregunta</b> 
              y su correspondiente <b>respuesta</b>.
            </li>
            <li>
              Pulsa <b>“Añadir a la lista”</b> para incorporarla a la tabla del municipio.
            </li>
            <li>
              Una vez <b>añadidas todas las preguntas</b>, debes pulsar el botón <b>GUARDAR</b> 
              para que queden registradas en el sistema.  
              <div style="margin-top:4px; font-size:0.9rem; color:#b02a37; background:#fdeaea; border-radius:6px; padding:6px 10px; border:1px solid #f5c2c7;">
                ⚠️ <b>Importante:</b> Si no pulsas <b>“Guardar”</b>, las preguntas no se guardarán 
                y se perderán al salir del asistente.
              </div>
              <div style="margin-top:6px;">
                Una vez guardadas correctamente, las preguntas aparecerán <b>de forma inmediata</b> 
                en nuestra web dentro del bloque <b>“Preguntas frecuentes”</b>.
              </div>
            </li>
          </ol>
        </div>

        <div style='margin-top:15px; margin-bottom:8px; margin-left:20px; text-align:justify; font-size:0.92rem;'>
          <p style='margin-bottom:5px;'>
            Ordenación de preguntas:
          </p>
          <ol style='padding-left:20px; margin:0;'>
            <li>
              Si deseas cambiar el orden en que se muestran las preguntas, pulsa el botón <b>“Ordenar”</b>, 
              arrastra las filas a la posición deseada y guarda el nuevo orden con <b>“Guardar orden”</b>.
            </li>
          </ol>
        </div>

          <div style='margin-top:15px; margin-left:20px; font-size:0.92rem;>
          <p style='margin-bottom:3px;'>
            <b>Si en algún momento, alguna pregunta ya no es relevante, puedes eliminarla con el botón <b>“Eliminar”</b>. 
              Trás guardar los cambios, la pregunta dejará de mostrarse automáticamente en nuestra web.</b>
          </p>
        </div><br>

        <div style='margin-top:10px; text-align:center;'>
          <img
            src='images/ayuda/ejemplo-faqs.png'
            alt='Vista pública de las preguntas frecuentes del POU'
            style='max-width:100%; border-radius:8px; box-shadow:0 0 6px rgba(0,0,0,0.2);'
          >
          <p style='font-size:0.9rem; color:#555; margin-top:5px;'>
            Ejemplo de cómo se muestran las preguntas frecuentes en la web pública: 
            cada pregunta se despliega al hacer clic, mostrando su respuesta completa.
          </p>
        </div>
      </div>
    `,
    tooltipClass: 'customTooltip'
  };
}


function iniciarTourPanel() {
  const modalEl = document.getElementById('modalAyudaPanel');
  if (!modalEl) return;

  let modal = bootstrap.Modal.getInstance(modalEl);
  if (!modal) modal = new bootstrap.Modal(modalEl);

  modal.show();
}
