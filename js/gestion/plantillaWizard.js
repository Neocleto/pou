// Contenido de partida del asistente. Se carga solo al aplicar la plantilla.
const PLANTILLA_WIZARD = {
  paso1: {
    buzon_participacion_activo: '1'
  },
  // Textos de Información de los documentos 1.1 y 1.2.
  paso2: {
    sinPlaneamiento: {
      titulo: "Para qué sirve el Plan de Ordenación Urbana",
      descripcion: `
        <p>Un POU es uno de los instrumentos de ordenación urbanística detallada que sirven para establecer las directrices y los objetivos de la planificación del suelo urbano, es decir, el suelo transformado por la edificación o la urbanización.</p>
        <p>Con la legislación anterior, estas determinaciones formaban parte de las Normas Subsidiarias (NNSS) o de los Planes Generales (PGOU) municipales, y ahora, la nueva normativa de aplicación en Andalucía, la denominada LISTA (Ley de Impulso para la Sostenibilidad del Territorio de Andalucía) posibilita la división de la ordenación en dos instrumentos, en función de dos niveles de ordenación, general y detallada.</p>
        <p>Analizando el espacio urbano y diagnosticando los problemas de nuestro entorno debemos diseñar las bases para mejorar la calidad de vida de todas y todos. El POU va a establecer las condiciones de edificación y de uso de las parcelas y las normas de urbanización y diseño de los espacios públicos (calles, parques, plazas…)</p>
        <p>Este municipio no cuenta con ningún instrumento de planeamiento, por lo que carece de directrices que planifiquen la ordenación del núcleo urbano y del conjunto del término municipal.</p>
        <p>Actualmente para desarrollar cualquier actuación en el núcleo, es necesario recurrir a normativas de ámbito provincial, autonómico y estatal. Estas normas, sin embargo, no siempre tienen en cuenta la escala, las características ni las necesidades específicas del núcleo, lo que dificulta su desarrollo, por lo que es imprescindible contar con una normativa específica adaptada a las características y peculiaridades del pueblo.</p>
      `.trim()
    },
    conPlaneamiento: {
      titulo: "¿Por qué es necesario un nuevo Plan de Ordenación Urbana?",
      descripcion: `
        <p>Un POU es uno de los instrumentos de ordenación urbanística detallada que sirven para establecer las directrices y los objetivos de la planificación del suelo urbano, es decir, el suelo transformado por la edificación o la urbanización.</p>
        <p>Con la legislación anterior, estas determinaciones formaban parte de las Normas Subsidiarias (NNSS) o de los Planes Generales (PGOU) municipales, y ahora, la nueva normativa de aplicación en Andalucía, la denominada LISTA (Ley de Impulso para la Sostenibilidad del Territorio de Andalucía) posibilita la división de la ordenación en dos instrumentos, en función de dos niveles de ordenación, general y detallada.</p>
        <p>Este municipio cuenta con unas Normas Subsidiarias del año 1993. El Ayuntamiento ha considerado necesario la revisión de esta normativa y de los objetivos y criterios para la intervención en nuestra localidad, bien para mejorarla, rehabilitarla o regenerarla.</p>
        <p>Analizando el espacio urbano y diagnosticando los problemas de nuestro entorno debemos diseñar las bases para mejorar la calidad de vida de todas y todos. El POU va a establecer las condiciones de edificación y de uso de las parcelas y las normas de urbanización y diseño de los espacios públicos (calles, parques, plazas…)</p>
      `.trim()
    }
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
      <p>La <strong>participación ciudadana</strong> constituye un elemento fundamental en cualquier proceso de elaboración de los instrumentos de ordenación urbanística. Este proceso se concibe como un espacio de diálogo y construcción colectiva en el que se integran los conocimientos, experiencias y expectativas de la población local con la aportación técnica y administrativa del equipo del Servicio de Arquitectura y Planeamiento de la Diputación Provincial de Málaga, responsable de la redacción del documento.</p>
      <p><strong>Las vecinas y vecinos de este municipio sois los protagonistas</strong> en la ciudad, conocéis las virtudes y defectos del pueblo y nos encantaría que nos contárais tanto la problemática que os encontráis en el desarrollo de la vida diaria como cualquier idea que tengáis para mejorarla.</p>
      <p>A través de este proceso participativo se pretende identificar oportunidades, detectar problemáticas y proponer soluciones que, además de ser técnicamente viables, cuenten con el <strong>consenso más amplio posible de la ciudadanía</strong>.</p>
    `.trim()
  },
  // Preguntas del documento 6.1. Las nueve primeras se cargan en ambas variantes.
  // Son textos municipales y no modifican la biblioteca comun de FAQs.
  paso7: [
    { pregunta: "¿Qué es un Plan de Ordenación Urbana (POU)?", respuesta: "El Plan de Ordenación Urbana (POU) es un instrumento de ordenación urbanística detallada para establecer las directrices y los objetivos de la planificación del suelo urbano, es decir, el suelo transformado por la edificación o la urbanización." },
    { pregunta: "¿Cuál es el objetivo del POU?", respuesta: "El objetivo es revisar o redactar la normativa de edificación y de urbanización adaptada a las necesidades del núcleo. Es el momento de revisar los criterios a la hora de intervenir en el suelo urbano, promoviendo un desarrollo urbano sostenible, primando la revitalización y la regeneración de la ciudad existente." },
    { pregunta: "¿De qué manera pueden las personas del municipio implicarse en la participación del POU?", respuesta: "La ciudadanía puede participar desde el inicio en el proceso de elaboración del POU, donde se plantea un plan específico de participación pública que recoge acciones como encuestas, reuniones vecinales, buzones de sugerencias, sesiones informativas, herramientas digitales y mecanismos de retroalimentación continua.\n\nAdemás, tras la aprobación de los distintos documentos, se abrirán los periodos marcados por la normativa para la presentación de sugerencias sobre el contenido del documento de Avance que se publique, y alegaciones sobre el documento de Aprobación Inicial." },
    { pregunta: "¿Cómo influye el POU en la ciudadanía?", respuesta: "La aprobación del POU proporciona un marco normativo urbanístico que dota de seguridad jurídica a toda la ciudadanía. Establece qué es lo que se va a poder construir en las nuestras parcelas, cómo va a ser el diseño de nuestro espacio público. Del mismo modo, identifica las actuaciones a acometer para mejorar la calidad de vida de los residentes proponiendo actuaciones urbanísticas y de transformación urbanística, nuevos servicios e infraestructuras, nuevas dotaciones y espacios destinados a la conservación de áreas naturales y culturales." },
    { pregunta: "¿Tiene en cuenta el POU el entorno natural del núcleo y su desarrollo sostenible?", respuesta: "Sí, una parte fundamental del POU es la integración de políticas de sostenibilidad y protección ambiental, incluyendo la gestión de recursos naturales y la mitigación de impactos medioambientales.\n\nLa aprobación del POU conlleva una doble tramitación: urbanística y ambiental. Los documentos ambientales también se podrán consultar en las diferentes fases de exposición pública:\n\n- En el documento de Avance se elabora de manera paralela el Documento Inicial Estratégico (DIE), que inicia el procedimiento ambiental, emitiendo el órgano autonómico competente el Documento de Alcance, en el que se recogen una serie de recomendaciones a incorporar en el POU.\n\n- Tras la Aprobación Inicial del documento del POU, que incluye un anexo de Evaluación Ambiental Estratégica (EAE), el órgano autonómico competente emite una Declaración Ambiental Estratégica, que pone fin a la tramitación ambiental." },
    { pregunta: "¿Qué ámbito territorial regula el POU?", respuesta: "El POU regula el suelo urbano, que es el escenario de nuestra vida diaria. Comprende el núcleo de nuestro pueblo —con sus casas, parques, plazas y equipamientos— además de los solares y espacios vacíos colindantes." },
    { pregunta: "¿El POU de mi municipio incorpora la perspectiva de género?", respuesta: "El POU incorpora la perspectiva de género, lo que significa que se incorporan propuestas de ordenación que mejoran la calidad de vida de toda la ciudadanía independientemente del género, edad, condición física, social, psicológica… materializado en aspectos referentes a la accesibilidad, la seguridad, el transporte público o la vivienda protegida." },
    { pregunta: "¿Quién es el equipo encargado de realizar el POU?", respuesta: "El POU es elaborado por técnicos especializados del Servicio de Arquitectura y Urbanismo de la Diputación de Málaga, con la participación pública de la ciudadanía y la supervisión técnica y jurídica municipal y autonómica, para su posterior aprobación por la corporación municipal." },
    { pregunta: "¿Cómo acceder a la información sobre el POU en mi municipio?", respuesta: "La información detallada sobre el POU de un núcleo específico generalmente está disponible en la página web del ayuntamiento o en la oficina de urbanismo municipal.\n\nUna vez aprobado definitivamente el POU, se publica su normativa en el Boletín Oficial de la Junta de Andalucía (BOJA) y el documento completo se podrá visualizar en la web de la Diputación de Málaga, así como en la web de consulta de planeamiento urbanístico y territorial de la Junta de Andalucía." },
    { pregunta: "¿Qué consecuencias tiene que el municipio no tenga un POU?", respuesta: "De forma general, los municipios sin planeamiento se rigen por la planificación territorial y la legislación sectorial, así como la normativa en materia urbanística de escala provincial, autonómica o estatal. Por tanto, carece de una normativa que dé respuesta a las necesidades particulares de cada pueblo, identificando actuaciones necesarias para mejorar la calidad de vida de la ciudadanía, la obtención de nuevos espacios públicos y la aplicación de las medidas necesarias para conservar los valores ambientales, paisajísticos y culturales de nuestro entorno próximo." }
  ]
};

/** Sustituye el valor del campo y sincroniza CKEditor cuando corresponde. */
function escribirCampoPlantilla(id, valor) {
  const campo = document.getElementById(id);
  if (campo.dataset.richEditor === '1') {
    actualizarEditorEnriquecido(campo, valor);
  } else {
    campo.value = valor;
  }
}

/** Prepara las opciones de fase fuera del formulario. Un fallo deja el borrador intacto. */
async function prepararFasePlantilla(selectorFase, selectorSubfase) {
  const { num_fase, codigo_subfase } = PLANTILLA_WIZARD.paso3;
  const fases = selectorFase.cloneNode(true);
  const subfases = selectorSubfase.cloneNode(false);

  fases.value = num_fase;
  if (fases.value !== num_fase) {
    await cargarFasesPadre(num_fase, fases);
  }
  if (fases.value !== num_fase) {
    throw new Error('No se ha podido cargar la fase inicial.');
  }

  await cargarSubfases(num_fase, null, subfases);
  const subfase = Array.from(subfases.options).find(function (opcion) {
    const etiqueta = opcion.textContent.trim();
    return etiqueta === codigo_subfase || etiqueta.startsWith(codigo_subfase + ' ');
  });
  if (!subfase || !subfase.value) {
    throw new Error('No se ha podido cargar la subfase inicial.');
  }

  selectorFase.replaceChildren(...fases.options);
  selectorFase.disabled = false;
  selectorFase.value = num_fase;
  selectorSubfase.replaceChildren(...subfases.options);
  selectorSubfase.disabled = false;
  selectorSubfase.value = subfase.value;
}

/** Sustituye las preguntas del municipio con la variante elegida. */
function aplicarPreguntasPlantilla(tienePlaneamiento) {
  // En el POU, la décima pregunta se incorpora al elegir Sí.
  const preguntas = tienePlaneamiento ? PLANTILLA_WIZARD.paso7 : PLANTILLA_WIZARD.paso7.slice(0, 9);
  preguntasAsignadasLocal = preguntas.map(function (faq, indice) {
    return {
      id: 'plantilla_' + (indice + 1),
      asignacion_id: null,
      pregunta_id: null,
      pregunta: faq.pregunta,
      respuesta: faq.respuesta,
      pregunta_base: faq.pregunta,
      respuesta_base: faq.respuesta,
      es_exclusiva: true
    };
  });
  renderizarTablaFaqs(preguntasAsignadasLocal);
}

/** Rellena el asistente. Guardar confirma los datos, el diseño y el índice juntos. */
async function aplicarPlantilla(tienePlaneamiento) {
  await prepararFasePlantilla(
    document.getElementById('fase_padre'),
    document.getElementById('subfase_id')
  );

  // Del paso 1 la plantilla solo define el estado del buzón.
  document.getElementById('buzon_participacion_activo').checked =
    PLANTILLA_WIZARD.paso1.buzon_participacion_activo === '1';

  const informacion = tienePlaneamiento
    ? PLANTILLA_WIZARD.paso2.conPlaneamiento
    : PLANTILLA_WIZARD.paso2.sinPlaneamiento;
  escribirCampoPlantilla('titulo', informacion.titulo);
  escribirCampoPlantilla('descripcion', informacion.descripcion);

  escribirCampoPlantilla('estado_tramitacion', PLANTILLA_WIZARD.paso3.estado_tramitacion);
  escribirCampoPlantilla('fecha_inicio', PLANTILLA_WIZARD.paso3.fecha_inicio());

  escribirCampoPlantilla('titulo1', PLANTILLA_WIZARD.paso5.titulo1);
  escribirCampoPlantilla('descripcion1', PLANTILLA_WIZARD.paso5.descripcion1);
  aplicarPreguntasPlantilla(tienePlaneamiento);

  for (const paso of [1, 2, 3, 5, 7]) {
    guardarDatosPaso(paso);
  }
  plantillaPendiente = true;
  actualizarEstadoBotonGuardar();
}

// La respuesta elige la variante. Cancelar deja el borrador intacto.
document.getElementById('btnCargarPlantilla')?.addEventListener('click', async function () {
  const formulario = document.querySelector('.wizard-paso[data-step="1"] form');
  if (!formulario || cargandoEdicion || !modalWizardLoader.classList.contains('hidden')) return;
  if (!formulario.checkValidity() || !validarPaso(1)) {
    currentStep = 1;
    updateWizard();
    formulario.reportValidity();
    return;
  }

  const resultado = await Swal.fire({
    title: '¿Este municipio tiene planeamiento vigente?',
    text: 'La plantilla sustituirá los textos de información y participación, la fase, el estado del buzón, las preguntas frecuentes, el diseño y los accesos. Pulsa Guardar para aplicar los cambios y crear los botones de participación si el municipio todavía no tiene ninguno.',
    icon: 'warning',
    showDenyButton: true,
    showCancelButton: true,
    confirmButtonText: 'Sí',
    denyButtonText: 'No',
    cancelButtonText: 'Cancelar',
    customClass: {
      confirmButton: 'btn btn-primary me-2',
      denyButton: 'btn btn-outline-primary me-2',
      cancelButton: 'btn btn-secondary'
    },
    buttonsStyling: false
  });
  if (!resultado.isConfirmed && !resultado.isDenied) return;

  mostrarSpinnerModal();
  try {
    await aplicarPlantilla(resultado.isConfirmed);
  } catch (error) {
    Swal.fire('No se pudo aplicar la plantilla', error.message, 'error');
  } finally {
    ocultarSpinnerModal();
    actualizarEstadoBotonGuardar();
  }
});
