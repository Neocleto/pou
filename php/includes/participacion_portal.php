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

/** Recupera las rutas antiguas de documentos sin cambiar los enlaces guardados. */
function resolverArchivoParticipacion($ruta, $codMun): string
{
    $ruta = trim(str_replace('\\', '/', (string)$ruta));
    if ($ruta === '' || !preg_match('/^\d{5}$/D', (string)$codMun)) {
        return '';
    }

    $url = parse_url($ruta);
    if (!$url || empty($url['path'])) {
        return '';
    }

    // Las direcciones de otro servidor se conservan tal y como se guardaron.
    if (isset($url['scheme']) || isset($url['host'])) {
        if (!isset($url['host']) || !in_array(strtolower($url['scheme'] ?? ''), ['http', 'https'], true)) {
            return '';
        }
        $servidor = $url['host'] . (isset($url['port']) ? ':' . $url['port'] : '');
        if (strcasecmp($servidor, $_SERVER['HTTP_HOST'] ?? '') !== 0) {
            return $ruta;
        }
    }

    $raiz = dirname(__DIR__, 2);
    $proyectoActual = strtolower(basename($raiz));
    $rutaRelativa = ltrim(rawurldecode($url['path']), '/');
    if (str_starts_with($rutaRelativa, './')) {
        $rutaRelativa = substr($rutaRelativa, 2);
    }

    $proyectoGuardado = '';
    if (preg_match('#^(pbom|pou|pgom)/(.+)$#iD', $rutaRelativa, $coincidencia)) {
        $proyectoGuardado = strtolower($coincidencia[1]);
        $rutaRelativa = $coincidencia[2];
    }

    // Solo se comprueba el ámbito del municipio, o la carpeta de archivos comunes.
    $prefijo = str_starts_with($rutaRelativa, 'docs/comun/') ? 'docs/comun/' : "docs/{$codMun}/";
    if (!str_starts_with($rutaRelativa, $prefijo) || str_contains($rutaRelativa, "\0")
        || str_contains($rutaRelativa, '\\')
        || preg_match('#(?:^|/)\.{1,2}(?:/|$)#', $rutaRelativa)) {
        return '';
    }

    $rutaPublica = implode('/', array_map('rawurlencode', explode('/', $rutaRelativa)));
    if (existeDocumentoParticipacion($raiz, $prefijo, $rutaRelativa)) {
        return $rutaPublica;
    }

    // POU y PGOM pueden conservar rutas relativas de documentos copiados desde PBOM.
    // Solo se busca el mismo archivo de participación, dentro del mismo municipio.
    $proyectoOrigen = $proyectoGuardado;
    if ($proyectoOrigen === '' && in_array($proyectoActual, ['pou', 'pgom'], true)
        && str_starts_with($rutaRelativa, "docs/{$codMun}/participacion/")) {
        $proyectoOrigen = 'pbom';
    }

    if ($proyectoOrigen !== '' && $proyectoOrigen !== $proyectoActual) {
        $padre = dirname($raiz);
        foreach ([$proyectoOrigen, strtoupper($proyectoOrigen)] as $directorio) {
            if (existeDocumentoParticipacion($padre . '/' . $directorio, $prefijo, $rutaRelativa)) {
                return '/' . $directorio . '/' . $rutaPublica;
            }
        }
    }

    return '';
}

/** Un enlace local solo se activa si su archivo existe y el servidor puede leerlo. */
function existeDocumentoParticipacion(string $raiz, string $prefijo, string $ruta): bool
{
    $carpeta = realpath($raiz . '/' . $prefijo);
    $archivo = realpath($raiz . '/' . $ruta);
    return $carpeta && $archivo && str_starts_with($archivo, $carpeta . DIRECTORY_SEPARATOR)
        && is_file($archivo) && is_readable($archivo);
}

/** Todos los enlaces a encuestas conservan el modo del portal desde el que salen. */
function urlEncuestaMunicipal($codMun, $slug, $modoPreview = false)
{
    $url = 'php/municipio/formulario.php?cod_mun=' . urlencode($codMun)
        . '&slug=' . urlencode($slug);
    return $modoPreview ? $url . '&preview=1' : $url;
}
