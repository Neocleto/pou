<?php
// ============================================================================
// MODELO: CONFIGURACIÓN COMPLETA DEL PORTAL
//
// Además de los colores, este modelo guarda los textos y etiquetas del portal
// en un único campo JSON. De esta forma el configurador puede editar toda la
// página sin crear una columna nueva para cada frase.
// ============================================================================

require_once __DIR__ . '/../includes/valores_portal.php';
require_once __DIR__ . '/../includes/cabecera_portal.php';
require_once __DIR__ . '/../includes/html_portal.php';

class ConfiguracionVisualModel
{
    private $conn;

    public function __construct($db)
    {
        $this->conn = $db;
    }

    /**
     * Obtiene la configuración completa del municipio.
     */
    public function obtenerPorMunicipio($codMun)
    {
        $sql = "SELECT *
                FROM pou.configuracion_visual
                WHERE cod_mun = :cod_mun";

        $stmt = $this->conn->prepare($sql);
        $stmt->execute([':cod_mun' => $codMun]);

        $configuracion = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$configuracion) {
            return obtenerConfiguracionInicialPortal($codMun);
        }

        $configuracion['mostrar_accesos'] = $this->normalizarBooleano(
            $configuracion['mostrar_accesos'] ?? true
        );

        // 1. Completamos las secciones antiguas con los valores nuevos.
        $configuracion['secciones_portal'] = $this->normalizarSecciones(
            $configuracion['secciones_portal'] ?? []
        );

        // 2. Completamos también los textos del portal. Así una instalación
        //    anterior sigue funcionando aunque todavía no haya personalizado nada.
        $configuracion['contenido_portal'] = $this->normalizarContenidoPortal(
            $configuracion['contenido_portal'] ?? []
        );

        return normalizarIconosDatosPortal($configuracion);
    }

    /**
     * Crea o actualiza la configuración completa.
     */
    public function guardar($datos)
    {
        $datos = array_merge(
            obtenerConfiguracionInicialPortal($datos['cod_mun'] ?? ''),
            $datos
        );

        $sql = "INSERT INTO pou.configuracion_visual (
                    cod_mun,
                    color_primario,
                    color_secundario,
                    color_participacion,
                    color_documentos,
                    color_noticias,
                    color_buzon,
                    ancho_contenido,
                    escala_texto,
                    mostrar_accesos,
                    secciones_portal,
                    contenido_portal,
                    actualizado_en
                ) VALUES (
                    :cod_mun,
                    :color_primario,
                    :color_secundario,
                    :color_participacion,
                    :color_documentos,
                    :color_noticias,
                    :color_buzon,
                    :ancho_contenido,
                    :escala_texto,
                    CAST(:mostrar_accesos AS integer)::boolean,
                    CAST(:secciones_portal AS jsonb),
                    CAST(:contenido_portal AS jsonb),
                    CURRENT_TIMESTAMP
                )
                ON CONFLICT (cod_mun) DO UPDATE SET
                    color_primario = EXCLUDED.color_primario,
                    color_secundario = EXCLUDED.color_secundario,
                    color_participacion = EXCLUDED.color_participacion,
                    color_documentos = EXCLUDED.color_documentos,
                    color_noticias = EXCLUDED.color_noticias,
                    color_buzon = EXCLUDED.color_buzon,
                    ancho_contenido = EXCLUDED.ancho_contenido,
                    escala_texto = EXCLUDED.escala_texto,
                    mostrar_accesos = EXCLUDED.mostrar_accesos,
                    secciones_portal = EXCLUDED.secciones_portal,
                    contenido_portal = EXCLUDED.contenido_portal,
                    actualizado_en = CURRENT_TIMESTAMP";

        $stmt = $this->conn->prepare($sql);

        return $stmt->execute([
            ':cod_mun' => $datos['cod_mun'],
            ':color_primario' => $this->normalizarColor($datos['color_primario'] ?? '#540000'),
            ':color_secundario' => $this->normalizarColor($datos['color_secundario'] ?? '#540000'),
            ':color_participacion' => $this->normalizarColor($datos['color_participacion'] ?? '#540000'),
            ':color_documentos' => $this->normalizarColor($datos['color_documentos'] ?? '#540000'),
            ':color_noticias' => $this->normalizarColor($datos['color_noticias'] ?? '#540000'),
            ':color_buzon' => $this->normalizarColor($datos['color_buzon'] ?? '#540000'),
            ':ancho_contenido' => max(1100, min(1900, (int)($datos['ancho_contenido'] ?? 1800))),
            ':escala_texto' => max(0.90, min(1.20, (float)($datos['escala_texto'] ?? 1))),
            ':mostrar_accesos' => !empty($datos['mostrar_accesos']) ? 1 : 0,
            ':secciones_portal' => json_encode(
                $this->normalizarSecciones($datos['secciones_portal'] ?? []),
                JSON_UNESCAPED_UNICODE
            ),
            ':contenido_portal' => json_encode(
                $this->normalizarContenidoPortal($datos['contenido_portal'] ?? []),
                JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES
            )
        ]);
    }

    /**
     * Obtiene los accesos rápidos ordenados.
     */
    public function obtenerAccesos($codMun, $soloVisibles = false)
    {
        $sql = "SELECT *
                FROM pou.accesos_publicos
                WHERE cod_mun = :cod_mun";

        $sql .= " ORDER BY orden ASC, id ASC";

        $stmt = $this->conn->prepare($sql);
        $stmt->execute([':cod_mun' => $codMun]);

        $accesos = normalizarIconosDatosPortal($stmt->fetchAll(PDO::FETCH_ASSOC));
        // Una lista guardada vacía es válida. Solo un municipio sin diseño
        // previo recibe los accesos de fábrica; borrar el último no los repone.
        if (!$accesos) {
            $stmtConfiguracion = $this->conn->prepare(
                "SELECT 1 FROM pou.configuracion_visual WHERE cod_mun = :cod_mun"
            );
            $stmtConfiguracion->execute([':cod_mun' => $codMun]);
            if (!$stmtConfiguracion->fetchColumn()) {
                $accesos = obtenerAccesosInicialesPortal();
            }
        }
        if ($soloVisibles) {
            $accesos = array_values(array_filter($accesos, function ($acceso) {
                return $this->normalizarBooleano($acceso['visible'] ?? true);
            }));
        }
        return $accesos;
    }

    /**
     * Sustituye los accesos del municipio por los recibidos.
     */
    public function guardarAccesos($codMun, array $accesos)
    {
        if (count($accesos) > 12) {
            throw new Exception('Se pueden configurar hasta doce accesos rápidos.');
        }

        $accesosValidos = [];

        // 1. Validamos la lista completa antes de borrar nada. Un acceso con
        //    datos incompletos debe mostrar un error, no desaparecer en silencio.
        foreach ($accesos as $indice => $acceso) {
            $titulo = trim((string)($acceso['titulo'] ?? ''));
            $destino = trim((string)($acceso['destino'] ?? ''));

            if ($titulo === '') {
                throw new Exception('El acceso ' . ($indice + 1) . ' necesita un título.');
            }

            if ($destino === '') {
                throw new Exception('El acceso ' . ($indice + 1) . ' necesita un destino.');
            }

            $tipoDestino = $acceso['tipo_destino'] ?? 'seccion';

            if (!in_array($tipoDestino, ['seccion', 'url', 'formulario'], true)) {
                throw new Exception('El tipo de destino del acceso ' . ($indice + 1) . ' no es válido.');
            }

            $destino = $this->normalizarDestino($tipoDestino, $destino);

            if ($destino === '') {
                throw new Exception('Revisa el destino del acceso ' . ($indice + 1) . '.');
            }

            $accesosValidos[] = [
                'titulo' => $this->limpiarTexto($titulo, 120),
                'descripcion' => $this->limpiarTexto($acceso['descripcion'] ?? '', 240),
                'icono' => $this->normalizarIcono($acceso['icono'] ?? 'link-45deg'),
                'color' => $this->normalizarColor($acceso['color'] ?? '#540000'),
                'destino' => $destino,
                'tipo_destino' => $tipoDestino,
                'visible' => !isset($acceso['visible']) || $this->normalizarBooleano($acceso['visible'])
            ];
        }

        // 2. Sustituimos los registros únicamente cuando toda la lista es válida.
        $stmtEliminar = $this->conn->prepare(
            "DELETE FROM pou.accesos_publicos WHERE cod_mun = :cod_mun"
        );
        $stmtEliminar->execute([':cod_mun' => $codMun]);

        $sqlInsertar = "INSERT INTO pou.accesos_publicos (
                            cod_mun,
                            titulo,
                            descripcion,
                            icono,
                            color,
                            destino,
                            tipo_destino,
                            orden,
                            visible
                        ) VALUES (
                            :cod_mun,
                            :titulo,
                            :descripcion,
                            :icono,
                            :color,
                            :destino,
                            :tipo_destino,
                            :orden,
                            CAST(:visible AS integer)::boolean
                        )";

        $stmtInsertar = $this->conn->prepare($sqlInsertar);

        foreach ($accesosValidos as $indice => $acceso) {
            $stmtInsertar->execute([
                ':cod_mun' => $codMun,
                ':titulo' => $acceso['titulo'],
                ':descripcion' => $acceso['descripcion'],
                ':icono' => $acceso['icono'],
                ':color' => $acceso['color'],
                ':destino' => $acceso['destino'],
                ':tipo_destino' => $acceso['tipo_destino'],
                ':orden' => $indice + 1,
                ':visible' => $acceso['visible'] ? 1 : 0
            ]);
        }
    }



    /**
     * Normaliza el orden, el nombre y la visibilidad de los bloques.
     */
    private function normalizarSecciones($secciones)
    {
        if (is_string($secciones)) {
            $secciones = json_decode($secciones, true);
        }

        if (!is_array($secciones) || empty($secciones)) {
            return obtenerSeccionesInicialesPortal();
        }

        // 1. Preparamos los bloques fijos que forman parte de POU.
        $permitidas = [];

        foreach (obtenerSeccionesInicialesPortal() as $seccion) {
            $permitidas[$seccion['id']] = $seccion;
        }

        $resultado = [];
        $utilizadas = [];
        $personalizadas = 0;

        foreach ($secciones as $seccion) {
            if (!is_array($seccion)) {
                continue;
            }

            $id = preg_replace('/[^a-zA-Z0-9_-]/', '', trim((string)($seccion['id'] ?? '')));

            if ($id === '' || isset($utilizadas[$id])) {
                continue;
            }

            // 2. Los bloques fijos conservan el comportamiento anterior.
            if (isset($permitidas[$id])) {
                $resultado[] = [
                    'id' => $id,
                    'tipo' => 'sistema',
                    'titulo' => $this->normalizarTituloSeccion(
                        $seccion['titulo'] ?? $permitidas[$id]['titulo'],
                        $permitidas[$id]['titulo']
                    ),
                    'icono' => $this->normalizarIcono(
                        $seccion['icono'] ?? $permitidas[$id]['icono']
                    ),
                    'color' => $this->normalizarColor(
                        $seccion['color'] ?? $permitidas[$id]['color']
                    ),
                    'visible' => !isset($seccion['visible']) || $this->normalizarBooleano($seccion['visible'])
                ];

                $utilizadas[$id] = true;
                continue;
            }

            // 3. Permitimos hasta diez bloques creados por el gestor.
            if (($seccion['tipo'] ?? '') !== 'personalizado' || $personalizadas >= 10) {
                continue;
            }

            $resultado[] = [
                'id' => $id,
                'tipo' => 'personalizado',
                'titulo' => $this->normalizarTituloSeccion(
                    $seccion['titulo'] ?? 'Nuevo bloque',
                    'Nuevo bloque'
                ),
                'icono' => $this->normalizarIcono($seccion['icono'] ?? 'layout-text-window'),
                'color' => $this->normalizarColor($seccion['color'] ?? '#540000'),
                'visible' => !isset($seccion['visible']) || $this->normalizarBooleano($seccion['visible']),
                'diseno' => $this->normalizarDisenoBloque($seccion['diseno'] ?? 'texto'),
                'kicker' => $this->limpiarTexto($seccion['kicker'] ?? '', 120),
                'contenido' => $this->limpiarHtmlEnriquecido($seccion['contenido'] ?? '', 10000),
                'destacado_titulo' => $this->limpiarTexto($seccion['destacado_titulo'] ?? '', 160),
                'destacado_texto' => $this->limpiarHtmlEnriquecido($seccion['destacado_texto'] ?? '', 4000),
                'columna_izquierda' => $this->limpiarHtmlEnriquecido($seccion['columna_izquierda'] ?? '', 6000),
                'columna_derecha' => $this->limpiarHtmlEnriquecido($seccion['columna_derecha'] ?? '', 6000),
                'boton_texto' => $this->limpiarTexto($seccion['boton_texto'] ?? '', 100),
                'boton_url' => $this->normalizarUrlOpcional($seccion['boton_url'] ?? '')
            ];

            $utilizadas[$id] = true;
            $personalizadas++;
        }

        // 4. Añadimos los bloques fijos que falten en configuraciones antiguas.
        foreach ($permitidas as $id => $seccion) {
            if (!isset($utilizadas[$id])) {
                $seccion['tipo'] = 'sistema';
                $resultado[] = $seccion;
            }
        }

        return $resultado;
    }

    /**
     * Completa el JSON de textos y elimina HTML no permitido.
     */
    private function normalizarContenidoPortal($contenido)
    {
        if (is_string($contenido)) {
            $contenido = json_decode($contenido, true);
        }

        if (!is_array($contenido)) {
            $contenido = [];
        }

        $contenido = $this->combinarRecursivo(
            obtenerContenidoInicialPortal(),
            $contenido
        );

        $contenido['cabecera'] = actualizarTextosCabeceraPortal($contenido['cabecera']);

        // Eliminamos el texto del antiguo distintivo de la cabecera.
        unset($contenido['cabecera']['mensaje_destacado'], $contenido['cabecera']['subtitulo'], $contenido['documentos']['boton_texto']);

        // Descarta únicamente las opciones retiradas del diseño público.
        unset($contenido['accesos'], $contenido['cabecera']['ilustracion'], $contenido['cabecera']['boton_texto'],
            $contenido['participacion']['recursos_titulo'], $contenido['pie']['ilustracion'],
            $contenido['pie']['color'], $contenido['pie']['enlaces']);
        // Solo el buzón admite decoración. El resto de bloques no guarda opciones de ilustración.
        $contenido['buzon']['mostrar_ilustracion'] = $this->normalizarBooleano(
            $contenido['buzon']['mostrar_ilustracion'] ?? false
        );
        return $this->limpiarContenidoRecursivo($contenido);
    }

    /**
     * Une arrays conservando los valores iniciales que aún no existan.
     */
    private function combinarRecursivo(array $base, array $personalizado)
    {
        foreach ($personalizado as $clave => $valor) {
            if (is_array($valor) && isset($base[$clave]) && is_array($base[$clave])) {
                // Las listas numéricas se sustituyen completas.
                $esLista = $valor === [] || array_keys($valor) === range(0, count($valor) - 1);
                $base[$clave] = $esLista
                    ? $valor
                    : $this->combinarRecursivo($base[$clave], $valor);
            } else {
                $base[$clave] = $valor;
            }
        }

        return $base;
    }

    /**
     * Recorre el contenido y deja solamente texto sencillo, booleanos y listas.
     */
    private function limpiarContenidoRecursivo($valor, $claveActual = '')
    {
        if (is_array($valor)) {
            $resultado = [];

            foreach ($valor as $clave => $elemento) {
                $resultado[$clave] = $this->limpiarContenidoRecursivo($elemento, (string)$clave);
            }

            return $resultado;
        }

        if (is_bool($valor) || is_int($valor) || is_float($valor)) {
            return $valor;
        }

        if ($claveActual === 'icono' || str_ends_with($claveActual, '_icono')) {
            return $this->normalizarIcono($valor);
        }

        $camposEnriquecidos = [
            'descripcion',
            'introduccion',
            'privacidad_texto',
            'formularios_descripcion'
        ];

        if (in_array($claveActual, $camposEnriquecidos, true)) {
            return $this->limpiarHtmlEnriquecido($valor, 6000);
        }

        return $this->limpiarTexto($valor, 3000);
    }

    /** Conserva únicamente etiquetas de formato sencillas. */
    private function limpiarHtmlEnriquecido($texto, $limite)
    {
        return limpiarHtmlPortal($texto, $limite);
    }





    private function normalizarTituloSeccion($titulo, $tituloPorDefecto)
    {
        $titulo = $this->limpiarTexto($titulo, 120);
        return $titulo !== '' ? $titulo : $tituloPorDefecto;
    }

    private function normalizarDestino($tipoDestino, $destino)
    {
        $destino = trim((string)$destino);

        if ($tipoDestino === 'seccion') {
            // Algunas configuraciones antiguas guardaron "buzon" y otras
            // "#buzon". Aceptamos ambos formatos y almacenamos uno solo.
            $idSeccion = ltrim($destino, '#');

            return preg_match('/^[a-zA-Z0-9_-]+$/', $idSeccion)
                ? '#' . $idSeccion
                : '#informacion';
        }

        if ($tipoDestino === 'formulario') {
            $destino = preg_replace('/[^a-zA-Z0-9_-]+/', '-', $destino);
            return trim((string)$destino, '-');
        }

        if (filter_var($destino, FILTER_VALIDATE_URL)) {
            if (strpos($destino, 'http://') === 0 || strpos($destino, 'https://') === 0) {
                return $destino;
            }
        }

        return '';
    }

    /**
     * Acepta una URL externa o un enlace interno del propio portal.
     */
    private function normalizarUrlOpcional($url)
    {
        $url = trim((string)$url);

        if ($url === '') {
            return '';
        }

        if (preg_match('/^#[a-zA-Z0-9_-]+$/', $url)) {
            return $url;
        }

        if (filter_var($url, FILTER_VALIDATE_URL) && preg_match('#^https?://#i', $url)) {
            return $url;
        }

        return '';
    }

    private function normalizarIcono($icono)
    {
        $icono = normalizarNombreIconoPortal($icono);

        // El valor vacío es válido: permite mostrar el bloque sin icono.
        if ($icono === '') {
            return '';
        }

        return preg_match('/^[a-zA-Z0-9-]+$/', $icono)
            ? $icono
            : 'link-45deg';
    }

    /**
     * Limita los diseños de bloques personalizados a los que entiende el portal.
     */
    private function normalizarDisenoBloque($diseno)
    {
        $disenosPermitidos = ['texto', 'destacado', 'llamada', 'columnas'];
        $diseno = trim((string)$diseno);

        return in_array($diseno, $disenosPermitidos, true)
            ? $diseno
            : 'texto';
    }

    private function normalizarColor($color)
    {
        return preg_match('/^#[0-9a-fA-F]{6}$/', (string)$color)
            ? $color
            : '#540000';
    }

    /** Convierte booleanos de PostgreSQL, JSON y formularios. */
    private function normalizarBooleano($valor)
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

    private function limpiarTexto($texto, $limite)
    {
        $texto = trim(strip_tags((string)$texto));

        if (function_exists('mb_substr')) {
            return mb_substr($texto, 0, $limite, 'UTF-8');
        }

        return substr($texto, 0, $limite);
    }
}
