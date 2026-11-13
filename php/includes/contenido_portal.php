<?php
// Funciones de presentación del portal: textos, imágenes y contenido enriquecido.
// No consultan ni modifican datos. Consumidor: municipio_template.php.

require_once __DIR__ . '/html_portal.php';
require_once __DIR__ . '/iconos_portal.php';

/**
 * Une dos arrays conservando los valores por defecto que no se hayan editado.
 */
function combinarContenidoPortal(array $base, array $personalizado)
{
    foreach ($personalizado as $clave => $valor) {
        if (is_array($valor) && isset($base[$clave]) && is_array($base[$clave])) {
            $esLista = $valor === [] || array_keys($valor) === range(0, count($valor) - 1);
            $base[$clave] = $esLista ? $valor : combinarContenidoPortal($base[$clave], $valor);
        } else {
            $base[$clave] = $valor;
        }
    }

    return $base;
}

/**
 * Convierte texto UTF-8 a minúsculas aunque la instalación no tenga mbstring.
 */
function minusculasPortal($texto)
{
    if (function_exists('mb_strtolower')) {
        return mb_strtolower($texto, 'UTF-8');
    }

    return strtolower(strtr($texto, [
        'Á' => 'á', 'É' => 'é', 'Í' => 'í', 'Ó' => 'ó', 'Ú' => 'ú',
        'Ü' => 'ü', 'Ñ' => 'ñ'
    ]));
}

/**
 * Pone en mayúscula únicamente la primera letra de una palabra UTF-8.
 */
function mayusculaInicialPortal($texto)
{
    if ($texto === '') {
        return '';
    }

    if (function_exists('mb_substr')) {
        return mb_strtoupper(mb_substr($texto, 0, 1, 'UTF-8'), 'UTF-8')
            . mb_substr($texto, 1, null, 'UTF-8');
    }

    if (!preg_match('/^(.)(.*)$/us', $texto, $partes)) {
        return ucfirst($texto);
    }

    $primera = strtr(strtoupper($partes[1]), [
        'á' => 'Á', 'é' => 'É', 'í' => 'Í', 'ó' => 'Ó', 'ú' => 'Ú',
        'ü' => 'Ü', 'ñ' => 'Ñ'
    ]);

    return $primera . $partes[2];
}

/**
 * Aplica un título legible en español evitando mayúsculas innecesarias.
 */
function tituloNormalizadoPortal($texto)
{
    $palabrasPequenas = [
        'a', 'al', 'con', 'de', 'del', 'e', 'el', 'en', 'la', 'las',
        'los', 'o', 'para', 'por', 'sin', 'u', 'un', 'una', 'y'
    ];

    $partes = preg_split('/(\s+)/u', minusculasPortal($texto), -1, PREG_SPLIT_DELIM_CAPTURE);
    $indicePalabra = 0;

    foreach ($partes as $indice => $parte) {
        if (trim($parte) === '') {
            continue;
        }

        $esPequena = in_array($parte, $palabrasPequenas, true);
        $partes[$indice] = ($indicePalabra > 0 && $esPequena)
            ? $parte
            : mayusculaInicialPortal($parte);
        $indicePalabra++;
    }

    return implode('', $partes);
}

/**
 * Normaliza textos escritos completamente en mayúsculas.
 * Los acrónimos POU, PDF y FAQ se conservan correctamente.
 */
function normalizarTextoPortal($texto, $modoTitulo = false)
{
    $texto = trim((string)$texto);

    if ($texto === '') {
        return '';
    }

    $soloLetras = preg_replace('/[^\p{L}]+/u', '', $texto);

    if (function_exists('mb_strtoupper')) {
        $estaEnMayusculas = $soloLetras !== ''
            && $soloLetras === mb_strtoupper($soloLetras, 'UTF-8');
    } else {
        $mayusculas = strtoupper(strtr($soloLetras, [
            'á' => 'Á', 'é' => 'É', 'í' => 'Í', 'ó' => 'Ó', 'ú' => 'Ú',
            'ü' => 'Ü', 'ñ' => 'Ñ'
        ]));
        $estaEnMayusculas = $soloLetras !== '' && $soloLetras === $mayusculas;
    }

    if ($estaEnMayusculas) {
        $texto = $modoTitulo
            ? tituloNormalizadoPortal($texto)
            : mayusculaInicialPortal(minusculasPortal($texto));
    }

    return str_ireplace(
        ['Pou', 'Pdf', 'Faq'],
        ['POU', 'PDF', 'FAQ'],
        $texto
    );
}

/**
 * Sustituye el marcador {municipio} dentro de los textos configurables.
 */
function textoMunicipioPortal($texto, $nombreMunicipio)
{
    return str_replace('{municipio}', $nombreMunicipio, (string)$texto);
}

/**
 * Convierte los booleanos de PostgreSQL en verdadero o falso.
 */
function booleanoPortal($valor)
{
    if (is_bool($valor)) {
        return $valor;
    }

    return in_array(
        strtolower(trim((string)$valor)),
        ['1', 't', 'true', 'yes', 'si', 'sí'],
        true
    );
}

/**
 * Limpia las etiquetas HTML del editor y recorta el resumen de la noticia.
 */
function recortarTextoPortal($texto, $limite = 170)
{
    $texto = html_entity_decode((string)$texto, ENT_QUOTES | ENT_HTML5, 'UTF-8');
    $texto = preg_replace('/<br\s*\/?>|<\/(p|div|li|h[1-6])\s*>/i', ' ', $texto);
    $texto = trim(preg_replace('/\s+/u', ' ', strip_tags($texto)) ?? '');

    if (function_exists('mb_strimwidth')) {
        return mb_strimwidth($texto, 0, $limite, '...', 'UTF-8');
    }

    return strlen($texto) > $limite
        ? substr($texto, 0, max(0, $limite - 3)) . '...'
        : $texto;
}


/**
 * Busca la imagen guardada de la noticia en la carpeta del municipio.
 * Acepta rutas antiguas y, si la ruta no existe, intenta localizar el
 * archivo que corresponde al título. Nunca se cambia la base de datos.
 */
function obtenerRutaImagenNoticiaPortal($noticia, $codMun)
{
    $rutaGuardada = trim((string)($noticia['imagen_url'] ?? ''));

    // Los enlaces externos se conservan tal como están.
    if (preg_match('#^https?://#i', $rutaGuardada)) {
        return $rutaGuardada;
    }

    if (!preg_match('/^\d{5}$/', (string)$codMun)) {
        return $rutaGuardada;
    }

    $raizPortal = dirname(__DIR__, 2);
    $carpetaRelativa = "images/municipios/{$codMun}/noticias/";
    $carpetaImagenes = $raizPortal . '/' . $carpetaRelativa;
    $ruta = str_replace('\\', '/', $rutaGuardada);

    if ($ruta !== '') {
        // El portal usa <base href="/pou/">: la ruta debe ser relativa a POU.
        $posicionImagenes = strpos($ruta, 'images/municipios/');
        if ($posicionImagenes !== false) {
            $ruta = substr($ruta, $posicionImagenes);
        } else {
            $ruta = ltrim($ruta, '/');
        }

        if (strpos($ruta, '..') === false && is_file($raizPortal . '/' . $ruta)) {
            return $ruta;
        }

        // La ruta guardada puede incluir un prefijo antiguo o incorrecto.
        $nombreArchivo = basename($ruta);
        if ($nombreArchivo !== '' && is_file($carpetaImagenes . $nombreArchivo)) {
            return $carpetaRelativa . $nombreArchivo;
        }
    }

    // Recuperar la imagen original por el nombre de la noticia, si existe.
    $titulo = trim((string)($noticia['titulo'] ?? ''));
    $tituloSinTildes = iconv('UTF-8', 'ASCII//TRANSLIT', $titulo);
    if ($tituloSinTildes === false) {
        return $ruta;
    }
    $nombreBase = strtolower(trim(preg_replace('/[^a-zA-Z0-9_-]+/', '-', $tituloSinTildes), '-_'));
    if ($nombreBase === '') {
        return $ruta;
    }

    $archivos = glob($carpetaImagenes . $nombreBase . '-*');
    if ($archivos) {
        rsort($archivos);
        foreach ($archivos as $archivo) {
            if (is_file($archivo) && preg_match('/\.(jpe?g|png|webp)$/i', $archivo)) {
                return $carpetaRelativa . basename($archivo);
            }
        }
    }

    return $ruta;
}


/**
 * Conserva un conjunto pequeño de etiquetas de formato.
 * Los enlaces pierden atributos peligrosos y se abren de forma segura.
 */
function htmlEnriquecidoPortal($texto)
{
    $texto = str_replace(["\r\n", "\r"], "\n", (string)$texto);
    if ($texto === strip_tags($texto)) {
        return nl2br(htmlspecialchars($texto, ENT_QUOTES, 'UTF-8'), false);
    }
    $html = limpiarHtmlPortal($texto);
    // El texto con formato inline mantiene sus saltos; las listas y párrafos
    // ya contienen la estructura que ha escrito el gestor.
    if (!preg_match('/<(p|br|ul|ol|li|blockquote|h[234])\b/i', $html)) {
        $html = nl2br($html, false);
    }
    return $html;
}

// ============================================================================
// 2. CONFIGURACION Y TEXTOS EDITABLES
// ============================================================================
/** Devuelve el icono guardado; una cadena vacía permite retirarlo. */
function obtenerIconoBotonParticipacionPortal($boton)
{
    return array_key_exists('icono', $boton) ? normalizarNombreIconoPortal($boton['icono']) : 'file-earmark-arrow-down';
}

