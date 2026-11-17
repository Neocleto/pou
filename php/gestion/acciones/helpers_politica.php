<?php
// ===========================================================
// BUSCAR LA POLÍTICA DE PRIVACIDAD DEL AYUNTAMIENTO
//
// 1. Preparar las posibles direcciones de la web municipal.
// 2. Consultar las portadas a la vez, sin esperar a un dominio lento.
// 3. Devolver el mejor enlace publicado en una de esas portadas.
// Si no hay enlace en las portadas, prueba las rutas habituales y Google.
// No necesita conexión a la base de datos.
// ===========================================================

/** Convierte "Alhaurín de la Torre" en "alhaurin-de-la-torre". */
function slugifyMunicipio(string $nombre): string {
    $texto = iconv('UTF-8', 'ASCII//TRANSLIT', $nombre);
    if ($texto === false) {
        $texto = $nombre;
    }
    $texto = strtolower($texto);
    $texto = preg_replace('/[^a-z0-9]+/', '-', $texto);
    $texto = trim($texto, '-');
    return $texto;
}

/** Prepara los dominios habituales, sin repetir los que sean iguales. */
function dominiosPoliticaMunicipio(string $nombre): array {
    $slug = slugifyMunicipio($nombre);
    if ($slug === '') {
        return [];
    }
    $nombreSinGuiones = str_replace('-', '', $slug);
    $dominios = [
        "www.{$nombreSinGuiones}.es", "{$nombreSinGuiones}.es",
        "www.{$slug}.es", "{$slug}.es",
        "www.{$nombreSinGuiones}.eu", "{$nombreSinGuiones}.eu"
    ];
    return array_values(array_unique($dominios));
}

/** Comprueba el dominio completo: alameda.es no coincide con otra-alameda.es. */
function esDominioPoliticaMunicipal(string $url, array $dominios): bool {
    $partes = parse_url($url);
    $esquema = strtolower($partes['scheme'] ?? '');
    if (!in_array($esquema, ['http', 'https'], true)) {
        return false;
    }
    if (isset($partes['user']) || isset($partes['pass'])) {
        return false;
    }
    $host = strtolower($partes['host'] ?? '');
    foreach ($dominios as $dominio) {
        $dominio = preg_replace('/^www\./', '', $dominio);
        $subdominio = '.' . $dominio;
        if ($host === $dominio || substr($host, -strlen($subdominio)) === $subdominio) {
            return true;
        }
        // Conservar enlaces al mismo municipio cuando su web cambia de .es a .com, .org o .net.
        // Se compara el nombre completo del dominio, no una coincidencia dentro de otra palabra.
        $partesHost = explode('.', $host);
        $nombreEsperado = explode('.', $dominio)[0];
        $numeroPartes = count($partesHost);
        if ($numeroPartes >= 2 && $partesHost[$numeroPartes - 2] === $nombreEsperado
            && in_array($partesHost[$numeroPartes - 1], ['es', 'eu', 'com', 'org', 'net'], true)) {
            return true;
        }
    }
    return false;
}

/** Convierte el href de un enlace en una URL absoluta, respetando las redirecciones. */
function resolverUrlPolitica(string $href, string $base): ?string {
    $href = trim(html_entity_decode($href, ENT_QUOTES | ENT_HTML5, 'UTF-8'));
    if ($href === '' || $href[0] === '#') {
        return null;
    }
    $partes = parse_url($base);
    if (empty($partes['host'])) {
        return null;
    }
    if (strpos($href, '//') === 0) {
        $href = $partes['scheme'] . ':' . $href;
    }
    if (preg_match('/^[a-z][a-z0-9+.-]*:/i', $href)) {
        if (preg_match('~^https?://~i', $href)) {
            return $href;
        }
        return null;
    }
    $origen = $partes['scheme'] . '://' . $partes['host'];
    if (isset($partes['port'])) {
        $origen .= ':' . $partes['port'];
    }
    $rutaBase = $partes['path'] ?? '/';
    if ($href[0] === '?') {
        return $origen . $rutaBase . $href;
    }
    if ($href[0] !== '/') {
        $href = substr($rutaBase, 0, strrpos($rutaBase, '/') + 1) . $href;
    }

    // Resolver ../ y ./ sin modificar los parámetros de la URL.
    $ruta = preg_split('/[?#]/', $href, 2)[0];
    $segmentos = [];
    foreach (explode('/', $ruta) as $segmento) {
        if ($segmento === '..') {
            array_pop($segmentos);
        } elseif ($segmento !== '.') {
            $segmentos[] = $segmento;
        }
    }
    return $origen . implode('/', $segmentos) . substr($href, strlen($ruta));
}

/** Lee los enlaces de una portada. Prioriza privacidad sobre protección de datos y aviso legal. */
function obtenerEnlacePolitica(string $html, string $urlPortada, array $dominios): ?string {
    $documento = new DOMDocument();
    $erroresAnteriores = libxml_use_internal_errors(true);
    $cargado = $documento->loadHTML('<?xml encoding="UTF-8">' . $html, LIBXML_NONET);
    libxml_clear_errors();
    libxml_use_internal_errors($erroresAnteriores);
    if (!$cargado) {
        return null;
    }

    // Algunas webs declaran una base distinta para sus enlaces relativos.
    $base = $urlPortada;
    $bases = $documento->getElementsByTagName('base');
    if ($bases->length > 0) {
        $baseDeclarada = resolverUrlPolitica($bases->item(0)->getAttribute('href'), $base);
        if ($baseDeclarada !== null) {
            $base = $baseDeclarada;
        }
    }
    $mejorUrl = null;
    $mejorPuntuacion = 0;
    foreach ($documento->getElementsByTagName('a') as $enlace) {
        $url = resolverUrlPolitica($enlace->getAttribute('href'), $base);
        // Google puede envolver el destino en /url?q=... o /url?url=...
        if ($url !== null && parse_url($url, PHP_URL_HOST) === 'www.google.com'
            && parse_url($url, PHP_URL_PATH) === '/url') {
            parse_str(parse_url($url, PHP_URL_QUERY) ?? '', $parametros);
            $destino = $parametros['q'] ?? $parametros['url'] ?? '';
            if (is_string($destino)) {
                $url = resolverUrlPolitica($destino, $base);
            }
        }
        if ($url === null || !esDominioPoliticaMunicipal($url, $dominios)) {
            continue;
        }
        $texto = preg_replace('/\s+/u', ' ', $enlace->textContent);
        $ruta = urldecode(parse_url($url, PHP_URL_PATH) ?? '');
        $texto = mb_strtolower($texto . ' ' . $ruta, 'UTF-8');
        $puntuacion = 0;
        if (strpos($texto, 'privacidad') !== false) {
            $puntuacion = 3;
        } elseif (preg_match('/protecci[oó]n[ _-]*(de[ _-]*)?datos/u', $texto)) {
            $puntuacion = 2;
        } elseif (preg_match('/aviso[ _-]*legal/u', $texto)) {
            $puntuacion = 1;
        }
        $url = explode('#', $url, 2)[0];
        if ($puntuacion > $mejorPuntuacion && rtrim($url, '/') !== rtrim($urlPortada, '/')) {
            $mejorPuntuacion = $puntuacion;
            $mejorUrl = $url;
        }
    }
    // Es un enlace publicado por la web municipal. El usuario lo revisa antes de guardarlo.
    // No hacemos otra petición por cada enlace: esa comprobación retrasaba la búsqueda.
    return $mejorUrl;
}

/**
 * Consulta direcciones sin bloquearse en la primera web lenta.
 * En modo portada/google lee enlaces; en modo ruta comprueba la dirección con HEAD.
 * Los fallos se reintentan una vez, reutilizando conexión y cookies.
 * Cada fase tiene un límite de tiempo y un máximo de dos conexiones por servidor.
 */
function consultarUrlsPolitica(array $direcciones, array $dominios, float $maxSegundos, string $modo): array {
    // Recordar qué servidores necesitaron el paquete de CA durante esta búsqueda.
    static $certificadosPorHost = [];
    $limite = microtime(true) + $maxSegundos;
    $multi = curl_multi_init();
    // Limitar la concurrencia evita lanzar todas las rutas contra la misma web a la vez.
    curl_multi_setopt($multi, CURLMOPT_MAX_TOTAL_CONNECTIONS, 8);
    curl_multi_setopt($multi, CURLMOPT_MAX_HOST_CONNECTIONS, 2);
    $consultas = [];
    $portadas = [];
    $fallosCertificado = [];
    $archivoCertificados = dirname(__DIR__, 3) . '/lib/cacert.pem';
    $pendientes = $direcciones;
    $bloqueada = false;
    $tiempoAgotado = false;
    $detalles = [];

    try {
        for ($intento = 1; $intento <= 2; $intento++) {
            // 1. Preparar todas las consultas de este intento.
            foreach ($pendientes as $url) {
                $restanteMs = (int)(($limite - microtime(true)) * 1000);
                if ($restanteMs < 100) {
                    $tiempoAgotado = true;
                    break;
                }
                if (!isset($consultas[$url])) {
                    $curl = curl_init($url);
                    curl_setopt_array($curl, [
                        CURLOPT_PRIVATE => $url,
                        CURLOPT_NOBODY => $modo === 'ruta',
                        CURLOPT_RETURNTRANSFER => true,
                        CURLOPT_FOLLOWLOCATION => true,
                        CURLOPT_MAXREDIRS => 5,
                        CURLOPT_PROTOCOLS => CURLPROTO_HTTP | CURLPROTO_HTTPS,
                        CURLOPT_REDIR_PROTOCOLS => CURLPROTO_HTTP | CURLPROTO_HTTPS,
                        CURLOPT_SSL_VERIFYPEER => true,
                        CURLOPT_SSL_VERIFYHOST => 2,
                        CURLOPT_ENCODING => '',
                        CURLOPT_COOKIEFILE => '',
                        CURLOPT_USERAGENT => 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
                    ]);
                    $host = parse_url($url, PHP_URL_HOST);
                    if (isset($certificadosPorHost[$host]) && is_readable($archivoCertificados)) {
                        curl_setopt($curl, CURLOPT_CAINFO, $archivoCertificados);
                    }
                    $consultas[$url] = ['curl' => $curl, 'activa' => false];
                }
                $curl = $consultas[$url]['curl'];
                curl_setopt_array($curl, [
                    CURLOPT_CONNECTTIMEOUT_MS => min(3000, $restanteMs),
                    CURLOPT_TIMEOUT_MS => min(5000, $restanteMs),
                ]);
                curl_multi_add_handle($multi, $curl);
                $consultas[$url]['activa'] = true;
            }
            $pendientes = [];

            // 2. Leer cada respuesta en cuanto termina, sin esperar a las otras webs.
            do {
                do {
                    $estado = curl_multi_exec($multi, $activas);
                } while ($estado === CURLM_CALL_MULTI_PERFORM);
                if ($estado !== CURLM_OK) {
                    throw new RuntimeException('No se pudieron consultar las portadas.');
                }
                while ($respuesta = curl_multi_info_read($multi)) {
                    $curl = $respuesta['handle'];
                    $url = curl_getinfo($curl, CURLINFO_PRIVATE);
                    $codigo = (int)curl_getinfo($curl, CURLINFO_HTTP_CODE);
                    $urlFinal = curl_getinfo($curl, CURLINFO_EFFECTIVE_URL);
                    $html = (string)curl_multi_getcontent($curl);
                    $error = $respuesta['result'];
                    if (!in_array($error, [CURLE_SSL_CACERT, CURLE_SSL_CACERT_BADFILE], true)) {
                        unset($fallosCertificado[$url]);
                    }
                    // Guardar las portadas que respondieron permite limitar después las rutas a esas webs.
                    if ($modo === 'portada' && $codigo > 0 && esDominioPoliticaMunicipal($urlFinal, $dominios)) {
                        $partes = parse_url($urlFinal);
                        $origen = $partes['scheme'] . '://' . $partes['host'];
                        if (isset($partes['port'])) {
                            $origen .= ':' . $partes['port'];
                        }
                        $portadas[$origen] = true;
                    }
                    curl_multi_remove_handle($multi, $curl);
                    $consultas[$url]['activa'] = false;

                    // Una verificación humana se comunica al usuario; no se intenta sortearla.
                    $verificacion = preg_match('/awswaf|gokuProps|human verification|cf-chl-/i', $html);
                    if (in_array($error, [CURLE_SSL_CACERT, CURLE_SSL_CACERT_BADFILE], true)) {
                        // Si PHP no tiene bien configurados sus certificados, usar el paquete de Mozilla.
                        // La verificación HTTPS continúa activada; no se aceptan certificados inválidos.
                        $fallosCertificado[$url] = true;
                        if (is_readable($archivoCertificados)) {
                            $certificadosPorHost[parse_url($url, PHP_URL_HOST)] = true;
                            curl_setopt($curl, CURLOPT_CAINFO, $archivoCertificados);
                            $pendientes[] = $url;
                        }
                    } elseif ($modo === 'ruta' && $error === CURLE_OK && $codigo >= 200 && $codigo < 300) {
                        $ruta = parse_url($urlFinal, PHP_URL_PATH) ?? '';
                        if (esDominioPoliticaMunicipal($urlFinal, $dominios)
                            && preg_match('/privacidad|proteccion|aviso[-_]?legal/i', $ruta)) {
                            return ['success' => true, 'url' => $urlFinal,
                                'message' => 'Se ha localizado una dirección probable. Revísala antes de guardar.'];
                        }
                    } elseif ($verificacion) {
                        $bloqueada = true;
                    } elseif ($codigo === 403 || $codigo === 405) {
                        // Sin verificación humana puede ser un rechazo provisional.
                        $bloqueada = true;
                        // Algunas webs rechazan HEAD y permiten GET, como en la versión original.
                        if ($modo === 'ruta') {
                            curl_setopt($curl, CURLOPT_NOBODY, false);
                        }
                        $pendientes[] = $url;
                    } elseif ($error === CURLE_OK && $codigo >= 200 && $codigo < 300 && $html !== '') {
                        $enlace = obtenerEnlacePolitica($html, $urlFinal, $dominios);
                        if ($enlace !== null) {
                            return ['success' => true, 'url' => $enlace,
                                'message' => 'Se ha encontrado un enlace en la web municipal. Revísalo antes de guardar.'];
                        }
                        $pendientes[] = $url;
                    } elseif ($codigo !== 404 && $codigo !== 410) {
                        $pendientes[] = $url;
                    }
                    if ($error === CURLE_OPERATION_TIMEDOUT) {
                        $tiempoAgotado = true;
                    }
                    $detalles[$url] = 'HTTP ' . $codigo . ', cURL ' . $error;
                }
                if (microtime(true) >= $limite) {
                    $tiempoAgotado = true;
                    break;
                }
                if ($activas > 0) {
                    // Esperar actividad de red evita mantener el procesador ocupado.
                    if (curl_multi_select($multi, 0.1) === -1) {
                        usleep(10000);
                    }
                }
            } while ($activas > 0);
            if ($pendientes === [] || microtime(true) >= $limite) {
                break;
            }
        }
    } finally {
        // 3. Cerrar también las consultas lentas al encontrar una URL o agotar el tiempo.
        foreach ($consultas as $consulta) {
            if ($consulta['activa']) {
                curl_multi_remove_handle($multi, $consulta['curl']);
            }
            curl_close($consulta['curl']);
        }
        curl_multi_close($multi);
    }

    // Guardar solo dirección y estado en el log de PHP permite diagnosticar fallos de PRO.
    error_log('Buscar política de privacidad: ' . json_encode($detalles, JSON_UNESCAPED_SLASHES));
    if ($fallosCertificado !== []) {
        $mensaje = 'No se ha podido verificar el certificado HTTPS de la web consultada. Revisa los certificados de PHP/cURL en el servidor.';
    } elseif ($bloqueada) {
        $mensaje = 'La web municipal bloquea la consulta automática o solicita una verificación humana. Abre su web y copia el enlace de privacidad.';
    } elseif ($tiempoAgotado) {
        $mensaje = 'La web municipal no ha respondido dentro del tiempo de búsqueda. Puedes introducir la URL manualmente.';
    } else {
        $mensaje = 'No se ha localizado un enlace de privacidad en las portadas consultadas. Puedes introducirlo manualmente.';
    }
    return ['success' => false, 'url' => null, 'message' => $mensaje,
        'portadas' => array_keys($portadas), 'estados' => $detalles];
}

/**
 * Busca como la versión original: portada, rutas habituales y búsqueda alternativa.
 * Cada fase tiene su tiempo reservado, para que la primera no impida ejecutar las demás.
 */
function buscarPoliticaPrivacidad(string $nombreMunicipio): array {
    if (!function_exists('curl_multi_init') || !class_exists('DOMDocument')) {
        return ['success' => false, 'url' => null,
            'message' => 'El servidor necesita las extensiones cURL y DOM de PHP para buscar la política de privacidad.'];
    }
    $dominios = dominiosPoliticaMunicipio($nombreMunicipio);
    if ($dominios === []) {
        return ['success' => false, 'url' => null, 'message' => 'Selecciona un municipio válido.'];
    }

    // 1. Buscar el enlace publicado en las portadas municipales.
    $direcciones = [];
    foreach ($dominios as $dominio) {
        $direcciones[] = 'https://' . $dominio . '/';
    }
    $resultadoPortadas = consultarUrlsPolitica($direcciones, $dominios, 6.0, 'portada');
    if ($resultadoPortadas['success']) {
        return $resultadoPortadas;
    }

    // 2. Recuperar todas las rutas habituales que probaba el buscador original.
    // Si una portada respondió, priorizar su dirección real después de las redirecciones.
    $origenes = $resultadoPortadas['portadas'];
    if ($origenes === []) {
        foreach ($dominios as $dominio) {
            $origenes[] = 'https://' . $dominio;
        }
    }
    $rutas = [
        '/aviso-legal-y-politica-de-privacidad', '/aviso-legal-y-politica-de-privacidad/',
        '/politica-de-privacidad', '/politica-de-privacidad/',
        '/politica-privacidad', '/politica-privacidad/', '/politica-de-privacidad.php',
        '/proteccion-de-datos', '/proteccion-de-datos/',
        '/informacion-general/politica-de-privacidad', '/informacion-general/politica-de-privacidad/',
        '/aviso-legal', '/aviso-legal/', '/avisolegal', '/avisolegal/'
    ];
    $direcciones = [];
    foreach ($rutas as $ruta) {
        foreach ($origenes as $origen) {
            $direcciones[] = $origen . $ruta;
        }
    }
    $resultadoRutas = consultarUrlsPolitica($direcciones, $dominios, 8.0, 'ruta');
    if ($resultadoRutas['success']) {
        return $resultadoRutas;
    }

    // 3. Recuperar la búsqueda alternativa para direcciones con rutas numéricas o distintas.
    $dominio = str_replace('-', '', slugifyMunicipio($nombreMunicipio)) . '.es';
    $consulta = 'site:' . $dominio . ' ("política de privacidad" OR "aviso legal")';
    $googleUrl = 'https://www.google.com/search?q=' . urlencode($consulta) . '&hl=es';
    $resultadoGoogle = consultarUrlsPolitica([$googleUrl], $dominios, 6.0, 'google');
    if ($resultadoGoogle['success']) {
        return $resultadoGoogle;
    }

    // Los estados técnicos quedan en el log de PHP, nunca en una falsa URL encontrada.
    error_log('Búsqueda completa de política (' . $nombreMunicipio . '): ' . json_encode([
        'portadas' => $resultadoPortadas['estados'],
        'rutas' => $resultadoRutas['estados'],
        'google' => $resultadoGoogle['estados']
    ], JSON_UNESCAPED_SLASHES));
    return ['success' => false, 'url' => null, 'message' =>
        'No se ha podido obtener la política tras consultar la web municipal, las rutas habituales y la búsqueda alternativa. ' . $resultadoPortadas['message']];
}
