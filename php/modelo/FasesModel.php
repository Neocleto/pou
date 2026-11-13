<?php

class FasesModel {

    private $conn;

    public function __construct($db) {
        $this->conn = $db;
    }

    /**
     * Devuelve la fase actual de un municipio junto al total de fases.
     */
    public function obtenerFaseActualPorMunicipio($cod_mun) {
        $sql = "
            SELECT
                fa.num_fase,
                fa.subfase_id,
                fa.fecha_inicio,
                fa.estado_tramitacion,
                sf.codigo_subfase,
                sf.titulo AS titulo_subfase,
                sf.descripcion,
                sf.imagen_url
            FROM pou.fase_actual fa
            LEFT JOIN pou.subfases sf ON sf.id = fa.subfase_id
            WHERE fa.cod_mun = :cod_mun
        ";
        $stmt = $this->conn->prepare($sql);
        $stmt->bindParam(':cod_mun', $cod_mun);
        $stmt->execute();
        return $stmt->fetch(PDO::FETCH_ASSOC);
    }

    /**
     * Actualiza o inserta la fase actual de un municipio.
     */
    public function crearOActualizarFaseActual($cod_mun, $num_fase_padre, $subfase_id, $fecha_inicio, $estado_tramitacion) {

        $st = $this->conn->prepare("SELECT COUNT(*) FROM pou.fase_actual WHERE cod_mun = :cod_mun");
        $st->execute([':cod_mun' => $cod_mun]);
        $existe = ((int)$st->fetchColumn()) > 0;

        if ($existe) {
            $sql = "UPDATE pou.fase_actual
                    SET num_fase = :num_fase, subfase_id = :subfase_id, fecha_inicio = :fecha_inicio, estado_tramitacion = :estado_tramitacion
                    WHERE cod_mun = :cod_mun";
        } else {
            $sql = "INSERT INTO pou.fase_actual (cod_mun, num_fase, subfase_id, fecha_inicio, estado_tramitacion)
                    VALUES (:cod_mun, :num_fase, :subfase_id, :fecha_inicio, :estado_tramitacion)";
        }

        $stmt = $this->conn->prepare($sql);
        return $stmt->execute([
            ':cod_mun' => $cod_mun,
            ':num_fase' => $num_fase_padre,
            ':subfase_id' => $subfase_id,
            ':fecha_inicio' => $fecha_inicio,
            ':estado_tramitacion' => $estado_tramitacion
        ]);
    }

    // Listar todas las fases globales (para pintar la leyenda dinámicamente)
    public function listarFases() {
        $stmt = $this->conn->query("
            SELECT num_fase,
                titulo,
                ('FASE ' || num_fase || '. ' || titulo) AS label
            FROM pou.fases
            ORDER BY num_fase
        ");
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    // Listar subfases por fase
    public function listarSubfasesPorFase($num_fase_padre) {
        $stmt = $this->conn->prepare("
            SELECT id, codigo_subfase, titulo, descripcion
            FROM pou.subfases
            WHERE num_fase_padre = :n
            ORDER BY codigo_subfase
        ");
        $stmt->execute([':n' => $num_fase_padre]);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    /**
     * Lista todas las subfases para mostrarlas en el configurador completo.
     */
    public function listarTodasSubfases() {
        $stmt = $this->conn->query("
            SELECT id, num_fase_padre, codigo_subfase, titulo, descripcion, imagen_url
            FROM pou.subfases
            ORDER BY num_fase_padre, codigo_subfase
        ");

        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    // Validación subfase pertenece a fase padre
    public function validarSubfasePerteneceAFase($subfase_id, $num_fase_padre): bool {
        $stmt = $this->conn->prepare("
            SELECT COUNT(*)
            FROM pou.subfases
            WHERE id = :id AND num_fase_padre = :padre
        ");
        $stmt->execute([
            ':id' => $subfase_id,
            ':padre' => $num_fase_padre
        ]);
        return ((int)$stmt->fetchColumn()) > 0;
    }

}
