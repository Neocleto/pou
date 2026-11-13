/**
 * Acciones del contenido: recursos, documentos, noticias y preguntas frecuentes.
 * Usa los endpoints existentes y actualiza el editor y la vista previa.
 * El estado del formulario local está en configuradorContenidoPortal.js.
 */

async function ejecutarAccionContenido(accion, boton) {
    if (accion === 'content-open-forms') {
        mostrarPanelConfigurador('formularios');
        return;
    }

    if (accion === 'content-new-resource') {
        estadoEditorContenido.recursoEditando = crearRecursoVacio();
        estadoEditorContenido.recursoIndice = estadoPortal.botonesParticipacion.length;
        marcarCambios(false, 'local');
        actualizarListadoRecursosParticipacion(true);
        return;
    }

    if (accion === 'content-edit-resource') {
        const recurso = estadoPortal.botonesParticipacion[Number(boton.dataset.index)];
        estadoEditorContenido.recursoIndice = Number(boton.dataset.index);
        estadoEditorContenido.recursoEditando = recurso
            ? { ...recurso, archivo_url_old: recurso.archivo_url || '' }
            : null;
        marcarCambios(false, 'local');
        actualizarListadoRecursosParticipacion(true);
        return;
    }

    if (accion === 'content-cancel-resource') {
        estadoEditorContenido.recursoEditando = null;
        estadoEditorContenido.recursoIndice = null;
        marcarCambios(false, 'local');
        actualizarListadoRecursosParticipacion();
        return;
    }

    if (accion === 'content-select-resource-file') {
        document.querySelector('[data-content-file="resource"]')?.click();
        return;
    }

    if (accion === 'content-save-resource') {
        await guardarRecursoParticipacion();
        return;
    }

    if (accion === 'content-delete-resource') {
        await eliminarRecursoParticipacion(Number(boton.dataset.index));
        return;
    }

    if (accion === 'content-new-document') {
        estadoEditorContenido.documentoEditando = crearDocumentoVacio();
        marcarCambios(false, 'local');
        renderPanelSeccion('documentos');
        return;
    }

    if (accion === 'content-edit-document') {
        const documento = estadoPortal.datosContenido.documentos[Number(boton.dataset.index)];
        estadoEditorContenido.documentoEditando = documento ? { ...documento } : null;
        marcarCambios(false, 'local');
        renderPanelSeccion('documentos');
        return;
    }

    if (accion === 'content-cancel-document') {
        estadoEditorContenido.documentoEditando = null;
        marcarCambios(false, 'local');
        renderPanelSeccion('documentos');
        return;
    }

    if (accion === 'content-select-document-file') {
        document.querySelector('[data-content-file="document"]')?.click();
        return;
    }

    if (accion === 'content-save-document') {
        await guardarDocumentoContenido();
        return;
    }

    if (accion === 'content-delete-document') {
        await eliminarDocumentoContenido(Number(boton.dataset.index));
        return;
    }

    if (accion === 'content-toggle-documents') {
        estadoEditorContenido.documentosExpandidos =
            !estadoEditorContenido.documentosExpandidos;
        actualizarListadoDocumentosConfigurador();
        return;
    }

    if (accion === 'content-new-category') {
        await crearCategoriaContenido();
        return;
    }

    if (accion === 'content-new-news') {
        estadoEditorContenido.noticiaEditando = crearNoticiaVacia();
        marcarCambios(false, 'local');
        renderPanelSeccion('actualidad');
        return;
    }

    if (accion === 'content-edit-news') {
        const noticia = estadoPortal.datosContenido.noticias[Number(boton.dataset.index)];
        estadoEditorContenido.noticiaEditando = noticia ? { ...noticia } : null;
        marcarCambios(false, 'local');
        renderPanelSeccion('actualidad');
        return;
    }

    if (accion === 'content-toggle-news') {
        await cambiarPublicacionNoticiaContenido(Number(boton.dataset.index));
        return;
    }

    if (accion === 'content-cancel-news') {
        estadoEditorContenido.noticiaEditando = null;
        marcarCambios(false, 'local');
        renderPanelSeccion('actualidad');
        return;
    }

    if (accion === 'content-save-news') {
        await guardarNoticiaContenido();
        return;
    }

    if (accion === 'content-delete-news') {
        await eliminarNoticiaContenido(Number(boton.dataset.index));
        return;
    }

    if (accion === 'content-assign-faq') {
        await asignarFaqBibliotecaContenido();
        return;
    }

    if (accion === 'content-save-faq') {
        await guardarFaqContenido();
        return;
    }

    if (accion === 'content-view-faq') {
        verFaqContenido(Number(boton.dataset.index));
        return;
    }

    if (accion === 'content-edit-faq') {
        await editarFaqContenido(Number(boton.dataset.index));
        return;
    }

    if (accion === 'content-restore-faq') {
        await restaurarFaqContenido(Number(boton.dataset.index));
        return;
    }

    if (accion === 'content-delete-faq') {
        await eliminarFaqContenido(Number(boton.dataset.index));
    }
}

async function guardarRecursoParticipacion() {
    const recurso = estadoEditorContenido.recursoEditando;
    leerCamposLocalesRecurso(recurso);

    const necesitaFormulario = recurso.tipo_contenido === 'formulario'
        || recurso.tipo_contenido === 'ambos';
    const necesitaPdf = recurso.tipo_contenido === 'pdf'
        || recurso.tipo_contenido === 'ambos';
    const formulario = (estadoPortal.formularios || []).find(function (item) {
        return Number(item.id) === Number(recurso.formulario_id);
    });
    const tienePdf = Boolean(recurso.archivo_url.trim() || formulario?.pdf_url);

    if (!recurso.texto_boton.trim()) {
        Swal.fire('Revisa el botón', 'Escribe el título que verá la ciudadanía.', 'warning');
        return;
    }

    if (necesitaFormulario && !recurso.formulario_id) {
        Swal.fire('Revisa el botón', 'Selecciona el formulario online que debe abrir.', 'warning');
        return;
    }

    if (necesitaPdf && !tienePdf) {
        Swal.fire('Revisa el botón', 'Sube un PDF o selecciona un formulario que ya tenga PDF.', 'warning');
        return;
    }

    const datos = new URLSearchParams({
        action: recurso.id ? 'actualizarBotonParticipacion' : 'guardarBotonParticipacion',
        cod_mun: estadoPortal.codMun,
        texto_boton: recurso.texto_boton,
        archivo_url: recurso.archivo_url,
        archivo_url_old: recurso.archivo_url_old || recurso.archivo_url,
        icono: recurso.icono,
        color: recurso.color,
        tipo_contenido: recurso.tipo_contenido,
        formulario_id: recurso.formulario_id ? String(recurso.formulario_id) : '',
        visible: recurso.visible !== false ? '1' : '0'
    });

    if (recurso.id) {
        datos.append('id', String(recurso.id));
    }

    try {
        await solicitarJson('php/gestion/acciones/acciones_participacion.php', {
            method: 'POST',
            body: datos
        });

        await recargarRecursosParticipacion();
        estadoEditorContenido.recursoEditando = null;
        estadoEditorContenido.recursoIndice = null;
        marcarCambios(false, 'local');
        actualizarListadoRecursosParticipacion();
        recargarIframePortal();
    } catch (error) {
        Swal.fire('No se pudo guardar', error.message, 'error');
    }
}

async function eliminarRecursoParticipacion(indice) {
    const recurso = estadoPortal.botonesParticipacion[indice];

    if (!recurso) return;

    const confirmacion = await confirmarEliminacionContenido('¿Eliminar este recurso?', 'El archivo dejará de estar disponible en el portal.');
    if (!confirmacion) return;

    try {
        await solicitarJson('php/gestion/acciones/acciones_participacion.php', {
            method: 'POST',
            body: new URLSearchParams({
                action: 'eliminarBotonParticipacion',
                id: String(recurso.id),
                archivo_url: recurso.archivo_url || ''
            })
        });

        await recargarRecursosParticipacion();
        actualizarListadoRecursosParticipacion();
        recargarIframePortal();
    } catch (error) {
        Swal.fire('No se pudo eliminar', error.message, 'error');
    }
}

async function recargarRecursosParticipacion() {
    const respuesta = await solicitarJson(
        `php/gestion/acciones/acciones_participacion.php?action=listarBotonesParticipacion&cod_mun=${encodeURIComponent(estadoPortal.codMun)}`
    );

    estadoPortal.botonesParticipacion = (respuesta.data || []).map(normalizarBotonParticipacion);
    // Una eliminación puede cambiar los índices: el editor sigue al ID del recurso.
    const editando = estadoEditorContenido.recursoEditando;
    if (editando && editando.id !== null) {
        const indice = estadoPortal.botonesParticipacion.findIndex(function (recurso) {
            return Number(recurso.id) === Number(editando.id);
        });
        if (indice >= 0) estadoEditorContenido.recursoIndice = indice;
        else {
            estadoEditorContenido.recursoEditando = null;
            estadoEditorContenido.recursoIndice = null;
        }
    }
}

async function guardarDocumentoContenido() {
    const documento = estadoEditorContenido.documentoEditando;
    leerCamposLocalesDocumento(documento);

    if (!documento.titulo.trim() || !documento.fase_id || !documento.archivo_url.trim()) {
        Swal.fire('Revisa el documento', 'Indica el título, la fase y el archivo.', 'warning');
        return;
    }

    const datos = new URLSearchParams({
        action: documento.id ? 'actualizarDocumento' : 'guardarDocumento',
        cod_mun: estadoPortal.codMun,
        fase_id: String(documento.fase_id),
        titulo: documento.titulo,
        archivo_url: documento.archivo_url,
        categoria_id: String(documento.categoria_id || ''),
        archivo_anterior: documento.archivo_anterior || documento.archivo_url
    });

    if (documento.id) datos.append('id', String(documento.id));

    try {
        await solicitarJson('php/gestion/acciones/acciones_documentos.php', {
            method: 'POST',
            body: datos
        });

        await recargarDocumentosContenido();
        estadoEditorContenido.documentoEditando = null;
        marcarCambios(false, 'local');
        renderPanelSeccion('documentos');
        recargarIframePortal();
    } catch (error) {
        Swal.fire('No se pudo guardar', error.message, 'error');
    }
}

async function eliminarDocumentoContenido(indice) {
    const documento = estadoPortal.datosContenido.documentos[indice];
    if (!documento) return;

    const confirmacion = await confirmarEliminacionContenido('¿Eliminar este documento?', 'Se eliminará el archivo y su registro.');
    if (!confirmacion) return;

    try {
        await solicitarJson('php/gestion/acciones/acciones_documentos.php', {
            method: 'POST',
            body: new URLSearchParams({
                action: 'eliminarDocumento',
                id: String(documento.id),
                archivo_url: documento.archivo_url || ''
            })
        });

        await recargarDocumentosContenido();
        renderPanelSeccion('documentos');
        recargarIframePortal();
    } catch (error) {
        Swal.fire('No se pudo eliminar', error.message, 'error');
    }
}

async function recargarDocumentosContenido() {
    const respuesta = await solicitarJson(
        `php/gestion/acciones/acciones_documentos.php?action=listarDocumentos&cod_mun=${encodeURIComponent(estadoPortal.codMun)}`
    );

    estadoPortal.datosContenido.documentos = respuesta.data || [];
}

async function crearCategoriaContenido() {
    const respuesta = await Swal.fire({
        title: 'Nueva categoría',
        input: 'text',
        inputLabel: 'Nombre',
        showCancelButton: true,
        confirmButtonText: 'Crear',
        cancelButtonText: 'Cancelar',
        inputValidator: function (valor) {
            return String(valor || '').trim() ? undefined : 'Escribe un nombre.';
        }
    });

    if (!respuesta.isConfirmed) return;

    try {
        await solicitarJson('php/gestion/acciones/acciones_documentos.php', {
            method: 'POST',
            body: new URLSearchParams({
                action: 'crearCategoria',
                nombre: String(respuesta.value).trim()
            })
        });

        const listado = await solicitarJson('php/gestion/acciones/acciones_documentos.php?action=listarCategorias');
        estadoPortal.datosContenido.categorias = listado.data || [];
        renderPanelSeccion('documentos');
    } catch (error) {
        Swal.fire('No se pudo crear', error.message, 'error');
    }
}

async function guardarNoticiaContenido() {
    const noticia = estadoEditorContenido.noticiaEditando;
    leerCamposLocalesNoticia(noticia);

    if (!noticia.titulo.trim() || !noticia.fecha_publicacion) {
        Swal.fire('Revisa la noticia', 'Escribe un título y una fecha de publicación.', 'warning');
        return;
    }

    const archivo = document.querySelector('[data-content-file="news"]')?.files?.[0];

    if (!noticia.id && !archivo) {
        Swal.fire('Revisa la noticia', 'Selecciona una imagen para la nueva noticia.', 'warning');
        return;
    }

    const datos = new FormData();
    datos.append('action', noticia.id ? 'actualizarNoticia' : 'crearNoticia');
    datos.append('cod_mun', estadoPortal.codMun);
    datos.append('titulo', noticia.titulo);
    datos.append('fecha_publicacion', noticia.fecha_publicacion);
    datos.append('resumen', noticia.resumen || '');
    datos.append('enlace_detalle', noticia.enlace_detalle || '');
    datos.append('activa', noticia.activa ? '1' : '0');

    if (noticia.id) datos.append('id', String(noticia.id));
    if (archivo) datos.append('archivo_imagen', archivo);

    try {
        await solicitarJson('php/gestion/acciones/acciones_noticias.php', {
            method: 'POST',
            body: datos
        });

        await recargarNoticiasContenido();
        estadoEditorContenido.noticiaEditando = null;
        marcarCambios(false, 'local');
        renderPanelSeccion('actualidad');
        recargarIframePortal();
    } catch (error) {
        Swal.fire('No se pudo guardar', error.message, 'error');
    }
}

/**
 * Publica o despublica una noticia sin obligar a abrir todo el formulario.
 */
async function cambiarPublicacionNoticiaContenido(indice) {
    const noticia = estadoPortal.datosContenido.noticias[indice];

    if (!noticia) return;

    const publicada = convertirBooleano(noticia.activa, false);

    try {
        await solicitarJson('php/gestion/acciones/acciones_noticias.php', {
            method: 'POST',
            body: new URLSearchParams({
                action: 'cambiarEstadoNoticia',
                id: String(noticia.id),
                cod_mun: estadoPortal.codMun,
                activa: publicada ? '0' : '1'
            })
        });

        await recargarNoticiasContenido();
        renderPanelSeccion('actualidad');
        recargarIframePortal();
    } catch (error) {
        Swal.fire('No se pudo cambiar la publicación', error.message, 'error');
    }
}

async function eliminarNoticiaContenido(indice) {
    const noticia = estadoPortal.datosContenido.noticias[indice];
    if (!noticia) return;

    const confirmacion = await confirmarEliminacionContenido('¿Eliminar esta noticia?', 'La noticia dejará de estar disponible.');
    if (!confirmacion) return;

    try {
        await solicitarJson('php/gestion/acciones/acciones_noticias.php', {
            method: 'POST',
            body: new URLSearchParams({
                action: 'eliminarNoticia',
                id: String(noticia.id),
                imagen_url: noticia.imagen_url || ''
            })
        });

        await recargarNoticiasContenido();
        renderPanelSeccion('actualidad');
        recargarIframePortal();
    } catch (error) {
        Swal.fire('No se pudo eliminar', error.message, 'error');
    }
}

async function recargarNoticiasContenido() {
    const respuesta = await solicitarJson(
        `php/gestion/acciones/acciones_noticias.php?action=listarNoticias&cod_mun=${encodeURIComponent(estadoPortal.codMun)}`
    );

    estadoPortal.datosContenido.noticias = respuesta.data || [];
}

async function asignarFaqBibliotecaContenido() {
    const preguntaId = Number(obtenerCampoLocal('faq-library-select') || 0);

    if (!preguntaId) {
        Swal.fire('Selecciona una pregunta', 'Elige una pregunta de la biblioteca común.', 'info');
        return;
    }

    try {
        await solicitarJson('php/gestion/acciones/acciones_faqs.php', {
            method: 'POST',
            body: new URLSearchParams({
                action: 'asignarExistente',
                cod_mun: estadoPortal.codMun,
                pregunta_id: String(preguntaId)
            })
        });
        await actualizarFaqsTrasAccion();
    } catch (error) {
        Swal.fire('No se pudo asignar', error.message, 'error');
    }
}

async function guardarFaqContenido() {
    const pregunta = obtenerCampoLocal('faq-question').trim();
    const respuesta = obtenerCampoLocal('faq-answer').trim();

    if (!pregunta || !respuesta) {
        Swal.fire('Revisa la pregunta', 'Completa la pregunta y la respuesta.', 'warning');
        return;
    }

    try {
        await solicitarJson('php/gestion/acciones/acciones_faqs.php', {
            method: 'POST',
            body: new URLSearchParams({
                action: 'crearExclusiva',
                cod_mun: estadoPortal.codMun,
                pregunta: pregunta,
                respuesta: respuesta
            })
        });
        await actualizarFaqsTrasAccion();
    } catch (error) {
        Swal.fire('No se pudo guardar', error.message, 'error');
    }
}

function verFaqContenido(indice) {
    const faq = estadoPortal.datosContenido.faqs[indice];
    if (!faq) return;

    Swal.fire({
        title: escaparHtml(faq.pregunta || 'Pregunta'),
        html: `<div class="text-start" style="white-space:pre-line">${escaparHtml(faq.respuesta || '')}</div>`,
        confirmButtonText: 'Cerrar',
        width: 720
    });
}

async function editarFaqContenido(indice) {
    const faq = estadoPortal.datosContenido.faqs[indice];
    if (!faq) return;

    const resultado = await Swal.fire({
        title: convertirBooleano(faq.es_exclusiva, false) ? 'Editar pregunta municipal' : 'Adaptar para este municipio',
        html: `
            <label class="form-label w-100 text-start">Pregunta</label>
            <input id="faqContenidoPregunta" class="form-control mb-3" value="${escaparHtml(faq.pregunta || '')}">
            <label class="form-label w-100 text-start">Respuesta</label>
            <textarea id="faqContenidoRespuesta" class="form-control" rows="7">${escaparHtml(faq.respuesta || '')}</textarea>`,
        showCancelButton: true,
        confirmButtonText: 'Guardar adaptación',
        cancelButtonText: 'Cancelar',
        width: 760,
        preConfirm: function () {
            const pregunta = document.getElementById('faqContenidoPregunta').value.trim();
            const respuesta = document.getElementById('faqContenidoRespuesta').value.trim();
            if (!pregunta || !respuesta) {
                Swal.showValidationMessage('Completa la pregunta y la respuesta.');
                return false;
            }
            return { pregunta, respuesta };
        }
    });

    if (!resultado.isConfirmed) return;

    try {
        await solicitarJson('php/gestion/acciones/acciones_faqs.php', {
            method: 'POST',
            body: new URLSearchParams({
                action: 'personalizarMunicipio',
                cod_mun: estadoPortal.codMun,
                asignacion_id: String(faq.asignacion_id),
                pregunta: resultado.value.pregunta,
                respuesta: resultado.value.respuesta
            })
        });
        await actualizarFaqsTrasAccion();
    } catch (error) {
        Swal.fire('No se pudo editar', error.message, 'error');
    }
}

async function restaurarFaqContenido(indice) {
    const faq = estadoPortal.datosContenido.faqs[indice];
    if (!faq) return;

    try {
        await solicitarJson('php/gestion/acciones/acciones_faqs.php', {
            method: 'POST',
            body: new URLSearchParams({
                action: 'restaurarBase',
                cod_mun: estadoPortal.codMun,
                asignacion_id: String(faq.asignacion_id)
            })
        });
        await actualizarFaqsTrasAccion();
    } catch (error) {
        Swal.fire('No se pudo restaurar', error.message, 'error');
    }
}

async function eliminarFaqContenido(indice) {
    const faq = estadoPortal.datosContenido.faqs[indice];
    if (!faq) return;

    const confirmacion = await confirmarEliminacionContenido('¿Retirar esta pregunta?', 'Solo se quitará de este municipio.');
    if (!confirmacion) return;

    try {
        await solicitarJson('php/gestion/acciones/acciones_faqs.php', {
            method: 'POST',
            body: new URLSearchParams({
                action: 'eliminarAsignacion',
                cod_mun: estadoPortal.codMun,
                asignacion_id: String(faq.asignacion_id || ''),
                pregunta_id: String(faq.pregunta_id || '')
            })
        });
        await actualizarFaqsTrasAccion();
    } catch (error) {
        Swal.fire('No se pudo retirar', error.message, 'error');
    }
}

async function actualizarFaqsTrasAccion() {
    await recargarFaqsContenido();
    renderPanelSeccion('actualidad');
    recargarIframePortal();
}

async function recargarFaqsContenido() {
    const respuesta = await solicitarJson(
        `php/gestion/acciones/acciones_faqs.php?action=listarPreguntasMunicipio&cod_mun=${encodeURIComponent(estadoPortal.codMun)}`
    );

    estadoPortal.datosContenido.faqs = respuesta.data || [];
}

async function subirArchivoContenido(archivo, tipo) {
    const datos = new FormData();
    datos.append('archivo', archivo);
    datos.append('cod_mun', estadoPortal.codMun);
    datos.append('tipo', tipo);

    try {
        const respuesta = await solicitarJson('php/gestion/archivos/subirArchivo.php', {
            method: 'POST',
            body: datos
        });

        return respuesta.url || '';
    } catch (error) {
        Swal.fire('No se pudo subir el archivo', error.message, 'error');
        throw error;
    }
}

function leerCamposLocalesRecurso(recurso) {
    recurso.texto_boton = obtenerCampoLocal('resource-title');
    recurso.icono = obtenerCampoLocal('resource-icon') ?? 'file-earmark-arrow-down';
    recurso.icono = obtenerIconoBotonParticipacionPortal(recurso);
    recurso.color = obtenerCampoLocal('resource-color') || estadoPortal.configuracion.color_primario || '#540000';
    recurso.tipo_contenido = obtenerCampoLocal('resource-type') || 'pdf';
    recurso.formulario_id = obtenerCampoLocal('resource-form') || '';
    recurso.archivo_url = obtenerCampoLocal('resource-file') || recurso.archivo_url || '';
    recurso.visible = document.querySelector('[data-content-local="resource-visible"]')?.checked !== false;
}

function leerCamposLocalesDocumento(documento) {
    documento.titulo = obtenerCampoLocal('document-title');
    documento.fase_id = obtenerCampoLocal('document-phase');
    documento.categoria_id = obtenerCampoLocal('document-category');
}

function leerCamposLocalesNoticia(noticia) {
    noticia.titulo = obtenerCampoLocal('news-title');
    noticia.fecha_publicacion = obtenerCampoLocal('news-date');
    noticia.enlace_detalle = obtenerCampoLocal('news-link');
    noticia.resumen = obtenerCampoLocal('news-summary');
    noticia.activa = Boolean(document.querySelector('[data-content-local="news-active"]')?.checked);
}

function obtenerCampoLocal(nombre) {
    return String(document.querySelector(`[data-content-local="${nombre}"]`)?.value || '');
}

function obtenerSubfasesFase(numeroFase) {
    return (estadoPortal.datosContenido.subfases || []).filter(function (subfase) {
        return Number(subfase.num_fase_padre) === Number(numeroFase);
    });
}

function crearRecursoVacio() {
    return {
        id: null,
        texto_boton: '',
        archivo_url: '',
        archivo_url_old: '',
        icono: 'file-earmark-arrow-down',
        color: estadoPortal.configuracion.color_primario || '#540000',
        tipo_contenido: 'pdf',
        formulario_id: '',
        visible: true
    };
}

function crearDocumentoVacio() {
    return {
        id: null,
        titulo: '',
        fase_id: '',
        categoria_id: '',
        archivo_url: '',
        archivo_anterior: ''
    };
}

function crearNoticiaVacia() {
    return {
        id: null,
        titulo: '',
        fecha_publicacion: new Date().toISOString().slice(0, 10),
        resumen: '',
        enlace_detalle: '',
        imagen_url: '',
        activa: true
    };
}

async function confirmarEliminacionContenido(titulo, texto) {
    const respuesta = await Swal.fire({
        title: titulo,
        text: texto,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Eliminar',
        cancelButtonText: 'Cancelar',
        confirmButtonColor: '#c53636'
    });

    return respuesta.isConfirmed;
}
