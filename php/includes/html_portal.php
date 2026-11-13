<?php
// ============================================================================
// FORMATO HTML DEL PORTAL
// Comparte la limpieza entre el guardado de diseño y su presentación pública.
// Solo admite formato de texto y enlaces; no conserva atributos ejecutables.
// ============================================================================

/** Limpia un fragmento del editor sin depender de expresiones para analizar HTML. */
function limpiarHtmlPortal($texto, $limite = null)
{
    $texto = trim((string)$texto);
    if ($limite !== null) {
        $texto = function_exists('mb_substr')
            ? mb_substr($texto, 0, $limite, 'UTF-8')
            : substr($texto, 0, $limite);
    }

    // Sin DOM se muestra el contenido como texto, nunca como HTML sin revisar.
    if (!class_exists('DOMDocument')) {
        return htmlspecialchars(strip_tags($texto), ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
    }

    $documento = new DOMDocument('1.0', 'UTF-8');
    $erroresAnteriores = libxml_use_internal_errors(true);
    $documento->loadHTML(
        '<?xml encoding="UTF-8"><html><body>' . $texto . '</body></html>',
        LIBXML_NONET | LIBXML_NOERROR | LIBXML_NOWARNING
    );
    libxml_clear_errors();
    libxml_use_internal_errors($erroresAnteriores);

    $cuerpo = $documento->getElementsByTagName('body')->item(0);
    if (!$cuerpo) return '';
    limpiarNodosHtmlPortal($cuerpo);

    $resultado = '';
    foreach ($cuerpo->childNodes as $nodo) {
        $resultado .= $documento->saveHTML($nodo);
    }
    return trim($resultado);
}

/** Recorre los nodos y conserva únicamente etiquetas de lectura y enlaces válidos. */
function limpiarNodosHtmlPortal($padre)
{
    $permitidas = ['p', 'br', 'strong', 'b', 'em', 'i', 'u', 'ul', 'ol', 'li',
        'a', 'blockquote', 'h2', 'h3', 'h4'];
    foreach (iterator_to_array($padre->childNodes) as $nodo) {
        if ($nodo->nodeType === XML_COMMENT_NODE) {
            $padre->removeChild($nodo);
            continue;
        }
        if ($nodo->nodeType !== XML_ELEMENT_NODE) continue;

        $etiqueta = strtolower($nodo->nodeName);
        if (in_array($etiqueta, ['script', 'style', 'iframe', 'object', 'embed'], true)) {
            $padre->removeChild($nodo);
            continue;
        }

        limpiarNodosHtmlPortal($nodo);
        if (!in_array($etiqueta, $permitidas, true)) {
            while ($nodo->firstChild) {
                $padre->insertBefore($nodo->firstChild, $nodo);
            }
            $padre->removeChild($nodo);
            continue;
        }

        $url = $nodo->getAttribute('href');
        $titulo = $nodo->getAttribute('title');
        foreach (iterator_to_array($nodo->attributes) as $atributo) {
            $nodo->removeAttribute($atributo->nodeName);
        }
        if ($etiqueta === 'a' && esEnlaceHtmlPortalValido($url)) {
            $nodo->setAttribute('href', $url);
            $nodo->setAttribute('target', '_blank');
            $nodo->setAttribute('rel', 'noopener noreferrer');
            if ($titulo !== '') $nodo->setAttribute('title', $titulo);
        }
    }
}

/** Admite enlaces web, correo, teléfono y rutas internas sin caracteres de control. */
function esEnlaceHtmlPortalValido($url)
{
    $url = trim((string)$url);
    if ($url === '' || preg_match('/[\x00-\x20\\\\]/', $url)) return false;
    if (preg_match('#^(https?://|mailto:|tel:)#i', $url)) return true;
    // Las rutas relativas no pueden contener un esquema ni empezar por //.
    return strpos($url, ':') === false && strpos($url, '//') !== 0;
}
