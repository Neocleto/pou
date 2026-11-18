<?php
// ============================================================================
// ICONOS DEL PORTAL Y DEL CONFIGURADOR
// Adapta los identificadores antiguos sin cambiar dibujos ni escribir en BBDD.
// ============================================================================

/** Conserva Bootstrap, el valor vacío y el prefijo propio de esta aplicación. */
function normalizarIconoPortal($icono)
{
    $icono = trim((string)$icono);
    $icono = preg_replace('/^(?:bi\s+)?bi-/', '', $icono);
    if ($icono === '') {
        return '';
    }
    if (preg_match('/^(?:[a-z0-9]+-)?(fases|manos|documentos|noticias|buzon|encuesta-infantil|encuesta-participacion)$/i', $icono, $coincidencia)) {
        return 'pou-' . strtolower($coincidencia[1]);
    }
    return preg_match('/^[a-zA-Z0-9-]+$/', $icono) ? $icono : 'link-45deg';
}

/** Solo normaliza campos de icono; conserva false/null cuando no hay registro. */
function normalizarIconosDatosPortal($datos)
{
    if (!is_array($datos)) return $datos;
    foreach ($datos as $clave => $valor) {
        if (is_array($valor)) {
            $datos[$clave] = normalizarIconosDatosPortal($valor);
        } elseif ($clave === 'icono' || substr((string)$clave, -6) === '_icono') {
            $datos[$clave] = normalizarIconoPortal($valor);
        }
    }
    return $datos;
}
