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
 *    2. Añade las FAQs (preguntas frecuentes) del paso 7,
 *        que ya existen en la base de datos (por su ID).
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
    titulo: 'Motivos para la elaboración del nuevo POU',
    descripcion: `La reciente normativa andaluza, conocida como LISTA, se orienta hacia el fomento de la sostenibilidad territorial, introduciendo modificaciones significativas para responder de manera más eficiente a las nuevas exigencias del contexto actual. Esta ley, enfocada en la regulación de la ordenación del territorio y el urbanismo, facilita los procedimientos para la aprobación de planes urbanísticos y trae conceptos innovadores en cuanto a la clasificación del suelo y nuevas estrategias de planificación. Estas últimas buscan reforzar el desarrollo de las áreas urbanas ya existentes, delegando un papel más activo a los Ayuntamientos.
    Dentro de este marco normativo, y considerando las particularidades de {municipio}, el Ayuntamiento ha emprendido la tarea de revisar y actualizar su planificación general para alinearla con la LISTA. Este esfuerzo se ve apoyado por las iniciativas del Área de Cohesión Territorial de la Diputación Provincial de Málaga, que promueve un nuevo modelo de asistencia técnica en materia de urbanismo a través de ayudas financieras. El objetivo de esta acción es modernizar y adaptar la planificación urbana de {municipio} a las actuales demandas sociales y a las directrices que marca la ley vigente.`
  },
  paso3: {
    num_fase: '1',
    subfase_id:'1',
    estado_tramitacion: 'Esta fase inicia el proceso de elaboración del POU, donde se plantea un plan de participación pública que recoge acciones como encuestas, reuniones vecinales, buzones de sugerencias, sesiones informativas, herramientas digitales y mecanismos de retroalimentación continua.',
    fecha_inicio: () => new Date().toISOString().split('T')[0]
  },
  paso5: {
    // Estos textos se guardan solo para mantener compatibilidad con la tabla antigua.
    titulo1: 'Participa en el POU',
    descripcion1: 'El POU se construye también con la participación de la ciudadanía.',
    titulo2: 'Encuestas y formularios',
    descripcion2: 'Consulta los formularios y recursos disponibles para participar.'
  },
  paso7: [
    { id: 1, pregunta: '¿Qué es el POU?', respuesta: 'POU significa Plan de Ordenación Urbana. Este portal permite consultar la información del plan, seguir su tramitación y participar a través de los recursos que publica el Ayuntamiento.' },
    { id: 2, pregunta: '¿Cuál es el objetivo principal del POU?', respuesta: 'El objetivo es establecer la ordenación urbanística del término municipal, adaptada a las características propias del municipio con la máxima sencillez y simplificación de sus determinaciones en función de su dinámica urbanística, promoviendo un desarrollo urbano sostenible, equilibrado y coherente, garantizando el aprovechamiento racional de los recursos y la protección del patrimonio natural y cultural.' },
    { id: 3, pregunta: '¿Quién elabora el POU?', respuesta: 'El POU es elaborado por técnicos especializados del Servicio de Arquitectura y Urbanismo de la Diputación de Málaga, con la participación pública de la ciudadanía, la supervisión técnica y jurídica municipal y autonómica, para su posterior aprobación por la corporación municipal.' },
    { id: 4, pregunta: '¿Cómo afecta el POU a los residentes del municipio?', respuesta: 'La aprobación del POU proporciona un marco normativo urbanístico y territorial que dota de seguridad jurídica a toda la ciudadanía. Del mismo modo, se mejora la calidad de vida de los residentes proponiendo actuaciones urbanísticas y de transformación urbanística, nuevos servicios e infraestructuras, nuevas dotaciones y espacios destinados a la conservación de áreas naturales y culturales.' },
    { id: 5, pregunta: '¿Dónde puedo consultar el ámbito del POU?', respuesta: 'El ámbito y las determinaciones del plan se recogen en los documentos publicados en este portal. Para conocer cómo afecta a una parcela o zona concreta, consulta la documentación y el servicio municipal de urbanismo.' },
    { id: 6, pregunta: '¿Cómo puede la ciudadanía participar en el proceso de POU?',  respuesta: 'El propósito de la participación ciudadana es lograr que el modelo de ordenación del POU se fundamente en el consenso y las necesidades concretas del municipio, buscando soluciones técnicamente viables que alcancen un alto grado de aceptación entre los habitantes del municipio.\n\nLa ciudadanía puede participar desde el inicio en el proceso de elaboración del POU, donde se plantea un plan específico de participación pública que recoge acciones como encuestas, reuniones vecinales, buzones de sugerencias, sesiones informativas, herramientas digitales y mecanismos de retroalimentación continua.\n\nEn el Avance de POU, la ciudadanía puede conocer el contenido del documento y presentar sugerencias al modelo de planificación previsto una vez que se haya publicado en la web del Ayuntamiento.\n\nPosteriormente, tras la Aprobación Inicial del POU, se abre otro periodo de exposición pública, no inferior a 45 días, en el que la ciudadanía, colectivos, asociaciones, colegios profesionales y otras administraciones pueden consultar el documento y presentar alegaciones.' },
    { id: 7, pregunta: '¿El POU incluye consideraciones sobre el medio ambiente y la sostenibilidad?', respuesta: 'Sí, una parte fundamental del POU es la integración de políticas de sostenibilidad y protección ambiental, incluyendo la gestión de recursos naturales y la mitigación de impactos medioambientales.\n\nLa aprobación del POU conlleva una doble tramitación urbanística y ambiental. En el documento de Avance se elabora de manera paralela el Documento Inicial Estratégico, que inicia el procedimiento ambiental, emitiendo el órgano autonómico competente el Documento de Alcance, en el que se recogen una serie de recomendaciones a incorporar en el POU.\n\nMás tarde, tras la aprobación inicial del documento del POU, que incluye un anexo de Evaluación Ambiental Estratégica, el órgano autonómico competente emite una Declaración Ambiental Estratégica, que pone fin a la tramitación.' },
    { id: 8, pregunta: '¿Qué ocurre mientras se tramita el POU?', respuesta: 'Consulta el estado de la tramitación y la documentación publicada para conocer el avance del plan. El servicio municipal de urbanismo puede informar sobre el planeamiento vigente y su aplicación en cada caso.' },
    { id: 9, pregunta: '¿Dónde puedo obtener más información sobre el POU de mi municipio?', respuesta: 'La información detallada sobre el POU de un municipio específico generalmente está disponible en la página web del ayuntamiento o en la oficina de urbanismo municipal.\n\nUna vez aprobado definitivamente el POU, se publica su normativa en el Boletín Oficial de la Junta de Andalucía (BOJA) y el documento completo se podrá visualizar en la web de la Diputación de Málaga, así como en la web de consulta de planeamiento urbanístico y territorial de la Junta de Andalucía.' },
    { id: 10, pregunta: '¿El POU de mi municipio incorpora la perspectiva de género?', respuesta: 'El POU en su fase de análisis y diagnóstico incorpora cuestiones desde la perspectiva de género, creando propuestas de ordenación que mejoren la calidad de vida de toda la ciudadanía independientemente del género, edad, condición física, social, psicológica…materializado en aspectos referentes a la accesibilidad, la seguridad, el transporte público o la vivienda protegida.' }
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
    actualizarEditorEnriquecido(inputEl.id, valorFinal);
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
function aplicarPlantillaPaso7() {
  /* 1. Nos aseguramos que existe una lista local de preguntas */
  if (!Array.isArray(preguntasAsignadasLocal)) {
    // Si el módulo de FAQs aún no inicializó su array, lo creamos vacío.
    // Esto evita que el render repinte “sin datos” justo después de la plantilla.
    preguntasAsignadasLocal = [];
  }

  /* 2. Añadimos las preguntas de la plantilla (si no estaban ya) */
  (PLANTILLA_WIZARD.paso7 || []).forEach(p => {
    const yaExiste = preguntasAsignadasLocal.some(x => String(x.id) === String(p.id));
    if (!yaExiste) {
      preguntasAsignadasLocal.push({
        id: p.id,
        pregunta: p.pregunta,
        respuesta: p.respuesta,
        existente: true
      });
    }
  });

  /* 3. Mostramos la tabla con las preguntas cargadas */
  if (typeof renderizarTablaFaqs === 'function') {
    // Pintamos usando la fuente de verdad local (preguntasAsignadasLocal)
    renderizarTablaFaqs(preguntasAsignadasLocal);
  }

  /* 4. Preparamos datosWizard[7] con SOLO los IDs de las FAQs */
  if (typeof datosWizard !== 'object' || !datosWizard) {
    // Si por alguna razón aún no existe, lo iniciamos
    datosWizard = {};
  }
  datosWizard[7] = {
    faqs: preguntasAsignadasLocal.map(p => ({ id: p.id }))
  };

  /* 5. Marcamos el paso como listo */
  if (typeof guardarDatosPaso === 'function') {
    guardarDatosPaso(7);
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

  // Paso 3 (fase actual)
  escribirCampoTexto(document.getElementById('fase_padre'), PLANTILLA_WIZARD.paso3.num_fase, modo);

  // Cargamos las subfases antes de seleccionar una. De esta forma el estado
  // propuesto y el selector siempre quedan sincronizados.
  if (window.FasesWizard && typeof window.FasesWizard.cargarSubfases === 'function') {
    await window.FasesWizard.cargarSubfases(
      PLANTILLA_WIZARD.paso3.num_fase,
      PLANTILLA_WIZARD.paso3.subfase_id
    );
  }

  escribirCampoTexto(document.getElementById('estado_tramitacion'), PLANTILLA_WIZARD.paso3.estado_tramitacion, modo);
  escribirCampoTexto(document.getElementById('fecha_inicio'), PLANTILLA_WIZARD.paso3.fecha_inicio, modo);
  if (typeof guardarDatosPaso === 'function') guardarDatosPaso(3);

  // Paso 5 (participación)
  escribirCampoTexto(document.getElementById('titulo1'), PLANTILLA_WIZARD.paso5.titulo1, modo);
  escribirCampoTexto(document.getElementById('titulo2'), PLANTILLA_WIZARD.paso5.titulo2, modo);
  escribirCampoTexto(document.getElementById('descripcion1'), PLANTILLA_WIZARD.paso5.descripcion1, modo);
  escribirCampoTexto(document.getElementById('descripcion2'), PLANTILLA_WIZARD.paso5.descripcion2, modo);
  if (typeof guardarDatosPaso === 'function') guardarDatosPaso(5);

  // Paso 7 (FAQs reutilizables)
  aplicarPlantillaPaso7();

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
