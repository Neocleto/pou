<?php
// ============================================================================
// CATÁLOGO PÚBLICO DE DOCUMENTOS
// Lo usan el controlador de documentos y el portal municipal. Se conserva una
// única regla: está activa la última fase del catálogo que tenga documentos.
// Las fases de documentos NO son las ocho fases del expediente urbanístico.
// ============================================================================

/** Agrupa archivos y prepara los cuatro accesos públicos sin cambiar sus IDs. */
function prepararCatalogoDocumentos(array $documentos, array $catalogo)
{
    $botones = [
        1 => ['titulo' => 'Avance y documento inicial', 'fases' => []],
        2 => ['titulo' => 'Aprobación inicial', 'fases' => []],
        3 => ['titulo' => 'Documento final', 'fases' => []],
        4 => ['titulo' => 'Aprobación definitiva', 'fases' => []]
    ];
    $grupos = [];
    $hayDocumentos = [];
    foreach ($documentos as $documento) {
        $numero = (int)$documento['num_fase'];
        $categoria = $documento['categoria'] ?: 'Sin categoría';
        $grupos[$numero][$categoria][] = $documento;
        $hayDocumentos[$numero] = true;
    }

    $faseActiva = 0;
    $codigoFaseActiva = '';
    $botonActivo = 0;
    $menu = [];
    foreach ($catalogo as $fase) {
        $numero = (int)$fase['num_fase'];
        $titulo = strtolower(strtr((string)$fase['titulo'], ['Á'=>'a','É'=>'e','Í'=>'i','Ó'=>'o','Ú'=>'u','á'=>'a','é'=>'e','í'=>'i','ó'=>'o','ú'=>'u']));
        // La segunda aprobación inicial (2.1) pertenece al segundo botón.
        if (strpos($titulo, 'definitiva') !== false) {
            $paso = 4;
        } elseif (strpos($titulo, 'final') !== false) {
            $paso = 3;
        } elseif (strpos($titulo, 'avance') !== false || (string)$fase['codigo'] === '1') {
            $paso = 1;
        } elseif (strpos($titulo, 'inicial') !== false || strpos((string)$fase['codigo'], '2') === 0) {
            $paso = 2;
        } else {
            $paso = max(1, min(4, (int)$fase['codigo']));
        }
        $botones[$paso]['fases'][] = $numero;
        if (!empty($hayDocumentos[$numero])) {
            $faseActiva = $numero;
            $codigoFaseActiva = (string)$fase['codigo'];
            $botonActivo = $paso;
        }
        $esIntermedia = in_array($fase['es_fase_21'] ?? false, [true, 1, '1', 't', 'true'], true);
        if (!$esIntermedia || !empty($hayDocumentos[$numero])) {
            $menu[$numero] = $fase;
        }
        if (!isset($grupos[$numero])) {
            $grupos[$numero] = [];
        }
    }
    // El estado se calcula por el orden del catálogo, nunca por el ID interno.
    foreach ($botones as $paso => &$boton) {
        $boton['estado'] = $paso === $botonActivo ? 'activa'
            : ($botonActivo > 0 && $paso < $botonActivo ? 'completada' : 'pendiente');
    }
    unset($boton);
    foreach ($menu as $numero => &$fase) {
        $fase['estado'] = $numero === $faseActiva ? 'activa'
            : ($faseActiva > 0 && version_compare((string)$fase['codigo'], $codigoFaseActiva, '<') ? 'completada' : 'pendiente');
    }
    unset($fase);
    // Las vistas públicas no reciben títulos ni enlaces de fases cerradas.
    $grupos = $faseActiva > 0 ? [$faseActiva => $grupos[$faseActiva] ?? []] : [];
    // Memoria y cartografía primero. La búsqueda conserva este mismo orden.
    foreach ($grupos as &$categorias) {
        uksort($categorias, function ($a, $b) {
            $prioridad = function ($texto) {
                $texto = strtolower(strtr($texto, ['Í'=>'i', 'í'=>'i']));
                if (strpos($texto, 'memoria') !== false) return 1;
                if (strpos($texto, 'cartograf') !== false) return 2;
                return 3;
            };
            $resultado = $prioridad($a) <=> $prioridad($b);
            return $resultado === 0 ? strnatcasecmp($a, $b) : $resultado;
        });
    }
    unset($categorias);
    return [
        'faseActualNum' => $faseActiva,
        'faseActual' => ['num_fase' => $faseActiva],
        'fasesMenu' => $menu,
        'documentosPorFase' => $grupos,
        'botones' => $botones,
        'botonActivo' => $botonActivo
    ];
}
