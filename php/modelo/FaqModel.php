<?php

/**
 * Gestiona la biblioteca de preguntas frecuentes y su uso por municipio.
 *
 * Hay dos niveles diferentes:
 * 1. pou.faqs: biblioteca común que no se modifica al personalizar.
 * 2. pou.faq_municipio: asignación, orden y textos propios del municipio.
 */
class FaqModel
{
    private $conn;

    public function __construct($db)
    {
        $this->conn = $db;
    }

    /**
     * Devuelve las preguntas que se publican en un municipio.
     * Si el municipio tiene un texto propio, se usa sin alterar la biblioteca.
     */
    public function obtenerFaqsPorMunicipio($codMun)
    {
        try {
            $stmt = $this->conn->prepare("
                SELECT
                    fm.id AS asignacion_id,
                    f.id AS pregunta_id,
                    COALESCE(NULLIF(fm.pregunta_personalizada, ''), f.pregunta) AS pregunta,
                    COALESCE(NULLIF(fm.respuesta_personalizada, ''), f.respuesta) AS respuesta,
                    f.pregunta AS pregunta_base,
                    f.respuesta AS respuesta_base,
                    fm.orden,
                    fm.es_exclusiva,
                    CASE
                        WHEN fm.es_exclusiva = TRUE
                          OR NULLIF(fm.pregunta_personalizada, '') IS NOT NULL
                          OR NULLIF(fm.respuesta_personalizada, '') IS NOT NULL
                        THEN TRUE
                        ELSE FALSE
                    END AS personalizada,
                    COALESCE(f.id, -fm.id) AS id
                FROM pou.faq_municipio fm
                LEFT JOIN pou.faqs f ON f.id = fm.pregunta_id
                WHERE fm.cod_mun = :cod_mun
                ORDER BY fm.orden ASC, fm.id ASC
            ");
            $stmt->execute([':cod_mun' => $codMun]);
            return $stmt->fetchAll(PDO::FETCH_ASSOC);
        } catch (PDOException $e) {
            throw new Exception('Error al obtener las preguntas del municipio: ' . $e->getMessage());
        }
    }

    /**
     * Devuelve la biblioteca común de preguntas reutilizables.
     */
    public function obtenerTodasLasPreguntas()
    {
        try {
            $stmt = $this->conn->query("
                SELECT id, pregunta, respuesta
                FROM pou.faqs
                ORDER BY pregunta ASC, id ASC
            ");
            return $stmt->fetchAll(PDO::FETCH_ASSOC);
        } catch (PDOException $e) {
            throw new Exception('Error al obtener la biblioteca de preguntas: ' . $e->getMessage());
        }
    }

    

    /**
     * Indica si una pregunta de la biblioteca ya está asignada al municipio.
     */
    public function preguntaYaAsignada($codMun, $preguntaId)
    {
        $stmt = $this->conn->prepare("
            SELECT id
            FROM pou.faq_municipio
            WHERE cod_mun = :cod_mun AND pregunta_id = :pregunta_id
        ");
        $stmt->execute([
            ':cod_mun' => $codMun,
            ':pregunta_id' => $preguntaId
        ]);

        return $stmt->fetchColumn() ?: false;
    }

    /**
     * Asigna una pregunta de la biblioteca y devuelve el id de la asignación.
     */
    public function asignarPreguntaAMunicipio($codMun, $preguntaId)
    {
        $idExistente = $this->preguntaYaAsignada($codMun, $preguntaId);

        if ($idExistente) {
            return $idExistente;
        }

        $stmt = $this->conn->prepare("
            INSERT INTO pou.faq_municipio (cod_mun, pregunta_id, orden)
            VALUES (
                :cod_mun,
                :pregunta_id,
                (SELECT COALESCE(MAX(orden), 0) + 1
                 FROM pou.faq_municipio
                 WHERE cod_mun = :cod_mun_orden)
            )
            RETURNING id
        ");
        $stmt->execute([
            ':cod_mun' => $codMun,
            ':cod_mun_orden' => $codMun,
            ':pregunta_id' => $preguntaId
        ]);

        return $stmt->fetchColumn();
    }

    /**
     * Crea una pregunta exclusiva del municipio.
     * No se añade a la biblioteca común.
     */
    public function crearPreguntaExclusiva($codMun, $pregunta, $respuesta, $orden = null)
    {
        $ordenFinal = $orden ?: $this->obtenerSiguienteOrden($codMun);

        $stmt = $this->conn->prepare("
            INSERT INTO pou.faq_municipio (
                cod_mun,
                pregunta_id,
                orden,
                pregunta_personalizada,
                respuesta_personalizada,
                es_exclusiva
            ) VALUES (
                :cod_mun,
                NULL,
                :orden,
                :pregunta,
                :respuesta,
                TRUE
            )
            RETURNING id
        ");
        $stmt->execute([
            ':cod_mun' => $codMun,
            ':orden' => $ordenFinal,
            ':pregunta' => trim($pregunta),
            ':respuesta' => trim($respuesta)
        ]);

        return $stmt->fetchColumn();
    }

    /**
     * Guarda una adaptación solo para el municipio indicado.
     */
    public function personalizarPreguntaMunicipio($codMun, $asignacionId, $pregunta, $respuesta)
    {
        $stmt = $this->conn->prepare("
            UPDATE pou.faq_municipio
            SET pregunta_personalizada = :pregunta,
                respuesta_personalizada = :respuesta
            WHERE id = :id AND cod_mun = :cod_mun
        ");
        $stmt->execute([
            ':pregunta' => trim($pregunta),
            ':respuesta' => trim($respuesta),
            ':id' => $asignacionId,
            ':cod_mun' => $codMun
        ]);

        if ($stmt->rowCount() === 0) {
            throw new Exception('No se ha encontrado la pregunta asignada al municipio.');
        }
    }

    /**
     * Restaura el texto de la biblioteca común.
     */
    public function restaurarPreguntaBase($codMun, $asignacionId)
    {
        $stmt = $this->conn->prepare("
            UPDATE pou.faq_municipio
            SET pregunta_personalizada = NULL,
                respuesta_personalizada = NULL,
                es_exclusiva = FALSE
            WHERE id = :id
              AND cod_mun = :cod_mun
              AND pregunta_id IS NOT NULL
        ");
        $stmt->execute([
            ':id' => $asignacionId,
            ':cod_mun' => $codMun
        ]);

        if ($stmt->rowCount() === 0) {
            throw new Exception('Esta pregunta no tiene una versión de biblioteca que restaurar.');
        }
    }

    /**
     * Elimina una asignación concreta, sea común o exclusiva.
     */
    public function eliminarAsignacion($codMun, $asignacionId)
    {
        $stmt = $this->conn->prepare("
            DELETE FROM pou.faq_municipio
            WHERE id = :id AND cod_mun = :cod_mun
        ");
        $stmt->execute([
            ':id' => $asignacionId,
            ':cod_mun' => $codMun
        ]);
    }

    /**
     * Compatibilidad con llamadas antiguas que eliminan por pregunta_id.
     */
    public function eliminarPreguntaDeMunicipio($codMun, $preguntaId)
    {
        $stmt = $this->conn->prepare("
            DELETE FROM pou.faq_municipio
            WHERE cod_mun = :cod_mun AND pregunta_id = :pregunta_id
        ");
        $stmt->execute([
            ':cod_mun' => $codMun,
            ':pregunta_id' => $preguntaId
        ]);
    }

    /**
     * Guarda la lista completa del paso 7 sin modificar la biblioteca común.
     */
    public function guardarPreguntasDelWizard($codMun, array $items)
    {
        $asignacionesConservadas = [];
        $orden = 1;

        foreach ($items as $item) {
            $pregunta = trim((string)($item['pregunta'] ?? ''));
            $respuesta = trim((string)($item['respuesta'] ?? ''));

            if ($pregunta === '' || $respuesta === '') {
                continue;
            }

            $asignacionId = (int)($item['asignacion_id'] ?? 0);
            $preguntaId = (int)($item['pregunta_id'] ?? 0);

            // 1. La pregunta ya estaba asignada: actualizamos sus textos y orden.
            if ($asignacionId > 0) {
                $this->actualizarAsignacionWizard(
                    $codMun,
                    $asignacionId,
                    $pregunta,
                    $respuesta,
                    !empty($item['personalizada']) || !empty($item['es_exclusiva']),
                    $orden
                );
                $asignacionesConservadas[] = $asignacionId;
                $orden++;
                continue;
            }

            // 2. Pregunta seleccionada de la biblioteca común.
            if ($preguntaId > 0) {
                $asignacionId = (int)$this->asignarPreguntaAMunicipio($codMun, $preguntaId);
                $this->actualizarOrdenAsignacion($codMun, $asignacionId, $orden);
                $asignacionesConservadas[] = $asignacionId;
                $orden++;
                continue;
            }

            // 3. Pregunta escrita para este municipio.
            $asignacionId = (int)$this->crearPreguntaExclusiva($codMun, $pregunta, $respuesta, $orden);
            $asignacionesConservadas[] = $asignacionId;
            $orden++;
        }

        $this->eliminarAsignacionesNoIncluidas($codMun, $asignacionesConservadas);
        return true;
    }

    /**
     * Reordena usando los ids de asignación.
     */
    public function reordenarPreguntas($codMun, array $idsAsignacion)
    {
        $orden = 1;

        foreach ($idsAsignacion as $id) {
            $this->actualizarOrdenAsignacion($codMun, (int)$id, $orden);
            $orden++;
        }
    }

    private function actualizarAsignacionWizard($codMun, $asignacionId, $pregunta, $respuesta, $personalizada, $orden)
    {
        $stmt = $this->conn->prepare("
            UPDATE pou.faq_municipio
            SET orden = :orden,
                pregunta_personalizada = CASE WHEN CAST(:personalizada AS INTEGER) = 1 THEN :pregunta ELSE NULL END,
                respuesta_personalizada = CASE WHEN CAST(:personalizada AS INTEGER) = 1 THEN :respuesta ELSE NULL END
            WHERE id = :id AND cod_mun = :cod_mun
        ");
        $stmt->execute([
            ':orden' => $orden,
            ':personalizada' => $personalizada ? 1 : 0,
            ':pregunta' => $pregunta,
            ':respuesta' => $respuesta,
            ':id' => $asignacionId,
            ':cod_mun' => $codMun
        ]);
    }

    private function actualizarOrdenAsignacion($codMun, $asignacionId, $orden)
    {
        $stmt = $this->conn->prepare("
            UPDATE pou.faq_municipio
            SET orden = :orden
            WHERE id = :id AND cod_mun = :cod_mun
        ");
        $stmt->execute([
            ':orden' => $orden,
            ':id' => $asignacionId,
            ':cod_mun' => $codMun
        ]);
    }

    private function eliminarAsignacionesNoIncluidas($codMun, array $ids)
    {
        if (empty($ids)) {
            $stmt = $this->conn->prepare("
                DELETE FROM pou.faq_municipio WHERE cod_mun = :cod_mun
            ");
            $stmt->execute([':cod_mun' => $codMun]);
            return;
        }

        $marcadores = implode(',', array_fill(0, count($ids), '?'));
        $stmt = $this->conn->prepare("
            DELETE FROM pou.faq_municipio
            WHERE cod_mun = ? AND id NOT IN ($marcadores)
        ");
        $stmt->execute(array_merge([$codMun], array_map('intval', $ids)));
    }

    private function obtenerSiguienteOrden($codMun)
    {
        $stmt = $this->conn->prepare("
            SELECT COALESCE(MAX(orden), 0) + 1
            FROM pou.faq_municipio
            WHERE cod_mun = :cod_mun
        ");
        $stmt->execute([':cod_mun' => $codMun]);
        return (int)$stmt->fetchColumn();
    }
}
