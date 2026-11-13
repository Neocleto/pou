<?php

// modelo/FasesDocumentosModel.php
class FasesDocumentosModel
{
    /** @var PDO */
    private $db;

    public function __construct($conexion)
    {
        $this->db = $conexion;
    }

    /**
     * Devuelve todas las fases de documentos en orden “humano”:
     * 1, 2, 2.1, 3, 3.1, etc.
     *
     * Trae:
     *  - id
     *  - codigo   -> '1', '2', '2.1', '3', ...
     *  - num_fase -> número interno si lo usas
     *  - etiqueta
     *  - titulo
     *  - es_fase_21
     */
    public function obtenerTodas(): array
    {
        $sql = "
            SELECT
                codigo,
                num_fase,
                etiqueta,
                titulo,
                es_fase_21
            FROM pou.fases_documentos
        ";

        $stmt  = $this->db->query($sql);
        $fases = $stmt->fetchAll(PDO::FETCH_ASSOC);

        // Ordenamos en PHP con version_compare para que quede:
        // 1, 2, 2.1, 3, 3.1, ...
        usort($fases, function ($a, $b) {
            $codA = (string)($a['codigo'] ?? '');
            $codB = (string)($b['codigo'] ?? '');

            return version_compare($codA, $codB);
        });

        return $fases;
    }
}
