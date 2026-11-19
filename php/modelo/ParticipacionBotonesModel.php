<?php
require_once __DIR__ . '/../includes/archivos_municipio.php';
require_once __DIR__ . '/../includes/participacion_portal.php';
// ============================================================================
// MODELO: BOTONES DE PARTICIPACION
//
// Un boton puede mostrar un PDF, un formulario online o las dos opciones.
// Los registros antiguos siguen funcionando como recursos PDF.
// ============================================================================

class ParticipacionBotonesModel
{
    private $conn;

    public function __construct($conexion)
    {
        $this->conn = $conexion;
    }

    /**
     * Crea un boton de participacion.
     */
    public function crearBoton(
        $codMun,
        $textoBoton,
        $archivoUrl,
        $icono = 'file-earmark-arrow-down',
        $color = '#540000',
        $tipoContenido = 'pdf',
        $formularioId = null,
        $visible = true
    ) {
        $tipoContenido = $this->normalizarTipoContenido($tipoContenido);
        $formularioId = $this->normalizarFormularioId($formularioId);
        $visible = $this->normalizarBooleano($visible);

        $this->validarContenidoBoton(
            $codMun,
            $tipoContenido,
            $formularioId
        );

        $sql = "INSERT INTO pou.participacion_botones (
                    cod_mun,
                    texto_boton,
                    archivo_url,
                    es_naranja,
                    icono,
                    color,
                    tipo_contenido,
                    formulario_id,
                    visible
                ) VALUES (
                    :cod_mun,
                    :texto_boton,
                    :archivo_url,
                    FALSE,
                    :icono,
                    :color,
                    :tipo_contenido,
                    :formulario_id,
                    CAST(:visible AS integer)::boolean
                )";

        $stmt = $this->conn->prepare($sql);

        return $stmt->execute([
            ':cod_mun' => $codMun,
            ':texto_boton' => trim((string)$textoBoton),
            ':archivo_url' => trim((string)$archivoUrl),
            ':icono' => $this->normalizarIcono($icono),
            ':color' => $this->normalizarColor($color),
            ':tipo_contenido' => $tipoContenido,
            ':formulario_id' => $formularioId,
            ':visible' => $visible ? 1 : 0
        ]);
    }


    /** La plantilla de botones solo se usa si el municipio todavía no tiene ninguno. */
    public function aplicarPlantilla($codMun)
    {
        if ($this->listarBotonesPorMunicipio($codMun)) {
            return;
        }

        foreach (obtenerBotonesPlantillaParticipacion() as $boton) {
            $this->crearBoton($codMun, $boton['titulo'], $boton['archivo'], $boton['icono'], $boton['color']);
        }
    }

    /**
     * Actualiza un boton. El archivo solo cambia cuando se recibe uno nuevo.
     */
    public function actualizarBoton(
        $id,
        $textoBoton,
        $archivoUrl = null,
        $icono = 'file-earmark-arrow-down',
        $color = '#540000',
        $tipoContenido = 'pdf',
        $formularioId = null,
        $codMun = null,
        $visible = true
    ) {
        $tipoContenido = $this->normalizarTipoContenido($tipoContenido);
        $formularioId = $this->normalizarFormularioId($formularioId);
        $visible = $this->normalizarBooleano($visible);

        // 1. Recuperamos el registro actual para mantener el archivo si no cambia.
        $actual = $this->obtenerBotonPorId($id);

        if (!$actual) {
            throw new Exception('El recurso de participacion no existe.');
        }

        $codMunValidacion = $codMun ?: $actual['cod_mun'];
        $archivoFinal = trim((string)$archivoUrl);

        if ($archivoFinal === '') {
            $archivoFinal = trim((string)($actual['archivo_url'] ?? ''));
        }

        $this->validarContenidoBoton(
            $codMunValidacion,
            $tipoContenido,
            $formularioId
        );

        // 2. Guardamos todos los datos del botón.
        $sql = "UPDATE pou.participacion_botones
                SET texto_boton = :texto_boton,
                    archivo_url = :archivo_url,
                    es_naranja = FALSE,
                    icono = :icono,
                    color = :color,
                    tipo_contenido = :tipo_contenido,
                    formulario_id = :formulario_id,
                    visible = CAST(:visible AS integer)::boolean
                WHERE id = :id";

        $stmt = $this->conn->prepare($sql);

        $ok = $stmt->execute([
            ':id' => (int)$id,
            ':texto_boton' => trim((string)$textoBoton),
            ':archivo_url' => $archivoFinal,
            ':icono' => $this->normalizarIcono($icono),
            ':color' => $this->normalizarColor($color),
            ':tipo_contenido' => $tipoContenido,
            ':formulario_id' => $formularioId,
            ':visible' => $visible ? 1 : 0
        ]);
        if ($ok && $archivoFinal !== ($actual['archivo_url'] ?? '')) {
            eliminarArchivoMunicipalPOU($actual['archivo_url'], $actual['cod_mun']);
        }
        return $ok;
    }

    /**
     * Lista los botones y los datos basicos del formulario vinculado.
     */
    public function listarBotonesPorMunicipio($codMun)
    {
        $sql = "SELECT
                    b.*,
                    f.titulo AS formulario_titulo,
                    f.slug AS formulario_slug,
                    f.modalidad AS formulario_modalidad,
                    f.pdf_url AS formulario_pdf_url,
                    f.texto_boton_online AS formulario_texto_online,
                    f.texto_boton_pdf AS formulario_texto_pdf,
                    f.activo AS formulario_activo
                FROM pou.participacion_botones b
                LEFT JOIN pou.formularios f
                    ON f.id = b.formulario_id
                   AND f.cod_mun = b.cod_mun
                WHERE b.cod_mun = :cod_mun
                ORDER BY b.id ASC";

        $stmt = $this->conn->prepare($sql);
        $stmt->execute([':cod_mun' => $codMun]);

        // La misma comprobación alimenta el portal, el editor y el aviso de publicación.
        $botones = normalizarIconosDatosPortal($stmt->fetchAll(PDO::FETCH_ASSOC));
        foreach ($botones as &$boton) {
            $tipo = $boton['tipo_contenido'] ?? 'pdf';
            $url = '';
            if ($tipo !== 'formulario') {
                $url = resolverArchivoParticipacion($boton['archivo_url'], $codMun);
                if ($url === '') {
                    $url = resolverArchivoParticipacion($boton['formulario_pdf_url'], $codMun);
                }
            }
            $boton['url_documento'] = $url;
            $boton['documento_pendiente'] = $tipo !== 'formulario' && $url === '';
        }
        unset($boton);

        return $botones;
    }

    /**
     * Actualiza los datos editables desde el configurador completo.
     */
    public function actualizarDisenoBotones($codMun, array $botones)
    {
        $sql = "UPDATE pou.participacion_botones
                SET texto_boton = :texto_boton,
                    icono = :icono,
                    color = :color,
                    tipo_contenido = :tipo_contenido,
                    formulario_id = :formulario_id,
                    visible = CAST(:visible AS integer)::boolean,
                    es_naranja = FALSE
                WHERE id = :id
                  AND cod_mun = :cod_mun";

        $stmt = $this->conn->prepare($sql);

        // Solo se actualizan los botones que pertenecen al municipio.
        $idsMunicipales = array_column($this->listarBotonesPorMunicipio($codMun), 'id');

        foreach ($botones as $boton) {
            $id = (int)($boton['id'] ?? 0);
            $texto = trim((string)($boton['texto_boton'] ?? ''));

            if (!in_array($id, $idsMunicipales, true) || $texto === '') {
                continue;
            }

            $tipoContenido = $this->normalizarTipoContenido(
                $boton['tipo_contenido'] ?? 'pdf'
            );
            $formularioId = $this->normalizarFormularioId(
                $boton['formulario_id'] ?? null
            );

            $visible = $this->normalizarBooleano($boton['visible'] ?? true);
            $this->validarContenidoBoton(
                $codMun,
                $tipoContenido,
                $formularioId
            );

            $stmt->execute([
                ':id' => $id,
                ':cod_mun' => $codMun,
                ':texto_boton' => $texto,
                ':icono' => $this->normalizarIcono(
                    $boton['icono'] ?? 'file-earmark-arrow-down'
                ),
                ':color' => $this->normalizarColor(
                    $boton['color'] ?? '#540000'
                ),
                ':tipo_contenido' => $tipoContenido,
                ':formulario_id' => $formularioId,
                ':visible' => $visible ? 1 : 0
            ]);
        }
    }

    /**
     * Elimina el archivo y el registro del boton.
     */
    public function eliminarBoton($id)
    {
        $actual = $this->obtenerBotonPorId($id);
        if (!$actual) throw new Exception('El recurso de participación no existe.');
        $stmt = $this->conn->prepare('DELETE FROM pou.participacion_botones WHERE id = ?');
        $stmt->execute([(int)$id]);
        eliminarArchivoMunicipalPOU($actual['archivo_url'] ?? '', $actual['cod_mun']);
    }

    /**
     * Devuelve un boton concreto.
     */
    public function obtenerBotonPorId($id)
    {
        $stmt = $this->conn->prepare(
            "SELECT *
             FROM pou.participacion_botones
             WHERE id = :id"
        );
        $stmt->execute([':id' => (int)$id]);

        return normalizarIconosDatosPortal($stmt->fetch(PDO::FETCH_ASSOC));
    }

    /**
     * Comprueba que el boton tenga los datos necesarios para su modalidad.
     */
    private function validarContenidoBoton(
        $codMun,
        $tipoContenido,
        $formularioId
    ) {
        $necesitaFormulario = in_array(
            $tipoContenido,
            ['formulario', 'ambos'],
            true
        );
        $formulario = null;

        // 1. Cuando el boton usa formulario, comprobamos que pertenezca al municipio.
        if ($necesitaFormulario) {
            if (!$formularioId) {
                throw new Exception('Selecciona el formulario online del boton.');
            }

            $sql = "SELECT id, modalidad
                    FROM pou.formularios
                    WHERE id = :id
                      AND cod_mun = :cod_mun";

            $stmt = $this->conn->prepare($sql);
            $stmt->execute([
                ':id' => $formularioId,
                ':cod_mun' => $codMun
            ]);
            $formulario = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$formulario) {
                throw new Exception('El formulario elegido no pertenece al municipio.');
            }

            if (!in_array($formulario['modalidad'], ['online', 'ambos'], true)) {
                throw new Exception('El formulario elegido no admite respuestas online.');
            }
        }
    }

    private function normalizarIcono($icono)
    {
        return normalizarIconoPortal($icono);
    }

    private function normalizarColor($color)
    {
        if (preg_match('/^#[0-9a-fA-F]{6}$/', (string)$color)) {
            return $color;
        }

        return '#540000';
    }

    /**
     * Convierte valores de formularios o JSON en verdadero o falso.
     */
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

    private function normalizarTipoContenido($tipoContenido)
    {
        $permitidos = ['pdf', 'formulario', 'ambos'];

        return in_array($tipoContenido, $permitidos, true)
            ? $tipoContenido
            : 'pdf';
    }

    private function normalizarFormularioId($formularioId)
    {
        $formularioId = (int)$formularioId;

        return $formularioId > 0 ? $formularioId : null;
    }

}
