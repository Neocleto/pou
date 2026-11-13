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
