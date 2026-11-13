/****************************************************************************
 * SELECTORES DE ICONOS DEL CONFIGURADOR
 * Catálogo alfabético, búsqueda por nombre y miniaturas del dibujo real.
 * Conserva un select con los atributos existentes para guardar sin cambiar
 * los eventos de bloques, accesos, recursos y formularios.
 ****************************************************************************/

/** Genera el mismo selector para campos generales, encuestas y recursos locales. */
function crearCampoIcono(etiqueta, ruta, valor, atributo = 'data-field') {
    const actual = normalizarNombreIconoPortal(valor);
    const opciones = [['', 'Sin icono'], ...iconosPortal];
    if (actual && !opciones.some(function (opcion) { return opcion[0] === actual; })) {
        opciones.push([actual, 'Icono guardado (' + actual + ')']);
    }
    opciones.sort(function (a, b) {
        return a[1].localeCompare(b[1], 'es', { sensitivity: 'base' });
    });
    const seleccionada = opciones.find(function (opcion) { return opcion[0] === actual; });
    const id = 'icono_' + atributo.replace(/[^a-z]/g, '') + '_' + ruta.replace(/[^a-z0-9_-]/gi, '_');
    const campo = `${atributo}="${escaparHtml(ruta)}"`;
    const local = atributo === 'data-content-local' ? 'data-local-icon-select' : '';

    return `
        <div class="portal-config-field portal-icon-field">
            <label id="${id}_label" for="${id}">${escaparHtml(etiqueta)}</label>
            <select id="${id}" ${campo} data-icon-select ${local} hidden aria-hidden="true" tabindex="-1">
                ${opciones.map(function (opcion) {
                    return `<option value="${escaparHtml(opcion[0])}" ${opcion[0] === actual ? 'selected' : ''}>${escaparHtml(opcion[1])}</option>`;
                }).join('')}
            </select>
            <details class="portal-icon-picker" data-icon-picker>
                <summary class="portal-icon-picker__trigger" aria-labelledby="${id}_label ${id}_actual" aria-haspopup="listbox">
                    <span class="portal-icon-field__preview" aria-hidden="true"><i class="${actual ? 'bi bi-' + escaparHtml(actual) : ''}"></i></span>
                    <span id="${id}_actual" data-icon-current>${escaparHtml(seleccionada[1])}</span>
                    <i class="bi bi-chevron-down" aria-hidden="true"></i>
                </summary>
                <div class="portal-icon-picker__panel">
                    <input type="search" class="form-control" data-icon-search placeholder="Buscar icono: carpeta, mapa…" aria-label="Buscar icono de ${escaparHtml(etiqueta)}" autocomplete="off">
                    <div class="portal-icon-picker__list" role="listbox" aria-labelledby="${id}_label">
                        ${opciones.map(function (opcion) {
                            return `<button type="button" class="portal-icon-picker__option" data-icon-choice="${escaparHtml(opcion[0])}" role="option" aria-selected="${opcion[0] === actual}">
                                <i class="${opcion[0] ? 'bi bi-' + escaparHtml(opcion[0]) : 'bi bi-slash-circle'}" aria-hidden="true"></i>
                                <span>${escaparHtml(opcion[1])}</span>
                            </button>`;
                        }).join('')}
                    </div>
                    <p class="portal-icon-picker__empty" data-icon-empty role="status" hidden>No hay iconos con ese nombre.</p>
                </div>
            </details>
        </div>`;
}

/** La búsqueda ignora tildes y mayúsculas, y admite también el identificador del icono. */
function filtrarIconosPortal(caja) {
    const buscador = caja.querySelector('[data-icon-search]');
    const normalizar = function (texto) {
        return String(texto).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('es');
    };
    const consulta = normalizar(buscador.value.trim());
    let visibles = 0;
    caja.querySelectorAll('[data-icon-choice]').forEach(function (boton) {
        boton.hidden = !normalizar(boton.textContent + ' ' + boton.dataset.iconChoice).includes(consulta);
        if (!boton.hidden) visibles++;
    });
    caja.querySelector('[data-icon-empty]').hidden = visibles > 0;
}

/** Actualiza texto, miniatura y selección tanto desde el desplegable como desde el código. */
function sincronizarSelectorIconoPortal(selector) {
    const campo = selector.closest('.portal-icon-field');
    const opcion = selector.selectedOptions[0];
    if (!campo || !opcion) return;
    campo.querySelector('[data-icon-current]').textContent = opcion.textContent;
    campo.querySelector('.portal-icon-field__preview i').className = selector.value ? 'bi bi-' + selector.value : '';
    campo.querySelectorAll('[data-icon-choice]').forEach(function (boton) {
        boton.setAttribute('aria-selected', String(boton.dataset.iconChoice === selector.value));
    });
}

/** Cierra otros selectores al abrir uno o al hacer clic fuera del campo. */
function cerrarSelectoresIconosPortal(excepto = null) {
    document.querySelectorAll('[data-icon-picker][open]').forEach(function (caja) {
        if (caja !== excepto) caja.open = false;
    });
}

// Delegación: los campos se regeneran al cambiar de panel o editar un recurso.
document.addEventListener('toggle', function (evento) {
    const caja = evento.target;
    if (!caja.matches('[data-icon-picker]') || !caja.open) return;
    cerrarSelectoresIconosPortal(caja);
    const buscador = caja.querySelector('[data-icon-search]');
    buscador.value = '';
    filtrarIconosPortal(caja);
    buscador.focus();
}, true);

document.addEventListener('input', function (evento) {
    if (evento.target.hasAttribute('data-icon-search')) {
        filtrarIconosPortal(evento.target.closest('[data-icon-picker]'));
    }
});

document.addEventListener('click', function (evento) {
    const boton = evento.target.closest('[data-icon-choice]');
    if (!boton) {
        if (!evento.target.closest('.portal-icon-field')) cerrarSelectoresIconosPortal();
        return;
    }
    const campo = boton.closest('.portal-icon-field');
    const selector = campo.querySelector('select[data-icon-select]');
    selector.value = boton.dataset.iconChoice;
    sincronizarSelectorIconoPortal(selector);
    campo.querySelector('[data-icon-picker]').open = false;
    // El cambio sigue el mismo recorrido de guardado que cualquier campo del editor.
    selector.dispatchEvent(new Event('change', { bubbles: true }));
    if (campo.isConnected) campo.querySelector('summary').focus();
});

document.addEventListener('change', function (evento) {
    if (evento.target.matches('select[data-icon-select]')) {
        sincronizarSelectorIconoPortal(evento.target);
    }
});

// Teclado: Escape cierra; las flechas recorren los resultados; Enter elige desde la búsqueda.
document.addEventListener('keydown', function (evento) {
    const caja = evento.target.closest('[data-icon-picker]');
    if (!caja || !caja.open) return;
    if (evento.key === 'Escape') {
        evento.preventDefault();
        caja.open = false;
        caja.querySelector('summary').focus();
        return;
    }
    const opciones = Array.from(caja.querySelectorAll('[data-icon-choice]:not([hidden])'));
    if (!opciones.length) return;
    const buscando = evento.target.hasAttribute('data-icon-search');
    if (buscando && evento.key === 'Enter') {
        evento.preventDefault();
        opciones[0].click();
    } else if (evento.key === 'ArrowDown' || evento.key === 'ArrowUp') {
        evento.preventDefault();
        const indice = opciones.indexOf(document.activeElement);
        const siguiente = buscando ? 0 : Math.max(0, Math.min(opciones.length - 1, indice + (evento.key === 'ArrowDown' ? 1 : -1)));
        opciones[siguiente].focus();
    }
});
