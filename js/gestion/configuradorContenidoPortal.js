/****************************************************************************
 * CONFIGURADOR DE CONTENIDO DEL PORTAL POU
 *
 * Amplia el configurador visual para que el usuario pueda editar tambien:
 * - Textos de todos los bloques.
 * - Informacion general y fase actual.
 * - Recursos PDF, documentos, noticias y preguntas frecuentes.
 *
 * Se mantiene separado del archivo principal para que el codigo sea facil de
 * localizar y modificar.
 ****************************************************************************/

const estadoEditorContenido = {
    recursoEditando: null,
    recursoIndice: null,
    documentoEditando: null,
    noticiaEditando: null,
    busquedaDocumentos: '',
    documentosExpandidos: false
};

// ============================================================================
// 1. VALORES INICIALES
// ============================================================================

const contenidoPortalInicial = datosInicialesPortal.valores_iniciales.contenido_portal;

/**
 * Completa los textos y datos que puedan faltar en instalaciones anteriores.
 */
function prepararContenidoCompleto() {
    estadoPortal.contenido = combinarObjetosContenido(
        contenidoPortalInicial,
        estadoPortal.contenido || {}
    );

    // El distintivo de la antigua cabecera ya no existe.
    delete estadoPortal.contenido.cabecera.mensaje_destacado;
    delete estadoPortal.contenido.cabecera.subtitulo;
    delete estadoPortal.contenido.documentos.boton_texto;

    const tituloGuardado = String(estadoPortal.contenido.cabecera.titulo || '').trim();
    const tituloAntiguo = `POU de ${estadoPortal.municipio.nombre || ''}`.trim();
    if (
        tituloGuardado === 'POU de {municipio}'
        || tituloGuardado.toLocaleLowerCase('es') === tituloAntiguo.toLocaleLowerCase('es')
    ) {
        estadoPortal.contenido.cabecera.titulo = 'Plan de Ordenación Urbana';
    }

    estadoPortal.datosContenido = combinarObjetosContenido({
        informacion: { titulo: '', descripcion: '' },
        fase_actual: {
            num_fase: '',
            subfase_id: '',
            fecha_inicio: '',
            estado_tramitacion: ''
        },
        fases: [],
        subfases: [],
        documentos: [],
        categorias: [],
        fases_documentos: [],
        noticias: [],
        faqs: [],
        faqs_disponibles: [],
        buzon_activo: false,
        politica_privacidad_url: ''
    }, estadoPortal.datosContenido || {});
    const seccionInformacion = estadoPortal.secciones.find(function (seccion) { return seccion.id === 'informacion'; });
    if (seccionInformacion) {
        const titulo = String(estadoPortal.datosContenido.informacion.titulo || '').trim();
        if (titulo) seccionInformacion.titulo = titulo;
        else estadoPortal.datosContenido.informacion.titulo = seccionInformacion.titulo;
    }

    const etiqueta = String(estadoPortal.contenido?.cabecera?.etiqueta || '').trim();

    if (!etiqueta || etiqueta === 'POU · Portal municipal de planeamiento') {
        estadoPortal.contenido.cabecera.etiqueta = 'Portal municipal de planeamiento';
    }

}

/**
 * Une dos objetos sin compartir referencias con el objeto inicial.
 */
function combinarObjetosContenido(base, personalizado) {
    const resultado = JSON.parse(JSON.stringify(base || {}));

    Object.keys(personalizado || {}).forEach(function (clave) {
        const valor = personalizado[clave];
        const valorBase = resultado[clave];

        if (
            valor
            && typeof valor === 'object'
            && !Array.isArray(valor)
            && valorBase
            && typeof valorBase === 'object'
            && !Array.isArray(valorBase)
        ) {
            resultado[clave] = combinarObjetosContenido(valorBase, valor);
        } else {
            resultado[clave] = valor;
        }
    });

    return resultado;
}

// La carga del archivo principal es asincrona. Completamos el estado justo
// antes de dibujar cualquiera de los paneles ampliados.
function asegurarContenidoCompleto() {
    prepararContenidoCompleto();
}

// ============================================================================
// 2. PANELES COMPLETOS
// ============================================================================

/**
 * La cabecera permite editar imagenes y todos sus textos visibles.
 */
function renderPanelCabecera() {
    asegurarContenidoCompleto();
    establecerCabeceraPanel('Cabecera del municipio', 'Configura la imagen, el escudo y todos los textos de presentación.');

    const rutaBanner = estadoPortal.municipio.imagen_cabecera || 'images/no_pou_data1.png';
    const rutaEscudo = estadoPortal.municipio.escudo || 'images/logo_mipou.png';
    const cabecera = estadoPortal.contenido.cabecera;

    document.getElementById('contenidoPanelConfigurador').innerHTML = `
        ${crearTarjetaConfiguracion(
            'Textos de presentación',
            'Puedes utilizar {municipio} para insertar automáticamente el nombre del ayuntamiento.',
            `<div class="portal-config-grid">
                ${crearCampoTexto('Etiqueta superior', 'contenido.cabecera.etiqueta', cabecera.etiqueta || '')}
                ${crearCampoTexto('Título principal', 'contenido.cabecera.titulo', cabecera.titulo || '')}
                ${crearCampoTextoEnriquecidoContenido('Descripción breve', 'contenido.cabecera.descripcion', cabecera.descripcion || '', 4)}
            </div>`
        )}

        ${crearTarjetaConfiguracion(
            'Escudo municipal',
            'Se carga automáticamente el escudo municipal. Puedes sustituirlo sin modificar el original.',
            `<div class="portal-upload-box">
                <img src="${escaparHtml(rutaEscudo)}" class="portal-upload-preview is-crest" alt="Escudo municipal">
                <div>
                    <button type="button" class="btn btn-outline-primary btn-sm" data-upload-button="escudo"><i class="bi bi-upload me-1"></i>Subir otro escudo</button>
                    <input type="file" class="d-none" data-upload-input="escudo" accept="image/jpeg,image/png,image/webp">
                    <button type="button" class="btn btn-light btn-sm mt-2" data-action="reset-crest">Usar escudo automático</button>
                    <div class="portal-config-help">JPG, PNG o WEBP, hasta 4 MB. Pulsa Guardar para conservar la selección.</div>
                </div>
            </div>`
        )}

        ${crearTarjetaConfiguracion(
            'Imagen panorámica',
            'Fotografía de la cabecera del portal público.',
            `<div class="portal-upload-box">
                <img src="${escaparHtml(rutaBanner)}" class="portal-upload-preview" alt="Vista previa del banner">
                <div>
                    <button type="button" class="btn btn-outline-primary btn-sm" data-upload-button="banner">
                        <i class="bi bi-upload me-1"></i>Seleccionar imagen
                    </button>
                    <input type="file" class="d-none" data-upload-input="banner" accept="image/jpeg,image/png,image/webp">
                    <div class="portal-config-help">La fotografía se recorta automáticamente para adaptarse a cada pantalla.</div>
                </div>
            </div>`
        )}
    `;
};

/**
 * El indice permite editar su introduccion y cada acceso.
 */
function renderPanelAccesos() {
    asegurarContenidoCompleto();
    establecerCabeceraPanel('Índice de la página', 'Configura el título y todos los accesos directos del portal.');

    const accesos = estadoPortal.accesos.map(function (acceso, indice) {
        return crearEditorAcceso(acceso, indice);
    }).join('');

    document.getElementById('contenidoPanelConfigurador').innerHTML = `
        ${crearTarjetaConfiguracion(
            'Comportamiento',
            'Ocultar el índice no elimina los accesos configurados.',
            crearCampoInterruptor('Mostrar el índice en la página pública', 'configuracion.mostrar_accesos', estadoPortal.configuracion.mostrar_accesos)
        )}

        ${crearTarjetaConfiguracion(
            'Accesos configurables',
            'Cada acceso permite editar su texto, icono, color, destino, visibilidad y orden. La vista previa usa los mismos dibujos que la página pública.',
            `<div class="portal-repeater">${accesos || crearVacio('Aún no hay accesos configurados.')}</div>
             <div class="portal-access-editor-actions">
                <button type="button" class="btn btn-outline-primary btn-sm" data-action="add-access">
                    <i class="bi bi-plus-circle me-1"></i>Añadir acceso
                </button>
                <button type="button" class="btn btn-outline-secondary btn-sm" data-action="add-custom-section-from-access">
                    <i class="bi bi-layout-text-window me-1"></i>Crear un bloque nuevo
                </button>
             </div>
             <p class="portal-config-help mt-2 mb-0">Si necesitas un destino nuevo, por ejemplo “Comida”, crea primero el bloque y después selecciónalo en el acceso.</p>`
        )}
    `;
};

/**
 * Dibuja el editor completo del bloque elegido.
 */
function renderPanelSeccion(idSeccion) {
    const bloque = estadoPortal.secciones.find(function (item) { return item.id === idSeccion; });
    if (bloque?.tipo === 'personalizado') {
        renderPanelBloquePersonalizado(idSeccion);
        return;
    }

    asegurarContenidoCompleto();

    const seccion = estadoPortal.secciones.find(function (item) {
        return item.id === idSeccion;
    });

    if (!seccion) {
        return;
    }

    establecerCabeceraPanel(seccion.titulo, 'Edita el diseño y el contenido real de este bloque desde la misma pantalla.');

    // El encabezado reúne los elementos que aparecen juntos en la página.
    const identidad = crearTarjetaConfiguracion(
        'Encabezado del bloque',
        'Texto sobre el título, título principal e icono del encabezado.',
        `<div class="portal-config-grid portal-config-grid--one">
            ${crearCampoTexto('Texto sobre el título', `contenido.${idSeccion}.kicker`, estadoPortal.contenido[idSeccion]?.kicker || '')}
            ${idSeccion === 'informacion' ? crearCampoTexto('Título principal', 'datosContenido.informacion.titulo', estadoPortal.datosContenido.informacion.titulo || seccion.titulo) : crearCampoTexto('Título principal', `seccion.${idSeccion}.titulo`, seccion.titulo || '')}
        </div>
        <div class="portal-config-grid mt-3">
            ${crearCampoIcono('Icono del encabezado', `seccion.${idSeccion}.icono`, seccion.icono ?? 'square')}
            ${crearCampoColor('Color del bloque', `seccion.${idSeccion}.color`, seccion.color || estadoPortal.configuracion.color_primario)}
        </div>
        <div class="mt-3">
            ${crearCampoInterruptor('Mostrar este bloque en la página pública', `seccion.${idSeccion}.visible`, seccion.visible !== false)}
        </div>`
    );

    const contenidoEspecifico = {
        informacion: renderContenidoInformacion,
        fases: renderContenidoFases,
        participacion: renderContenidoParticipacion,
        documentos: renderContenidoDocumentos,
        actualidad: renderContenidoActualidad,
        buzon: renderContenidoBuzon
    }[idSeccion];

    document.getElementById('contenidoPanelConfigurador').innerHTML = identidad
        + (contenidoEspecifico ? contenidoEspecifico() : '');
};

/**
 * Panel de información general.
 */
function renderContenidoInformacion() {
    const datos = estadoPortal.datosContenido.informacion;

    return `
        ${crearTarjetaConfiguracion(
            'Contenido principal',
            'Estos datos se guardan en el mismo registro que utiliza el asistente.',
            `<div class="portal-config-grid">
                ${crearCampoTextoEnriquecidoContenido('Descripción', 'datosContenido.informacion.descripcion', datos.descripcion || '', 7)}
            </div>`
        )}
    `;
}

/**
 * Panel de fase actual.
 */
function renderContenidoFases() {
    const textos = estadoPortal.contenido.fases;
    const faseActual = estadoPortal.datosContenido.fase_actual;
    const fases = estadoPortal.datosContenido.fases || [];
    const subfases = obtenerSubfasesFase(faseActual.num_fase);
    const imagenFases = faseActual.imagen_url || '';

    return `
        ${crearTarjetaConfiguracion(
            'Fase actual',
            'Franja que aparece justo debajo del encabezado del bloque.',
            `<div class="portal-config-grid portal-config-grid--one mb-3">
                ${crearCampoTexto('Etiqueta junto a la fase', 'contenido.fases.etiqueta_fase', textos.etiqueta_fase || '')}
             </div>
             <div class="portal-config-grid">
                ${crearCampoSeleccionGeneral('Fase', 'datosContenido.fase_actual.num_fase', String(faseActual.num_fase || ''), [
                    ['', 'Selecciona una fase'],
                    ...fases.map(function (fase) {
                        return [String(fase.num_fase), fase.label || `Fase ${fase.num_fase}`];
                    })
                ])}
                ${crearCampoSeleccionGeneral('Subfase', 'datosContenido.fase_actual.subfase_id', String(faseActual.subfase_id || ''), [
                    ['', 'Sin subfase'],
                    ...subfases.map(function (subfase) {
                        return [String(subfase.id), `${subfase.codigo_subfase} · ${subfase.titulo}`];
                    })
                ])}
                ${crearCampoFechaContenido('Fecha de inicio de la fase', 'datosContenido.fase_actual.fecha_inicio', faseActual.fecha_inicio || '')}
             </div>`
        )}

        ${imagenFases ? crearTarjetaConfiguracion(
            'Imagen de las fases',
            'Imagen informativa asociada a la fase seleccionada.',
            `<img class="portal-config-phase-image" src="${escaparHtml(imagenFases)}" alt="Imagen informativa de las fases">`
        ) : ''}

        ${crearTarjetaConfiguracion(
            'Estado de la tramitación',
            'Recuadro de información que aparece debajo de la imagen de fases.',
            `<div class="portal-config-grid portal-config-grid--one">
                ${crearCampoTexto('Título del recuadro de estado', 'contenido.fases.etiqueta_estado', textos.etiqueta_estado || '')}
                ${crearCampoTextoEnriquecidoContenido('Texto del estado', 'datosContenido.fase_actual.estado_tramitacion', faseActual.estado_tramitacion || '', 5)}
             </div>`
        )}
    `;
}

/**
 * Panel de recursos y formularios de participación.
 */
function renderContenidoParticipacion() {
    const textos = estadoPortal.contenido.participacion;
    const recursos = crearListadoRecursosParticipacion();

    return `
        ${crearTarjetaConfiguracion(
            'Introducción',
            'Texto que aparece antes de los recursos de participación.',
            `<div class="portal-config-grid">
                ${crearCampoTextoEnriquecidoContenido('Introducción', 'contenido.participacion.introduccion', textos.introduccion || '', 4)}
            </div>`
        )}

        ${crearTarjetaConfiguracion(
            'Botones de participación',
            'Cada botón puede abrir un formulario online, descargar un PDF o mostrar las dos opciones.',
            `<div class="portal-content-list" data-resource-list>${recursos}</div>
             <button type="button" class="btn btn-outline-primary btn-sm mt-3" data-action="content-new-resource" data-resource-new ${estadoEditorContenido.recursoEditando ? 'hidden' : ''}>
                <i class="bi bi-plus-circle me-1"></i>Añadir botón de participación
             </button>`
        )}

        ${crearTarjetaConfiguracion(
            'Formularios online',
            'Diseña las preguntas y comprueba exactamente cómo se verán antes de publicarlas.',
            `<div class="portal-config-grid portal-config-grid--one mb-3">
                ${crearCampoTexto('Título de los formularios', 'contenido.participacion.formularios_titulo', textos.formularios_titulo || '')}
                ${crearCampoTextoEnriquecidoContenido('Descripción de los formularios', 'contenido.participacion.formularios_descripcion', textos.formularios_descripcion || '', 3)}
             </div>
             <div class="portal-inline-summary">
                <span><i class="bi bi-ui-checks-grid"></i></span>
                <div>
                    <strong>${estadoPortal.formularios.length} formularios configurados</strong>
                    <small>Admiten modalidad online, PDF o ambas opciones.</small>
                </div>
                <button type="button" class="btn btn-primary btn-sm" data-action="content-open-forms">
                    Diseñar y previsualizar
                </button>
             </div>`
        )}
    `;
}

/**
 * Panel de documentos publicados.
 */
function renderContenidoDocumentos() {
    const textos = estadoPortal.contenido.documentos;
    const listadoDocumentos = estadoPortal.datosContenido.documentos || [];
    const documentos = listadoDocumentos
        .map(crearFilaDocumentoContenido)
        .join('');
    const editor = estadoEditorContenido.documentoEditando
        ? crearEditorDocumentoContenido(estadoEditorContenido.documentoEditando)
        : '';
    const totalCategorias = new Set(
        listadoDocumentos
            .map(function (documento) { return documento.categoria || ''; })
            .filter(Boolean)
    ).size;
    const totalFases = new Set(
        listadoDocumentos
            .map(function (documento) { return documento.codigo_fase || documento.fase_id || ''; })
            .filter(Boolean)
    ).size;
    const urlGestionCompleta = `php/gestion/panel_gestion.php?abrirPaso=4&cod_mun=${encodeURIComponent(estadoPortal.codMun)}`;

    // El HTML se inserta al terminar esta función. Después aplicamos el filtro
    // guardado y el límite inicial de seis documentos.
    window.setTimeout(actualizarListadoDocumentosConfigurador, 0);

    return `
        ${crearTarjetaConfiguracion(
            'Descripción del bloque',
            'El portal muestra cuatro fases. Solo la última con documentos permite abrir la documentación en una modal.',
            `<div class="portal-config-grid">
                ${crearCampoTextoEnriquecidoContenido('Descripción', 'contenido.documentos.descripcion', textos.descripcion || '', 4)}
            </div>`
        )}

        ${crearTarjetaConfiguracion(
            'Documentos publicados',
            'Consulta y edita rápidamente. Para una gestión intensiva puedes abrir el paso Documentos del asistente.',
            `${editor}
             <div class="portal-documents-manager__summary">
                <span><strong>${listadoDocumentos.length}</strong><small>Documentos</small></span>
                <span><strong>${totalCategorias}</strong><small>Categorías</small></span>
                <span><strong>${totalFases}</strong><small>Fases con archivos</small></span>
             </div>

             <div class="portal-documents-manager__toolbar">
                <label>
                    <i class="bi bi-search"></i>
                    <input
                        type="search"
                        class="form-control form-control-sm"
                        value="${escaparHtml(estadoEditorContenido.busquedaDocumentos)}"
                        placeholder="Buscar documento..."
                        data-documents-search-configurator>
                </label>
                <a
                    class="btn btn-primary btn-sm"
                    href="${escaparHtml(urlGestionCompleta)}"
                    target="_blank"
                    rel="noopener noreferrer">
                    <i class="bi bi-folder2-open me-1"></i>Gestión completa
                </a>
             </div>

             <div class="portal-content-list portal-documents-manager__list" data-documents-manager-list>
                ${documentos || crearVacio('No hay documentos publicados.')}
             </div>

             <div class="portal-documents-manager__empty" data-documents-manager-empty hidden>
                <i class="bi bi-search"></i>
                No hay documentos que coincidan con la búsqueda.
             </div>

             ${!estadoEditorContenido.documentoEditando ? `
                <div class="portal-documents-manager__actions">
                    <button type="button" class="btn btn-light btn-sm" data-action="content-toggle-documents" data-documents-toggle>
                        <i class="bi bi-list-ul me-1"></i>Mostrar todos
                    </button>
                    <button type="button" class="btn btn-outline-primary btn-sm" data-action="content-new-document">
                        <i class="bi bi-plus-circle me-1"></i>Añadir documento
                    </button>
                </div>` : ''}`
        )}
    `;
}

/**
 * Panel de noticias y preguntas frecuentes.
 */
function renderContenidoActualidad() {
    const textos = estadoPortal.contenido.actualidad;
    const noticias = (estadoPortal.datosContenido.noticias || [])
        .map(crearFilaNoticiaContenido)
        .join('');
    const faqs = (estadoPortal.datosContenido.faqs || [])
        .map(crearFilaFaqContenido)
        .join('');
    const editorNoticia = estadoEditorContenido.noticiaEditando
        ? crearEditorNoticiaContenido(estadoEditorContenido.noticiaEditando)
        : '';

    return `
        ${crearTarjetaConfiguracion(
            'Noticias',
            'Columna izquierda: encabezado, enlace de lectura y noticias publicadas.',
            `<div class="portal-config-grid">
                ${crearCampoTexto('Título de noticias', 'contenido.actualidad.noticias_titulo', textos.noticias_titulo || '')}
                ${crearCampoIcono('Icono de noticias', 'contenido.actualidad.noticias_icono', textos.noticias_icono ?? 'newspaper')}
             </div>
             <div class="portal-config-grid portal-config-grid--one mt-3">
                ${crearCampoTexto('Texto del enlace de cada noticia', 'contenido.actualidad.leer_mas', textos.leer_mas || '')}
             </div>
             <div class="portal-config-divider"></div>
             ${editorNoticia}
             <div class="portal-content-list">${noticias || crearVacio('No hay noticias creadas.')}</div>
             ${!estadoEditorContenido.noticiaEditando ? `
                <button type="button" class="btn btn-outline-primary btn-sm mt-3" data-action="content-new-news">
                    <i class="bi bi-plus-circle me-1"></i>Añadir noticia
                </button>` : ''}`
        )}

        ${crearTarjetaConfiguracion(
            'Preguntas frecuentes',
            'Columna derecha: encabezado y preguntas frecuentes del municipio.',
            `<div class="portal-config-grid mb-3">
                ${crearCampoTexto('Título de preguntas', 'contenido.actualidad.faqs_titulo', textos.faqs_titulo || '')}
                ${crearCampoIcono('Icono de preguntas', 'contenido.actualidad.faqs_icono', textos.faqs_icono ?? 'question-circle')}
             </div>
             <div class="portal-config-divider"></div>
             ${crearSelectorBibliotecaFaq()}
             ${crearEditorNuevaFaq()}
             <div class="portal-content-list mt-3">${faqs || crearVacio('No hay preguntas asignadas.')}</div>`
        )}
    `;
}

/**
 * Panel del buzón y la privacidad.
 */
function renderContenidoBuzon() {
    const textos = estadoPortal.contenido.buzon;
    const datos = estadoPortal.datosContenido;

    return `
        ${crearTarjetaConfiguracion(
            'Introducción',
            'Texto situado debajo del título del buzón.',
            crearCampoTextoEnriquecidoContenido('Introducción del buzón', 'contenido.buzon.introduccion', textos.introduccion || '', 3)
        )}
        ${crearTarjetaConfiguracion(
            'Protección de datos',
            'Recuadro de privacidad situado a la izquierda del formulario.',
            `<div class="portal-config-grid portal-config-grid--one">
                ${crearCampoTexto('Título de privacidad', 'contenido.buzon.privacidad_titulo', textos.privacidad_titulo || '')}
                ${crearCampoTextoEnriquecidoContenido('Información de privacidad', 'contenido.buzon.privacidad_texto', textos.privacidad_texto || '', 3)}
                ${crearCampoTexto('Texto del enlace de privacidad', 'contenido.buzon.privacidad_enlace', textos.privacidad_enlace || '')}
                ${crearCampoTexto('URL de la política de privacidad', 'datosContenido.politica_privacidad_url', datos.politica_privacidad_url || '', 'https://...')}
             </div>`
        )}
        ${crearTarjetaConfiguracion(
            'Ilustración del buzón',
            'Dibujo decorativo opcional que aparece debajo de la protección de datos.',
            crearCampoInterruptor('Mostrar la ilustración del buzón', 'contenido.buzon.mostrar_ilustracion', convertirBooleano(textos.mostrar_ilustracion, false))
        )}
        ${crearTarjetaConfiguracion(
            'Formulario del buzón',
            'Rótulos en el mismo orden en que los encuentra la persona que escribe.',
            `<div class="portal-config-grid portal-config-grid--one">
                ${crearCampoTexto('Etiqueta de asunto', 'contenido.buzon.asunto_etiqueta', textos.asunto_etiqueta || '')}
                ${crearCampoTexto('Etiqueta de mensaje', 'contenido.buzon.mensaje_etiqueta', textos.mensaje_etiqueta || '')}
                ${crearCampoTexto('Etiqueta de archivo adjunto', 'contenido.buzon.archivo_etiqueta', textos.archivo_etiqueta || '')}
                ${crearCampoTextoLargoContenido('Texto de consentimiento', 'contenido.buzon.consentimiento', textos.consentimiento || '', 2)}
                ${crearCampoTexto('Texto del botón de envío', 'contenido.buzon.boton_texto', textos.boton_texto || '')}
             </div>`
        )}
    `;
}

/** El pie conserva los logotipos oficiales y permite adaptar su color y rótulos. */
function renderPanelPie() {
    asegurarContenidoCompleto();
    const pie = estadoPortal.contenido.pie;
    establecerCabeceraPanel('Pie de página', 'Identidad y textos del ayuntamiento.');
    document.getElementById('contenidoPanelConfigurador').innerHTML = crearTarjetaConfiguracion(
        'Pie institucional',
        'Fondo liso con el color corporativo del portal. Los logotipos oficiales se conservan.',
        `<div class="portal-config-grid">
            ${crearCampoTexto('Texto principal', 'contenido.pie.texto_principal', pie.texto_principal || '')}
            ${crearCampoTexto('Texto secundario', 'contenido.pie.texto_secundario', pie.texto_secundario || '')}
        </div>`
    );
}

// ============================================================================
// 3. COMPONENTES DE LOS LISTADOS
// ============================================================================

/** Inserta un único editor justo después del recurso seleccionado. */
function crearListadoRecursosParticipacion() {
    let html = '';
    estadoPortal.botonesParticipacion.forEach(function (recurso, indice) {
        html += crearFilaRecursoParticipacion(recurso, indice);
        if (estadoEditorContenido.recursoEditando && estadoEditorContenido.recursoIndice === indice) {
            html += crearEditorRecursoParticipacion(estadoEditorContenido.recursoEditando);
        }
    });
    if (estadoEditorContenido.recursoEditando && estadoEditorContenido.recursoEditando.id === null) {
        html += crearEditorRecursoParticipacion(estadoEditorContenido.recursoEditando);
    }
    if (!html) html = crearVacio('No hay recursos descargables.');
    return html;
}

/**
 * Repinta solo el listado. Mantiene la fila elegida a la misma altura para que
 * abrir, cambiar el tipo, guardar o cancelar no envíe al usuario al principio.
 */
function actualizarListadoRecursosParticipacion(mostrarEditor = false) {
    const lista = document.querySelector('[data-resource-list]');
    if (!lista) return;
    const panel = document.getElementById('contenidoPanelConfigurador');
    const indice = estadoEditorContenido.recursoIndice;
    const fila = lista.querySelector(`[data-resource-row="${indice}"]`);
    const posicion = fila ? fila.getBoundingClientRect().top : null;
    const scrollAnterior = panel.scrollTop;
    lista.innerHTML = crearListadoRecursosParticipacion();
    panel.scrollTop = scrollAnterior;
    const nuevaFila = lista.querySelector(`[data-resource-row="${indice}"]`);
    if (nuevaFila && posicion !== null) panel.scrollTop += nuevaFila.getBoundingClientRect().top - posicion;
    const nuevo = document.querySelector('[data-resource-new]');
    if (nuevo) nuevo.hidden = Boolean(estadoEditorContenido.recursoEditando);
    if (mostrarEditor) {
        const encabezado = lista.querySelector('.portal-content-editor__heading');
        if (encabezado) {
            const limite = panel.getBoundingClientRect().bottom - 16;
            const fin = encabezado.getBoundingClientRect().bottom;
            if (fin > limite) panel.scrollTop += fin - limite;
        }
    }
}

function crearFilaRecursoParticipacion(boton, indice) {
    const iconoBoton = obtenerIconoBotonParticipacionPortal(boton);
    const tipo = boton.tipo_contenido || 'pdf';
    const etiquetas = {
        pdf: 'Documento PDF',
        formulario: 'Formulario online',
        ambos: 'Formulario online y PDF'
    };
    const detalleFormulario = boton.formulario_titulo
        ? ` · ${boton.formulario_titulo}`
        : '';
    const visible = boton.visible !== false;

    return `
        <article class="portal-content-row" data-resource-row="${indice}">
            ${iconoBoton ? `<span class="portal-content-row__icon" style="--item-color:${escaparHtml(boton.color || estadoPortal.configuracion.color_primario || '#540000')}">
                <i class="bi bi-${escaparHtml(iconoBoton)}"></i>
            </span>` : ''}
            <span class="portal-content-row__copy">
                <strong>${escaparHtml(boton.texto_boton || 'Recurso sin título')}</strong>
                <small>${escaparHtml((etiquetas[tipo] || etiquetas.pdf) + detalleFormulario)}</small>
                <em class="portal-content-row__meta">${visible ? 'Visible' : 'Oculto temporalmente'}</em>
            </span>
            <span class="portal-content-row__actions">
                <button type="button" data-action="content-edit-resource" data-index="${indice}" title="Editar" aria-label="Editar ${escaparHtml(boton.texto_boton || 'recurso')}" aria-expanded="${estadoEditorContenido.recursoIndice === indice}"><i class="bi bi-pencil"></i></button>
                <button type="button" class="is-danger" data-action="content-delete-resource" data-index="${indice}" title="Eliminar"><i class="bi bi-trash"></i></button>
            </span>
        </article>`;
}

function crearEditorRecursoParticipacion(recurso) {
    const icono = obtenerIconoBotonParticipacionPortal(recurso);
    const tipo = recurso.tipo_contenido || 'pdf';
    const necesitaFormulario = tipo === 'formulario' || tipo === 'ambos';
    const necesitaPdf = tipo === 'pdf' || tipo === 'ambos';
    const formulariosDisponibles = (estadoPortal.formularios || []).filter(function (formulario) {
        return formulario.modalidad === 'online' || formulario.modalidad === 'ambos';
    });
    const formularioSeleccionado = formulariosDisponibles.find(function (formulario) {
        return Number(formulario.id) === Number(recurso.formulario_id);
    });
    const pdfFormulario = formularioSeleccionado?.pdf_url || recurso.formulario_pdf_url || '';

    return `
        <div class="portal-content-editor">
            <div class="portal-content-editor__heading">
                <strong>${recurso.id ? 'Editar botón de participación' : 'Nuevo botón de participación'}</strong>
                <button type="button" data-action="content-cancel-resource" title="Cerrar"><i class="bi bi-x-lg"></i></button>
            </div>

            <div class="portal-resource-preview" style="--item-color:${escaparHtml(recurso.color || estadoPortal.configuracion.color_primario || '#540000')}">
                ${icono ? `<span><i class="bi bi-${escaparHtml(icono)}"></i></span>` : ''}
                <div>
                    <strong>${escaparHtml(recurso.texto_boton || 'Vista previa del botón')}</strong>
                    <small>El icono y el color se actualizan al instante.</small>
                </div>
            </div>

            <div class="portal-config-grid">
                ${crearCampoTextoLocal('Título del botón', 'resource-title', recurso.texto_boton || '')}
                ${crearCampoSeleccionLocal('Contenido del botón', 'resource-type', tipo, [
                    ['pdf', 'Solo documento PDF'],
                    ['formulario', 'Solo formulario online'],
                    ['ambos', 'Formulario online y PDF']
                ])}

                ${crearCampoIcono('Icono del botón', 'resource-icon', icono, 'data-content-local')}

                ${crearCampoColorLocal('Color del botón', 'resource-color', recurso.color || estadoPortal.configuracion.color_primario || '#540000')}

                <div class="portal-config-field" style="grid-column:1/-1">
                    <div class="form-check form-switch">
                        <input class="form-check-input" type="checkbox" data-content-local="resource-visible" ${recurso.visible !== false ? 'checked' : ''}>
                        <label class="form-check-label">Mostrar este recurso en la página pública</label>
                    </div>
                    <div class="portal-config-help">Ocultarlo no elimina el archivo, el formulario ni su diseño.</div>
                </div>

                ${necesitaFormulario ? `
                    ${crearCampoSeleccionLocal(
                        'Formulario vinculado',
                        'resource-form',
                        String(recurso.formulario_id || ''),
                        [
                            ['', 'Selecciona un formulario'],
                            ...formulariosDisponibles.map(function (formulario) {
                                const estado = convertirBooleano(formulario.activo, false) ? '' : ' · borrador';
                                return [String(formulario.id), `${formulario.titulo}${estado}`];
                            })
                        ]
                    )}
                    <div class="portal-config-help" style="grid-column:1/-1">
                        Las respuestas online se guardan y se envían al gestor municipal. También se avisa al arquitecto cuando el municipio tiene activada esa opción.
                    </div>` : ''}

                ${necesitaPdf ? `
                    <div class="portal-config-field" style="grid-column:1/-1">
                        <label>Documento PDF</label>
                        <div class="input-group">
                            <input class="form-control" data-content-local="resource-file" value="${escaparHtml(recurso.archivo_url || '')}" placeholder="${pdfFormulario ? 'Se usará el PDF del formulario si no subes otro' : 'Selecciona un archivo PDF'}" readonly>
                            <button class="btn btn-outline-primary" type="button" data-action="content-select-resource-file" title="Seleccionar PDF"><i class="bi bi-upload"></i></button>
                        </div>
                        <input type="file" class="d-none" data-content-file="resource" accept="application/pdf,.pdf">
                        <div class="portal-config-help">
                            ${pdfFormulario
                                ? `El formulario vinculado ya tiene PDF: ${escaparHtml(pdfFormulario)}`
                                : 'Sube el PDF que podrá descargar la ciudadanía.'}
                        </div>
                    </div>` : ''}
            </div>

            <div class="portal-content-editor__actions">
                <button type="button" class="btn btn-light btn-sm" data-action="content-cancel-resource">Cancelar</button>
                <button type="button" class="btn btn-primary btn-sm" data-action="content-save-resource"><i class="bi bi-check2 me-1"></i>Guardar botón</button>
            </div>
        </div>`;
}

function crearFilaDocumentoContenido(documento, indice) {
    const textoBusqueda = normalizarTextoBusquedaDocumentos([
        documento.titulo,
        documento.codigo_fase,
        documento.categoria
    ].join(' '));

    return `
        <article
            class="portal-content-row"
            data-document-row
            data-document-index="${indice}"
            data-document-search="${escaparHtml(textoBusqueda)}">
            <span class="portal-content-row__icon" style="--item-color:var(--pou-editor-primary)"><i class="bi bi-file-earmark-text"></i></span>
            <span class="portal-content-row__copy">
                <strong>${escaparHtml(documento.titulo || 'Documento sin título')}</strong>
                <small>${escaparHtml(documento.codigo_fase || 'Sin fase')} · ${escaparHtml(documento.categoria || 'Sin categoría')}</small>
            </span>
            <span class="portal-content-row__actions">
                <a href="${escaparHtml(documento.archivo_url || '#')}" target="_blank" title="Abrir"><i class="bi bi-box-arrow-up-right"></i></a>
                <button type="button" data-action="content-edit-document" data-index="${indice}" title="Editar"><i class="bi bi-pencil"></i></button>
                <button type="button" class="is-danger" data-action="content-delete-document" data-index="${indice}" title="Eliminar"><i class="bi bi-trash"></i></button>
            </span>
        </article>`;
}

function crearEditorDocumentoContenido(documento) {
    const fases = estadoPortal.datosContenido.fases_documentos || [];
    const categorias = estadoPortal.datosContenido.categorias || [];

    return `
        <div class="portal-content-editor">
            <div class="portal-content-editor__heading">
                <strong>${documento.id ? 'Editar documento' : 'Nuevo documento'}</strong>
                <button type="button" data-action="content-cancel-document" title="Cerrar"><i class="bi bi-x-lg"></i></button>
            </div>
            <div class="portal-config-grid">
                ${crearCampoTextoLocal('Título', 'document-title', documento.titulo || '')}
                ${crearCampoSeleccionLocal('Fase documental', 'document-phase', String(documento.fase_id || documento.num_fase || ''), [
                    ['', 'Selecciona una fase'],
                    ...fases.map(function (fase) {
                        return [String(fase.num_fase), `${fase.codigo} · ${fase.titulo}`];
                    })
                ])}
                ${crearCampoSeleccionLocal('Categoría', 'document-category', String(documento.categoria_id || ''), [
                    ['', 'Sin categoría'],
                    ...categorias.map(function (categoria) {
                        return [String(categoria.id), categoria.nombre];
                    })
                ])}
                <div class="portal-config-field">
                    <label>Archivo</label>
                    <div class="input-group">
                        <input class="form-control" data-content-local="document-file" value="${escaparHtml(documento.archivo_url || '')}" readonly>
                        <button class="btn btn-outline-primary" type="button" data-action="content-select-document-file"><i class="bi bi-upload"></i></button>
                    </div>
                    <input type="file" class="d-none" data-content-file="document" accept=".pdf,.doc,.docx,.jpg,.jpeg,.png">
                </div>
            </div>
            <div class="portal-content-editor__actions">
                <button type="button" class="btn btn-light btn-sm" data-action="content-new-category"><i class="bi bi-tag me-1"></i>Nueva categoría</button>
                <span class="flex-grow-1"></span>
                <button type="button" class="btn btn-light btn-sm" data-action="content-cancel-document">Cancelar</button>
                <button type="button" class="btn btn-primary btn-sm" data-action="content-save-document"><i class="bi bi-check2 me-1"></i>Guardar documento</button>
            </div>
        </div>`;
}

function crearFilaNoticiaContenido(noticia, indice) {
    const publicada = convertirBooleano(noticia.activa, false);

    return `
        <article class="portal-content-row">
            <span class="portal-content-row__thumbnail">${noticia.imagen_url ? `<img src="${escaparHtml(noticia.imagen_url)}" alt="">` : '<i class="bi bi-image"></i>'}</span>
            <span class="portal-content-row__copy">
                <strong>${escaparHtml(noticia.titulo || 'Noticia sin título')}</strong>
                <small>${escaparHtml(noticia.fecha_publicacion || '')} · ${publicada ? 'Publicada' : 'Borrador'}</small>
            </span>
            <span class="portal-content-row__actions">
                <button type="button" data-action="content-toggle-news" data-index="${indice}" title="${publicada ? 'Despublicar noticia' : 'Publicar noticia'}">
                    <i class="bi bi-${publicada ? 'eye-slash' : 'eye'}"></i>
                </button>
                <button type="button" data-action="content-edit-news" data-index="${indice}" title="Editar"><i class="bi bi-pencil"></i></button>
                <button type="button" class="is-danger" data-action="content-delete-news" data-index="${indice}" title="Eliminar"><i class="bi bi-trash"></i></button>
            </span>
        </article>`;
}

function crearEditorNoticiaContenido(noticia) {
    return `
        <div class="portal-content-editor">
            <div class="portal-content-editor__heading">
                <strong>${noticia.id ? 'Editar noticia' : 'Nueva noticia'}</strong>
                <button type="button" data-action="content-cancel-news" title="Cerrar"><i class="bi bi-x-lg"></i></button>
            </div>
            <div class="portal-config-grid">
                ${crearCampoTextoLocal('Título', 'news-title', noticia.titulo || '')}
                ${crearCampoFechaLocal('Fecha de publicación', 'news-date', noticia.fecha_publicacion || '')}
                ${crearCampoTextoLocal('Enlace de detalle', 'news-link', noticia.enlace_detalle || '', 'https://...')}
                <div class="portal-config-field">
                    <label>Imagen ${noticia.id ? '(opcional para mantener la actual)' : '(obligatoria)'}</label>
                    <input type="file" class="form-control" data-content-file="news" accept="image/jpeg,image/png">
                </div>
                ${crearCampoTextoEnriquecidoLocal('Resumen', 'news-summary', noticia.resumen || '', 5)}
                <div class="portal-config-field" style="grid-column:1/-1">
                    <label class="portal-local-switch">
                        <input type="checkbox" data-content-local="news-active" ${convertirBooleano(noticia.activa, true) ? 'checked' : ''}>
                        <span>Publicar noticia</span>
                    </label>
                </div>
            </div>
            <div class="portal-content-editor__actions">
                <button type="button" class="btn btn-light btn-sm" data-action="content-cancel-news">Cancelar</button>
                <button type="button" class="btn btn-primary btn-sm" data-action="content-save-news"><i class="bi bi-check2 me-1"></i>Guardar noticia</button>
            </div>
        </div>`;
}

function crearSelectorBibliotecaFaq() {
    const asignadas = new Set((estadoPortal.datosContenido.faqs || [])
        .map(function (faq) { return Number(faq.pregunta_id || 0); })
        .filter(Boolean));

    const opciones = (estadoPortal.datosContenido.faqs_disponibles || [])
        .filter(function (faq) { return !asignadas.has(Number(faq.id)); })
        .map(function (faq) {
            return `<option value="${Number(faq.id)}">${escaparHtml(faq.pregunta || '')}</option>`;
        }).join('');

    return `
        <div class="portal-content-editor portal-content-editor--compact mb-3">
            <strong class="d-block mb-2">Biblioteca común</strong>
            <div class="d-flex gap-2 align-items-end flex-wrap">
                <div class="portal-config-field flex-grow-1" style="min-width:260px">
                    <label>Pregunta disponible</label>
                    <select class="form-select" data-content-local="faq-library-select">
                        <option value="">-- Seleccionar pregunta --</option>
                        ${opciones}
                    </select>
                </div>
                <button type="button" class="btn btn-outline-primary btn-sm" data-action="content-assign-faq">
                    <i class="bi bi-link-45deg me-1"></i>Asignar
                </button>
            </div>
        </div>`;
}

function crearEditorNuevaFaq() {
    return `
        <div class="portal-content-editor portal-content-editor--compact">
            <div class="portal-config-grid">
                ${crearCampoTextoLocal('Pregunta', 'faq-question', '')}
                ${crearCampoTextoLargoLocal('Respuesta', 'faq-answer', '', 3)}
            </div>
            <div class="portal-content-editor__actions">
                <button type="button" class="btn btn-outline-success btn-sm" data-action="content-save-faq"><i class="bi bi-plus-circle me-1"></i>Crear para este municipio</button>
            </div>
        </div>`;
}

function crearFilaFaqContenido(faq, indice) {
    const exclusiva = convertirBooleano(faq.es_exclusiva, false);
    const personalizada = convertirBooleano(faq.personalizada, false);
    const tipo = exclusiva ? 'Municipal' : (personalizada ? 'Adaptada' : 'Biblioteca');

    return `
        <article class="portal-content-row">
            <span class="portal-content-row__icon" style="--item-color:var(--pou-editor-primary)"><i class="bi bi-question-circle"></i></span>
            <span class="portal-content-row__copy">
                <strong>${escaparHtml(faq.pregunta || 'Pregunta')}</strong>
                <small>${escaparHtml(recortarTextoContenido(faq.respuesta || '', 100))}</small>
                <em class="portal-content-row__meta">${tipo}</em>
            </span>
            <span class="portal-content-row__actions">
                <button type="button" data-action="content-view-faq" data-index="${indice}" title="Ver pregunta y respuesta"><i class="bi bi-eye"></i></button>
                <button type="button" data-action="content-edit-faq" data-index="${indice}" title="Editar solo para este municipio"><i class="bi bi-pencil"></i></button>
                ${personalizada && !exclusiva ? `<button type="button" data-action="content-restore-faq" data-index="${indice}" title="Restaurar texto de biblioteca"><i class="bi bi-arrow-counterclockwise"></i></button>` : ''}
                <button type="button" class="is-danger" data-action="content-delete-faq" data-index="${indice}" title="Retirar"><i class="bi bi-trash"></i></button>
            </span>
        </article>`;
}

// ============================================================================
// 4. EVENTOS Y ACCIONES
// ============================================================================

/**
 * Actualiza la vista del icono y los campos dependientes del tipo de botón.
 */
document.addEventListener('change', function (evento) {
    if (evento.target.hasAttribute('data-local-icon-select')) {
        if (estadoEditorContenido.recursoEditando) {
            marcarCambios(true, 'local');
            leerCamposLocalesRecurso(estadoEditorContenido.recursoEditando);
            actualizarListadoRecursosParticipacion();
        }
        return;
    }

    if (
        ['resource-type', 'resource-form'].includes(evento.target.dataset.contentLocal)
        && estadoEditorContenido.recursoEditando
    ) {
        leerCamposLocalesRecurso(estadoEditorContenido.recursoEditando);
        actualizarListadoRecursosParticipacion();
    }
});

/**
 * Actualiza el título y el color de la tarjeta mientras se escriben.
 */
document.addEventListener('input', function (evento) {
    if (
        evento.target.hasAttribute('data-content-local')
        && (
            estadoEditorContenido.recursoEditando
            || estadoEditorContenido.documentoEditando
            || estadoEditorContenido.noticiaEditando
        )
    ) {
        marcarCambios(true, 'local');
    }

    if (evento.target.hasAttribute('data-documents-search-configurator')) {
        estadoEditorContenido.busquedaDocumentos = evento.target.value || '';
        actualizarListadoDocumentosConfigurador();
        return;
    }

    const campo = evento.target.dataset.contentLocal;
    const vista = document.querySelector('.portal-resource-preview');

    if (!vista || !['resource-title', 'resource-color'].includes(campo)) {
        return;
    }

    if (campo === 'resource-title') {
        const titulo = vista.querySelector('strong');

        if (titulo) {
            titulo.textContent = evento.target.value.trim() || 'Vista previa del botón';
        }


    }

    if (campo === 'resource-color') {
        vista.style.setProperty('--item-color', evento.target.value || estadoPortal.configuracion.color_primario || '#540000');
    }
});

/**
 * Los archivos se procesan desde un único evento delegado.
 */
document.addEventListener('change', async function (evento) {
    if (
        evento.target.hasAttribute('data-content-local')
        && (
            estadoEditorContenido.recursoEditando
            || estadoEditorContenido.documentoEditando
            || estadoEditorContenido.noticiaEditando
        )
    ) {
        marcarCambios(true, 'local');
    }

    const tipoArchivo = evento.target.dataset.contentFile;

    if (!tipoArchivo) {
        return;
    }

    const archivo = evento.target.files?.[0];

    if (!archivo) {
        return;
    }

    if (tipoArchivo === 'resource') {
        // Conservar título, tipo y color escritos antes de repintar tras la subida.
        leerCamposLocalesRecurso(estadoEditorContenido.recursoEditando);
        const url = await subirArchivoContenido(archivo, 'participacion');
        estadoEditorContenido.recursoEditando.archivo_url = url;
        marcarCambios(true, 'local');
        actualizarListadoRecursosParticipacion();
        return;
    }

    if (tipoArchivo === 'document') {
        const url = await subirArchivoContenido(archivo, 'documento');
        estadoEditorContenido.documentoEditando.archivo_url = url;
        marcarCambios(true, 'local');
        renderPanelSeccion('documentos');
        return;
    }

    if (tipoArchivo === 'news') {
        marcarCambios(true, 'local');
    }
});

/**
 * Cuando cambia la fase refrescamos el selector de subfase.
 */
document.addEventListener('change', function (evento) {
    if (evento.target.dataset.field === 'datosContenido.fase_actual.num_fase') {
        estadoPortal.datosContenido.fase_actual.subfase_id = '';
        estadoPortal.datosContenido.fase_actual.titulo_subfase = '';
        estadoPortal.datosContenido.fase_actual.imagen_url = '';
        window.setTimeout(function () {
            renderPanelSeccion('fases');
            programarVistaPrevia();
        }, 0);
    }
});

// Al elegir una subfase proponemos su descripción como estado actual.
// El usuario puede editar el texto después con el editor enriquecido.
document.addEventListener('change', function (evento) {
    if (evento.target.dataset.field !== 'datosContenido.fase_actual.subfase_id') {
        return;
    }

    const subfase = (estadoPortal.datosContenido.subfases || []).find(function (item) {
        return Number(item.id) === Number(evento.target.value);
    });

    // Título e imagen siguen la subfase; no son ilustraciones decorativas.
    estadoPortal.datosContenido.fase_actual.titulo_subfase = subfase?.titulo || '';
    estadoPortal.datosContenido.fase_actual.imagen_url = subfase?.imagen_url || '';
    if (subfase) {
        estadoPortal.datosContenido.fase_actual.estado_tramitacion = subfase.descripcion || subfase.titulo || '';
    }
    window.setTimeout(function () {
        renderPanelSeccion('fases');
        programarVistaPrevia();
    }, 0);
});

function recortarTextoContenido(texto, limite) {
    const valor = String(texto || '');
    return valor.length > limite ? valor.slice(0, limite - 3) + '...' : valor;
}

/**
 * Filtra la lista documental y limita la vista inicial a seis filas.
 * La gestión completa sigue disponible en el paso Documentos del asistente.
 */
function actualizarListadoDocumentosConfigurador() {
    const filas = Array.from(document.querySelectorAll('[data-document-row]'));
    const busqueda = normalizarTextoBusquedaDocumentos(
        estadoEditorContenido.busquedaDocumentos
    );
    const botonMostrar = document.querySelector('[data-documents-toggle]');
    const estadoVacio = document.querySelector('[data-documents-manager-empty]');
    let coincidencias = 0;
    let visibles = 0;

    filas.forEach(function (fila) {
        const coincide = !busqueda
            || String(fila.dataset.documentSearch || '').includes(busqueda);

        if (coincide) {
            coincidencias++;
        }

        const dentroDelLimite = busqueda
            || estadoEditorContenido.documentosExpandidos
            || coincidencias <= 6;

        fila.hidden = !coincide || !dentroDelLimite;

        if (!fila.hidden) {
            visibles++;
        }
    });

    if (estadoVacio) {
        estadoVacio.hidden = filas.length === 0 || visibles > 0;
    }

    if (botonMostrar) {
        botonMostrar.hidden = Boolean(busqueda) || coincidencias <= 6;
        botonMostrar.innerHTML = estadoEditorContenido.documentosExpandidos
            ? '<i class="bi bi-chevron-up me-1"></i>Mostrar menos'
            : `<i class="bi bi-list-ul me-1"></i>Mostrar todos (${coincidencias})`;
    }
}

/**
 * Prepara un texto para buscar sin distinguir mayúsculas ni tildes.
 */
function normalizarTextoBusquedaDocumentos(texto) {
    return String(texto || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .trim();
}

// ============================================================================
// 9. CAMPOS SENCILLOS DEL EDITOR
// ============================================================================

function crearCampoTextoLargoContenido(etiqueta, ruta, valor, filas) {
    return `
        <div class="portal-config-field" style="grid-column:1/-1">
            <label>${escaparHtml(etiqueta)}</label>
            <textarea class="form-control" rows="${Number(filas || 3)}" data-field="${escaparHtml(ruta)}">${escaparHtml(valor)}</textarea>
        </div>`;
}

function crearCampoTextoEnriquecidoContenido(etiqueta, ruta, valor, filas) {
    return `
        <div class="portal-config-field portal-config-field--rich" style="grid-column:1/-1">
            <label>${escaparHtml(etiqueta)}</label>
            <textarea class="form-control" rows="${Number(filas || 4)}" data-field="${escaparHtml(ruta)}" data-rich-editor="1">${escaparHtml(valor)}</textarea>
        </div>`;
}

function crearCampoFechaContenido(etiqueta, ruta, valor) {
    return `
        <div class="portal-config-field">
            <label>${escaparHtml(etiqueta)}</label>
            <input type="date" class="form-control" data-field="${escaparHtml(ruta)}" value="${escaparHtml(valor)}">
        </div>`;
}

function crearCampoTextoLocal(etiqueta, nombre, valor, placeholder) {
    return `
        <div class="portal-config-field">
            <label>${escaparHtml(etiqueta)}</label>
            <input class="form-control" data-content-local="${escaparHtml(nombre)}" value="${escaparHtml(valor)}" placeholder="${escaparHtml(placeholder || '')}">
        </div>`;
}

function crearCampoTextoLargoLocal(etiqueta, nombre, valor, filas) {
    return `
        <div class="portal-config-field" style="grid-column:1/-1">
            <label>${escaparHtml(etiqueta)}</label>
            <textarea class="form-control" rows="${Number(filas || 3)}" data-content-local="${escaparHtml(nombre)}">${escaparHtml(valor)}</textarea>
        </div>`;
}

function crearCampoTextoEnriquecidoLocal(etiqueta, nombre, valor, filas) {
    return `
        <div class="portal-config-field portal-config-field--rich" style="grid-column:1/-1">
            <label>${escaparHtml(etiqueta)}</label>
            <textarea class="form-control" rows="${Number(filas || 4)}" data-content-local="${escaparHtml(nombre)}" data-rich-editor="1">${escaparHtml(valor)}</textarea>
        </div>`;
}

function crearCampoSeleccionLocal(etiqueta, nombre, valor, opciones) {
    return `
        <div class="portal-config-field">
            <label>${escaparHtml(etiqueta)}</label>
            <select class="form-select" data-content-local="${escaparHtml(nombre)}">
                ${opciones.map(function (opcion) {
                    return `<option value="${escaparHtml(opcion[0])}" ${String(opcion[0]) === String(valor) ? 'selected' : ''}>${escaparHtml(opcion[1])}</option>`;
                }).join('')}
            </select>
        </div>`;
}

function crearCampoColorLocal(etiqueta, nombre, valor) {
    return crearSelectorColorPortal(etiqueta, 'data-content-local', nombre, valor);
}

function crearCampoFechaLocal(etiqueta, nombre, valor) {
    return `
        <div class="portal-config-field">
            <label>${escaparHtml(etiqueta)}</label>
            <input type="date" class="form-control" data-content-local="${escaparHtml(nombre)}" value="${escaparHtml(valor)}">
        </div>`;
}
