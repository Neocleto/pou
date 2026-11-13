<?php
// ===========================================================
// HELPER: BÚSQUEDA DE URL DE POLÍTICA DE PRIVACIDAD DE AYUNTAMIENTOS
// ===========================================================

/**
 * Convierte "Alhaurín de la Torre" -> "alhaurin-de-la-torre"
 */
function slugifyMunicipio(string $nombre): string {
    $texto = iconv('UTF-8', 'ASCII//TRANSLIT', $nombre);
    $texto = strtolower($texto);
    $texto = preg_replace('/[^a-z0-9]+/', '-', $texto);
    $texto = trim($texto, '-');
    return $texto;
}

/**
 * Devuelve el dominio "base" a partir del nombre del municipio.
 * Ej.: "Alhaurín de la Torre" -> "alhaurindelatorre.es"
 */
function dominioMunicipioDesdeNombre(string $nombreMunicipio): string {
    $slug = slugifyMunicipio($nombreMunicipio);
    return str_replace('-', '', $slug) . '.es';
}

/**
 * Comprueba si una URL responde “bien”.
 */
function urlExiste(string $url): bool {
    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_NOBODY         => true,
        CURLOPT_FOLLOWLOCATION => true,
        CURLOPT_CONNECTTIMEOUT => 3,  //  tiempo máximo de conexión
        CURLOPT_TIMEOUT        => 4,  //  tiempo máximo total de la petición
        CURLOPT_SSL_VERIFYPEER => false,
        CURLOPT_SSL_VERIFYHOST => false,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_USERAGENT      => 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
    ]);
    curl_exec($ch);
    $code  = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $errno = curl_errno($ch);
    curl_close($ch);

    // Si ha habido timeout o no se puede conectar, salimos rápido
    if (in_array($errno, [
        CURLE_OPERATION_TIMEDOUT,
        CURLE_COULDNT_RESOLVE_HOST,
        CURLE_COULDNT_CONNECT,
    ], true)) {
        return false;
    }

    if ($code >= 200 && $code < 400 && $code !== 0) {
        return true;
    }

    // Si el HEAD falla por política del servidor,
    // intentamos con un GET “normal” pero también con límites bajos.
    if (in_array($code, [0, 403, 405], true)) {
        $ch = curl_init($url);
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_FOLLOWLOCATION => true,
            CURLOPT_CONNECTTIMEOUT => 3,
            CURLOPT_TIMEOUT        => 5,
            CURLOPT_SSL_VERIFYPEER => false,
            CURLOPT_SSL_VERIFYHOST => false,
            CURLOPT_USERAGENT      => 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        ]);
        curl_exec($ch);
        $code  = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $errno = curl_errno($ch);
        curl_close($ch);

        if (in_array($errno, [
            CURLE_OPERATION_TIMEDOUT,
            CURLE_COULDNT_RESOLVE_HOST,
            CURLE_COULDNT_CONNECT,
        ], true)) {
            return false;
        }

        return $code >= 200 && $code < 400;
    }

    return false;
}


/**
 * Descarga HTML de una URL (GET) y devuelve el contenido si la respuesta es 2xx/3xx.
 */
function descargarHtml(string $url): ?string {
    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_FOLLOWLOCATION => true,
        CURLOPT_CONNECTTIMEOUT => 3,  //  conexión rápida
        CURLOPT_TIMEOUT        => 6,  //  máximo total
        CURLOPT_SSL_VERIFYPEER => false,
        CURLOPT_SSL_VERIFYHOST => false,
        CURLOPT_USERAGENT      => 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
    ]);
    $html  = curl_exec($ch);
    $code  = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $errno = curl_errno($ch);
    curl_close($ch);

    if (in_array($errno, [
        CURLE_OPERATION_TIMEDOUT,
        CURLE_COULDNT_RESOLVE_HOST,
        CURLE_COULDNT_CONNECT,
    ], true)) {
        // Página lenta/caída → la tratamos como no disponible
        return null;
    }

    if ($code >= 200 && $code < 400 && $html) {
        return $html;
    }
    return null;
}


/**
 * PUNTUAR URL DE POLÍTICA / AVISO
 * --------------------------------
 * Cuanto más alta la puntuación, más "correcta" parece la URL.
 * Se tiene en cuenta:
 *  - host (protecciondedatos.*)
 *  - path (politica-de-privacidad, proteccion-de-datos, aviso-legal…)
 *  - texto del enlace (por si viene de la home)
 */
function puntuarUrlPolitica(string $url, string $textoEnlace = ''): int {
    $parts = parse_url($url);
    $host  = strtolower($parts['host'] ?? '');
    $path  = strtolower($parts['path'] ?? '');
    $texto = mb_strtolower($textoEnlace, 'UTF-8');

    $score = 0;

    // Subdominio específico de protección de datos (ej. protecciondedatos.marbella.es)
    if (strpos($host, 'protecciondedatos') !== false || strpos($path, 'protecciondedatos') !== false) {
        $score += 120;
    }

    // Política de privacidad explícita
    if (
        strpos($path, 'politica-de-privacidad') !== false ||
        strpos($path, 'politica_privacidad') !== false ||
        mb_strpos($texto, 'política de privacidad', 0, 'UTF-8') !== false
    ) {
        $score += 100;
    }

    // Política + privacidad en cualquier orden
    if (strpos($path, 'politica') !== false && strpos($path, 'privacidad') !== false) {
        $score += 80;
    }

    // Protección de datos
    if (
        strpos($path, 'proteccion-de-datos') !== false ||
        mb_strpos($texto, 'protección de datos', 0, 'UTF-8') !== false
    ) {
        $score += 70;
    }

    // Aviso legal "a secas"
    if (
        strpos($path, 'aviso-legal') !== false ||
        strpos($path, 'avisolegal') !== false ||
        mb_strpos($texto, 'aviso legal', 0, 'UTF-8') !== false
    ) {
        $score += 40;
    }

    // https suma un poco
    if (($parts['scheme'] ?? '') === 'https') {
        $score += 10;
    }

    // Pequeño plus por profundidad de path (más específico)
    $segments = array_filter(explode('/', $path));
    $score += min(count($segments) * 2, 10);

    return $score;
}

/**
 * Comprueba que una URL:
 *  - Tiene un host relacionado con el municipio (mismo "nombre base")
 *  - y su path parece de política / aviso / protección de datos.
 *
 * Usado sobre todo en la capa de Google.
 */
function esEnlacePoliticaValido(string $url, string $dominioEsperado): bool {
    $parts = parse_url($url);
    if (!$parts || empty($parts['host'])) return false;

    $host = strtolower($parts['host']);
    $path = strtolower($parts['path'] ?? '');

    $dominioEsperado = strtolower($dominioEsperado);
    $baseName = explode('.', $dominioEsperado)[0]; // ej: malaga.es -> malaga

    // El host debe contener el nombre base del dominio (acepta subdominios y otros TLD: .eu, etc.)
    if (strpos($host, $baseName) === false) {
        return false;
    }

    // Debe parecer URL de política / aviso / protección de datos
    $keywordsPath = ['politica', 'privacidad', 'aviso-legal', 'avisolegal', 'proteccion-de-datos'];
    foreach ($keywordsPath as $kw) {
        if (strpos($path, $kw) !== false) {
            return true;
        }
    }
    return false;
}

/**
 * 2ª capa: intenta encontrar la URL de política escaneando la home del ayuntamiento.
 * Busca enlaces cuyo texto contenga "política de privacidad", "aviso legal" o "protección de datos".
 * Elige la mejor candidata según puntuación (URL + texto del enlace).
 */
function buscarPoliticaPorHtml(string $nombreMunicipio): ?string {
    $slug              = slugifyMunicipio($nombreMunicipio);
    $dominioSinGuiones = str_replace('-', '', $slug);
    $baseName          = $dominioSinGuiones; // p.ej. "malaga"

    // Posibles dominios (incluimos .eu por si acaso, aunque aquí solo usamos para la home)
    $dominios = array_unique([
        "{$slug}.es",
        "www.{$slug}.es",
        "{$dominioSinGuiones}.es",
        "www.{$dominioSinGuiones}.es",
        "{$baseName}.eu",
        "www.{$baseName}.eu",
    ]);

    // Palabras clave típicas en el TEXTO del enlace
    $keywordsTexto = ['política de privacidad', 'aviso legal', 'protección de datos'];

    $mejorUrl   = null;
    $mejorScore = -1;

    foreach ($dominios as $dom) {
        $base = "https://{$dom}";
        $html = descargarHtml($base . '/');
        if (!$html) continue;

        // Buscar todos los enlaces <a href="...">texto</a>
        if (!preg_match_all('/<a\s+[^>]*href=["\']([^"\']+)["\'][^>]*>(.*?)<\/a>/is', $html, $matches, PREG_SET_ORDER)) {
            continue;
        }

        foreach ($matches as $m) {
            $href  = trim($m[1]);
            $texto = trim($m[2]);
            if ($texto === '') continue;

            // Normalizar texto del enlace
            $textoLimpio = mb_strtolower(
                strip_tags(
                    html_entity_decode($texto, ENT_QUOTES | ENT_HTML5, 'UTF-8')
                ),
                'UTF-8'
            );

            // ¿El texto contiene alguna palabra clave?
            $coincide = false;
            foreach ($keywordsTexto as $kw) {
                if (mb_strpos($textoLimpio, $kw, 0, 'UTF-8') !== false) {
                    $coincide = true;
                    break;
                }
            }
            if (!$coincide) continue;

            // Construir URL absoluta
            if (strpos($href, 'http://') === 0 || strpos($href, 'https://') === 0) {
                $url = $href;
            } elseif (strpos($href, '//') === 0) {
                $url = 'https:' . $href;
            } elseif ($href[0] === '/') {
                $url = $base . $href;
            } else {
                $url = $base . '/' . $href;
            }

            // Comprobamos que la URL pertenece “al municipio” (host contiene el nombre base)
            $parts = parse_url($url);
            $host  = strtolower($parts['host'] ?? '');
            if ($host === '' || strpos($host, $baseName) === false) {
                continue;
            }

            // Verificamos que responda bien
            if (!urlExiste($url)) continue;

            // Puntuación base por la propia URL
            $score = puntuarUrlPolitica($url);

            // Bonus según el TEXTO del enlace
            if (mb_strpos($textoLimpio, 'política de privacidad', 0, 'UTF-8') !== false) {
                $score += 40; // muy preferente
            } elseif (mb_strpos($textoLimpio, 'protección de datos', 0, 'UTF-8') !== false) {
                $score += 25;
            } elseif (mb_strpos($textoLimpio, 'aviso legal', 0, 'UTF-8') !== false) {
                $score += 10;
            }

            // Elegimos la mejor puntuación
            if ($score > $mejorScore) {
                $mejorScore = $score;
                $mejorUrl   = $url;
            }
        }
    }

    return $mejorUrl;
}


/**
 * 1ª capa: probar dominios y rutas "típicas" de políticas.
 * Ahora también elige la mejor URL usando puntuarUrlPolitica().
 */
function buscarPoliticaPorDominios(string $nombreMunicipio): ?string {
    $slug = slugifyMunicipio($nombreMunicipio);
    $dominioSinGuiones = str_replace('-', '', $slug);

    // nombre "base" del municipio (malaga, marbella, etc.)
    $baseName = $dominioSinGuiones;

    // Posibles dominios del ayuntamiento
    $dominios = array_unique([
        "{$slug}.es",
        "www.{$slug}.es",
        "{$dominioSinGuiones}.es",
        "www.{$dominioSinGuiones}.es",
        // añadimos variantes .eu para casos como Málaga
        "{$baseName}.eu",
        "www.{$baseName}.eu",
    ]);

    // Rutas típicas donde suele estar la política / aviso legal
    $paths = [
        '/aviso-legal-y-politica-de-privacidad',
        '/aviso-legal-y-politica-de-privacidad/',
        '/politica-de-privacidad',
        '/politica-de-privacidad/',
        '/politica-privacidad',
        '/politica-privacidad/',
        '/politica-de-privacidad.php',
        '/proteccion-de-datos',
        '/proteccion-de-datos/',
        '/aviso-legal',
        '/aviso-legal/',
        '/avisolegal',
        '/avisolegal/',
        // caso específico muy común: información general + política
        '/informacion-general/politica-de-privacidad',
        '/informacion-general/politica-de-privacidad/',
    ];

    $mejorUrl   = null;
    $mejorScore = -1;

    foreach ($dominios as $dom) {
        foreach ($paths as $path) {
            $url = "https://{$dom}{$path}";
            if (!urlExiste($url)) continue;

            $score = puntuarUrlPolitica($url);
            if ($score > $mejorScore) {
                $mejorScore = $score;
                $mejorUrl   = $url;
            }
        }
    }

    return $mejorUrl;
}


/**
 * Plan B sin API: búsqueda en Google mediante query normal.
 * Toma la primera URL orgánica que:
 *  - tenga host relacionado con el municipio
 *  - y parezca una URL de política / aviso / protección de datos
 */
function buscarPoliticaPorGoogle(string $nombreMunicipio): ?string {
    $dominio = dominioMunicipioDesdeNombre($nombreMunicipio);

    // Query orientada a Google (dominio base, pero luego permitimos subdominios / otros TLD)
    $query = 'site:' . $dominio . ' "política de privacidad" OR "aviso legal"';

    $googleUrl = "https://www.google.com/search?q=" . urlencode($query) . "&hl=es";

    $opts = [
        'http' => [
            'method'  => "GET",
            'header'  => "User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64)\r\n",
            'timeout' => 6
        ]
    ];

    $context = stream_context_create($opts);
    $html = @file_get_contents($googleUrl, false, $context);

    if (!$html) return null;

    if (!preg_match_all('/\/url\?q=(https:\/\/[^&]+)&/i', $html, $matches)) {
        return null;
    }

    $mejorUrl   = null;
    $mejorScore = -1;

    foreach ($matches[1] as $rawUrl) {
        $url = urldecode($rawUrl);

        // Debe sonar a "política / aviso" y al dominio del municipio (nombre base en el host)
        if (!esEnlacePoliticaValido($url, $dominio)) {
            continue;
        }

        if (!urlExiste($url)) {
            continue;
        }

        $score = puntuarUrlPolitica($url);

        if ($score > $mejorScore) {
            $mejorScore = $score;
            $mejorUrl   = $url;
        }
    }

    return $mejorUrl;
}

function tiempoAgotado(float $inicio, float $maxSegundos): bool {
    return (microtime(true) - $inicio) >= $maxSegundos;
}
