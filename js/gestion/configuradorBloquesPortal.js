/****************************************************************************
 * BLOQUES PERSONALIZADOS Y VISTA PREVIA DEL CONFIGURADOR
 *
 * Agrupa la creación de bloques libres y el ajuste responsive del lienzo.
 ****************************************************************************/

// ============================================================================
// 1. BLOQUES PÚBLICOS CREADOS POR EL GESTOR
// ============================================================================

/**
 * Conserva los bloques fijos y añade los bloques personalizados.
 */
function normalizarSecciones(secciones) {
    if (typeof secciones === 'string') {
        try {
            secciones = JSON.parse(secciones);
        } catch (error) {
            secciones = [];
        }
    }

    const configuradas = Array.isArray(secciones) ? secciones : [];
    const resultado = [];
    const idsUsados = new Set();

    configuradas.forEach(function (seccion) {
        const id = String(seccion?.id || '').replace(/[^a-zA-Z0-9_-]/g, '');

        if (!id || idsUsados.has(id)) {
            return;
        }

        const defecto = seccionesPorDefecto.find(function (item) {
            return item.id === id;
        });

        if (defecto) {
            const icono = normalizarNombreIconoPortal(seccion.icono ?? defecto.icono);
            resultado.push({
                id: id,
                tipo: 'sistema',
                titulo: seccion.titulo || defecto.titulo,
                icono: icono,
                color: seccion.color || defecto.color,
                visible: convertirBooleano(seccion.visible, true)
            });
            idsUsados.add(id);
            return;
        }

        if (seccion?.tipo !== 'personalizado') {
            return;
        }

        resultado.push({
            id: id,
            tipo: 'personalizado',
            titulo: seccion.titulo || 'Nuevo bloque',
            icono: seccion.icono === null || seccion.icono === undefined
                ? 'layout-text-window'
                : normalizarNombreIconoPortal(seccion.icono),
            color: seccion.color || estadoPortal.configuracion.color_primario || '#540000',
            visible: convertirBooleano(seccion.visible, true),
            diseno: ['texto', 'destacado', 'llamada', 'columnas'].includes(seccion.diseno)
                ? seccion.diseno
                : 'texto',
            kicker: seccion.kicker || '',
            contenido: seccion.contenido || '',
            destacado_titulo: seccion.destacado_titulo || '',
            destacado_texto: seccion.destacado_texto || '',
            columna_izquierda: seccion.columna_izquierda || '',
            columna_derecha: seccion.columna_derecha || '',
            boton_texto: seccion.boton_texto || '',
            boton_url: seccion.boton_url || ''
        });
        idsUsados.add(id);
    });

    seccionesPorDefecto.forEach(function (defecto) {
        if (!idsUsados.has(defecto.id)) {
            resultado.push({
                ...defecto,
                tipo: 'sistema',
                icono: obtenerIconoAccesoPortal({ destino: `#${defecto.id}`, icono: defecto.icono })
            });
        }
    });

    return resultado;
};

/**
 * Los bloques personalizados muestran además la opción de eliminarlos.
 */
function crearBotonBloquePersonalizado (seccion, indice) {
    const activo = estadoPortal.panelActual === `seccion:${seccion.id}` ? 'is-active' : '';
    const oculto = seccion.visible === false ? 'is-muted' : '';

    return `
        <button type="button" class="portal-builder-menu__item ${activo}" data-panel="seccion:${escaparHtml(seccion.id)}">
            <span class="portal-builder-menu__icon" style="--menu-color:${escaparHtml(seccion.color || estadoPortal.configuracion.color_primario || '#540000')}">
                <i class="bi bi-${escaparHtml(seccion.icono || 'layout-text-window')}"></i>
            </span>
            <span class="portal-builder-menu__copy">
                <strong>${escaparHtml(seccion.titulo || 'Nuevo bloque')}</strong>
                <small>Bloque personalizado · ${seccion.visible === false ? 'Oculto' : 'Visible'}</small>
            </span>
            <span class="portal-builder-menu__actions">
                <span class="portal-builder-menu__mini ${oculto}" data-section-action="toggle" data-index="${indice}" title="Mostrar u ocultar"><i class="bi bi-eye"></i></span>
                <span class="portal-builder-menu__mini" data-section-action="up" data-index="${indice}" title="Subir"><i class="bi bi-arrow-up"></i></span>
                <span class="portal-builder-menu__mini" data-section-action="down" data-index="${indice}" title="Bajar"><i class="bi bi-arrow-down"></i></span>
                <span class="portal-builder-menu__mini is-danger" data-section-action="delete" data-index="${indice}" title="Eliminar"><i class="bi bi-trash"></i></span>
            </span>
        </button>`;
}

/**
 * Crea un bloque nuevo con contenido editable.
 */
async function crearBloquePublicoPersonalizado() {
    const personalizados = estadoPortal.secciones.filter(function (seccion) {
        return seccion.tipo === 'personalizado';
    });

    if (personalizados.length >= 10) {
        Swal.fire('Límite alcanzado', 'Se pueden crear hasta diez bloques personalizados.', 'info');
        return;
    }

    const seleccion = await Swal.fire({
        title: 'Elige un diseño de bloque',
        html: `
            <div class="portal-layout-choices" role="radiogroup" aria-label="Diseño del nuevo bloque">
                <label><input type="radio" name="diseno_bloque" value="texto" checked><span><i class="bi bi-text-paragraph"></i><strong>Texto</strong><small>Contenido sencillo y botón opcional.</small></span></label>
                <label><input type="radio" name="diseno_bloque" value="destacado"><span><i class="bi bi-layout-sidebar-reverse"></i><strong>Texto destacado</strong><small>Contenido con una llamada lateral.</small></span></label>
                <label><input type="radio" name="diseno_bloque" value="llamada"><span><i class="bi bi-megaphone"></i><strong>Llamada a la acción</strong><small>Mensaje centrado con enlace principal.</small></span></label>
                <label><input type="radio" name="diseno_bloque" value="columnas"><span><i class="bi bi-layout-split"></i><strong>Dos columnas</strong><small>Dos contenidos paralelos y adaptables.</small></span></label>
            </div>`,
        showCancelButton: true,
        confirmButtonText: 'Crear bloque',
        cancelButtonText: 'Cancelar',
        focusConfirm: false,
        preConfirm: function () {
            return document.querySelector('input[name="diseno_bloque"]:checked')?.value || 'texto';
        }
    });

    if (!seleccion.isConfirmed) {
        return;
    }

    const diseno = seleccion.value || 'texto';
    const id = 'bloque-' + Date.now();
    const nuevo = {
        id: id,
        tipo: 'personalizado',
        titulo: 'Nuevo bloque',
        icono: 'layout-text-window',
        color: estadoPortal.configuracion.color_primario || '#540000',
        visible: true,
        diseno: diseno,
        kicker: '',
        contenido: '<p>Escribe aquí el contenido que verá la ciudadanía.</p>',
        destacado_titulo: diseno === 'destacado' ? 'Información destacada' : '',
        destacado_texto: diseno === 'destacado' ? '<p>Añade aquí el dato o mensaje principal.</p>' : '',
        columna_izquierda: diseno === 'columnas' ? '<p>Contenido de la primera columna.</p>' : '',
        columna_derecha: diseno === 'columnas' ? '<p>Contenido de la segunda columna.</p>' : '',
        boton_texto: '',
        boton_url: ''
    };

    estadoPortal.secciones.push(nuevo);
    marcarCambios(true);
    renderMenuConfigurador();
    mostrarPanelConfigurador(`seccion:${id}`);
    programarVistaPrevia();
};

/**
 * Elimina un bloque creado por el gestor.
 */
async function eliminarBloquePublicoPersonalizado(indice) {
    const seccion = estadoPortal.secciones[indice];

    if (!seccion || seccion.tipo !== 'personalizado') {
        return;
    }

    const confirmacion = await Swal.fire({
        title: '¿Eliminar este bloque?',
        text: 'El contenido del bloque también se eliminará al guardar.',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Eliminar',
        cancelButtonText: 'Cancelar',
        confirmButtonColor: '#c53636'
    });

    if (!confirmacion.isConfirmed) {
        return;
    }

    estadoPortal.secciones.splice(indice, 1);
    estadoPortal.panelActual = 'general';
    marcarCambios(true);
    renderMenuConfigurador();
    mostrarPanelConfigurador('general');
    programarVistaPrevia();
};

/**
 * Muestra el editor completo de un bloque personalizado.
 */
function renderPanelBloquePersonalizado (idSeccion) {
    const seccion = estadoPortal.secciones.find(function (item) {
        return item.id === idSeccion;
    });

    if (!seccion) return;

    establecerCabeceraPanel(seccion.titulo, 'Edita el diseño, el texto y el enlace de este bloque público.');

    const diseno = seccion.diseno || 'texto';
    let camposSegunDiseno = '';

    if (diseno === 'destacado') {
        camposSegunDiseno = `
            ${crearCampoTexto('Título destacado', `seccion.${idSeccion}.destacado_titulo`, seccion.destacado_titulo || '')}
            ${crearCampoTextoEnriquecidoContenido('Texto destacado', `seccion.${idSeccion}.destacado_texto`, seccion.destacado_texto || '', 4)}`;
    }

    if (diseno === 'columnas') {
        camposSegunDiseno = `
            ${crearCampoTextoEnriquecidoContenido('Primera columna', `seccion.${idSeccion}.columna_izquierda`, seccion.columna_izquierda || '', 5)}
            ${crearCampoTextoEnriquecidoContenido('Segunda columna', `seccion.${idSeccion}.columna_derecha`, seccion.columna_derecha || '', 5)}`;
    }

    document.getElementById('contenidoPanelConfigurador').innerHTML = `
        ${crearTarjetaConfiguracion(
            'Encabezado del bloque',
            'Texto sobre el título, título principal e icono del encabezado.',
            `<div class="portal-config-grid portal-config-grid--one mb-3">
                ${crearCampoTexto('Texto sobre el título', `seccion.${idSeccion}.kicker`, seccion.kicker || '')}
                ${crearCampoTexto('Título principal', `seccion.${idSeccion}.titulo`, seccion.titulo || '')}
             </div>
             <div class="portal-config-grid">
                ${crearCampoIcono('Icono del encabezado', `seccion.${idSeccion}.icono`, seccion.icono ?? 'layout-text-window')}
                ${crearCampoColor('Color del bloque y sus iconos', `seccion.${idSeccion}.color`, seccion.color || estadoPortal.configuracion.color_primario)}
                <div class="portal-config-field" style="grid-column:1/-1">
                    ${crearCampoInterruptor('Mostrar este bloque en la página pública', `seccion.${idSeccion}.visible`, seccion.visible !== false)}
                </div>
            </div>`
        )}

        ${crearTarjetaConfiguracion(
            'Diseño del bloque',
            'Puedes cambiar la composición sin perder el contenido ya escrito.',
            `<div class="portal-config-grid">
                ${crearCampoSeleccionGeneral('Composición', `seccion.${idSeccion}.diseno`, diseno, [
                    ['texto', 'Texto sencillo'],
                    ['destacado', 'Texto con destacado lateral'],
                    ['llamada', 'Llamada a la acción centrada'],
                    ['columnas', 'Contenido en dos columnas']
                ])}
            </div>`
        )}

        ${crearTarjetaConfiguracion(
            'Contenido del bloque',
            'Los campos disponibles se adaptan al diseño seleccionado.',
            `<div class="portal-config-grid">
                ${crearCampoTextoEnriquecidoContenido('Contenido', `seccion.${idSeccion}.contenido`, seccion.contenido || '', 8)}
                ${camposSegunDiseno}
                ${crearCampoTexto('Texto del botón opcional', `seccion.${idSeccion}.boton_texto`, seccion.boton_texto || '')}
                ${crearCampoTexto('Enlace del botón', `seccion.${idSeccion}.boton_url`, seccion.boton_url || '', 'https://... o #seccion')}
            </div>`
        )}

        <div class="portal-config-danger-zone">
            <div>
                <strong>Eliminar bloque</strong>
                <small>Esta acción se aplicará definitivamente al guardar.</small>
            </div>
            <button type="button" class="btn btn-outline-danger btn-sm" data-action="delete-current-custom-section" data-section-id="${escaparHtml(idSeccion)}">
                <i class="bi bi-trash me-1"></i>Eliminar
            </button>
        </div>`;
}

// ============================================================================
// 2. VISTA PREVIA FIEL A ESCRITORIO, TABLETA Y MÓVIL
// ============================================================================

const anchosVistaPrevia = {
    // La página pública se diseña para el ancho de las capturas de escritorio.
    // El iframe se escala después para entrar en la columna del configurador.
    desktop: 1920,
    tablet: 820,
    mobile: 390
};

let tamanoVistaPrevia = 'desktop';

/**
 * Escala un viewport real para que el diseño mantenga sus puntos de ruptura.
 */
function ajustarLienzoVistaPrevia() {
    const marco = document.getElementById('marcoVistaPreviaPortal');
    const lienzo = document.getElementById('lienzoVistaPreviaPortal');
    const iframe = document.getElementById('iframeVistaPreviaPortal');

    if (!marco || !lienzo || !iframe || iframe.classList.contains('d-none')) {
        return;
    }

    const anchoReal = anchosVistaPrevia[tamanoVistaPrevia] || 1440;
    const margen = 20;
    const anchoDisponible = Math.max(280, marco.clientWidth - margen * 2);
    const altoDisponible = Math.max(420, marco.clientHeight - margen * 2);
    const escala = Math.min(1, anchoDisponible / anchoReal);
    const altoReal = Math.max(620, Math.floor(altoDisponible / escala));

    lienzo.style.width = `${Math.round(anchoReal * escala)}px`;
    lienzo.style.height = `${altoDisponible}px`;

    iframe.style.width = `${anchoReal}px`;
    iframe.style.height = `${altoReal}px`;
    iframe.style.transform = `scale(${escala})`;
};

function cambiarTamanoVistaPrevia (tamano) {
    tamanoVistaPrevia = anchosVistaPrevia[tamano] ? tamano : 'desktop';

    const marco = document.getElementById('marcoVistaPreviaPortal');
    marco.classList.remove('is-desktop', 'is-tablet', 'is-mobile');
    marco.classList.add(`is-${tamanoVistaPrevia}`);

    document.querySelectorAll('[data-preview-size]').forEach(function (boton) {
        boton.classList.toggle('is-active', boton.dataset.previewSize === tamanoVistaPrevia);
    });

    window.requestAnimationFrame(ajustarLienzoVistaPrevia);
}

/**
 * Desplaza el iframe hasta la parte que se está configurando.
 */
function navegarVistaPreviaHastaPanel(panel) {
    const iframe = document.getElementById('iframeVistaPreviaPortal');
    const documento = iframe?.contentDocument;

    if (!documento) {
        return;
    }

    let destino = null;

    if (panel === 'cabecera') {
        destino = documento.querySelector('.portal-hero');
    } else if (panel === 'accesos') {
        destino = documento.querySelector('.portal-quick-access');
    } else if (panel === 'pie') {
        destino = documento.querySelector('.portal-footer');
    } else if (panel.startsWith('seccion:')) {
        destino = buscarSeccionVistaPrevia(documento, panel.split(':')[1]);
    }

    if (destino) {
        iframe.contentWindow.scrollTo({
            top: iframe.contentWindow.scrollY + destino.getBoundingClientRect().top - 20,
            behavior: 'smooth'
        });
    }
}

/**
 * Sincroniza los bloques personalizados antes de aplicar sus estilos.
 */
function actualizarBloquesPersonalizadosVistaPrevia (documento) {

    const contenedor = documento.querySelector('.portal-content');

    if (!contenedor) {
        return;
    }

    const idsActivos = estadoPortal.secciones
        .filter(function (seccion) { return seccion.tipo === 'personalizado'; })
        .map(function (seccion) { return seccion.id; });

    contenedor.querySelectorAll('[data-custom-section="1"]').forEach(function (elemento) {
        if (!idsActivos.includes(elemento.dataset.portalSection)) {
            elemento.remove();
        }
    });

    estadoPortal.secciones.forEach(function (seccion, indice) {
        if (seccion.tipo !== 'personalizado') {
            return;
        }

        let elemento = buscarSeccionVistaPrevia(documento, seccion.id);

        if (!elemento) {
            elemento = documento.createElement('section');
            elemento.id = seccion.id;
            elemento.dataset.portalSection = seccion.id;
            elemento.dataset.customSection = '1';
            elemento.className = 'portal-section portal-custom-section';
            contenedor.appendChild(elemento);
        }

        elemento.style.order = String(indice + 1);
        elemento.style.display = seccion.visible === false ? 'none' : '';
        elemento.style.setProperty('--section-color', seccion.color || estadoPortal.configuracion.color_primario || '#540000');
        elemento.dataset.customLayout = seccion.diseno || 'texto';
        elemento.className = `portal-section portal-custom-section portal-custom-section--${seccion.diseno || 'texto'}`;

        let contenidoAdicional = '';

        if (seccion.diseno === 'destacado') {
            contenidoAdicional = `
                <aside class="portal-custom-section__highlight" data-custom-highlight>
                    ${seccion.destacado_titulo ? `<strong>${escaparHtml(seccion.destacado_titulo)}</strong>` : ''}
                    <div class="portal-rich-text">${seccion.destacado_texto || ''}</div>
                </aside>`;
        }

        if (seccion.diseno === 'columnas') {
            contenidoAdicional = `
                <div class="portal-custom-section__columns" data-custom-columns>
                    <div class="portal-rich-text">${seccion.columna_izquierda || ''}</div>
                    <div class="portal-rich-text">${seccion.columna_derecha || ''}</div>
                </div>`;
        }

        elemento.innerHTML = `
            <div class="portal-section__heading">
                ${seccion.icono ? `<span class="section-icon" data-section-icon><i class="bi bi-${escaparHtml(seccion.icono)}"></i></span>` : '<span class="section-icon" data-section-icon hidden></span>'}
                <div>
                    <p class="section-kicker" data-custom-kicker>${escaparHtml(seccion.kicker || '')}</p>
                    <h2 data-section-title>${escaparHtml(seccion.titulo || 'Nuevo bloque')}</h2>
                </div>
            </div>
            <div class="portal-custom-section__layout">
                <div class="portal-custom-section__content portal-rich-text" data-custom-content>${seccion.contenido || ''}</div>
                ${contenidoAdicional}
            </div>
            ${seccion.boton_texto && seccion.boton_url ? `
                <a class="portal-button portal-custom-section__button" href="${escaparHtml(seccion.boton_url)}" style="--button-color:var(--section-color)" data-custom-button>
                    <span>${escaparHtml(seccion.boton_texto)}</span><i class="bi bi-arrow-right"></i>
                </a>` : ''}`;
    });
}

// ============================================================================
// 3. PEQUEÑAS CORRECCIONES DE COHERENCIA
// ============================================================================

document.addEventListener('DOMContentLoaded', function () {
    const iframe = document.getElementById('iframeVistaPreviaPortal');
    const marco = document.getElementById('marcoVistaPreviaPortal');

    iframe?.addEventListener('load', function () {
        window.setTimeout(ajustarLienzoVistaPrevia, 80);
    });

    // El ancho de la columna puede cambiar sin que cambie el tamaño de la
    // ventana. Observamos el marco para recalcular la escala en ese caso.
    if (marco && typeof ResizeObserver !== 'undefined') {
        const observadorVistaPrevia = new ResizeObserver(function () {
            ajustarLienzoVistaPrevia();
        });
        observadorVistaPrevia.observe(marco);
    }

    window.addEventListener('resize', ajustarLienzoVistaPrevia);
    window.setTimeout(ajustarLienzoVistaPrevia, 250);
});
