/****************************************************************************
 * COLORES DEL CONFIGURADOR
 * Un selector compartido por bloques, accesos, recursos y formularios.
 * Reutiliza sus eventos actuales: solo cambia cómo se elige el color.
 ****************************************************************************/

const coloresHabitualesPortal = [
    ['#540000', 'Burdeos POU'], ['#0f4593', 'Azul'],
    ['#0891b2', 'Turquesa'], ['#16835b', 'Verde'],
    ['#65a30d', 'Verde claro'], ['#d69e00', 'Amarillo'],
    ['#ea780f', 'Naranja'], ['#dc403b', 'Rojo'],
    ['#c84985', 'Rosa'], ['#8056b3', 'Violeta'],
    ['#64748b', 'Gris'], ['#263247', 'Oscuro'], ['#ffffff', 'Blanco']
];
let coloresRecientesPortal = [];
try {
    const guardados = JSON.parse(localStorage.getItem('pou_colores_recientes') || '[]');
    if (Array.isArray(guardados)) {
        coloresRecientesPortal = guardados.filter(esColorPortal).slice(0, 10);
    }
} catch (error) {
    // Elegir colores sigue funcionando si el navegador no permite almacenamiento.
}

function esColorPortal(valor) {
    return typeof valor === 'string' && /^#[0-9a-f]{6}$/i.test(valor);
}

/** El atributo conserva el contrato del editor que consume cada campo. */
function crearSelectorColorPortal(etiqueta, atributo, ruta, valor) {
    if (!esColorPortal(valor)) valor = '#540000';
    const campo = `${atributo}="${escaparHtml(ruta)}"`;
    const id = 'color_' + atributo + '_' + ruta.replace(/[^a-z0-9]/gi, '_');
    return `<div class="portal-config-field portal-color-picker">
        <label for="${id}">${escaparHtml(etiqueta)}</label>
        <div class="portal-color-field">
            <button type="button" class="portal-color-trigger" data-color-open aria-expanded="false" aria-label="Elegir ${escaparHtml(etiqueta)}" style="--chosen-color:${valor}"><span></span><i class="bi bi-chevron-down" aria-hidden="true"></i></button>
            <input type="color" class="visually-hidden" tabindex="-1" ${campo} value="${valor}" aria-label="Color personalizado: ${escaparHtml(etiqueta)}">
            <input id="${id}" class="form-control" ${campo} value="${valor}" maxlength="7" pattern="#[0-9a-fA-F]{6}" spellcheck="false" aria-label="Valor hexadecimal: ${escaparHtml(etiqueta)}">
        </div>
        <div class="portal-color-palette" hidden></div>
    </div>`;
}

/** Incluye los tonos usados en cualquier bloque, botón, acceso o encuesta. */
function obtenerColoresUsadosPortal() {
    const colores = [];
    function agregar(valor) {
        if (esColorPortal(valor) && !colores.includes(valor.toLowerCase())) {
            colores.push(valor.toLowerCase());
        }
    }
    Object.values(estadoPortal.configuracion).forEach(agregar);
    [estadoPortal.secciones, estadoPortal.accesos, estadoPortal.botonesParticipacion, estadoPortal.formularios].forEach(function (lista) {
        (lista || []).forEach(function (elemento) { agregar(elemento.color); });
    });
    agregar(estadoPortal.contenido?.pie?.color);
    document.querySelectorAll('.portal-color-field input[type=color]').forEach(function (campo) { agregar(campo.value); });
    return colores;
}

function crearMuestrasColorPortal(titulo, opciones, actual) {
    if (!opciones.length) return '';
    let muestras = '';
    opciones.forEach(function (opcion) {
        const color = opcion[0];
        const nombre = opcion[1];
        muestras += `<button type="button" class="portal-color-swatch" data-color-value="${color}" style="--swatch-color:${color}" aria-label="${nombre} ${color}" title="${nombre} · ${color}" aria-pressed="${color.toLowerCase() === actual.toLowerCase()}"><i class="bi bi-check" aria-hidden="true"></i></button>`;
    });
    return `<div class="portal-color-palette__group"><span>${titulo}</span><div class="portal-color-swatches" role="group" aria-label="${titulo}">${muestras}</div></div>`;
}

function recordarColorPortal(color) {
    if (!esColorPortal(color)) return;
    color = color.toLowerCase();
    coloresRecientesPortal = [color].concat(coloresRecientesPortal.filter(function (item) { return item !== color; })).slice(0, 10);
    try { localStorage.setItem('pou_colores_recientes', JSON.stringify(coloresRecientesPortal)); } catch (error) { /* Sin persistencia, se conserva durante esta sesión. */ }
}

function cerrarPaletasColorPortal() {
    document.querySelectorAll('.portal-color-palette:not([hidden])').forEach(function (panel) {
        panel.hidden = true;
        panel.closest('.portal-color-picker').querySelector('[data-color-open]').setAttribute('aria-expanded', 'false');
    });
}

/** Sincroniza las dos entradas antes de que los editores lean sus eventos. */
function sincronizarMuestraColorPortal(evento) {
    const campo = evento.target;
    const selector = campo.closest('.portal-color-picker');
    if (!selector || !campo.matches('input')) return;
    if (!esColorPortal(campo.value)) { campo.setAttribute('aria-invalid', 'true'); return; }
    campo.removeAttribute('aria-invalid');
    selector.querySelectorAll('.portal-color-field input').forEach(function (pareja) { pareja.value = campo.value; });
    selector.querySelector('[data-color-open]').style.setProperty('--chosen-color', campo.value);
    if (evento.type === 'change') recordarColorPortal(campo.value);
}
document.addEventListener('input', sincronizarMuestraColorPortal, true);
document.addEventListener('change', sincronizarMuestraColorPortal, true);

document.addEventListener('click', function (evento) {
    const selector = evento.target.closest('.portal-color-picker');
    if (!selector) { cerrarPaletasColorPortal(); return; }
    const abrir = evento.target.closest('[data-color-open]');
    const panel = selector.querySelector('.portal-color-palette');
    const campo = selector.querySelector('input[type=color]');
    if (abrir) {
        const estabaAbierto = !panel.hidden;
        cerrarPaletasColorPortal();
        if (estabaAbierto) return;
        panel.innerHTML = crearMuestrasColorPortal('Colores habituales', coloresHabitualesPortal, campo.value)
            + crearMuestrasColorPortal('En esta página', obtenerColoresUsadosPortal().map(function (color) { return [color, 'Color del portal']; }), campo.value)
            + crearMuestrasColorPortal('Recientes', coloresRecientesPortal.map(function (color) { return [color, 'Color reciente']; }), campo.value)
            + '<button type="button" class="portal-color-custom" data-color-custom><i class="bi bi-palette" aria-hidden="true"></i> Elegir otro color…</button>';
        panel.hidden = false;
        abrir.setAttribute('aria-expanded', 'true');
        return;
    }
    const muestra = evento.target.closest('[data-color-value]');
    if (muestra) {
        campo.value = muestra.dataset.colorValue;
        campo.dispatchEvent(new Event('input', { bubbles: true }));
        campo.dispatchEvent(new Event('change', { bubbles: true }));
        cerrarPaletasColorPortal();
        selector.querySelector('[data-color-open]').focus({ preventScroll: true });
        return;
    }
    if (evento.target.closest('[data-color-custom]')) {
        cerrarPaletasColorPortal();
        if (typeof campo.showPicker === 'function') campo.showPicker();
        else campo.click();
    }
});
document.addEventListener('keydown', function (evento) {
    if (evento.key !== 'Escape') return;
    const panel = document.querySelector('.portal-color-palette:not([hidden])');
    if (!panel) return;
    const boton = panel.closest('.portal-color-picker').querySelector('[data-color-open]');
    cerrarPaletasColorPortal();boton.focus({ preventScroll: true });
});
