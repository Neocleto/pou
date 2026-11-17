<?php
// ============================================================================
// ESCUDO MUNICIPAL
// La imagen automática se conserva aparte de cualquier sustitución del gestor.
// Estas rutas se comparten entre el portal, el configurador y sus respuestas JSON.
// ============================================================================
function obtenerEscudoAutomaticoMunicipio($codMun)
{
    if (!preg_match('/^\d{5}$/', (string)$codMun)) {
        return 'images/logo_mipou.png';
    }
    foreach (['jpg', 'jpeg', 'png', 'webp'] as $extension) {
        $ruta = "images/municipios/{$codMun}/{$codMun}_escudo.{$extension}";
        if (is_file(dirname(__DIR__, 2) . '/' . $ruta)) {
            return $ruta;
        }
    }
    return 'images/logo_mipou.png';
}

function obtenerEscudoMunicipio($codMun, $guardado)
{
    $guardado = trim((string)$guardado);
    if ($guardado !== '' && basename($guardado) !== 'logo_mipou.png') {
        if (preg_match('#^https?://#i', $guardado)
            || is_file(dirname(__DIR__, 2) . '/' . $guardado)) {
            return $guardado;
        }
    }
    return obtenerEscudoAutomaticoMunicipio($codMun);
}

/**
 * Recupera la fotografía subida del municipio si la ruta se quedó vacía.
 * Los banners personalizados se guardan con un nombre único al subirlos.
 * Solo se consultan archivos de la carpeta del municipio; no se elimina nada.
 */
function obtenerBannerMunicipio($codMun, $guardado)
{
    $guardado = trim((string)$guardado);
    $raizProyecto = dirname(__DIR__, 2);

    // Una URL externa previamente guardada se conserva sin modificar.
    if ($guardado !== '' && preg_match('#^https?://#i', $guardado)) {
        return $guardado;
    }

    // Una imagen guardada que sigue existiendo tiene prioridad absoluta.
    $rutaLocal = ltrim($guardado, '/');
    $rutaLocal = preg_replace('#^(pbom|pou|pgom)/#i', '', $rutaLocal);
    $esMarcador = $guardado === ''
        || strpos(basename($guardado), 'no_') === 0
        || strpos(basename($guardado), 'sin_datos_') === 0;
    if (!$esMarcador && $rutaLocal !== '' && is_file($raizProyecto . '/' . $rutaLocal)) {
        return $rutaLocal;
    }

    if (!preg_match('/^\d{5}$/', (string)$codMun)) {
        return $esMarcador ? '' : $guardado;
    }

    $carpetaRelativa = 'images/municipios/' . $codMun;
    $carpetaFisica = $raizProyecto . '/' . $carpetaRelativa;

    // Las imágenes nuevas llevan sufijo _personalizado_<identificador>.
    // Seleccionamos la subida más reciente si se ha perdido la ruta guardada.
    $archivos = [];
    foreach (['jpg', 'jpeg', 'png', 'webp'] as $extension) {
        $archivosEncontrados = glob($carpetaFisica . '/' . $codMun . '_banner_personalizado_*.' . $extension) ?: [];
        $archivos = array_merge($archivos, $archivosEncontrados);
    }
    usort($archivos, static function ($a, $b) {
        $fechaA = filemtime($a) ?: 0;
        $fechaB = filemtime($b) ?: 0;
        if ($fechaA === $fechaB) {
            return strcmp(basename($b), basename($a));
        }
        return $fechaB <=> $fechaA;
    });

    foreach ($archivos as $archivo) {
        if (is_file($archivo)) {
            return $carpetaRelativa . '/' . basename($archivo);
        }
    }

    // Compatibilidad con las fotografías municipales de nombres anteriores.
    foreach (['jpg', 'jpeg', 'png', 'webp'] as $extension) {
        foreach ([$codMun . '_banner.', 'banner.'] as $nombre) {
            $archivo = $carpetaRelativa . '/' . $nombre . $extension;
            if (is_file($raizProyecto . '/' . $archivo)) {
                return $archivo;
            }
        }
    }

    // Si se perdió el archivo o la ruta es antigua, usamos la ilustración.
    // Nunca se borra la ruta almacenada ni se elimina una imagen del disco.
    return '';
}
