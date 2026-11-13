/****************************************************************************
 * DOCUMENTOS PÚBLICOS
 *
 * Gestiona el cambio de fase, la búsqueda de documentos y el botón para
 * volver al inicio de la página.
 ****************************************************************************/

document.addEventListener('DOMContentLoaded', function () {
    inicializarNavegacionFases();
    inicializarBuscadoresDocumentos();
    // El portal municipal ya tiene su propio botón de subida.
    if (document.body.classList.contains('portal-documents-page')) {
        inicializarBotonSubir();
    }
    const modal = document.getElementById('modalDocumentosPortal');
    if (modal) {
        modal.addEventListener('shown.bs.modal', function () {
            modal.querySelector('[data-documents-search]')?.focus();
        });
        modal.addEventListener('hidden.bs.modal', function () {
            const campo = modal.querySelector('[data-documents-search]');
            if (campo) {
                campo.value = '';
                filtrarDocumentosFase(campo);
            }
        });
    }
});

window.addEventListener('load', function () {
    ocultarCargaDocumentos();
});

// ============================================================================
// 1. NAVEGACIÓN ENTRE FASES
// ============================================================================

/**
 * En pantallas estrechas acerca el panel al elegir otra fase.
 */
function inicializarNavegacionFases() {
    const enlacesFase = document.querySelectorAll('#fases-tab .nav-link:not(:disabled)');
    const panelDocumentos = document.querySelector('.documents-panel');

    enlacesFase.forEach(function (enlace) {
        enlace.addEventListener('click', function () {
            if (window.innerWidth > 1080) {
                return;
            }

            window.setTimeout(function () {
                panelDocumentos?.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }, 120);
        });
    });
}

// ============================================================================
// 2. BÚSQUEDA DE DOCUMENTOS
// ============================================================================

/**
 * Conecta el buscador independiente de cada fase.
 */
function inicializarBuscadoresDocumentos() {
    document.querySelectorAll('[data-documents-search]').forEach(function (campo) {
        campo.addEventListener('input', function () {
            filtrarDocumentosFase(campo);
        });
    });
}

/**
 * Muestra únicamente los documentos cuyo título contiene el texto buscado.
 *
 * @param {HTMLInputElement} campo Buscador de la fase visible.
 */
function filtrarDocumentosFase(campo) {
    const panelFase = campo.closest('.tab-pane');

    if (!panelFase) {
        return;
    }

    const textoBuscado = normalizarTextoBusqueda(campo.value);
    const documentos = panelFase.querySelectorAll('[data-document-item]');
    let totalVisibles = 0;

    // 1. Filtramos cada documento por su título.
    documentos.forEach(function (documento) {
        const titulo = documento.querySelector('.document-item__copy strong')
            ?.textContent || '';
        const coincide = normalizarTextoBusqueda(titulo).includes(textoBuscado);

        documento.hidden = !coincide;

        if (coincide) {
            totalVisibles++;
        }
    });

    // 2. Ocultamos las categorías que se hayan quedado sin resultados.
    panelFase.querySelectorAll('[data-documents-category]').forEach(function (categoria) {
        const tieneDocumentos = Array.from(
            categoria.querySelectorAll('[data-document-item]')
        ).some(function (documento) {
            return !documento.hidden;
        });

        categoria.hidden = !tieneDocumentos;
    });

    // 3. Actualizamos el contador y el estado vacío.
    const contador = panelFase.querySelector('[data-documents-visible]');
    const etiqueta = panelFase.querySelector('[data-documents-visible-label]');
    const estadoVacio = panelFase.querySelector('[data-documents-filter-empty]');

    if (contador) {
        contador.textContent = String(totalVisibles);
    }

    if (etiqueta) {
        etiqueta.textContent = totalVisibles === 1
            ? 'archivo visible'
            : 'archivos visibles';
    }

    if (estadoVacio) {
        estadoVacio.hidden = totalVisibles > 0;
    }
}

/**
 * Prepara un texto para buscar sin distinguir mayúsculas ni tildes.
 */
function normalizarTextoBusqueda(texto) {
    return String(texto || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .trim()
        .toLowerCase();
}

// ============================================================================
// 3. BOTÓN VOLVER ARRIBA Y CARGA
// ============================================================================

/**
 * Muestra el botón de subida cuando la página ya se ha desplazado.
 */
function inicializarBotonSubir() {
    const botonSubir = document.getElementById('btnScrollTop');

    if (!botonSubir) {
        return;
    }

    window.addEventListener('scroll', function () {
        botonSubir.classList.toggle('visible', window.scrollY > 360);
    }, { passive: true });

    botonSubir.addEventListener('click', function () {
        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
    });
}

/**
 * Retira la capa de carga cuando imágenes y estilos están disponibles.
 */
function ocultarCargaDocumentos() {
    const spinner = document.getElementById('spinner-carga-documentos');

    if (!spinner) {
        return;
    }

    document.body.classList.remove('portal-loading');
    spinner.classList.add('is-hidden');

    window.setTimeout(function () {
        spinner.remove();
    }, 420);
}
