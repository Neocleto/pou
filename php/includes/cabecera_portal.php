<?php
// ============================================================================
// CABECERA MUNICIPAL
// Valores del diseño inicial y compatibilidad con los accesos de fábrica.
// No escribe en la base de datos ni sustituye los accesos personalizados.
// ============================================================================

require_once __DIR__ . '/valores_portal.php';

/** El icono guardado coincide con el que muestra el selector del configurador. */
function obtenerIconoAccesoPortal($acceso)
{
    return normalizarNombreIconoPortal($acceso['icono'] ?? '');
}

/** Devuelve el índice recibido; solo una ausencia de configuración usa el inicial. */
function obtenerAccesosCabeceraPortal($accesos = null)
{
    return $accesos ?? obtenerAccesosInicialesPortal();
}

// Los textos que ha escrito el gestor se conservan; solo cambia el texto inicial.
function actualizarTextosCabeceraPortal($cabecera)
{
    if (($cabecera['descripcion'] ?? '') === 'Consulta la información urbanística, el estado de la tramitación y las vías de participación del municipio.') {
        $cabecera['descripcion'] = 'Consulta la información urbanística, el estado de la tramitación y participa en el desarrollo del municipio.';
    }
    return $cabecera;
}

// El título completo se muestra en blanco y no acepta HTML del texto editable.
function tituloCabeceraPortal($titulo)
{
    return htmlspecialchars(trim((string)$titulo), ENT_QUOTES, 'UTF-8');
}

