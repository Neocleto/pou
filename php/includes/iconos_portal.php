<?php
// Identificadores de los iconos compartidos por el portal y su configurador.
// No consulta ni actualiza la base de datos; conserva los iconos de Bootstrap.

/** Adapta el prefijo de un icono propio copiado, conservando su dibujo. */
function normalizarNombreIconoPortal($icono)
{
    $icono = trim((string)$icono);
    if (preg_match('/^[a-z0-9]+-(fases|manos|documentos|noticias|buzon|encuesta-infantil|encuesta-participacion)$/i', $icono, $partes)) {
        return 'pou-' . strtolower($partes[1]);
    }
    return $icono;
}

/** Normaliza solo los campos de icono en registros y estructuras JSON ya leídas. */
function normalizarIconosDatosPortal($datos)
{
    if (!is_array($datos)) return $datos;
    foreach ($datos as $clave => $valor) {
        if (is_array($valor)) {
            $datos[$clave] = normalizarIconosDatosPortal($valor);
        } elseif ($clave === 'icono' || str_ends_with((string)$clave, '_icono')) {
            $datos[$clave] = normalizarNombreIconoPortal($valor);
        }
    }
    return $datos;
}
