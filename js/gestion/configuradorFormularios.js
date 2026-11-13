/**
 * Formularios del configurador: listado, edición, plantillas y guardado.
 * Depende del estado y los campos comunes de configuradorPortal.js.
 */

/**
 * Dibuja el listado o el editor de formularios dinámicos.
 */
function renderPanelFormularios() {
    establecerCabeceraPanel('Formularios y encuestas', 'Crea encuestas online, ofrece un PDF o combina las dos opciones.');

    if (estadoPortal.formularioActual) {
        renderEditorFormulario();
        return;
    }

    const filas = estadoPortal.formularios.map(function (formulario) {
        const modalidad = obtenerTextoModalidad(formulario.modalidad);
        const respuestas = Number(formulario.total_respuestas || 0);

        return `
            <article class="portal-form-list__item" data-form-id="${Number(formulario.id)}">
                ${formulario.icono ? `
                    <span class="portal-form-list__icon" style="--form-color:${escaparHtml(formulario.color || estadoPortal.configuracion.color_primario || '#540000')}">
                        <i class="bi bi-${escaparHtml(formulario.icono)}"></i>
                    </span>` : ''}
                <span class="portal-form-list__copy">
                    <strong>${escaparHtml(formulario.titulo)}</strong>
                    <small>${modalidad} · ${respuestas} respuestas · ${convertirBooleano(formulario.activo, false) ? 'Publicado' : 'Borrador'}</small>
                </span>
                <span class="portal-form-list__actions">
                    <button type="button" class="portal-small-button" data-action="edit-form" data-id="${Number(formulario.id)}" title="Editar">
                        <i class="bi bi-pencil"></i>
                    </button>
                    <button type="button" class="portal-small-button is-danger" data-action="delete-form" data-id="${Number(formulario.id)}" data-responses="${respuestas}" title="Eliminar o archivar">
                        <i class="bi bi-trash"></i>
                    </button>
                </span>
            </article>
        `;
    }).join('');

    document.getElementById('contenidoPanelConfigurador').innerHTML = `
        ${crearTarjetaConfiguracion(
            'Formularios del municipio',
            'La ciudadanía podrá responder desde la página pública.',
            `<div class="portal-form-builder-toolbar">
                <div class="btn-group">
                    <button type="button" class="btn btn-primary btn-sm" data-action="new-form">
                        <i class="bi bi-plus-circle me-1"></i>Nuevo formulario
                    </button>
                    <button type="button" class="btn btn-outline-primary btn-sm" data-action="template-child">
                        Plantilla infantil
                    </button>
                    <button type="button" class="btn btn-outline-primary btn-sm" data-action="template-general">
                        Plantilla general
                    </button>
                </div>
            </div>
            <div class="portal-form-list">${filas || crearVacio('Aún no hay formularios. Crea el primero desde cero o usa una plantilla.')}</div>`
        )}
    `;
    cambiarModoVistaPrevia(estadoPortal.formularioActual ? 'formulario' : 'portal');
}

/**
 * Crea la estructura mínima de un formulario nuevo.
 */
function crearFormularioVacioPortal() {
    return {
        id: null,
        titulo: '',
        descripcion: '',
        slug: '',
        icono: 'clipboard-check',
        color: estadoPortal.configuracion.color_primario || '#540000',
        modalidad: 'online',
        pdf_url: '',
        texto_boton_online: 'Realizar encuesta online',
        texto_boton_pdf: 'Descargar encuesta en PDF',
        mensaje_confirmacion: 'Gracias por participar. Tu respuesta se ha registrado correctamente.',
        activo: true,
        secciones: [
            {
                titulo: 'Datos generales',
                descripcion: '',
                preguntas: []
            }
        ]
    };
}

/**
 * Crea una pregunta nueva con valores fáciles de modificar.
 */
function crearPreguntaVaciaPortal() {
    return {
        enunciado: 'Nueva pregunta',
        ayuda: '',
        tipo: 'texto',
        obligatorio: false,
        ancho: 'completo',
        opciones: []
    };
}

/**
 * Abre un formulario existente desde el servidor.
 */
async function abrirFormularioParaEditar(idFormulario) {
    try {
        const datos = await solicitarJson(
            `php/gestion/formularios_dinamicos/acciones_formularios.php?accion=obtener&cod_mun=${encodeURIComponent(estadoPortal.codMun)}&id=${encodeURIComponent(idFormulario)}`
        );

        estadoPortal.formularioActual = normalizarFormularioPortal(datos.formulario);
        renderEditorFormulario();
    } catch (error) {
        Swal.fire('No se pudo abrir el formulario', error.message, 'error');
    }
}

/**
 * Dibuja el formulario completo en una sola pantalla desplazable.
 * Se evita un asistente dentro de otro asistente para reducir la complejidad.
 */
function renderEditorFormulario() {
    const formulario = estadoPortal.formularioActual;
    const ofreceFormularioOnline = formulario.modalidad !== 'pdf';
    const ofreceDocumentoPdf = formulario.modalidad === 'pdf'
        || formulario.modalidad === 'ambos';

    establecerCabeceraPanel(
        formulario.id ? 'Editar formulario' : 'Nuevo formulario',
        'Completa los datos básicos y añade apartados y preguntas.'
    );

    const secciones = formulario.secciones.map(function (seccion, indiceSeccion) {
        return crearEditorSeccionFormulario(seccion, indiceSeccion);
    }).join('');

    // El PDF solo se pide cuando la modalidad elegida lo va a mostrar.
    const campoPdf = ofreceDocumentoPdf
        ? `<div class="portal-config-field" style="grid-column:1/-1">
                <label>Documento PDF imprimible</label>
                <div class="input-group">
                    <input
                        class="form-control"
                        data-form-field="pdf_url"
                        value="${escaparHtml(formulario.pdf_url || '')}"
                        placeholder="No hay PDF seleccionado"
                        readonly>
                    <button
                        type="button"
                        class="btn btn-outline-primary"
                        data-action="upload-form-pdf">
                        <i class="bi bi-upload me-1"></i>
                        Subir PDF
                    </button>
                </div>
                <input
                    type="file"
                    class="d-none"
                    data-form-pdf-input
                    accept="application/pdf,.pdf">
                <div class="portal-config-help">Archivo PDF de hasta 8 MB.</div>
           </div>`
        : '';

    const campoTextoOnline = ofreceFormularioOnline
        ? crearCampoTextoFormulario(
            'Texto del botón online',
            'texto_boton_online',
            formulario.texto_boton_online || ''
        )
        : '';

    const campoTextoPdf = ofreceDocumentoPdf
        ? crearCampoTextoFormulario(
            'Texto del botón PDF',
            'texto_boton_pdf',
            formulario.texto_boton_pdf || ''
        )
        : '';

    const campoConfirmacion = ofreceFormularioOnline
        ? `<div class="portal-config-field" style="grid-column:1/-1">
                <label>Mensaje después de enviar</label>
                <input
                    class="form-control"
                    data-form-field="mensaje_confirmacion"
                    value="${escaparHtml(formulario.mensaje_confirmacion || '')}">
           </div>`
        : '';

    const constructorPreguntas = ofreceFormularioOnline
        ? `<div class="portal-form-builder-toolbar">
                <div>
                    <strong>Apartados y preguntas</strong>
                    <div class="portal-config-help">
                        Organiza el formulario por temas para que sea fácil de responder.
                    </div>
                </div>
                <button
                    type="button"
                    class="btn btn-outline-primary btn-sm"
                    data-action="add-form-section">
                    <i class="bi bi-plus-circle me-1"></i>
                    Añadir apartado
                </button>
           </div>

           <div id="constructorFormularioPortal">
                ${secciones || crearVacio('Añade un apartado para comenzar.')}
           </div>`
        : `<div class="alert alert-light border mt-3 mb-0">
                <i class="bi bi-file-earmark-pdf text-danger me-1"></i>
                Esta modalidad solo publica el documento PDF. No necesita preguntas online.
           </div>`;

    document.getElementById('contenidoPanelConfigurador').innerHTML = `
        <div class="portal-form-builder-toolbar">
            <button
                type="button"
                class="btn btn-outline-secondary btn-sm"
                data-action="cancel-form">
                <i class="bi bi-arrow-left me-1"></i>
                Volver al listado
            </button>

            <button
                type="button"
                class="btn btn-success btn-sm"
                data-action="save-form">
                <i class="bi bi-check2-circle me-1"></i>
                Guardar formulario
            </button>
        </div>

        ${crearTarjetaConfiguracion(
            'Datos básicos',
            'Define el título, la descripción y la forma de participación.',
            `<div class="portal-config-grid">
                ${crearCampoTextoFormulario(
                    'Título',
                    'titulo',
                    formulario.titulo,
                    'Ej: Encuesta inicial de participación'
                )}

                ${crearCampoSeleccionFormulario(
                    'Modalidad',
                    'modalidad',
                    formulario.modalidad,
                    [
                        ['online', 'Solo formulario online'],
                        ['pdf', 'Solo documento PDF'],
                        ['ambos', 'Formulario online y PDF']
                    ]
                )}

                <div class="portal-config-field" style="grid-column:1/-1">
                    <label>Descripción</label>
                    <textarea
                        class="form-control"
                        rows="3"
                        data-form-field="descripcion">${escaparHtml(formulario.descripcion || '')}</textarea>
                </div>

                ${crearCampoColorFormulario(
                    'Color de la encuesta',
                    'color',
                    formulario.color || estadoPortal.configuracion.color_primario || '#540000'
                )}
                ${crearCampoIcono('Icono de la encuesta', 'icono', formulario.icono ?? 'clipboard-check', 'data-form-field')}

                ${campoPdf}
            </div>`
        )}

        ${crearTarjetaConfiguracion(
            'Opciones de publicación',
            'Ajustes menos habituales que puedes dejar con sus valores iniciales.',
            `<details class="portal-config-advanced">
                <summary>
                    <span><i class="bi bi-sliders me-1"></i>Mostrar opciones avanzadas</span>
                    <small>Textos de los botones y mensaje final</small>
                </summary>

                <div class="portal-config-grid portal-config-advanced__body">
                    ${campoTextoOnline}
                    ${campoTextoPdf}
                    ${campoConfirmacion}
                    <div class="portal-config-field" style="grid-column:1/-1">
                        <div class="form-check form-switch mt-2">
                            <input
                                class="form-check-input"
                                type="checkbox"
                                id="formularioPublicado"
                                data-form-field="activo"
                                ${convertirBooleano(formulario.activo, true) ? 'checked' : ''}>
                            <label class="form-check-label" for="formularioPublicado">
                                Publicar en la página del municipio
                            </label>
                        </div>
                    </div>
                </div>
            </details>`
        )}

        ${constructorPreguntas}
    `;
    cambiarModoVistaPrevia('formulario');
    renderizarVistaPreviaFormulario();
}

/**
 * Dibuja un apartado y todas sus preguntas.
 */
function crearEditorSeccionFormulario(seccion, indiceSeccion) {
    const preguntas = (seccion.preguntas || []).map(function (pregunta, indicePregunta) {
        return crearEditorPreguntaFormulario(pregunta, indiceSeccion, indicePregunta);
    }).join('');

    return `
        <section class="portal-form-builder-section" data-form-section="${indiceSeccion}">
            <div class="portal-repeater-item__heading">
                <strong>Apartado ${indiceSeccion + 1}</strong>
                <span class="portal-repeater-item__actions">
                    <button type="button" class="portal-small-button" data-action="move-form-section-up" data-section="${indiceSeccion}" title="Subir"><i class="bi bi-arrow-up"></i></button>
                    <button type="button" class="portal-small-button" data-action="move-form-section-down" data-section="${indiceSeccion}" title="Bajar"><i class="bi bi-arrow-down"></i></button>
                    <button type="button" class="portal-small-button is-danger" data-action="remove-form-section" data-section="${indiceSeccion}" title="Eliminar"><i class="bi bi-trash"></i></button>
                </span>
            </div>

            <div class="portal-config-grid">
                ${crearCampoTextoFormulario('Título del apartado', `secciones.${indiceSeccion}.titulo`, seccion.titulo || '')}
                ${crearCampoTextoFormulario('Descripción', `secciones.${indiceSeccion}.descripcion`, seccion.descripcion || '')}
            </div>

            <div class="mt-3">
                ${preguntas || '<div class="portal-config-help">Este apartado todavía no tiene preguntas.</div>'}
            </div>

            <button type="button" class="btn btn-outline-primary btn-sm mt-2" data-action="add-form-question" data-section="${indiceSeccion}">
                <i class="bi bi-plus-circle me-1"></i>Añadir pregunta
            </button>
        </section>
    `;
}

/**
 * Dibuja una pregunta editable.
 */
function crearEditorPreguntaFormulario(pregunta, indiceSeccion, indicePregunta) {
    const rutaBase = `secciones.${indiceSeccion}.preguntas.${indicePregunta}`;
    const necesitaOpciones = ['opcion_unica', 'opcion_multiple', 'desplegable'].includes(pregunta.tipo);

    return `
        <article class="portal-form-builder-question" data-form-question="${indicePregunta}">
            <div class="portal-repeater-item__heading">
                <strong>Pregunta ${indicePregunta + 1}</strong>
                <span class="portal-repeater-item__actions">
                    <button type="button" class="portal-small-button" data-action="move-form-question-up" data-section="${indiceSeccion}" data-question="${indicePregunta}" title="Subir"><i class="bi bi-arrow-up"></i></button>
                    <button type="button" class="portal-small-button" data-action="move-form-question-down" data-section="${indiceSeccion}" data-question="${indicePregunta}" title="Bajar"><i class="bi bi-arrow-down"></i></button>
                    <button type="button" class="portal-small-button is-danger" data-action="remove-form-question" data-section="${indiceSeccion}" data-question="${indicePregunta}" title="Eliminar"><i class="bi bi-trash"></i></button>
                </span>
            </div>

            <div class="portal-config-grid">
                ${crearCampoTextoFormulario('Pregunta', `${rutaBase}.enunciado`, pregunta.enunciado || '')}
                ${crearCampoSeleccionFormulario('Tipo de respuesta', `${rutaBase}.tipo`, pregunta.tipo || 'texto', [
                    ['texto', 'Texto corto'],
                    ['texto_largo', 'Texto largo'],
                    ['numero', 'Número'],
                    ['fecha', 'Fecha'],
                    ['si_no', 'Sí / No'],
                    ['opcion_unica', 'Una opción'],
                    ['opcion_multiple', 'Varias opciones'],
                    ['desplegable', 'Lista desplegable']
                ])}
                ${crearCampoTextoFormulario('Texto de ayuda', `${rutaBase}.ayuda`, pregunta.ayuda || '', 'Opcional')}
                ${crearCampoSeleccionFormulario('Ancho', `${rutaBase}.ancho`, pregunta.ancho || 'completo', [
                    ['completo', 'Fila completa'],
                    ['medio', 'Media fila']
                ])}
                ${necesitaOpciones ? `
                    <div class="portal-config-field" style="grid-column:1/-1">
                        <label>Opciones, una por línea</label>
                        <textarea class="form-control" rows="4" data-form-options="${rutaBase}.opciones">${escaparHtml((pregunta.opciones || []).join('\n'))}</textarea>
                    </div>
                ` : ''}
                <div class="portal-config-field" style="grid-column:1/-1">
                    <div class="form-check form-switch mt-1">
                        <input class="form-check-input" type="checkbox" id="obligatoria_${indiceSeccion}_${indicePregunta}" data-form-field="${rutaBase}.obligatorio" ${pregunta.obligatorio ? 'checked' : ''}>
                        <label class="form-check-label" for="obligatoria_${indiceSeccion}_${indicePregunta}">Respuesta obligatoria</label>
                    </div>
                </div>
            </div>
        </article>
    `;
}

/**
 * Mueve, elimina o añade elementos dentro del formulario actual.
 */
function modificarSeccionFormulario(boton) {
    const accion = boton.dataset.action;
    const indiceSeccion = Number(boton.dataset.section);
    const secciones = estadoPortal.formularioActual.secciones;

    if (accion === 'add-form-section') {
        return;
    }

    if (accion === 'remove-form-section') {
        secciones.splice(indiceSeccion, 1);
    }

    if (accion === 'move-form-section-up') {
        moverElemento(secciones, indiceSeccion, -1);
    }

    if (accion === 'move-form-section-down') {
        moverElemento(secciones, indiceSeccion, 1);
    }

    renderEditorFormulario();
}

/**
 * Mueve, elimina o añade preguntas dentro de un apartado.
 */
function modificarPreguntaFormulario(boton) {
    const accion = boton.dataset.action;
    const indiceSeccion = Number(boton.dataset.section);
    const indicePregunta = Number(boton.dataset.question);
    const preguntas = estadoPortal.formularioActual.secciones[indiceSeccion]?.preguntas;

    if (!preguntas) {
        return;
    }

    if (accion === 'add-form-question') {
        preguntas.push(crearPreguntaVaciaPortal());
    }

    if (accion === 'remove-form-question') {
        preguntas.splice(indicePregunta, 1);
    }

    if (accion === 'move-form-question-up') {
        moverElemento(preguntas, indicePregunta, -1);
    }

    if (accion === 'move-form-question-down') {
        moverElemento(preguntas, indicePregunta, 1);
    }

    renderEditorFormulario();
}

/**
 * Sube el PDF asociado al formulario que se está editando.
 * El archivo se guarda en el servidor, pero la ruta no se persiste hasta
 * pulsar "Guardar formulario".
 */
async function subirPdfFormularioPortal(archivo) {
    if (!archivo || !estadoPortal.formularioActual) {
        return;
    }

    const datos = new FormData();
    datos.append('cod_mun', estadoPortal.codMun);
    datos.append('archivo', archivo);

    try {
        const resultado = await solicitarJson(
            'php/gestion/formularios_dinamicos/subir_pdf_formulario.php',
            {
                method: 'POST',
                body: datos
            }
        );

        estadoPortal.formularioActual.pdf_url = resultado.url;
        renderEditorFormulario();

        Swal.fire({
            icon: 'success',
            title: 'PDF preparado',
            text: 'Guarda el formulario para conservar la ruta del documento.',
            timer: 1600,
            showConfirmButton: false
        });
    } catch (error) {
        Swal.fire('No se pudo subir el PDF', error.message, 'error');
    }
}

/**
 * Comprueba que el formulario contiene los datos mínimos para publicarse.
 *
 * La función no modifica el formulario. Solo devuelve un mensaje cuando
 * encuentra un problema y una cadena vacía cuando todo es correcto.
 *
 * @param {Object} formulario Formulario que se está editando.
 * @returns {string} Mensaje de validación o cadena vacía.
 */
function validarFormularioPortal(formulario) {
    if (!formulario.titulo.trim()) {
        return 'Escribe un título para el formulario.';
    }

    // Las modalidades que ofrecen descarga necesitan un PDF ya subido.
    const necesitaPdf = formulario.modalidad === 'pdf'
        || formulario.modalidad === 'ambos';

    if (necesitaPdf && !String(formulario.pdf_url || '').trim()) {
        return 'Sube el documento PDF antes de guardar esta modalidad.';
    }

    // Un recurso exclusivamente PDF no necesita apartados ni preguntas.
    if (formulario.modalidad === 'pdf') {
        return '';
    }

    if (!formulario.secciones.length) {
        return 'Añade al menos un apartado.';
    }

    let totalPreguntas = 0;

    for (const seccion of formulario.secciones) {
        if (!String(seccion.titulo || '').trim()) {
            return 'Todos los apartados necesitan un título.';
        }

        const preguntas = Array.isArray(seccion.preguntas)
            ? seccion.preguntas
            : [];

        totalPreguntas += preguntas.length;

        for (const pregunta of preguntas) {
            if (!String(pregunta.enunciado || '').trim()) {
                return 'Todas las preguntas necesitan un enunciado.';
            }

            const necesitaOpciones = [
                'opcion_unica',
                'opcion_multiple',
                'desplegable'
            ].includes(pregunta.tipo);

            if (necesitaOpciones && (!pregunta.opciones || pregunta.opciones.length < 2)) {
                return 'Las preguntas de opciones necesitan al menos dos respuestas posibles.';
            }
        }
    }

    if (formulario.modalidad !== 'pdf' && totalPreguntas === 0) {
        return 'Añade al menos una pregunta para la modalidad online.';
    }

    return '';
}

/**
 * Cambia el aspecto del botón de guardado mientras se envían los datos.
 * Esto evita dobles clics y deja claro que la operación sigue en curso.
 *
 * @param {boolean} guardando Indica si la petición está activa.
 */
function mostrarGuardadoFormularioPortal(guardando) {
    const boton = document.querySelector('[data-action="save-form"]');

    if (!boton) {
        return;
    }

    boton.disabled = guardando;
    boton.innerHTML = guardando
        ? '<span class="spinner-border spinner-border-sm me-1"></span>Guardando'
        : '<i class="bi bi-check2-circle me-1"></i>Guardar formulario';
}

/**
 * Valida y guarda el formulario dinámico actual.
 */
async function guardarFormularioPortal() {
    const formulario = estadoPortal.formularioActual;
    const mensajeValidacion = validarFormularioPortal(formulario);

    if (mensajeValidacion) {
        Swal.fire('Revisa el formulario', mensajeValidacion, 'warning');
        return;
    }

    mostrarGuardadoFormularioPortal(true);

    try {
        const resultado = await solicitarJson(
            `php/gestion/formularios_dinamicos/acciones_formularios.php?accion=guardar&cod_mun=${encodeURIComponent(estadoPortal.codMun)}`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(formulario)
            }
        );

        // Guardamos el identificador devuelto por el servidor. Si una recarga del
        // listado falla, el formulario sigue sabiendo que ya existe en BBDD.
        estadoPortal.formularioActual.id = Number(resultado.id || 0) || null;

        const datos = await solicitarJson(
            `php/gestion/formularios_dinamicos/acciones_formularios.php?accion=listar&cod_mun=${encodeURIComponent(estadoPortal.codMun)}`
        );

        estadoPortal.formularios = datos.formularios || [];
        estadoPortal.formularioActual = null;

        renderMenuConfigurador();
        renderPanelFormularios();
        recargarIframePortal();

        Swal.fire({
            icon: 'success',
            title: 'Formulario guardado',
            timer: 1300,
            showConfirmButton: false
        });
    } catch (error) {
        Swal.fire('No se pudo guardar el formulario', error.message, 'error');
    } finally {
        mostrarGuardadoFormularioPortal(false);
    }
}

/**
 * Elimina un formulario vacío o archiva uno que ya contiene respuestas.
 */
async function eliminarFormularioPortal(idFormulario, totalRespuestas) {
    const tieneRespuestas = totalRespuestas > 0;
    const confirmacion = await Swal.fire({
        title: tieneRespuestas ? '¿Archivar formulario?' : '¿Eliminar formulario?',
        text: tieneRespuestas
            ? 'Las respuestas se conservarán y el formulario dejará de publicarse.'
            : 'El formulario se eliminará definitivamente.',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: tieneRespuestas ? 'Archivar' : 'Eliminar',
        cancelButtonText: 'Cancelar'
    });

    if (!confirmacion.isConfirmed) {
        return;
    }

    try {
        const datos = new URLSearchParams({
            accion: 'eliminar',
            cod_mun: estadoPortal.codMun,
            id: String(idFormulario)
        });

        await solicitarJson(
            'php/gestion/formularios_dinamicos/acciones_formularios.php',
            {
                method: 'POST',
                body: datos
            }
        );

        const listado = await solicitarJson(
            `php/gestion/formularios_dinamicos/acciones_formularios.php?accion=listar&cod_mun=${encodeURIComponent(estadoPortal.codMun)}`
        );

        estadoPortal.formularios = listado.formularios || [];
        renderMenuConfigurador();
        renderPanelFormularios();
        recargarIframePortal();
    } catch (error) {
        Swal.fire('No se pudo actualizar el formulario', error.message, 'error');
    }
}

/**
 * Genera un campo de texto enlazado al formulario que se está editando.
 */
function crearCampoTextoFormulario(etiqueta, ruta, valor, placeholder) {
    return `
        <div class="portal-config-field">
            <label>${escaparHtml(etiqueta)}</label>
            <input class="form-control" data-form-field="${ruta}" value="${escaparHtml(valor)}" placeholder="${escaparHtml(placeholder || '')}">
        </div>
    `;
}

/**
 * Genera un selector enlazado al formulario que se está editando.
 */
function crearCampoSeleccionFormulario(etiqueta, ruta, valor, opciones) {
    return `
        <div class="portal-config-field">
            <label>${escaparHtml(etiqueta)}</label>
            <select class="form-select" data-form-field="${ruta}">
                ${opciones.map(function (opcion) {
                    return `<option value="${opcion[0]}" ${opcion[0] === valor ? 'selected' : ''}>${escaparHtml(opcion[1])}</option>`;
                }).join('')}
            </select>
        </div>
    `;
}

/**
 * Genera el selector de color identificativo de un formulario.
 */
function crearCampoColorFormulario(etiqueta, ruta, valor) {
    return crearSelectorColorPortal(etiqueta, 'data-form-field', ruta, valor);
}

/**
 * Normaliza los booleanos de un formulario devuelto por PostgreSQL.
 * También garantiza que secciones, preguntas y opciones sean arrays.
 */
function normalizarFormularioPortal(formulario) {
    const resultado = JSON.parse(JSON.stringify(formulario || crearFormularioVacioPortal()));

    resultado.activo = convertirBooleano(resultado.activo, true);
    resultado.secciones = Array.isArray(resultado.secciones) ? resultado.secciones : [];

    resultado.secciones.forEach(function (seccion) {
        seccion.preguntas = Array.isArray(seccion.preguntas) ? seccion.preguntas : [];

        seccion.preguntas.forEach(function (pregunta) {
            pregunta.obligatorio = convertirBooleano(pregunta.obligatorio, false);
            pregunta.opciones = Array.isArray(pregunta.opciones) ? pregunta.opciones : [];
            pregunta.ancho = pregunta.ancho || 'completo';
            pregunta.tipo = pregunta.tipo || 'texto';
        });
    });

    return resultado;
}

/**
 * Devuelve una etiqueta legible para la modalidad del formulario.
 */
function obtenerTextoModalidad(modalidad) {
    if (modalidad === 'ambos') {
        return 'Online y PDF';
    }

    if (modalidad === 'pdf') {
        return 'Solo PDF';
    }

    return 'Formulario online';
}

/**
 * Crea una encuesta infantil editable basada en el documento de ejemplo.
 */
function crearPlantillaInfantilPortal() {
    const formulario = crearFormularioVacioPortal();

    formulario.titulo = 'Encuesta infantil para el Plan';
    formulario.descripcion = 'Encuesta anónima para conocer cómo viven y cómo imaginan el futuro del municipio las niñas y los niños.';
    formulario.icono = 'pou-encuesta-infantil';
    formulario.color = estadoPortal.configuracion.color_primario;
    // La plantilla se puede guardar inmediatamente como formulario online.
    // El usuario podrá activar la descarga PDF cuando suba el documento.
    formulario.modalidad = 'online';
    formulario.secciones = [
        {
            titulo: 'Sobre ti',
            descripcion: 'Datos generales de la persona que participa.',
            preguntas: [
                crearPreguntaPlantilla('¿Cuántos años tienes?', 'numero', true),
                crearPreguntaOpcionesPlantilla(
                    '¿Vives en el pueblo o vienes de vacaciones?',
                    'opcion_unica',
                    ['Vivo en el pueblo', 'Vengo de vacaciones'],
                    true
                )
            ]
        },
        {
            titulo: 'Moverse y jugar',
            descripcion: 'Movilidad, seguridad y espacios públicos.',
            preguntas: [
                crearPreguntaOpcionesPlantilla(
                    '¿Cómo vas al colegio?',
                    'opcion_unica',
                    ['En coche', 'Andando', 'De otra manera']
                ),
                crearPreguntaPlantilla('¿Qué cambiarías para que las calles fueran más agradables?', 'texto_largo'),
                crearPreguntaPlantilla('¿Cómo mejorarías la plaza o el parque?', 'texto_largo')
            ]
        },
        {
            titulo: 'Lo verde y el paisaje',
            descripcion: 'Árboles, sombra, campo y futuro del municipio.',
            preguntas: [
                crearPreguntaOpcionesPlantilla('¿Al pueblo le faltan zonas de sombra?', 'si_no'),
                crearPreguntaPlantilla('¿Qué es lo que más te gusta del pueblo?', 'texto_largo'),
                crearPreguntaPlantilla('Escribe cómo te gustaría que fuera el pueblo.', 'texto_largo')
            ]
        }
    ];

    return formulario;
}

/**
 * Crea una encuesta general de diagnóstico participativo.
 */
function crearPlantillaGeneralPortal() {
    const formulario = crearFormularioVacioPortal();

    formulario.titulo = 'Diagnóstico participativo POU';
    formulario.descripcion = 'Ayúdanos a conocer tus ideas sobre el espacio público, los edificios, las infraestructuras y el paisaje.';
    formulario.icono = 'pou-encuesta-participacion';
    formulario.color = estadoPortal.configuracion.color_primario;
    // La plantilla se puede guardar inmediatamente como formulario online.
    // El usuario podrá activar la descarga PDF cuando suba el documento.
    formulario.modalidad = 'online';
    formulario.secciones = [
        {
            titulo: 'El espacio público',
            descripcion: 'Calles, plazas, seguridad y accesibilidad.',
            preguntas: [
                crearPreguntaPlantilla('¿Qué lugar consideras inseguro y cómo lo mejorarías?', 'texto_largo'),
                crearPreguntaOpcionesPlantilla(
                    '¿Qué hace falta en las calles y plazas?',
                    'opcion_multiple',
                    ['Arbolado', 'Zonas de sombra', 'Señalización', 'Baños públicos', 'Fuentes de agua', 'Mobiliario accesible']
                )
            ]
        },
        {
            titulo: 'Edificios e infraestructuras',
            descripcion: 'Equipamientos, vivienda, movilidad y servicios.',
            preguntas: [
                crearPreguntaOpcionesPlantilla(
                    '¿Qué equipamientos echas en falta?',
                    'opcion_multiple',
                    ['Colegio', 'Museo', 'Pista deportiva', 'Centro de salud', 'Centro de día', 'Tanatorio']
                ),
                crearPreguntaPlantilla('¿Qué infraestructuras urbanas se deberían mejorar?', 'texto_largo')
            ]
        },
        {
            titulo: 'Territorio y paisaje',
            descripcion: 'Borde urbano, vistas y nuevas actividades.',
            preguntas: [
                crearPreguntaPlantilla('¿Qué vistas interesantes se deberían proteger?', 'texto_largo'),
                crearPreguntaPlantilla('¿Cómo mejorarías un lugar del municipio que no te gusta?', 'texto_largo')
            ]
        }
    ];

    return formulario;
}

/**
 * Crea una pregunta sencilla para las plantillas predeterminadas.
 */
function crearPreguntaPlantilla(enunciado, tipo, obligatorio) {
    return {
        enunciado: enunciado,
        ayuda: '',
        tipo: tipo,
        obligatorio: Boolean(obligatorio),
        ancho: 'completo',
        opciones: []
    };
}

/**
 * Crea una pregunta de selección y asigna sus opciones iniciales.
 */
function crearPreguntaOpcionesPlantilla(enunciado, tipo, opciones, obligatorio) {
    const pregunta = crearPreguntaPlantilla(enunciado, tipo, obligatorio);
    pregunta.opciones = opciones || [];
    return pregunta;
}
