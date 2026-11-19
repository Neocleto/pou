<?php
require_once __DIR__ . '/valores_portal.php';

/** Colores predefinidos que comparten la plantilla y el editor del asistente. */
function obtenerColoresParticipacion(): array
{
    return [
        'corporativo' => obtenerConfiguracionInicialPortal()['color_participacion'],
        'naranja' => '#b54d00',
    ];
}

// Los municipios nuevos reciben los botones en este orden.
function obtenerBotonesPlantillaParticipacion(): array
{
    $colores = obtenerColoresParticipacion();
    $corporativo = $colores['corporativo'];
    $naranja = $colores['naranja'];

    return [
        ['titulo' => 'Tríptico Informativo', 'icono' => 'book', 'color' => $corporativo, 'archivo' => ''],
        ['titulo' => 'Guía de Participación', 'icono' => 'person-check', 'color' => $corporativo, 'archivo' => 'docs/comun/guia_participacion.pdf'],
        ['titulo' => 'Plan de Participación', 'icono' => 'bezier2', 'color' => $corporativo, 'archivo' => 'docs/comun/plan_participacion.pdf'],
        ['titulo' => 'Encuesta Infantil de Participación', 'icono' => 'encuesta-infantil', 'color' => $naranja, 'archivo' => ''],
        ['titulo' => 'Encuesta de Participación', 'icono' => 'encuesta-participacion', 'color' => $naranja, 'archivo' => ''],
    ];
}

/** Recupera los enlaces existentes y comprueba los archivos locales del municipio. */
function resolverArchivoParticipacion($ruta, $codMun): string
{
    $ruta = trim((string)$ruta);
    if ($ruta === '' || !preg_match('/^\d{5}$/D', (string)$codMun)) {
        return '';
    }

    $raiz = dirname(__DIR__, 2);
    $prefijoProyecto = '/' . basename($raiz) . '/';
    $url = parse_url(str_replace('\\', '/', $ruta));
    if (!$url || empty($url['path'])) {
        return '';
    }

    $rutaPublica = $url['path'];
    if (stripos($rutaPublica, $prefijoProyecto) === 0) {
        $rutaPublica = substr($rutaPublica, strlen($prefijoProyecto));
    } elseif (isset($url['host'])) {
        // Los enlaces web ya enlazados se conservan. Solo comprobamos en disco los documentos locales.
        return in_array(strtolower($url['scheme'] ?? ''), ['https', 'http'], true) ? $ruta : '';
    } elseif (isset($url['scheme'])) {
        return '';
    } elseif (strpos($rutaPublica, '/docs/') === 0) {
        $rutaPublica = substr($rutaPublica, 1);
    } elseif (strpos($rutaPublica, './') === 0) {
        $rutaPublica = substr($rutaPublica, 2);
    }

    $rutaRelativa = rawurldecode($rutaPublica);
    if (str_contains($rutaRelativa, "\0")) {
        return '';
    }

    foreach (['docs/comun/', "docs/{$codMun}/"] as $prefijo) {
        if (strpos($rutaRelativa, $prefijo) !== 0) {
            continue;
        }

        $carpeta = realpath($raiz . '/' . $prefijo);
        $archivo = realpath($raiz . '/' . $rutaRelativa);
        if ($carpeta && $archivo && strpos($archivo, $carpeta . DIRECTORY_SEPARATOR) === 0
            && is_file($archivo) && is_readable($archivo)) {
            return $rutaPublica;
        }
    }

    return '';
}
