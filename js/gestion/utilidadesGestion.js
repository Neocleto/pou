/**
 * Convierte texto en HTML seguro para las tablas y formularios de gestión.
 * Se carga antes de los asistentes para que todos usen la misma función.
 */
function escapeHtml(valor = '') {
    return String(valor)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

/** Escapa un atributo HTML; los valores ausentes se muestran vacíos. */
function escapeAttr(valor) {
    if (valor == null) return '';
    return escapeHtml(valor);
}
