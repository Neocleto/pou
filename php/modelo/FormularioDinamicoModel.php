<?php
require_once __DIR__ . '/../includes/iconos_portal.php';

// ============================================================================
// MODELO DE FORMULARIOS DINÁMICOS
//
// Gestiona:
// - Formularios del municipio.
// - Apartados y preguntas.
// - Respuestas enviadas por la ciudadanía.
//
// La creación o modificación de tablas se realiza únicamente mediante SQL.
// ============================================================================

class FormularioDinamicoModel
{
    private $conn;

    public function __construct($db)
    {
        $this->conn = $db;
    }

    /**
     * Devuelve los formularios del municipio.
     */
    public function listarPorMunicipio($codMun, $soloActivos = false)
    {
        $sql = "SELECT
                    f.*,
                    (
                        SELECT COUNT(*)
                        FROM pou.formulario_respuestas r
                        WHERE r.formulario_id = f.id
                    ) AS total_respuestas
                FROM pou.formularios f
                WHERE f.cod_mun = :cod_mun";

        if ($soloActivos) {
            $sql .= " AND f.activo = TRUE";
        }

        $sql .= " ORDER BY f.orden ASC, f.id ASC";

        $stmt = $this->conn->prepare($sql);
        $stmt->execute([
            ':cod_mun' => $codMun
        ]);

        return normalizarIconosDatosPortal($stmt->fetchAll(PDO::FETCH_ASSOC));
    }

    /**
     * Devuelve un formulario con sus apartados y preguntas.
     */
    public function obtenerCompleto($id, $codMun = null)
    {
        $sql = "SELECT *
                FROM pou.formularios
                WHERE id = :id";

        $parametros = [
            ':id' => (int)$id
        ];

        if ($codMun !== null) {
            $sql .= " AND cod_mun = :cod_mun";
            $parametros[':cod_mun'] = $codMun;
        }

        $stmt = $this->conn->prepare($sql);
        $stmt->execute($parametros);

        $formulario = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$formulario) {
            return null;
        }

        $formulario['secciones'] = $this->obtenerSecciones((int)$formulario['id']);

        return normalizarIconosDatosPortal($formulario);
    }

    /**
     * Busca un formulario público por su dirección amigable.
     */
    public function obtenerPorSlug($codMun, $slug)
    {
        $sql = "SELECT id
                FROM pou.formularios
                WHERE cod_mun = :cod_mun
                  AND slug = :slug
                  AND activo = TRUE";

        $stmt = $this->conn->prepare($sql);
        $stmt->execute([
            ':cod_mun' => $codMun,
            ':slug' => $slug
        ]);

        $id = $stmt->fetchColumn();

        if (!$id) {
            return null;
        }

        return $this->obtenerCompleto((int)$id, $codMun);
    }

    /**
     * Guarda el formulario completo.
     *
     * El controlador abre la transacción antes de llamar a este método.
     */
    public function guardarCompleto($codMun, array $datos)
    {
        $formularioId = !empty($datos['id'])
            ? (int)$datos['id']
            : null;

        $titulo = trim($datos['titulo'] ?? '');

        if ($titulo === '') {
            throw new Exception('El formulario necesita un título.');
        }

        $modalidad = $this->normalizarModalidad($datos['modalidad'] ?? 'online');

        // Validamos también en servidor. El navegador ayuda al usuario, pero
        // una petición manual nunca debe guardar un formulario incompleto.
        $this->validarContenidoFormulario($datos, $modalidad);

        $slugBase = $datos['slug'] ?? $titulo;
        $slug = $this->crearSlugUnico($codMun, $slugBase, $formularioId);

        if ($formularioId) {
            if (!$this->obtenerResumen($formularioId, $codMun)) {
                throw new Exception('El formulario que intentas editar no existe.');
            }

            $this->actualizarFormulario(
                $formularioId,
                $codMun,
                $datos,
                $titulo,
                $slug,
                $modalidad
            );
        } else {
            $formularioId = $this->insertarFormulario(
                $codMun,
                $datos,
                $titulo,
                $slug,
                $modalidad
            );
        }

        // Las respuestas guardan una copia del enunciado mostrado.
        // Por eso los apartados se pueden reconstruir sin perder el histórico.
        $this->eliminarSecciones($formularioId);
        $this->guardarSecciones($formularioId, $datos['secciones'] ?? []);

        return $formularioId;
    }

    /**
     * Elimina un formulario sin respuestas o lo archiva si ya fue contestado.
     */
    public function eliminarOArchivar($id, $codMun)
    {
        $formulario = $this->obtenerResumen((int)$id, $codMun);

        if (!$formulario) {
            throw new Exception('El formulario solicitado no existe.');
        }

        $totalRespuestas = $this->contarRespuestas((int)$id, $codMun);

        if ($totalRespuestas > 0) {
            $sql = "UPDATE pou.formularios
                    SET activo = FALSE,
                        actualizado_en = CURRENT_TIMESTAMP
                    WHERE id = :id
                      AND cod_mun = :cod_mun";

            $stmt = $this->conn->prepare($sql);
            $stmt->execute([
                ':id' => (int)$id,
                ':cod_mun' => $codMun
            ]);

            return [
                'accion' => 'archivado',
                'total_respuestas' => $totalRespuestas
            ];
        }

        $sql = "DELETE FROM pou.formularios
                WHERE id = :id
                  AND cod_mun = :cod_mun";

        $stmt = $this->conn->prepare($sql);
        $stmt->execute([
            ':id' => (int)$id,
            ':cod_mun' => $codMun
        ]);

        return [
            'accion' => 'eliminado',
            'total_respuestas' => 0
        ];
    }

    /**
     * Guarda el orden de los formularios mostrado en el portal.
     */
    public function guardarOrden($codMun, array $formularios)
    {
        $sql = "UPDATE pou.formularios
                SET orden = :orden,
                    actualizado_en = CURRENT_TIMESTAMP
                WHERE id = :id
                  AND cod_mun = :cod_mun";

        $stmt = $this->conn->prepare($sql);

        foreach ($formularios as $indice => $formularioId) {
            $stmt->execute([
                ':orden' => $indice + 1,
                ':id' => (int)$formularioId,
                ':cod_mun' => $codMun
            ]);
        }
    }

    /**
     * Guarda una respuesta anónima y devuelve su referencia.
     */
    public function guardarRespuesta($formulario, array $respuestas, $ip)
    {
        $referencia = $this->crearReferenciaRespuesta();
        $ipHash = hash('sha256', (string)$ip);

        $sql = "INSERT INTO pou.formulario_respuestas
                    (formulario_id, cod_mun, referencia, respuestas, ip_hash)
                VALUES
                    (:formulario_id, :cod_mun, :referencia, CAST(:respuestas AS jsonb), :ip_hash)";

        $stmt = $this->conn->prepare($sql);
        $stmt->execute([
            ':formulario_id' => (int)$formulario['id'],
            ':cod_mun' => $formulario['cod_mun'],
            ':referencia' => $referencia,
            ':respuestas' => json_encode($respuestas, JSON_UNESCAPED_UNICODE),
            ':ip_hash' => $ipHash
        ]);

        return $referencia;
    }

    /**
     * Devuelve las respuestas de un formulario del municipio.
     */
    public function listarRespuestas($formularioId, $codMun)
    {
        $sql = "SELECT r.*
                FROM pou.formulario_respuestas r
                INNER JOIN pou.formularios f
                    ON f.id = r.formulario_id
                WHERE r.formulario_id = :formulario_id
                  AND f.cod_mun = :cod_mun
                ORDER BY r.enviado_en DESC";

        $stmt = $this->conn->prepare($sql);
        $stmt->execute([
            ':formulario_id' => (int)$formularioId,
            ':cod_mun' => $codMun
        ]);

        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    /**
     * Devuelve los apartados de un formulario.
     */
    private function obtenerSecciones($formularioId)
    {
        $sql = "SELECT *
                FROM pou.formulario_secciones
                WHERE formulario_id = :formulario_id
                ORDER BY orden ASC, id ASC";

        $stmt = $this->conn->prepare($sql);
        $stmt->execute([
            ':formulario_id' => $formularioId
        ]);

        $secciones = $stmt->fetchAll(PDO::FETCH_ASSOC);

        foreach ($secciones as &$seccion) {
            $seccion['preguntas'] = $this->obtenerPreguntas((int)$seccion['id']);
        }
        unset($seccion);

        return $secciones;
    }

    /**
     * Devuelve las preguntas de un apartado.
     */
    private function obtenerPreguntas($seccionId)
    {
        $sql = "SELECT *
                FROM pou.formulario_preguntas
                WHERE seccion_id = :seccion_id
                ORDER BY orden ASC, id ASC";

        $stmt = $this->conn->prepare($sql);
        $stmt->execute([
            ':seccion_id' => $seccionId
        ]);

        $preguntas = $stmt->fetchAll(PDO::FETCH_ASSOC);

        foreach ($preguntas as &$pregunta) {
            $pregunta['opciones'] = json_decode(
                $pregunta['opciones'] ?? '[]',
                true
            ) ?: [];
        }
        unset($pregunta);

        return $preguntas;
    }

    /**
     * Devuelve los datos mínimos de un formulario.
     */
    private function obtenerResumen($id, $codMun)
    {
        $sql = "SELECT id, titulo, activo
                FROM pou.formularios
                WHERE id = :id
                  AND cod_mun = :cod_mun";

        $stmt = $this->conn->prepare($sql);
        $stmt->execute([
            ':id' => $id,
            ':cod_mun' => $codMun
        ]);

        return $stmt->fetch(PDO::FETCH_ASSOC);
    }

    /**
     * Cuenta las respuestas recibidas por un formulario.
     */
    private function contarRespuestas($formularioId, $codMun)
    {
        $sql = "SELECT COUNT(*)
                FROM pou.formulario_respuestas r
                INNER JOIN pou.formularios f
                    ON f.id = r.formulario_id
                WHERE r.formulario_id = :formulario_id
                  AND f.cod_mun = :cod_mun";

        $stmt = $this->conn->prepare($sql);
        $stmt->execute([
            ':formulario_id' => $formularioId,
            ':cod_mun' => $codMun
        ]);

        return (int)$stmt->fetchColumn();
    }

    /**
     * Inserta la cabecera del formulario.
     */
    private function insertarFormulario($codMun, array $datos, $titulo, $slug, $modalidad)
    {
        $sql = "INSERT INTO pou.formularios
                    (
                        cod_mun,
                        titulo,
                        descripcion,
                        slug,
                        icono,
                        color,
                        modalidad,
                        pdf_url,
                        texto_boton_online,
                        texto_boton_pdf,
                        mensaje_confirmacion,
                        activo,
                        orden
                    )
                VALUES
                    (
                        :cod_mun,
                        :titulo,
                        :descripcion,
                        :slug,
                        :icono,
                        :color,
                        :modalidad,
                        :pdf_url,
                        :texto_boton_online,
                        :texto_boton_pdf,
                        :mensaje_confirmacion,
                        :activo,
                        :orden
                    )
                RETURNING id";

        $stmt = $this->conn->prepare($sql);
        $stmt->execute($this->prepararParametrosFormulario(
            $codMun,
            $datos,
            $titulo,
            $slug,
            $modalidad
        ));

        return (int)$stmt->fetchColumn();
    }

    /**
     * Actualiza la cabecera del formulario.
     */
    private function actualizarFormulario($id, $codMun, array $datos, $titulo, $slug, $modalidad)
    {
        $sql = "UPDATE pou.formularios
                SET titulo = :titulo,
                    descripcion = :descripcion,
                    slug = :slug,
                    icono = :icono,
                    color = :color,
                    modalidad = :modalidad,
                    pdf_url = :pdf_url,
                    texto_boton_online = :texto_boton_online,
                    texto_boton_pdf = :texto_boton_pdf,
                    mensaje_confirmacion = :mensaje_confirmacion,
                    activo = :activo,
                    orden = :orden,
                    actualizado_en = CURRENT_TIMESTAMP
                WHERE id = :id
                  AND cod_mun = :cod_mun";

        $parametros = $this->prepararParametrosFormulario(
            $codMun,
            $datos,
            $titulo,
            $slug,
            $modalidad
        );

        $parametros[':id'] = $id;

        $stmt = $this->conn->prepare($sql);
        $stmt->execute($parametros);
    }

    /**
     * Prepara los parámetros comunes de alta y edición.
     */
    private function prepararParametrosFormulario($codMun, array $datos, $titulo, $slug, $modalidad)
    {
        $color = $datos['color'] ?? '';

        if (!preg_match('/^#[0-9a-fA-F]{6}$/', $color)) {
            $color = '#540000';
        }

        return [
            ':cod_mun' => $codMun,
            ':titulo' => $titulo,
            ':descripcion' => trim($datos['descripcion'] ?? ''),
            ':slug' => $slug,
            ':icono' => $this->normalizarIcono(
                $datos['icono'] ?? 'clipboard-check'
            ),
            ':color' => $color,
            ':modalidad' => $modalidad,
            ':pdf_url' => trim($datos['pdf_url'] ?? ''),
            ':texto_boton_online' => trim(
                $datos['texto_boton_online'] ?? 'Realizar encuesta online'
            ),
            ':texto_boton_pdf' => trim(
                $datos['texto_boton_pdf'] ?? 'Descargar encuesta en PDF'
            ),
            ':mensaje_confirmacion' => trim(
                $datos['mensaje_confirmacion'] ?? 'Gracias por participar.'
            ),
            ':activo' => !empty($datos['activo']),
            ':orden' => (int)($datos['orden'] ?? 0)
        ];
    }

    /**
     * Evita guardar clases de icono con caracteres no permitidos.
     */
    private function normalizarIcono($icono)
    {
        $icono = normalizarNombreIconoPortal($icono);

        if ($icono === '') {
            return '';
        }

        if (preg_match('/^[a-zA-Z0-9-]+$/', $icono)) {
            return $icono;
        }

        return 'clipboard-check';
    }

    /**
     * Elimina los apartados actuales antes de reconstruir el formulario.
     */
    private function eliminarSecciones($formularioId)
    {
        $sql = "DELETE FROM pou.formulario_secciones
                WHERE formulario_id = :formulario_id";

        $stmt = $this->conn->prepare($sql);
        $stmt->execute([
            ':formulario_id' => $formularioId
        ]);
    }

    /**
     * Guarda todos los apartados y preguntas.
     */
    private function guardarSecciones($formularioId, array $secciones)
    {
        $sqlSeccion = "INSERT INTO pou.formulario_secciones
                            (formulario_id, titulo, descripcion, orden)
                       VALUES
                            (:formulario_id, :titulo, :descripcion, :orden)
                       RETURNING id";

        $sqlPregunta = "INSERT INTO pou.formulario_preguntas
                            (
                                seccion_id,
                                enunciado,
                                ayuda,
                                tipo,
                                obligatorio,
                                ancho,
                                opciones,
                                orden
                            )
                        VALUES
                            (
                                :seccion_id,
                                :enunciado,
                                :ayuda,
                                :tipo,
                                :obligatorio,
                                :ancho,
                                CAST(:opciones AS jsonb),
                                :orden
                            )";

        $stmtSeccion = $this->conn->prepare($sqlSeccion);
        $stmtPregunta = $this->conn->prepare($sqlPregunta);

        foreach ($secciones as $indiceSeccion => $seccion) {
            $tituloSeccion = trim($seccion['titulo'] ?? '');

            if ($tituloSeccion === '') {
                continue;
            }

            $stmtSeccion->execute([
                ':formulario_id' => $formularioId,
                ':titulo' => $tituloSeccion,
                ':descripcion' => trim($seccion['descripcion'] ?? ''),
                ':orden' => $indiceSeccion + 1
            ]);

            $seccionId = (int)$stmtSeccion->fetchColumn();

            $this->guardarPreguntas(
                $stmtPregunta,
                $seccionId,
                $seccion['preguntas'] ?? []
            );
        }
    }

    /**
     * Guarda las preguntas de un apartado.
     */
    private function guardarPreguntas($stmtPregunta, $seccionId, array $preguntas)
    {
        $tiposPermitidos = [
            'texto',
            'texto_largo',
            'numero',
            'fecha',
            'si_no',
            'opcion_unica',
            'opcion_multiple',
            'desplegable'
        ];

        foreach ($preguntas as $indicePregunta => $pregunta) {
            $enunciado = trim($pregunta['enunciado'] ?? '');

            if ($enunciado === '') {
                continue;
            }

            $tipo = $pregunta['tipo'] ?? 'texto';

            if (!in_array($tipo, $tiposPermitidos, true)) {
                $tipo = 'texto';
            }

            $opciones = array_map('trim', $pregunta['opciones'] ?? []);
            $opciones = array_values(array_filter($opciones));

            $stmtPregunta->execute([
                ':seccion_id' => $seccionId,
                ':enunciado' => $enunciado,
                ':ayuda' => trim($pregunta['ayuda'] ?? ''),
                ':tipo' => $tipo,
                ':obligatorio' => !empty($pregunta['obligatorio']),
                ':ancho' => ($pregunta['ancho'] ?? '') === 'medio'
                    ? 'medio'
                    : 'completo',
                ':opciones' => json_encode($opciones, JSON_UNESCAPED_UNICODE),
                ':orden' => $indicePregunta + 1
            ]);
        }
    }

    /**
     * Comprueba la estructura mínima antes de guardar un formulario.
     *
     * Esta validación reproduce las reglas del configurador visual para que
     * los datos sigan siendo coherentes aunque la petición no venga del UI.
     */
    private function validarContenidoFormulario(array $datos, $modalidad)
    {
        $pdfUrl = trim($datos['pdf_url'] ?? '');
        $necesitaPdf = $modalidad === 'pdf' || $modalidad === 'ambos';

        if ($necesitaPdf && $pdfUrl === '') {
            throw new Exception(
                'La modalidad seleccionada necesita un documento PDF.'
            );
        }

        // Un recurso exclusivamente PDF no necesita estructura online.
        if ($modalidad === 'pdf') {
            return;
        }

        $secciones = $datos['secciones'] ?? [];

        if (!is_array($secciones) || count($secciones) === 0) {
            throw new Exception('El formulario necesita al menos un apartado.');
        }

        $totalPreguntas = 0;
        $tiposConOpciones = [
            'opcion_unica',
            'opcion_multiple',
            'desplegable'
        ];

        foreach ($secciones as $seccion) {
            if (trim($seccion['titulo'] ?? '') === '') {
                throw new Exception('Todos los apartados necesitan un título.');
            }

            $preguntas = $seccion['preguntas'] ?? [];

            if (!is_array($preguntas)) {
                throw new Exception('La lista de preguntas no es válida.');
            }

            foreach ($preguntas as $pregunta) {
                $totalPreguntas += 1;

                if (trim($pregunta['enunciado'] ?? '') === '') {
                    throw new Exception(
                        'Todas las preguntas necesitan un enunciado.'
                    );
                }

                $tipo = $pregunta['tipo'] ?? 'texto';

                if (in_array($tipo, $tiposConOpciones, true)) {
                    $opciones = $pregunta['opciones'] ?? [];
                    $opciones = is_array($opciones)
                        ? array_values(array_filter(array_map('trim', $opciones)))
                        : [];

                    if (count($opciones) < 2) {
                        throw new Exception(
                            'Las preguntas de opciones necesitan al menos dos respuestas.'
                        );
                    }
                }
            }
        }

        if ($modalidad !== 'pdf' && $totalPreguntas === 0) {
            throw new Exception(
                'Los formularios online necesitan al menos una pregunta.'
            );
        }
    }

    /**
     * Normaliza la modalidad elegida.
     */
    private function normalizarModalidad($modalidad)
    {
        $modalidadesPermitidas = [
            'online',
            'pdf',
            'ambos'
        ];

        if (!in_array($modalidad, $modalidadesPermitidas, true)) {
            return 'online';
        }

        return $modalidad;
    }

    /**
     * Genera una dirección amigable que no se repita en el municipio.
     */
    private function crearSlugUnico($codMun, $texto, $formularioId = null)
    {
        $slugBase = $this->crearSlug($texto);
        $slug = $slugBase;
        $numero = 2;

        while ($this->existeSlug($codMun, $slug, $formularioId)) {
            $slug = $slugBase . '-' . $numero;
            $numero += 1;
        }

        return $slug;
    }

    /**
     * Comprueba si el slug ya está utilizado.
     */
    private function existeSlug($codMun, $slug, $formularioId = null)
    {
        $sql = "SELECT COUNT(*)
                FROM pou.formularios
                WHERE cod_mun = :cod_mun
                  AND slug = :slug";

        $parametros = [
            ':cod_mun' => $codMun,
            ':slug' => $slug
        ];

        if ($formularioId) {
            $sql .= " AND id <> :id";
            $parametros[':id'] = (int)$formularioId;
        }

        $stmt = $this->conn->prepare($sql);
        $stmt->execute($parametros);

        return (int)$stmt->fetchColumn() > 0;
    }

    /**
     * Convierte un título en una dirección amigable.
     */
    private function crearSlug($texto)
    {
        $texto = (string)$texto;

        if (function_exists('iconv')) {
            $textoConvertido = iconv('UTF-8', 'ASCII//TRANSLIT//IGNORE', $texto);

            if ($textoConvertido !== false) {
                $texto = $textoConvertido;
            }
        }

        $texto = preg_replace('/[^a-zA-Z0-9]+/', '-', $texto);
        $texto = strtolower((string)$texto);
        $texto = trim($texto, '-');

        return $texto !== ''
            ? $texto
            : 'formulario';
    }

    /**
     * Genera una referencia corta y difícil de repetir.
     */
    private function crearReferenciaRespuesta()
    {
        try {
            return strtoupper(substr(bin2hex(random_bytes(8)), 0, 12));
        } catch (Throwable $error) {
            return strtoupper(substr(hash('sha256', uniqid('', true)), 0, 12));
        }
    }
}
