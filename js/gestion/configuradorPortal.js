/******************************************************************************
 * CONFIGURADOR VISUAL DEL PORTAL POU
 *
 * Esta pantalla funciona como un editor de tres columnas:
 * 1. Menú con la estructura del portal.
 * 2. Formulario del bloque seleccionado.
 * 3. Vista previa del portal público.
 *
 * Las funciones se han separado por responsabilidad para que otro
 * desarrollador pueda localizar fácilmente dónde se carga, dibuja,
 * modifica o guarda cada parte.
 ******************************************************************************/

// ============================================================================
// 1. ESTADO GENERAL DEL EDITOR
// ============================================================================

const datosInicialesPortal = window.POU_CONFIGURADOR || {};

const estadoPortal = {
    codMun: String(datosInicialesPortal.cod_mun || ''),
    municipio: {
        nombre: datosInicialesPortal.nombre || '',
        imagen_cabecera: datosInicialesPortal.imagen_cabecera || '',
        escudo: datosInicialesPortal.escudo || '',
        escudo_automatico: datosInicialesPortal.escudo_automatico || ''
    },
    configuracion: {},
    accesos: [],
    secciones: [],
    botonesParticipacion: [],
    formularios: [],
    formularioActual: null,

    // Textos y datos reales de cada bloque publico.
    contenido: {},
    datosContenido: {},

    // El panel puede venir indicado desde el wizard. Así el usuario entra
    // directamente en Formularios sin tener que buscarlo en el menú lateral.
    panelActual: datosInicialesPortal.panel_inicial || 'general',
    cambiosGenerales: false,
    cambiosLocales: false,
    hayCambios: false
};

const seccionesPorDefecto = datosInicialesPortal.valores_iniciales.secciones_portal;
const iconosPortal = datosInicialesPortal.iconos;

// La identidad corporativa se toma del mismo catálogo que el portal público.
const temasPreparados = {
    corporativo: {
        nombre: 'Corporativo',
        descripcion: 'Burdeos corporativo del POU.',
        ...datosInicialesPortal.valores_iniciales
    }
};

let temporizadorVistaPrevia = null;
let identificadorCargaConfigurador = 0;

/**
 * Accesos iniciales comunes a todos los portales.
 */
function crearAccesosPortalPorDefecto() {
    return datosInicialesPortal.accesos_iniciales.map(normalizarAcceso);
}

// ============================================================================
// 2. ARRANQUE DE LA PANTALLA
// ============================================================================

document.addEventListener('DOMContentLoaded', function () {
    configurarEventosGenerales();
    cargarDatosConfigurador();
});

/**
 * Conecta los eventos que permanecen activos durante toda la pantalla.
 * Los formularios interiores se controlan mediante delegación de eventos,
 * porque su HTML cambia cada vez que el usuario selecciona otro bloque.
 */
function configurarEventosGenerales() {
    const menu = document.getElementById('menuConfiguradorPortal');
    const contenido = document.getElementById('contenidoPanelConfigurador');
    const iframe = document.getElementById('iframeVistaPreviaPortal');

    menu.addEventListener('click', gestionarClickMenu);
    contenido.addEventListener('click', gestionarClickContenido);
    contenido.addEventListener('input', gestionarCambioContenido);
    contenido.addEventListener('change', gestionarCambioContenido);

    document.getElementById('btnGuardarPortalCompleto')
        .addEventListener('click', guardarConfiguracionPortal);

    document.getElementById('btnRecargarConfigurador')
        .addEventListener('click', confirmarDescartarCambios);

    document.querySelectorAll('[data-preview-size]').forEach(function (boton) {
        boton.addEventListener('click', function () {
            cambiarTamanoVistaPrevia(boton.dataset.previewSize);
        });
    });

    iframe.addEventListener('load', function () {
        // Esperamos un instante para que el portal termine su animación de carga.
        window.setTimeout(aplicarCambiosEnVistaPrevia, 220);
    });
}

/**
 * Carga en paralelo la configuración visual y los formularios del municipio.
 */
async function cargarDatosConfigurador() {
    const cargaActual = ++identificadorCargaConfigurador;
    mostrarCargandoConfigurador(true);

    try {
        const [datosVisuales, datosFormularios] = await Promise.all([
            solicitarJson(
                `php/gestion/acciones/acciones_configuracion_visual.php?accion=obtener&cod_mun=${encodeURIComponent(estadoPortal.codMun)}`
            ),
            solicitarJson(
                `php/gestion/formularios_dinamicos/acciones_formularios.php?accion=listar&cod_mun=${encodeURIComponent(estadoPortal.codMun)}`
            )
        ]);

        // Si el usuario ha cambiado de municipio o la página ha iniciado otra
        // carga, ignoramos una respuesta anterior para no mezclar datos.
        if (cargaActual !== identificadorCargaConfigurador) {
            return;
        }

        if (String(datosVisuales.cod_mun || '') !== estadoPortal.codMun) {
            throw new Error('La respuesta pertenece a otro municipio. Recarga el configurador.');
        }

        if (datosFormularios.cod_mun && String(datosFormularios.cod_mun) !== estadoPortal.codMun) {
            throw new Error('Los formularios recibidos pertenecen a otro municipio. Recarga el configurador.');
        }

        estadoPortal.formularios = normalizarIconosDatosPortal(datosFormularios.formularios || []);
        prepararConfiguracionVisual(datosVisuales);

        renderMenuConfigurador();
        mostrarPanelConfigurador(estadoPortal.panelActual);
        marcarCambios(false);
        programarVistaPrevia();
    } catch (error) {
        Swal.fire('No se pudo abrir el configurador', error.message, 'error');
    } finally {
        mostrarCargandoConfigurador(false);
    }
}

/**
 * Convierte la respuesta del servidor en un estado seguro para el editor.
 */
function prepararConfiguracionVisual(datos) {
    datos = normalizarIconosDatosPortal(datos);
    const configuracion = { ...datosInicialesPortal.valores_iniciales, ...(datos.configuracion || {}) };

    estadoPortal.configuracion = {
        color_primario: configuracion.color_primario || '#540000',
        color_secundario: configuracion.color_secundario || '#540000',
        color_participacion: configuracion.color_participacion || '#540000',
        color_documentos: configuracion.color_documentos || '#540000',
        color_noticias: configuracion.color_noticias || '#540000',
        color_buzon: configuracion.color_buzon || '#540000',
        ancho_contenido: Number(configuracion.ancho_contenido || 1800),
        escala_texto: Number(configuracion.escala_texto || 1),
        mostrar_accesos: convertirBooleano(configuracion.mostrar_accesos, true)
    };

    // La identidad visual debe coincidir desde el primer render.
    document.body.style.setProperty('--pou-editor-primary', estadoPortal.configuracion.color_primario);

    const accesosCargados = Array.isArray(datos.accesos)
        ? datos.accesos.map(normalizarAcceso)
        : [];

    // El servidor distingue el índice inicial de una lista guardada vacía.
    // Conservamos esa decisión para que editor y página pública coincidan.
    estadoPortal.accesos = Array.isArray(datos.accesos)
        ? accesosCargados
        : crearAccesosPortalPorDefecto();

    estadoPortal.secciones = normalizarSecciones(configuracion.secciones_portal);
    estadoPortal.botonesParticipacion = Array.isArray(datos.botones_participacion)
        ? datos.botones_participacion.map(normalizarBotonParticipacion)
        : [];

    // El servidor ya completa los textos que faltan con sus valores iniciales.
    let contenidoPortal = configuracion.contenido_portal || {};

    if (typeof contenidoPortal === 'string') {
        try {
            contenidoPortal = JSON.parse(contenidoPortal);
        } catch (error) {
            contenidoPortal = {};
        }
    }

    estadoPortal.contenido = contenidoPortal || {};
    if (estadoPortal.contenido.pie) {
        delete estadoPortal.contenido.pie.color;
    }
    estadoPortal.datosContenido = datos.datos_contenido || {};

    // El servidor ya devuelve el Buzón sincronizado con el Wizard.
    // Repetimos la asignación de forma visible para que el estado del editor
    // tenga siempre un booleano sencillo.
    const seccionBuzon = estadoPortal.secciones.find(function (seccion) {
        return seccion.id === 'buzon';
    });

    if (seccionBuzon) {
        const buzonActivo = convertirBooleano(estadoPortal.datosContenido.buzon_activo, false);

        // El Wizard y el configurador modifican el mismo valor municipal.
        // Al abrir el configurador no combinamos dos interruptores distintos.
        seccionBuzon.visible = buzonActivo;
        estadoPortal.datosContenido.buzon_activo = seccionBuzon.visible;
    }

    // Conservamos la preferencia guardada de cada acceso. Si su bloque está
    // temporalmente oculto, la vista previa no lo dibuja, pero el acceso vuelve
    // a aparecer automáticamente al mostrar de nuevo ese bloque.

    estadoPortal.municipio.imagen_cabecera = datos.imagenes?.imagen_cabecera
        || estadoPortal.municipio.imagen_cabecera;

    estadoPortal.municipio.escudo = datos.imagenes?.escudo
        || estadoPortal.municipio.escudo;
    estadoPortal.municipio.escudo_automatico = datos.imagenes?.escudo_automatico
        || estadoPortal.municipio.escudo_automatico;
    prepararContenidoCompleto();
}

// ============================================================================
// 3. MENÚ LATERAL
// ============================================================================

/**
 * Dibuja el menú de estructura siguiendo el aspecto del mockup aprobado.
 */
function renderMenuConfigurador() {
    const menu = document.getElementById('menuConfiguradorPortal');

    const bloquesFijos = [
        crearBotonMenu('general', 'Diseño general', 'Colores, ancho y tipografía', 'palette', estadoPortal.configuracion.color_primario),
        crearBotonMenu('cabecera', 'Cabecera', 'Escudo, banner y título', 'image', estadoPortal.configuracion.color_primario),
        crearBotonMenu('accesos', 'Índice de la página', 'Accesos rápidos configurables', 'layout-text-window', estadoPortal.configuracion.color_primario),
        crearBotonMenu('formularios', 'Formularios y encuestas', `${estadoPortal.formularios.length} formularios configurados`, 'ui-checks-grid', estadoPortal.configuracion.color_primario)
    ].join('');

    const botonesSecciones = estadoPortal.secciones.map(function (seccion, indice) {
        return crearBotonSeccionMenu(seccion, indice);
    }).join('');

    menu.innerHTML = `
        ${bloquesFijos}
        <div class="portal-builder-menu__group">Bloques públicos</div>
        ${botonesSecciones}
        ${crearBotonMenu('pie', 'Pie de página', 'Fondo gris y textos', 'layout-text-window-reverse', estadoPortal.configuracion.color_primario)}
    `;

    if (!menu || menu.querySelector('[data-add-custom-section]')) {
        return;
    }

    const boton = document.createElement('button');
    boton.type = 'button';
    boton.className = 'portal-builder-add-section';
    boton.setAttribute('data-add-custom-section', '1');
    boton.innerHTML = '<i class="bi bi-plus-circle"></i><span>Añadir bloque público</span>';
    menu.appendChild(boton);

}

/**
 * Crea un botón simple del menú lateral.
 */
function crearBotonMenu(panel, titulo, descripcion, icono, color) {
    const activo = estadoPortal.panelActual === panel ? 'is-active' : '';

    return `
        <button type="button" class="portal-builder-menu__item ${activo}" data-panel="${panel}">
            <span class="portal-builder-menu__icon" style="--menu-color:${color}">
                <i class="bi bi-${icono}"></i>
            </span>
            <span class="portal-builder-menu__copy">
                <strong>${escaparHtml(titulo)}</strong>
                <small>${escaparHtml(descripcion)}</small>
            </span>
            <span></span>
        </button>
    `;
}

/**
 * Crea un botón de sección con controles de visibilidad y orden.
 */
function crearBotonSeccionMenu(seccion, indice) {
    if (seccion.tipo === 'personalizado') {
        return crearBotonBloquePersonalizado(seccion, indice);
    }

    const activo = estadoPortal.panelActual === `seccion:${seccion.id}` ? 'is-active' : '';
    const oculto = seccion.visible === false ? 'is-muted' : '';

    return `
        <button type="button" class="portal-builder-menu__item ${activo}" data-panel="seccion:${seccion.id}">
            <span class="portal-builder-menu__icon" style="--menu-color:${escaparHtml(seccion.color || estadoPortal.configuracion.color_primario)}">
                <i class="bi bi-${escaparHtml(seccion.icono || 'square')}"></i>
            </span>
            <span class="portal-builder-menu__copy">
                <strong>${escaparHtml(seccion.titulo)}</strong>
                <small>${seccion.visible === false ? 'Oculto' : 'Visible'}</small>
            </span>
            <span class="portal-builder-menu__actions">
                <span class="portal-builder-menu__mini ${oculto}" data-section-action="toggle" data-index="${indice}" title="Mostrar u ocultar">
                    <i class="bi bi-eye"></i>
                </span>
                <span class="portal-builder-menu__mini" data-section-action="up" data-index="${indice}" title="Subir">
                    <i class="bi bi-arrow-up"></i>
                </span>
                <span class="portal-builder-menu__mini" data-section-action="down" data-index="${indice}" title="Bajar">
                    <i class="bi bi-arrow-down"></i>
                </span>
            </span>
        </button>
    `;
}

/**
 * Gestiona la navegación y los controles pequeños del menú lateral.
 */
function gestionarClickMenu(evento) {
    const botonNuevo = evento.target.closest('[data-add-custom-section]');

    if (botonNuevo) {
        crearBloquePublicoPersonalizado();
        return;
    }

    const control = evento.target.closest('[data-section-action]');

    if (control && control.dataset.sectionAction === 'delete') {
        evento.preventDefault();
        evento.stopPropagation();
        eliminarBloquePublicoPersonalizado(Number(control.dataset.index));
        return;
    }

    const controlSeccion = evento.target.closest('[data-section-action]');

    if (controlSeccion) {
        evento.preventDefault();
        evento.stopPropagation();
        modificarSeccionDesdeMenu(controlSeccion);
        return;
    }

    const botonPanel = evento.target.closest('[data-panel]');

    if (botonPanel) {
        mostrarPanelConfigurador(botonPanel.dataset.panel);
        window.setTimeout(function () {
            navegarVistaPreviaHastaPanel(botonPanel.dataset.panel);
        }, 80);
    }
}

/**
 * Muestra, oculta o mueve una sección pública.
 */
function modificarSeccionDesdeMenu(control) {
    const indice = Number(control.dataset.index);
    const accion = control.dataset.sectionAction;
    const seccion = estadoPortal.secciones[indice];

    if (!seccion) {
        return;
    }

    if (accion === 'toggle') {
        seccion.visible = seccion.visible === false;

        // El Wizard y el configurador usan el mismo valor para el buzón.
        // Así el ojo del menú, el bloque y sus accesos nunca se contradicen.
        if (seccion.id === 'buzon') {
            estadoPortal.datosContenido.buzon_activo = seccion.visible;
        }
    }

    if (accion === 'up') {
        moverElemento(estadoPortal.secciones, indice, -1);
    }

    if (accion === 'down') {
        moverElemento(estadoPortal.secciones, indice, 1);
    }

    marcarCambios(true);
    renderMenuConfigurador();
    programarVistaPrevia();
}

// ============================================================================
// 4. PANELES DE PROPIEDADES
// ============================================================================

/**
 * Selecciona el panel central que debe mostrarse.
 */
function mostrarPanelConfigurador(panel) {
    estadoPortal.panelActual = panel;
    renderMenuConfigurador();

    if (panel === 'general') {
        renderPanelGeneral();
        return;
    }

    if (panel === 'cabecera') {
        renderPanelCabecera();
        return;
    }

    if (panel === 'accesos') {
        renderPanelAccesos();
        return;
    }

    if (panel === 'pie') {
        renderPanelPie();
        return;
    }

    if (panel === 'formularios') {
        renderPanelFormularios();
        return;
    }

    if (panel.startsWith('seccion:')) {
        renderPanelSeccion(panel.split(':')[1]);
    }
}

/**
 * Cambia el título y la descripción del panel central.
 */
function establecerCabeceraPanel(titulo, descripcion) {
    document.getElementById('tituloPanelConfigurador').textContent = titulo;
    document.getElementById('descripcionPanelConfigurador').textContent = descripcion;
}

/**
 * Dibuja el formulario de colores, ancho y lectura.
 */
function renderPanelGeneral() {
    establecerCabeceraPanel('Diseño general', 'Define la identidad visual y la legibilidad del portal.');

    const temas = Object.entries(temasPreparados).map(function ([clave, tema]) {
        // Los tonos de la muestra corresponden a lo que aplica el tema.
        const colores = [
            tema.color_primario,
            tema.color_secundario,
            tema.color_participacion
        ];

        return `
            <button type="button" class="portal-theme-button" data-theme="${clave}">
                <span class="portal-theme-colors">
                    ${colores.map(function (color) {
                        return `<span style="--theme-color:${color}"></span>`;
                    }).join('')}
                </span>
                <strong>${tema.nombre}</strong>
                <small>${tema.descripcion}</small>
            </button>
        `;
    }).join('');

    document.getElementById('contenidoPanelConfigurador').innerHTML = `
        ${crearTarjetaConfiguracion(
            'Temas preparados',
            'Selecciona un tono principal para la identidad global. Después puedes ajustar los colores de cada sección y de cada acceso por separado.',
            `<div class="portal-theme-list">${temas}</div>`
        )}

        ${crearTarjetaConfiguracion(
            'Colores del portal',
            'Este color define la identidad general del portal. Las secciones, accesos y recursos pueden seguir personalizándose con su propio color.',
            `<div class="portal-config-grid portal-config-grid--one">
                ${crearCampoColor('Color corporativo del portal', 'configuracion.color_primario', estadoPortal.configuracion.color_primario)}
            </div>`
        )}

        ${crearTarjetaConfiguracion(
            'Ancho y lectura',
            'Aumenta el ancho para aprovechar monitores grandes y ajusta el tamaño del texto.',
            `<div class="portal-config-grid">
                ${crearCampoNumero('Ancho máximo del contenido', 'configuracion.ancho_contenido', estadoPortal.configuracion.ancho_contenido, 1100, 1900, 20, 'Píxeles')}
                ${crearCampoNumero('Escala del texto', 'configuracion.escala_texto', estadoPortal.configuracion.escala_texto, 0.90, 1.20, 0.05, '1.00 es el tamaño normal')}
            </div>`
        )}
    `;
}

// ============================================================================
// Los formularios se gestionan en configuradorFormularios.js.
// ============================================================================

// ============================================================================
// 5. EVENTOS DEL PANEL CENTRAL
// ============================================================================

/**
 * Gestiona botones del panel central.
 */
function gestionarClickContenido(evento) {
    const botonTema = evento.target.closest('[data-theme]');
    const botonSubida = evento.target.closest('[data-upload-button]');
    const botonAccion = evento.target.closest('[data-action]');

    if (botonTema) {
        aplicarTema(botonTema.dataset.theme);
        return;
    }

    if (botonSubida) {
        const tipo = botonSubida.dataset.uploadButton;
        document.querySelector(`[data-upload-input="${tipo}"]`)?.click();
        return;
    }

    if (!botonAccion) {
        return;
    }

    ejecutarAccionPanel(botonAccion);
}

/**
 * Actualiza el estado cuando se escribe en un campo.
 */
function gestionarCambioContenido(evento) {
    const campoGeneral = evento.target.dataset.field;
    const campoFormulario = evento.target.dataset.formField;
    const opcionesFormulario = evento.target.dataset.formOptions;
    const archivo = evento.target.dataset.uploadInput;
    const archivoPdfFormulario = evento.target.hasAttribute('data-form-pdf-input');

    if (archivo) {
        subirImagenPortal(archivo, evento.target.files[0]);
        return;
    }

    if (archivoPdfFormulario) {
        // Un selector de archivo dispara input y change. La subida se hace una sola vez.
        if (evento.type === 'change') subirPdfFormularioPortal(evento.target.files[0]);
        return;
    }

    if (campoGeneral) {
        if (evento.target.matches('.portal-color-field input.form-control')
            && !/^#[0-9a-f]{6}$/i.test(evento.target.value)) {
            return;
        }
        actualizarCampoPortal(campoGeneral, obtenerValorCampo(evento.target));

        // Sincronizamos el selector y el hexadecimal del mismo color.
        if (evento.target.matches('input[type="color"]')) {
            const pareja = evento.target.parentElement.querySelector('input.form-control');
            if (pareja) pareja.value = evento.target.value;
        } else if (evento.target.matches('input.form-control') && /^#[0-9a-f]{6}$/i.test(evento.target.value)) {
            const pareja = evento.target.parentElement.querySelector('input[type="color"]');
            if (pareja) pareja.value = evento.target.value;
        }

        // El campo de destino depende del tipo elegido. Lo redibujamos para
        // mostrar una lista de secciones o formularios en lugar de pedir códigos.
        if (campoGeneral.match(/^accesos\.\d+\.tipo_destino$/)) {
            const indiceAcceso = Number(campoGeneral.split('.')[1]);
            const acceso = estadoPortal.accesos[indiceAcceso];

            if (acceso) {
                if (acceso.tipo_destino === 'seccion') acceso.destino = '#informacion';
                if (acceso.tipo_destino === 'formulario') acceso.destino = estadoPortal.formularios.find(esEncuestaOnline)?.slug || '';
                if (acceso.tipo_destino === 'url') acceso.destino = 'https://';
            }

            renderPanelAccesos();
        }

        // Mostramos el icono elegido sin obligar a guardar o recargar.
        if (evento.target.hasAttribute('data-icon-select')) {
            const icono = evento.target
                .closest('.portal-icon-field')
                ?.querySelector('.portal-icon-field__preview i');

            if (icono) {
                icono.className = evento.target.value ? `bi bi-${evento.target.value}` : '';
            }
        }

        if (campoGeneral.match(/^seccion\.[^.]+\.diseno$/)) {
            renderPanelSeccion(campoGeneral.split('.')[1]);
        }

        marcarCambios(true);
        programarVistaPrevia();
        return;
    }

    if (campoFormulario && estadoPortal.formularioActual) {
        establecerValorRuta(
            estadoPortal.formularioActual,
            campoFormulario,
            obtenerValorCampo(evento.target)
        );

        // Algunos campos cambian los controles visibles del editor.
        const cambiaEstructura = campoFormulario.endsWith('.tipo')
            || campoFormulario === 'modalidad';

        if (cambiaEstructura) {
            renderEditorFormulario();
        }

        return;
    }

    if (opcionesFormulario && estadoPortal.formularioActual) {
        const opciones = evento.target.value
            .split('\n')
            .map(function (opcion) {
                return opcion.trim();
            })
            .filter(Boolean);

        establecerValorRuta(estadoPortal.formularioActual, opcionesFormulario, opciones);
    }
}

/**
 * Ejecuta una acción concreta del panel central.
 */
function ejecutarAccionPanel(boton) {
    const accionContenido = boton.dataset.action || '';
    if (accionContenido.startsWith('content-')) {
        ejecutarAccionContenido(accionContenido, boton);
        return;
    }
    if (accionContenido === 'delete-current-custom-section') {
        const indice = estadoPortal.secciones.findIndex(function (seccion) {
            return seccion.id === boton.dataset.sectionId;
        });
        eliminarBloquePublicoPersonalizado(indice);
        return;
    }

    const accion = boton.dataset.action;

    if (accion === 'reset-crest') {
        estadoPortal.municipio.escudo = estadoPortal.municipio.escudo_automatico;
        marcarCambios(true);
        renderPanelCabecera();
        programarVistaPrevia();
        return;
    }

    if (accion === 'add-access') {
        estadoPortal.accesos.push(crearAccesoVacio());
        marcarCambios(true);
        renderPanelAccesos();
        programarVistaPrevia();
        return;
    }

    if (accion === 'add-custom-section-from-access') {
        if (typeof crearBloquePublicoPersonalizado === 'function') {
            crearBloquePublicoPersonalizado();
        }
        return;
    }

    if (accion.startsWith('access-')) {
        modificarAcceso(boton);
        return;
    }

    if (accion === 'new-form') {
        estadoPortal.formularioActual = crearFormularioVacioPortal();
        renderEditorFormulario();
        return;
    }

    if (accion === 'template-child') {
        estadoPortal.formularioActual = crearPlantillaInfantilPortal();
        renderEditorFormulario();
        return;
    }

    if (accion === 'template-general') {
        estadoPortal.formularioActual = crearPlantillaGeneralPortal();
        renderEditorFormulario();
        return;
    }

    if (accion === 'edit-form') {
        abrirFormularioParaEditar(Number(boton.dataset.id));
        return;
    }

    if (accion === 'delete-form') {
        eliminarFormularioPortal(
            Number(boton.dataset.id),
            Number(boton.dataset.responses || 0)
        );
        return;
    }

    if (accion === 'cancel-form') {
        estadoPortal.formularioActual = null;
        renderPanelFormularios();
        return;
    }

    if (accion === 'save-form') {
        guardarFormularioPortal();
        return;
    }

    if (accion === 'upload-form-pdf') {
        document.querySelector('[data-form-pdf-input]')?.click();
        return;
    }

    if (accion === 'add-form-section') {
        estadoPortal.formularioActual.secciones.push({
            titulo: 'Nuevo apartado',
            descripcion: '',
            preguntas: []
        });
        renderEditorFormulario();
        return;
    }

    if (accion.includes('form-section')) {
        modificarSeccionFormulario(boton);
        return;
    }

    if (accion.includes('form-question')) {
        modificarPreguntaFormulario(boton);
    }
}

/**
 * Actualiza un campo general o un campo de acceso.
 */
function actualizarCampoPortal(ruta, valor) {
    if (ruta.startsWith('configuracion.')) {
        if (obtenerValorRuta(estadoPortal, ruta) === valor) return;
        const colorAnterior = estadoPortal.configuracion.color_primario;
        establecerValorRuta(estadoPortal, ruta, valor);
        if (ruta === 'configuracion.color_primario') {
            // Se actualizan únicamente los elementos que seguían al color global.
            // Una sección con color propio conserva su elección.
            ['color_secundario', 'color_participacion', 'color_documentos', 'color_noticias', 'color_buzon'].forEach(function (campo) {
                if (estadoPortal.configuracion[campo] === colorAnterior) estadoPortal.configuracion[campo] = valor;
            });
            [estadoPortal.secciones, estadoPortal.accesos, estadoPortal.botonesParticipacion].forEach(function (lista) {
                lista.forEach(function (item) {
                    if (item.color === colorAnterior) item.color = valor;
                });
            });
            document.body.style.setProperty('--pou-editor-primary', valor);
            renderMenuConfigurador();
        }
        return;
    }

    if (ruta.startsWith('accesos.')) {
        establecerValorRuta(estadoPortal, ruta, valor);
        return;
    }

    if (ruta.startsWith('botonesParticipacion.')) {
        establecerValorRuta(estadoPortal, ruta, valor);
        return;
    }

    if (ruta.startsWith('contenido.')) {
        establecerValorRuta(estadoPortal, ruta, valor);
        return;
    }

    if (ruta.startsWith('datosContenido.')) {
        establecerValorRuta(estadoPortal, ruta, valor);
        if (ruta === 'datosContenido.informacion.titulo') {
            const seccion = estadoPortal.secciones.find(function (item) { return item.id === 'informacion'; });
            if (seccion && seccion.titulo !== valor) {
                seccion.titulo = valor;
                renderMenuConfigurador();
            }
        }
        return;
    }

    if (ruta.startsWith('seccion.')) {
        const partes = ruta.split('.');
        const idSeccion = partes[1];
        const campo = partes[2];
        const seccion = estadoPortal.secciones.find(function (item) {
            return item.id === idSeccion;
        });

        if (seccion) {
            // input y change pueden informar del mismo valor. No sustituimos el
            // menú al perder el foco: hacerlo interrumpe el clic de navegación.
            if (seccion[campo] === valor) return;
            const colorAnterior = seccion.color;
            seccion[campo] = valor;

            // Los recursos que usan el color de Participación siguen a su sección.
            // Los que tienen un color propio no se modifican.
            if (idSeccion === 'participacion' && campo === 'color') {
                estadoPortal.botonesParticipacion.forEach(function (boton) {
                    if (boton.color === colorAnterior) {
                        boton.color = valor;
                    }
                });
            }

            // En el buzón, el interruptor del bloque activa o desactiva también
            // el dato municipal que utiliza la página pública.
            if (idSeccion === 'buzon' && campo === 'visible') {
                estadoPortal.datosContenido.buzon_activo = valor !== false;
            }

            renderMenuConfigurador();
        }
    }
}

/**
 * Aplica un tema completo sin guardar todavía.
 */
function aplicarTema(nombreTema) {
    const tema = temasPreparados[nombreTema];

    if (!tema) {
        return;
    }

    Object.keys(estadoPortal.configuracion).forEach(function (campo) {
        if (campo.startsWith('color_') && tema[campo] !== undefined) {
            estadoPortal.configuracion[campo] = tema[campo];
        }
    });

    // El tema se aplica a todos los bloques y accesos. Después el gestor
    // puede cambiar cada color sin que se sobrescriba con el general.
    const colores = {
        informacion: tema.color_secundario,
        fases: tema.color_secundario,
        participacion: tema.color_participacion,
        documentos: tema.color_documentos,
        actualidad: tema.color_noticias,
        buzon: tema.color_buzon
    };
    estadoPortal.secciones.forEach(function (seccion) {
        seccion.color = colores[seccion.id] || tema.color_primario;
    });
    estadoPortal.accesos.forEach(function (acceso) {
        const idSeccion = String(acceso.destino || '').replace(/^#/, '');
        acceso.color = colores[idSeccion] || tema.color_primario;
    });
    estadoPortal.botonesParticipacion.forEach(function (boton) {
        boton.color = tema.color_participacion;
    });

    document.body.style.setProperty('--pou-editor-primary', estadoPortal.configuracion.color_primario);
    marcarCambios(true);
    renderMenuConfigurador();
    renderPanelGeneral();
    programarVistaPrevia();
}

/**
 * Añade, elimina o mueve un acceso rápido.
 */
function modificarAcceso(boton) {
    const indice = Number(boton.dataset.index);
    const accion = boton.dataset.action;

    if (!estadoPortal.accesos[indice]) {
        return;
    }

    if (accion === 'access-remove') {
        estadoPortal.accesos.splice(indice, 1);
    }

    if (accion === 'access-up') {
        moverElemento(estadoPortal.accesos, indice, -1);
    }

    if (accion === 'access-down') {
        moverElemento(estadoPortal.accesos, indice, 1);
    }

    marcarCambios(true);
    renderPanelAccesos();
    programarVistaPrevia();
}

// ============================================================================
// 6. GUARDADO Y SUBIDAS
// ============================================================================

/**
 * Guarda la configuración visual completa del municipio.
 */
async function guardarConfiguracionPortal() {
    // Los editores de botones, documentos y noticias tienen su propio botón
    // Guardar. Evitamos que el guardado general ignore un borrador abierto.
    if (estadoPortal.cambiosLocales) {
        await Swal.fire({
            icon: 'info',
            title: 'Hay una edición sin guardar',
            text: 'Guarda o cancela el botón, documento o noticia que estás editando antes de guardar el diseño general.'
        });
        return;
    }

    const boton = document.getElementById('btnGuardarPortalCompleto');
    const textoOriginal = boton.innerHTML;

    boton.disabled = true;
    boton.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span>Guardando';

    try {
        // Antes de guardar igualamos expresamente los dos puntos de entrada
        // desde los que se puede activar el buzón (Wizard y configurador).
        const seccionBuzon = estadoPortal.secciones.find(function (seccion) {
            return seccion.id === 'buzon';
        });

        if (seccionBuzon) {
            estadoPortal.datosContenido.buzon_activo = seccionBuzon.visible !== false;
        }

        const datosEnvio = {
            cod_mun: estadoPortal.codMun,
            ...estadoPortal.configuracion,
            accesos: estadoPortal.accesos,
            secciones_portal: estadoPortal.secciones,
            botones_participacion: estadoPortal.botonesParticipacion,
            contenido_portal: estadoPortal.contenido,
            datos_contenido: estadoPortal.datosContenido,
            imagen_cabecera: estadoPortal.municipio.imagen_cabecera,
            escudo: estadoPortal.municipio.escudo
        };

        const resultadoGuardado = await solicitarJson(
            `php/gestion/acciones/acciones_configuracion_visual.php?accion=guardar&cod_mun=${encodeURIComponent(estadoPortal.codMun)}`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(datosEnvio)
            }
        );

        // Comprobamos el resultado persistido antes de mostrar el mensaje.
        // Así un interruptor de acceso no puede parecer guardado si la base de
        // datos ha devuelto un valor diferente.
        comprobarAccesosGuardados(
            estadoPortal.accesos,
            resultadoGuardado.accesos_guardados || []
        );
        comprobarConfiguracionGuardada(resultadoGuardado);

        // El servidor ya devuelve los valores leídos de PostgreSQL después de
        // guardar. Los incorporamos sin recargar la pantalla ni el iframe para
        // conservar el bloque seleccionado y la posición exacta de la vista.
        actualizarEstadoDespuesDeGuardar(resultadoGuardado);
        marcarCambios(false, 'general');
        aplicarCambiosEnVistaPrevia();

        Swal.fire({
            icon: 'success',
            title: 'Diseño guardado',
            timer: 1300,
            showConfirmButton: false
        });
    } catch (error) {
        Swal.fire('No se pudo guardar', error.message, 'error');
    } finally {
        boton.disabled = false;
        boton.innerHTML = textoOriginal;
    }
}

/**
 * Incorpora las normalizaciones devueltas por el servidor sin redibujar la
 * pantalla. Así el usuario continúa exactamente donde estaba trabajando.
 */
function actualizarEstadoDespuesDeGuardar(resultadoGuardado) {
    const configuracionGuardada = resultadoGuardado.configuracion_guardada || {};
    const accesosGuardados = resultadoGuardado.accesos_guardados || [];

    estadoPortal.configuracion.color_primario =
        configuracionGuardada.color_primario || estadoPortal.configuracion.color_primario;
    estadoPortal.configuracion.color_secundario =
        configuracionGuardada.color_secundario || estadoPortal.configuracion.color_secundario;
    estadoPortal.configuracion.color_participacion =
        configuracionGuardada.color_participacion || estadoPortal.configuracion.color_participacion;
    estadoPortal.configuracion.color_documentos =
        configuracionGuardada.color_documentos || estadoPortal.configuracion.color_documentos;
    estadoPortal.configuracion.color_noticias =
        configuracionGuardada.color_noticias || estadoPortal.configuracion.color_noticias;
    estadoPortal.configuracion.color_buzon =
        configuracionGuardada.color_buzon || estadoPortal.configuracion.color_buzon;
    estadoPortal.configuracion.ancho_contenido =
        Number(configuracionGuardada.ancho_contenido || estadoPortal.configuracion.ancho_contenido);
    estadoPortal.configuracion.escala_texto =
        Number(configuracionGuardada.escala_texto || estadoPortal.configuracion.escala_texto);
    estadoPortal.configuracion.mostrar_accesos = convertirBooleano(
        configuracionGuardada.mostrar_accesos,
        estadoPortal.configuracion.mostrar_accesos
    );

    estadoPortal.secciones = normalizarSecciones(
        configuracionGuardada.secciones_portal || estadoPortal.secciones
    );
    estadoPortal.contenido = configuracionGuardada.contenido_portal || estadoPortal.contenido;
    estadoPortal.accesos = accesosGuardados.map(normalizarAcceso);
    estadoPortal.datosContenido.buzon_activo = convertirBooleano(
        resultadoGuardado.buzon_activo_guardado,
        false
    );
}

/**
 * Comprueba título, destino y visibilidad de los accesos recién guardados.
 */
function comprobarAccesosGuardados(accesosEnviados, accesosGuardados) {
    if (!Array.isArray(accesosGuardados)
        || accesosGuardados.length !== accesosEnviados.length) {
        throw new Error('No se han podido verificar todos los accesos del índice.');
    }

    accesosEnviados.forEach(function (accesoEnviado, indice) {
        const accesoGuardado = normalizarAcceso(accesosGuardados[indice] || {});
        const destinoEnviado = accesoEnviado.tipo_destino === 'seccion'
            ? `#${String(accesoEnviado.destino || '').replace(/^#/, '')}`
            : String(accesoEnviado.destino || '');

        if (accesoGuardado.titulo !== String(accesoEnviado.titulo || '')
            || accesoGuardado.destino !== destinoEnviado
            || accesoGuardado.icono !== String(accesoEnviado.icono || '')
            || accesoGuardado.color.toLowerCase() !== String(accesoEnviado.color).toLowerCase()
            || accesoGuardado.visible !== (accesoEnviado.visible !== false)) {
            throw new Error(
                `El acceso "${accesoEnviado.titulo || (indice + 1)}" no se ha guardado correctamente.`
            );
        }
    });
}

/**
 * Comprueba los estados generales que antes podían quedar contradictorios.
 */
function comprobarConfiguracionGuardada(resultadoGuardado) {
    const configuracionGuardada = resultadoGuardado.configuracion_guardada || {};
    const mostrarAccesosGuardado = convertirBooleano(
        configuracionGuardada.mostrar_accesos,
        true
    );

    if (mostrarAccesosGuardado !== estadoPortal.configuracion.mostrar_accesos) {
        throw new Error('La visibilidad del índice no se ha guardado correctamente.');
    }

    const seccionesGuardadas = normalizarSecciones(
        configuracionGuardada.secciones_portal
    );

    estadoPortal.secciones.forEach(function (seccionEnviada) {
        const seccionGuardada = seccionesGuardadas.find(function (seccion) {
            return seccion.id === seccionEnviada.id;
        });

        if (!seccionGuardada
            || seccionGuardada.color.toLowerCase() !== String(seccionEnviada.color).toLowerCase()
            || seccionGuardada.icono !== String(seccionEnviada.icono || '')
            || seccionGuardada.visible !== (seccionEnviada.visible !== false)
) {
            throw new Error(
                `La visibilidad del bloque "${seccionEnviada.titulo}" no se ha guardado correctamente.`
            );
        }
    });

    const ilustracionGuardada = convertirBooleano(
        configuracionGuardada.contenido_portal?.buzon?.mostrar_ilustracion,
        false
    );
    if (ilustracionGuardada !== convertirBooleano(estadoPortal.contenido.buzon?.mostrar_ilustracion, false)) {
        throw new Error('La opción de ilustración del Buzón no se ha guardado correctamente.');
    }

    const buzonActivoGuardado = convertirBooleano(
        resultadoGuardado.buzon_activo_guardado,
        false
    );
    const seccionBuzon = estadoPortal.secciones.find(function (seccion) {
        return seccion.id === 'buzon';
    });

    if (seccionBuzon
        && buzonActivoGuardado !== (seccionBuzon.visible !== false)) {
        throw new Error('El estado del Buzón no coincide entre el Wizard y el configurador.');
    }
}

/**
 * Sube una imagen y actualiza la vista previa sin guardar todavía el diseño.
 */
async function subirImagenPortal(tipo, archivo) {
    if (!archivo) {
        return;
    }

    const datos = new FormData();
    datos.append('cod_mun', estadoPortal.codMun);
    datos.append('tipo', tipo);
    datos.append('archivo', archivo);

    try {
        const resultado = await solicitarJson(
            'php/gestion/archivos/subirImagenMunicipio.php',
            {
                method: 'POST',
                body: datos
            }
        );

        if (tipo === 'banner') {
            estadoPortal.municipio.imagen_cabecera = resultado.url;
        } else {
            estadoPortal.municipio.escudo = resultado.url;
        }

        marcarCambios(true);
        renderPanelCabecera();
        programarVistaPrevia();
    } catch (error) {
        Swal.fire('No se pudo subir la imagen', error.message, 'error');
    }
}

// ============================================================================
// 7. RECARGA DE LA VISTA PREVIA
// ============================================================================

/**
 * Recarga el portal real después de guardar cambios en la base de datos.
 */
function recargarIframePortal() {
    const iframe = document.getElementById('iframeVistaPreviaPortal');
    const posicionHorizontal = iframe.contentWindow?.scrollX || 0;
    const posicionVertical = iframe.contentWindow?.scrollY || 0;
    const url = new URL(iframe.src, window.location.href);

    // 1. Añadimos una marca distinta para evitar una respuesta cacheada.
    url.searchParams.set('editor_refresh', String(Date.now()));

    // 2. Después de la carga recuperamos la posición anterior.
    iframe.addEventListener('load', function restaurarPosicion() {
        window.setTimeout(function () {
            iframe.contentWindow?.scrollTo(posicionHorizontal, posicionVertical);
        }, 260);
    }, { once: true });

    iframe.src = url.toString();
}

// ============================================================================
// 8. AYUDANTES DE HTML Y DATOS
// ============================================================================

/**
 * Construye una tarjeta de opciones del panel central.
 */
function crearTarjetaConfiguracion(titulo, descripcion, contenido) {
    return `
        <section class="portal-config-card">
            <div class="portal-config-card__heading">
                <h3>${escaparHtml(titulo)}</h3>
                <p>${escaparHtml(descripcion)}</p>
            </div>
            ${contenido}
        </section>
    `;
}

/**
 * Genera un campo de texto enlazado a una ruta del estado general.
 */
function crearCampoTexto(etiqueta, ruta, valor, placeholder, soloLectura) {
    const atributoRuta = ruta ? `data-field="${ruta}"` : '';

    return `
        <div class="portal-config-field">
            <label>${escaparHtml(etiqueta)}</label>
            <input class="form-control" ${atributoRuta} value="${escaparHtml(valor)}" placeholder="${escaparHtml(placeholder || '')}" ${soloLectura ? 'readonly' : ''}>
        </div>
    `;
}

/**
 * Genera un campo numérico con límites y texto de ayuda.
 */
function crearCampoNumero(etiqueta, ruta, valor, minimo, maximo, paso, ayuda) {
    return `
        <div class="portal-config-field">
            <label>${escaparHtml(etiqueta)}</label>
            <input type="number" class="form-control" data-field="${ruta}" value="${valor}" min="${minimo}" max="${maximo}" step="${paso}">
            <div class="portal-config-help">${escaparHtml(ayuda || '')}</div>
        </div>
    `;
}

/**
 * Genera el selector de color y su valor hexadecimal editable.
 */
function crearCampoColor(etiqueta, ruta, valor) {
    return crearSelectorColorPortal(etiqueta, 'data-field', ruta, valor);
}

/**
 * Genera un interruptor booleano para visibilidad o publicación.
 */
function crearCampoInterruptor(etiqueta, ruta, activo) {
    const id = 'switch_' + ruta.replace(/[^a-z0-9]/gi, '_');

    return `
        <div class="form-check form-switch">
            <input class="form-check-input" type="checkbox" id="${id}" data-field="${ruta}" ${activo ? 'checked' : ''}>
            <label class="form-check-label" for="${id}">${escaparHtml(etiqueta)}</label>
        </div>
    `;
}

/**
 * Dibuja un acceso rápido con sus campos y botones de ordenación.
 */
function crearEditorAcceso(acceso, indice) {
    const icono = obtenerIconoAccesoPortal(acceso);
    return `
        <article class="portal-repeater-item">
            <div class="portal-repeater-item__heading">
                <strong>Acceso ${indice + 1}</strong>
                <span class="portal-repeater-item__actions">
                    <button type="button" class="portal-small-button" data-action="access-up" data-index="${indice}" title="Subir"><i class="bi bi-arrow-up"></i></button>
                    <button type="button" class="portal-small-button" data-action="access-down" data-index="${indice}" title="Bajar"><i class="bi bi-arrow-down"></i></button>
                    <button type="button" class="portal-small-button is-danger" data-action="access-remove" data-index="${indice}" title="Eliminar"><i class="bi bi-trash"></i></button>
                </span>
            </div>

            <div class="portal-config-grid">
                ${crearCampoTexto('Título', `accesos.${indice}.titulo`, acceso.titulo || '')}
                ${crearCampoTexto('Descripción', `accesos.${indice}.descripcion`, acceso.descripcion || '')}
                ${crearCampoIcono('Icono', `accesos.${indice}.icono`, icono)}
                ${crearCampoColor('Color del acceso', `accesos.${indice}.color`, acceso.color)}
                ${crearCampoSeleccionGeneral('Tipo de destino', `accesos.${indice}.tipo_destino`, acceso.tipo_destino || 'seccion', [
                    ['seccion', 'Sección de la página'],
                    ['url', 'Enlace externo'],
                    ['formulario', 'Formulario online']
                ])}
                ${crearCampoDestinoAcceso(acceso, indice)}
                <div class="portal-config-field" style="grid-column:1/-1">
                    ${crearCampoInterruptor('Mostrar este acceso', `accesos.${indice}.visible`, acceso.visible !== false)}
                </div>
            </div>
        </article>
    `;
}

/**
 * Muestra un destino comprensible según el tipo de acceso.
 * El gestor no necesita conocer identificadores como #participacion.
 */
function crearCampoDestinoAcceso(acceso, indice) {
    const tipo = acceso.tipo_destino || 'seccion';
    const ruta = `accesos.${indice}.destino`;

    if (tipo === 'seccion') {
        // El selector se construye a partir de los bloques reales. Ya no se
        // muestran destinos antiguos como Noticias y Preguntas por separado.
        const secciones = estadoPortal.secciones.map(function (seccion) {
            const etiquetaOculta = seccion.visible === false ? ' · oculto' : '';
            return [`#${seccion.id}`, `${seccion.titulo || 'Bloque sin nombre'}${etiquetaOculta}`];
        });

        return `
            <div class="portal-config-field">
                <label>Sección de destino</label>
                <select class="form-select" data-field="${ruta}">
                    ${secciones.map(function (opcion) {
                        return `<option value="${escaparHtml(opcion[0])}" ${opcion[0] === acceso.destino ? 'selected' : ''}>${escaparHtml(opcion[1])}</option>`;
                    }).join('')}
                </select>
                <small>Solo aparecen los bloques que existen en esta página.</small>
            </div>`;
    }

    if (tipo === 'formulario') {
        const formularios = estadoPortal.formularios.filter(esEncuestaOnline);

        return `
            <div class="portal-config-field">
                <label>Formulario de destino</label>
                <select class="form-select" data-field="${ruta}">
                    <option value="">-- Seleccionar formulario --</option>
                    ${formularios.map(function (formulario) {
                        return `<option value="${escaparHtml(formulario.slug || '')}" ${String(formulario.slug || '') === String(acceso.destino || '') ? 'selected' : ''}>${escaparHtml(formulario.titulo || formulario.slug || 'Formulario')}</option>`;
                    }).join('')}
                </select>
                <small>Solo aparecen los formularios del municipio que estás configurando.</small>
            </div>`;
    }

    return crearCampoTexto('URL de destino', ruta, acceso.destino || 'https://', 'https://...');
}

/**
 * Genera un selector de iconos con nombres comprensibles.
 */


/**
 * Genera un selector para la configuración general del portal.
 */
function crearCampoSeleccionGeneral(etiqueta, ruta, valor, opciones) {
    return `
        <div class="portal-config-field">
            <label>${escaparHtml(etiqueta)}</label>
            <select class="form-select" data-field="${ruta}">
                ${opciones.map(function (opcion) {
                    return `<option value="${opcion[0]}" ${opcion[0] === valor ? 'selected' : ''}>${escaparHtml(opcion[1])}</option>`;
                }).join('')}
            </select>
        </div>
    `;
}

/**
 * Devuelve el estado vacío reutilizado en listados sin elementos.
 */
function crearVacio(texto) {
    return `
        <div class="portal-form-builder-empty">
            <i class="bi bi-ui-checks-grid"></i>
            <span>${escaparHtml(texto)}</span>
        </div>
    `;
}

/**
 * Crea un acceso rápido con valores iniciales seguros.
 */
function crearAccesoVacio() {
    return {
        titulo: 'Nuevo acceso',
        descripcion: 'Descripción breve',
        icono: 'link-45deg',
        color: estadoPortal.configuracion.color_primario || '#540000',
        destino: '#informacion',
        tipo_destino: 'seccion',
        visible: true
    };
}

/**
 * Mantiene los dibujos de las guías y fases igual que el PHP del portal.
 */
function obtenerIconoAccesoPortal(acceso) {
    return acceso.icono === null || acceso.icono === undefined ? 'link-45deg' : normalizarIconoPortal(acceso.icono);
}

/** Los nombres antiguos de los dibujos propios usan ahora el catálogo POU. */
function normalizarIconoPortal(icono) {
    const nombre = String(icono ?? '').trim().replace(/^(?:bi\s+)?bi-/, '');
    if (!nombre) return '';
    const propio = nombre.match(/^(?:[a-z0-9]+-)?(fases|manos|documentos|noticias|buzon|encuesta-infantil|encuesta-participacion)$/i);
    if (propio) return 'pou-' + propio[1].toLowerCase();
    return /^[a-zA-Z0-9-]+$/.test(nombre) ? nombre : 'link-45deg';
}

/** Adapta los campos de icono de respuestas JSON; conserva los demás valores. */
function normalizarIconosDatosPortal(datos) {
    if (Array.isArray(datos)) return datos.map(normalizarIconosDatosPortal);
    if (!datos || typeof datos !== 'object') return datos;
    const resultado = {};
    Object.keys(datos).forEach(function (clave) {
        resultado[clave] = clave === 'icono' || clave.endsWith('_icono')
            ? normalizarIconoPortal(datos[clave])
            : normalizarIconosDatosPortal(datos[clave]);
    });
    return resultado;
}

/**
 * Completa los campos que puedan faltar en un acceso leído de BBDD.
 */
function normalizarAcceso(acceso) {
    const tipoDestino = acceso.tipo_destino || 'seccion';
    let destino = acceso.destino || '#informacion';

    // Unificamos los registros antiguos que no incluían la almohadilla.
    if (tipoDestino === 'seccion') {
        destino = `#${String(destino).replace(/^#/, '')}`;
    }

    return {
        titulo: acceso.titulo || '',
        descripcion: acceso.descripcion || '',
        icono: obtenerIconoAccesoPortal(acceso),
        color: acceso.color || estadoPortal.configuracion.color_primario || '#540000',
        destino: destino,
        tipo_destino: tipoDestino,
        visible: convertirBooleano(acceso.visible, true)
    };
}

/**
 * Usa las mismas imágenes de las dos encuestas que la plantilla PHP.
 */
function obtenerIconoBotonParticipacionPortal(boton) {
    return boton.icono === null || boton.icono === undefined ? 'file-earmark-arrow-down' : normalizarIconoPortal(boton.icono);
}

/**
 * Completa los datos visuales de un botón de participación.
 */
function normalizarBotonParticipacion(boton) {
    const seccion = estadoPortal.secciones.find(function (item) {
        return item.id === 'participacion';
    });
    const colorSeccion = seccion?.color || estadoPortal.configuracion.color_primario || '#540000';
    // Se respeta cualquier color elegido; solo el vacío hereda el del bloque.
    const colorRecurso = String(boton.color || '').trim() || colorSeccion;

    return {
        id: Number(boton.id || 0),
        texto_boton: boton.texto_boton || '',
        archivo_url: boton.archivo_url || '',
        url_documento: boton.url_documento || '',
        documento_no_disponible: convertirBooleano(boton.documento_no_disponible, false),
        documento_pendiente: convertirBooleano(boton.documento_pendiente, false),
        icono: obtenerIconoBotonParticipacionPortal(boton),
        color: colorRecurso,
        tipo_contenido: boton.tipo_contenido || 'pdf',
        formulario_id: Number(boton.formulario_id || 0) || '',
        formulario_titulo: boton.formulario_titulo || '',
        formulario_slug: boton.formulario_slug || '',
        formulario_modalidad: boton.formulario_modalidad || '',
        formulario_pdf_url: boton.formulario_pdf_url || '',
        visible: convertirBooleano(boton.visible, true)
    };
}

/**
 * Intercambia un elemento con el anterior o el siguiente.
 */
function moverElemento(lista, indice, direccion) {
    const nuevoIndice = indice + direccion;

    if (nuevoIndice < 0 || nuevoIndice >= lista.length) {
        return;
    }

    const temporal = lista[indice];
    lista[indice] = lista[nuevoIndice];
    lista[nuevoIndice] = temporal;
}

/**
 * Convierte una ruta relativa del proyecto en una URL válida dentro del iframe.
 */
function obtenerRutaProyecto(ruta) {
    const rutaLimpia = String(ruta || '').trim();

    if (rutaLimpia === '') {
        return '';
    }

    if (/^(https?:|data:|blob:|\/)/i.test(rutaLimpia)) {
        return rutaLimpia;
    }

    return '/pou/' + rutaLimpia.replace(/^\.\//, '');
}

/**
 * Obtiene el valor correcto según el tipo de control HTML.
 */
function obtenerValorCampo(campo) {
    if (campo.type === 'checkbox') {
        return campo.checked;
    }

    if (campo.type === 'number') {
        return Number(campo.value);
    }

    return campo.value;
}

/**
 * Guarda un valor dentro de una ruta como "secciones.0.titulo".
 */
function establecerValorRuta(objeto, ruta, valor) {
    const partes = ruta.split('.');
    let referencia = objeto;

    partes.forEach(function (parte, indice) {
        const esUltima = indice === partes.length - 1;

        if (esUltima) {
            referencia[parte] = valor;
            return;
        }

        if (referencia[parte] === undefined) {
            referencia[parte] = /^\d+$/.test(partes[indice + 1]) ? [] : {};
        }

        referencia = referencia[parte];
    });
}

/**
 * Ejecuta una petición y unifica el tratamiento de respuestas JSON y errores.
 */
async function solicitarJson(url, opciones = {}) {
    const configuracionPeticion = {
        ...opciones,
        cache: 'no-store',
        credentials: 'same-origin',
        headers: {
            ...(opciones.headers || {}),
            'X-POU-Municipio': estadoPortal.codMun
        }
    };

    const respuesta = await fetch(url, configuracionPeticion);
    const texto = await respuesta.text();
    let datos = null;

    try {
        datos = JSON.parse(texto);
    } catch (error) {
        throw new Error('El servidor devolvió una respuesta no válida.');
    }

    if (!respuesta.ok || datos.ok === false || datos.success === false) {
        throw new Error(datos.mensaje || datos.message || 'No se pudo completar la operación.');
    }

    return datos;
}

/**
 * Actualiza el indicador de cambios pendientes de la cabecera.
 */
function marcarCambios(hayCambios, tipo = 'general') {
    if (tipo === 'local') {
        estadoPortal.cambiosLocales = hayCambios;
    } else if (tipo === 'todos') {
        estadoPortal.cambiosGenerales = hayCambios;
        estadoPortal.cambiosLocales = hayCambios;
    } else {
        estadoPortal.cambiosGenerales = hayCambios;
    }

    estadoPortal.hayCambios =
        estadoPortal.cambiosGenerales || estadoPortal.cambiosLocales;

    const estado = document.getElementById('estadoGuardadoPortal');
    const texto = estado.querySelector('[data-save-state-text]');

    estado.classList.toggle('has-changes', estadoPortal.hayCambios);

    if (texto) {
        texto.textContent = estadoPortal.hayCambios
            ? 'Cambios sin guardar'
            : 'Cambios guardados';
    }
}

/**
 * Muestra u oculta la capa que evita el FOUC durante la carga inicial.
 */
function mostrarCargandoConfigurador(mostrar) {
    document.getElementById('portalBuilderLoader')
        .classList.toggle('is-hidden', !mostrar);
}

/**
 * Pide confirmación antes de perder modificaciones visuales sin guardar.
 */
async function confirmarDescartarCambios() {
    if (!estadoPortal.hayCambios) {
        window.location.reload();
        return;
    }

    const confirmacion = await Swal.fire({
        title: '¿Descartar los cambios?',
        text: 'Se recuperará la última configuración guardada.',
        icon: 'question',
        showCancelButton: true,
        confirmButtonText: 'Descartar',
        cancelButtonText: 'Continuar editando'
    });

    if (confirmacion.isConfirmed) {
        window.location.reload();
    }
}

/**
 * Convierte los valores booleanos devueltos por PostgreSQL/PDO.
 * Según la configuración del servidor pueden llegar como true, false,
 * 1, 0, "t" o "f".
 */
function convertirBooleano(valor, valorPorDefecto) {
    if (valor === true || valor === 1) {
        return true;
    }

    if (valor === false || valor === 0) {
        return false;
    }

    const texto = String(valor ?? '').trim().toLowerCase();

    if (['1', 't', 'true', 'yes', 'si', 'sí'].includes(texto)) {
        return true;
    }

    if (['0', 'f', 'false', 'no'].includes(texto)) {
        return false;
    }

    return Boolean(valorPorDefecto);
}

/**
 * Escapa texto antes de insertarlo dentro de plantillas HTML.
 */
function escaparHtml(valor) {
    const equivalencias = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };

    return String(valor ?? '').replace(/[&<>"']/g, function (caracter) {
        return equivalencias[caracter];
    });
}

// ============================================================================
// 9. NAVEGACIÓN Y CAMBIOS PENDIENTES
// ============================================================================

// Evitamos recuperar desde la caché del navegador un configurador perteneciente
// a otro municipio y avisamos antes de perder cambios todavía no guardados.
window.addEventListener('pageshow', function (evento) {
    if (evento.persisted) window.location.reload();
});

window.addEventListener('beforeunload', function (evento) {
    if (!estadoPortal.hayCambios) return;
    evento.preventDefault();
    evento.returnValue = '';
});

function esEncuestaOnline(formulario) {
    return ['online', 'ambos'].includes(formulario.modalidad);
}

// El configurador siempre abre la encuesta como prueba, también si el municipio no está publicado.
function obtenerUrlPruebaEncuesta(slug) {
    const parametros = new URLSearchParams({cod_mun: estadoPortal.codMun, slug, preview: '1'});
    return obtenerRutaProyecto('php/municipio/formulario.php?' + parametros.toString());
}
