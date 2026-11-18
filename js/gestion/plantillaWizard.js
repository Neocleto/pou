/*******************************************
 *  PLANTILLA DEL WIZARD (Pasos obligatorios)
 *  Archivo: plantillaWizard.js
 *
 *  Propósito:
 *    Cargar valores por defecto en los pasos 2, 3, 5 y 7
 *    sin tocar Documentos (4) ni Noticias (6).
 *
 *  Qué hace el botón "Cargar plantilla":
 *    1. Rellena automáticamente campos de los pasos 2, 3 y 5.
 *    2. Carga las nueve primeras FAQs del documento del POU
 *       como preguntas especificas del municipio, sin tocar la biblioteca.
 *    3. Deja todos los pasos listos para guardar en BBDD.
 *******************************************/

/* ==========================================================
 * 1) CONTENIDO EDITABLE DE LA PLANTILLA
 * ========================================================== */
const PLANTILLA_WIZARD = {
  paso1: {
    buzon_participacion_activo: '1'
  },
  paso2: {
    titulo: 'Para qué sirve el plan de ordenación urbana',
    descripcion: `
      <p>Este municipio no cuenta con planeamiento general, por lo que carece de directrices que planifiquen la ordenación del núcleo urbano y del conjunto del término municipal. Con este Plan de Ordenación Urbana (POU), la ciudadanía tiene la oportunidad de decidir su futuro y reflexionar colectivamente cómo desean que sea su pueblo.</p>
      <p>Actualmente para desarrollar cualquier actuación en el municipio, es necesario recurrir a las normativas y a la legislación vigente de ámbito autonómico y estatal. Estas normas, sin embargo, no siempre tienen en cuenta la escala, las características ni las necesidades específicas del municipio, lo que dificulta su desarrollo.</p>
      <p>Nos encontramos en un momento importante, ya que existe la oportunidad de elaborar un POU contando con la participación ciudadana en el marco de la Ley de Impulso para la Sostenibilidad del Territorio de Andalucía (LISTA), que regula la ordenación del territorio y el urbanismo, y que facilita y agiliza los procedimientos para la ejecución de actuaciones urbanísticas.</p>
      <p>La LISTA introduce un cambio significativo en el concepto de clasificación de suelo y propone nuevas estrategias de planificación. El objetivo ya no es promover nuevos crecimientos que creen expectativas entre las personas propietarias de suelo, sino de conservar y mejorar lo existente, aprovechando todo su potencial y permitiendo un crecimiento justificado cuando resulte necesario.</p>
      <p>Este POU es un documento urbanístico elaborado por el equipo multidisciplinar de profesionales del Servicio de Arquitectura y Planeamiento de la Diputación Provincial de Málaga, dentro del marco de la asistencia técnica recogida en los Planes Provinciales de Asistencia y Cooperación. Su objetivo es dotar a los municipios de un marco urbanístico legal adecuado a las directrices establecidas por la legislación vigente, que permita desarrollar su ordenación urbana y territorial conforme a las actuales demandas sociales.</p>
    `.trim()
  },
  paso3: {
    num_fase: '1',
    codigo_subfase: '1.1',
    estado_tramitacion: 'Esta fase inicia el proceso de elaboración del POU, donde se plantea un plan de participación pública que recoge acciones como encuestas, reuniones vecinales, buzones de sugerencias, sesiones informativas, herramientas digitales y mecanismos de retroalimentación continua.',
    // Se calcula al pulsar Cargar plantilla, respetando el dia local.
    fecha_inicio: () => {
      const hoy = new Date();
      const anio = hoy.getFullYear();
      const mes = String(hoy.getMonth() + 1).padStart(2, '0');
      const dia = String(hoy.getDate()).padStart(2, '0');
      return `${anio}-${mes}-${dia}`;
    }
  },
  paso5: {
    // Título y texto públicos de la sección de participación.
    titulo1: 'Participación ciudadana en el POU',
    descripcion1: `
      <p>La implicación de los ciudadanos en la Participación es un pilar esencial en la elaboración del <strong>Plan de Ordenación Urbana (POU)</strong>. Este enfoque se centra en combinar las vivencias y perspectivas de la comunidad, con la experiencia técnica y administrativa del equipo del <strong>Servicio de Arquitectura y Planeamiento de la Diputación de Málaga</strong>, encargado de su redacción.</p>
      <p>El propósito es lograr que este instrumento de ordenación urbanística se fundamente en un <strong>amplio consenso</strong> y aborde efectivamente las <strong>necesidades concretas del municipio</strong>.</p>
      <p>A través de este <strong>proceso colaborativo</strong>, se buscan soluciones que no solo sean técnicamente sólidas, sino que también alcancen un alto grado de aceptación entre los habitantes del municipio.</p>
      <p>Este método de participación garantiza que los planes reflejen una <strong>visión compartida</strong> y sean más efectivos en su <strong>implementación y sostenibilidad</strong>.</p>
    `.trim()
  },
  // Las primeras nueve preguntas del documento oficial del POU (13/11/2026).
  // Son textos municipales y no modifican la biblioteca comun de FAQs.
  paso7: [
    { pregunta: "¿Qué es un PLAN BÁSICO DE ORDENACIÓN MUNICIPAL – POU?", respuesta: "El Plan de Ordenación Urbana (POU) es un instrumento de ordenación urbanística detallada para establecer las directrices y los objetivos de la planificación del suelo urbano, es decir, el suelo transformado por la edificación o la urbanización." },
    { pregunta: "¿Cuál es el objetivo del POU?", respuesta: "El objetivo es revisar o redactar la normativa de edificación y de urbanización adaptada a las necesidades del núcleo. Es el momento de revisar los criterios a la hora de intervenir en el suelo urbano, promoviendo un desarrollo urbano sostenible, primando la revitalización y la regeneración de la ciudad existente." },
    { pregunta: "¿De qué manera pueden las personas del municipio implicarse en la participación del POU?", respuesta: "La ciudadanía puede participar desde el inicio en el proceso de elaboración del POU, donde se plantea un plan específico de participación pública que recoge acciones como encuestas, reuniones vecinales, buzones de sugerencias, sesiones informativas, herramientas digitales y mecanismos de retroalimentación continua.\n\nAdemás, tras la aprobación de los distintos documentos, se abrirán los periodos marcados por la normativa para la presentación de sugerencias sobre el contenido del documento de Avance que se publique, y alegaciones sobre el documento de Aprobación Inicial." },
    { pregunta: "¿Cómo influye el POU en la ciudadanía?", respuesta: "La aprobación del POU proporciona un marco normativo urbanístico que dota de seguridad jurídica a toda la ciudadanía. Establece qué es lo que se va a poder construir en las nuestras parcelas, cómo va a ser el diseño de nuestro espacio público. Del mismo modo, identifica las actuaciones a acometer para mejorar la calidad de vida de los residentes proponiendo actuaciones urbanísticas y de transformación urbanística, nuevos servicios e infraestructuras, nuevas dotaciones y espacios destinados a la conservación de áreas naturales y culturales." },
    { pregunta: "¿Tiene en cuenta el POU el entorno natural del núcleo y su desarrollo sostenible?", respuesta: "Sí, una parte fundamental del POU es la integración de políticas de sostenibilidad y protección ambiental, incluyendo la gestión de recursos naturales y la mitigación de impactos medioambientales.\n\nLa aprobación del POU conlleva una doble tramitación: urbanística y ambiental. Los documentos ambientales también se podrán consultar en las diferentes fases de exposición pública:\n\n- En el documento de Avance se elabora de manera paralela el Documento Inicial Estratégico (DIE), que inicia el procedimiento ambiental, emitiendo el órgano autonómico competente el Documento de Alcance, en el que se recogen una serie de recomendaciones a incorporar en el POU.\n\n- Tras la Aprobación Inicial del documento del POU, que incluye un anexo de Evaluación Ambiental Estratégica (EAE), el órgano autonómico competente emite una Declaración Ambiental Estratégica, que pone fin a la tramitación ambiental." },
    { pregunta: "¿Qué ámbito territorial regula el POU?", respuesta: "El POU regula el suelo urbano, que es el escenario de nuestra vida diaria. Comprende el núcleo de nuestro pueblo —con sus casas, parques, plazas y equipamientos— además de los solares y espacios vacíos colindantes." },
    { pregunta: "¿El POU de mi municipio incorpora la perspectiva de género?", respuesta: "El POU incorpora la perspectiva de género, lo que significa que se incorporan propuestas de ordenación que mejoran la calidad de vida de toda la ciudadanía independientemente del género, edad, condición física, social, psicológica… materializado en aspectos referentes a la accesibilidad, la seguridad, el transporte público o la vivienda protegida." },
    { pregunta: "¿Quién es el equipo encargado de realizar el POU?", respuesta: "El POU es elaborado por técnicos especializados del Servicio de Arquitectura y Urbanismo de la Diputación de Málaga, con la participación pública de la ciudadanía y la supervisión técnica y jurídica municipal y autonómica, para su posterior aprobación por la corporación municipal." },
    { pregunta: "¿Cómo acceder a la información sobre el POU en mi municipio?", respuesta: "La información detallada sobre el POU de un núcleo específico generalmente está disponible en la página web del ayuntamiento o en la oficina de urbanismo municipal.\n\nUna vez aprobado definitivamente el POU, se publica su normativa en el Boletín Oficial de la Junta de Andalucía (BOJA) y el documento completo se podrá visualizar en la web de la Diputación de Málaga, así como en la web de consulta de planeamiento urbanístico y territorial de la Junta de Andalucía." }
  ]
};

/* ==========================================================
 * 2) FUNCIONES AUXILIARES
 * ========================================================== */

// Escribe texto en inputs o textareas normales
function escribirCampoTexto(inputEl, valor, modo) {
  if (!inputEl) return;
  const actual = (inputEl.value ?? '').trim();
  const nuevo = (typeof valor === 'function') ? valor() : valor;
  if (modo === 'sobrescribir' || (modo === 'soloVacios' && actual === '')) {
    const valorFinal = String(nuevo ?? '').replaceAll('{municipio}', obtenerNombreMunicipioPlantilla());
    // Solo los textareas enriquecidos necesitan CKEditor. Los selects,
    // fechas e inputs normales requieren su valor literal, sin etiquetas <p>.
    if (inputEl.tagName === 'TEXTAREA' && inputEl.dataset.richEditor === '1') {
      actualizarEditorEnriquecido(inputEl.id, valorFinal);
    } else {
      inputEl.value = valorFinal;
    }
  }
}

/** Devuelve el municipio seleccionado sin depender del plugin visual. */
function obtenerNombreMunicipioPlantilla() {
  const selector = document.getElementById('nombre');
  const valor = selector?.selectedOptions?.[0]?.textContent || selector?.value || '';
  return String(valor).trim() || 'el municipio';
}

// Marca o desmarca un checkbox
function escribirCheckbox(checkEl, valor, modo) {
  if (!checkEl) return;
  const marcar = (valor === '1' || valor === 1 || valor === true);
  if (modo === 'sobrescribir' || (modo === 'soloVacios' && !checkEl.checked)) {
    checkEl.checked = marcar;
    checkEl.dispatchEvent(new Event('change', { bubbles: true }));
  }
}


// ============================================================
// Comprueba que todos los campos obligatorios del Paso 1 están rellenos
// ============================================================
function paso1Completo() {
  // Campos obligatorios del Paso 1 con sus validaciones
  const camposObligatorios = [
    { id: 'cod_mun', nombre: 'Código del Municipio', regex: /^\d{5}$/, descripcion: 'Debe tener exactamente 5 dígitos' },
    { id: 'nombre', nombre: 'Nombre del Municipio' },
    { id: 'correo_contacto', nombre: 'Correo del Arquitecto', regex: /^[^@\s]+@[^@\s]+\.[a-zA-Z]{2,}$/, descripcion: 'Introduce un correo válido con dominio (ej. usuario@dominio.com)' },
    { id: 'correo_contacto_gestor', nombre: 'Correo del Gestor', regex: /^[^@\s]+@[^@\s]+\.[a-zA-Z]{2,}$/, descripcion: 'Introduce un correo válido con dominio (ej. usuario@dominio.com)' },
    { id: 'politica_privacidad_url', nombre: 'URL de la Política de Privacidad del Ayuntamiento', regex: /^(https?:\/\/[^\s$.?#].[^\s]*)$/, descripcion: 'Introduce una URL válida que empiece por http o https' }
  ];


  // Buscamos si falta alguno
  const faltantes = camposObligatorios.filter(c => {
    const el = document.getElementById(c.id);
    const valor = (el?.value || '').trim();
    if (!valor) return true; // vacío
    if (c.regex && !c.regex.test(valor)) return true; // formato incorrecto
    return false;
  });

  // Si falta alguno, devolvemos lista de los que no cumplen
  if (faltantes.length > 0) {
    const nombres = faltantes.map(c => `• ${c.nombre}`).join('\n');
    mostrarAvisoPaso1Incompleto(nombres);
    return false;
  }

  return true;
}

// ============================================================
// Muestra un aviso si el usuario intenta cargar la plantilla
// sin completar todos los campos del Paso 1
// ============================================================
function mostrarAvisoPaso1Incompleto(camposFaltantes = '') {
  try {
    if (typeof currentStep !== 'undefined') currentStep = 1;
    if (typeof updateWizard === 'function') updateWizard();
  } catch (_) {}

  Swal.fire({
    title: 'Completa el Paso 1',
    html: `
      <p style="text-align:justify; margin:0 0 10px 0;">
        Antes de cargar la plantilla, asegúrate de haber completado todos los campos obligatorios del <strong>Paso 1</strong>.
      </p>
      ${camposFaltantes
        ? `<pre style="text-align:left; background:#f8f9fa; padding:10px; border-radius:6px; font-size:0.9rem;">${camposFaltantes}</pre>`
        : ''}
    `,
    icon: 'info',
    confirmButtonText: 'Entendido',
    customClass: { confirmButton: 'btn btn-primary' },
    buttonsStyling: false
  });
}


/* ==========================================================
 * 3) FUNCIÓN ESPECÍFICA: aplicarPlantillaPaso7()
 *    Encargada de rellenar el Paso 7 con las FAQs del sistema
 * ========================================================== */
function aplicarPlantillaPaso7(modo = 'soloVacios') {
  if (!Array.isArray(preguntasAsignadasLocal)) {
    preguntasAsignadasLocal = [];
  }

  // Rellenar huecos no sustituye preguntas existentes del municipio.
  if (modo === 'soloVacios' && preguntasAsignadasLocal.length > 0) {
    return;
  }

  // La plantilla carga exactamente nueve preguntas del documento recibido.
  // Sin IDs de biblioteca: el modelo las guarda como preguntas exclusivas
  // del municipio y conserva intacta la biblioteca comun pou.faqs.
  preguntasAsignadasLocal = PLANTILLA_WIZARD.paso7.map(function (faq, indice) {
    return {
      id: 'plantilla_pou_' + (indice + 1),
      asignacion_id: null,
      pregunta_id: null,
      pregunta: faq.pregunta,
      respuesta: faq.respuesta,
      pregunta_base: '',
      respuesta_base: '',
      personalizada: true,
      es_exclusiva: true,
      nueva: true
    };
  });

  if (typeof renderizarTablaFaqs === 'function') {
    renderizarTablaFaqs(preguntasAsignadasLocal);
  }

  // Usar el serializador del Paso 7, que incluye los textos y los indicadores
  // de pregunta exclusiva. Enviar solo los IDs perderia las respuestas nuevas.
  if (typeof guardarDatosPaso === 'function') {
    guardarDatosPaso(7);
  }

  if (typeof actualizarEstadoBotonGuardar === 'function') {
    actualizarEstadoBotonGuardar();
  }
}

/* ==========================================================
 * 4) FUNCIÓN PRINCIPAL: aplicarPlantilla()
 * ========================================================== */
async function aplicarPlantilla(modo = 'soloVacios') {

  // Comprobación inicial
  if (!paso1Completo()) return;

  // Paso 1 (checkboxes)
  escribirCheckbox(document.getElementById('enviar_docs_a_arquitecto'), PLANTILLA_WIZARD.paso1.enviar_docs_a_arquitecto, modo);
  escribirCheckbox(document.getElementById('buzon_participacion_activo'), PLANTILLA_WIZARD.paso1.buzon_participacion_activo, modo);
  if (typeof guardarDatosPaso === 'function') guardarDatosPaso(1);

  // Paso 2 (información general)
  escribirCampoTexto(document.getElementById('titulo'), PLANTILLA_WIZARD.paso2.titulo, modo);
  escribirCampoTexto(document.getElementById('descripcion'), PLANTILLA_WIZARD.paso2.descripcion, modo);
  if (typeof guardarDatosPaso === 'function') guardarDatosPaso(2);

  // Paso 3 (fase actual): fase 1, subfase 1.1.
  // Seleccionamos por codigo y no por ID de base de datos, que puede cambiar.
  const selectorFase = document.getElementById('fase_padre');
  const selectorSubfase = document.getElementById('subfase_id');
  const rellenarFase = modo === 'sobrescribir' || !selectorFase?.value;

  if (rellenarFase) {
    // En el wizard las fases se cargan por AJAX. Si aún están cargando,
    // esperamos a que exista la opción antes de seleccionar la fase 1.
    const faseInicial = PLANTILLA_WIZARD.paso3.num_fase;
    const tieneFase = selectorFase && Array.from(selectorFase.options).some(function (opcion) {
      return opcion.value === faseInicial;
    });
    if (!tieneFase && window.FasesWizard && typeof window.FasesWizard.cargarFasesPadre === 'function') {
      await window.FasesWizard.cargarFasesPadre(faseInicial);
    }
    escribirCampoTexto(selectorFase, faseInicial, 'sobrescribir');
    if (!selectorFase || selectorFase.value !== faseInicial) {
      Swal.fire('No se pudo cargar la fase 1', 'Comprueba que el listado de fases esté disponible y vuelve a cargar la plantilla.', 'error');
      return;
    }
    if (window.FasesWizard && typeof window.FasesWizard.cargarSubfases === 'function') {
      await window.FasesWizard.cargarSubfases(PLANTILLA_WIZARD.paso3.num_fase);
    }
    if (selectorSubfase) {
      const subfaseInicial = Array.from(selectorSubfase.options).find(function (opcion) {
        return opcion.textContent.trim().startsWith(PLANTILLA_WIZARD.paso3.codigo_subfase + ' ')
          || opcion.textContent.trim() === PLANTILLA_WIZARD.paso3.codigo_subfase;
      });
      if (subfaseInicial) {
        selectorSubfase.value = subfaseInicial.value;
      }
      if (!selectorSubfase.value) {
        Swal.fire('No se pudo cargar la subfase 1.1', 'Comprueba que esta subfase exista para la fase 1 y vuelve a aplicar la plantilla.', 'error');
        return;
      }
    }
  } else if (!selectorSubfase?.value && window.FasesWizard) {
    // Conservar una fase ya existente cuando se elige rellenar solo vacios.
    await window.FasesWizard.cargarSubfases(selectorFase.value);
  }

  escribirCampoTexto(document.getElementById('estado_tramitacion'), PLANTILLA_WIZARD.paso3.estado_tramitacion, modo);
  escribirCampoTexto(document.getElementById('fecha_inicio'), PLANTILLA_WIZARD.paso3.fecha_inicio, modo);
  if (typeof guardarDatosPaso === 'function') guardarDatosPaso(3);

  // Paso 5 (participación)
  escribirCampoTexto(document.getElementById('titulo1'), PLANTILLA_WIZARD.paso5.titulo1, modo);
  escribirCampoTexto(document.getElementById('descripcion1'), PLANTILLA_WIZARD.paso5.descripcion1, modo);
  if (typeof guardarDatosPaso === 'function') guardarDatosPaso(5);

  // Paso 7 (FAQs reutilizables)
  aplicarPlantillaPaso7(modo);

  // La misma plantilla preparará también la configuración visual y los accesos.
  window.plantillaPortalAplicada = true;
  window.plantillaPortalModo = modo;

  // Recalcula estado del botón Guardar (si existe)
  if (typeof actualizarEstadoBotonGuardar === 'function') {
    actualizarEstadoBotonGuardar();
  }

  // Aviso final
  Swal.fire({
    title: 'Plantilla aplicada',
    text: (modo === 'sobrescribir')
      ? 'Se han aplicado los valores de plantilla en todos los campos obligatorios.'
      : 'Se han rellenado los huecos vacíos con valores de plantilla.',
    icon: 'success',
    confirmButtonText: 'OK',
    customClass: { confirmButton: 'btn btn-success' },
    buttonsStyling: false
  });
}

/* ==========================================================
 * 5) DIÁLOGO PARA ELEGIR MODO ("solo vacíos" o "sobrescribir")
 * ========================================================== */
function abrirDialogoPlantilla() {
  Swal.fire({
    title: 'Cargar plantilla',
    width: '760px',
    html: `
      <div class="text-start pt-1">
        <div class="alert alert-info py-2 px-3 mb-2" style="font-size: 0.9rem;">
          <strong>Antes de cargar la plantilla:</strong> asegúrate de haber completado el <strong>Paso 1</strong>
          (datos del municipio), ya que son propios de cada municipio.
        </div>

        <p class="mb-2">Se preparará un <strong>POU completo de partida</strong> con los textos comunes, el diseño y los accesos iniciales.</p>

        <ul class="mb-2">
          <li><strong>Paso 2:</strong> Título y descripción base.</li>
          <li><strong>Paso 3:</strong> Fase inicial, estado y fecha de inicio.</li>
          <li><strong>Paso 5:</strong> Textos institucionales de participación.</li>
          <li><strong>Paso 7:</strong> Añade preguntas frecuentes por defecto.</li>
          <li><strong>Página pública:</strong> Aplica el diseño, los bloques y los accesos comunes.</li>
        </ul>

        <div class="alert alert-warning py-2 px-3 mb-2" style="font-size: 0.9rem;">
          <strong>Ojo:</strong> Será necesario completar el <strong>Paso 5</strong> con la creación de
          <strong>botones y formularios de participación</strong>, ya que estos, junto con los
          <strong>documentos</strong> y las <strong>noticias</strong>, son elementos específicos
          de cada municipio y no se cargan automáticamente.
        </div>
      </div>
    `,
    icon: 'question',
    showConfirmButton: true,
    showDenyButton: true,
    showCancelButton: true,
    confirmButtonText: 'Rellenar campos vacíos',
    denyButtonText: 'Sobrescribir con plantilla',
    cancelButtonText: 'Cancelar',
    customClass: {
      confirmButton: 'btn btn-primary me-2',
      denyButton: 'btn btn-outline-danger me-2',
      cancelButton: 'btn btn-secondary'
    },
    buttonsStyling: false
  }).then(res => {
    if (res.isConfirmed) aplicarPlantilla('soloVacios');
    else if (res.isDenied) aplicarPlantilla('sobrescribir');
  });
}

/* ==========================================================
 * 6) EVENTO CLICK DEL BOTÓN (id="btnCargarPlantilla")
 * ========================================================== */
document.addEventListener('click', (e) => {
  const btn = e.target.closest('#btnCargarPlantilla');
  if (!btn) return;
  e.preventDefault();
  abrirDialogoPlantilla();
});
