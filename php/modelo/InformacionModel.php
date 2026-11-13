<?php

/**
 * Modelo InformacionModel
 * Gestiona la información general del municipio (paso 2 del wizard).
 */
class InformacionModel {
    private $conn;

    /**
     * Constructor que recibe la conexión a la base de datos.
     */
    public function __construct($db) {
        $this->conn = $db;
    }

    /**
     * Obtiene la información general de un municipio por su código.
     * Utilizado al editar para precargar los datos del paso 2.
     */
    public function obtenerInformacionPorMunicipio($cod_mun) {
        $stmt = $this->conn->prepare("
            SELECT titulo, descripcion
            FROM pou.informacion_general
            WHERE cod_mun = :cod_mun
        ");
        $stmt->bindParam(':cod_mun', $cod_mun);
        $stmt->execute();
        $informacion = $stmt->fetch(PDO::FETCH_ASSOC);
        // Instalaciones anteriores guardaban el encabezado solo en el configurador.
        // Lo recuperamos para que el mismo título aparezca también en el paso 2.
        if ($informacion && trim((string)($informacion['titulo'] ?? '')) === '') {
            $informacion['titulo'] = 'Para qué sirve el POU';
            $stmtConfig = $this->conn->prepare("SELECT secciones_portal FROM pou.configuracion_visual WHERE cod_mun = :cod_mun");
            $stmtConfig->execute([':cod_mun' => $cod_mun]);
            $secciones = $stmtConfig->fetchColumn();
            if (is_string($secciones)) $secciones = json_decode($secciones, true);
            foreach ((array)$secciones as $seccion) {
                if (($seccion['id'] ?? '') === 'informacion' && trim((string)($seccion['titulo'] ?? '')) !== '') {
                    $informacion['titulo'] = $seccion['titulo'];
                    break;
                }
            }
        }
        return $informacion;
    }

    /**
     * Crea una nueva entrada de información general para un municipio.
     * Se usa al guardar un nuevo municipio desde el wizard.
     */
    public function crearInformacion($datos) {
        $stmt = $this->conn->prepare("
            INSERT INTO pou.informacion_general (cod_mun, titulo, descripcion)
            VALUES (:cod_mun, :titulo, :descripcion)
        ");
        $stmt->bindParam(':cod_mun', $datos['cod_mun']);
        $stmt->bindParam(':titulo', $datos['titulo']);
        $stmt->bindParam(':descripcion', $datos['descripcion']);
        return $stmt->execute();
    }

    /**
     * Actualiza la información general de un municipio existente.
     * Solo se llama si el paso 2 ha sido modificado.
     */
    public function actualizarInformacion($cod_mun, $datos) {
        if (!is_array($datos)) {
            throw new InvalidArgumentException("Se esperaba un array asociativo en actualizarInformacion.");
        }
    
        // Verificar si ya existe información
        $stmt = $this->conn->prepare("SELECT COUNT(*) FROM pou.informacion_general WHERE cod_mun = :cod_mun");
        $stmt->bindParam(':cod_mun', $cod_mun);
        $stmt->execute();
        $existe = $stmt->fetchColumn() > 0;
    
        if ($existe) {
            // UPDATE
            $stmt = $this->conn->prepare("
                UPDATE pou.informacion_general
                SET titulo = :titulo, descripcion = :descripcion
                WHERE cod_mun = :cod_mun
            ");
        } else {
            // INSERT
            $stmt = $this->conn->prepare("
                INSERT INTO pou.informacion_general (cod_mun, titulo, descripcion)
                VALUES (:cod_mun, :titulo, :descripcion)
            ");
        }
    
        $stmt->bindParam(':cod_mun', $cod_mun);
        $stmt->bindParam(':titulo', $datos['titulo']);
        $stmt->bindParam(':descripcion', $datos['descripcion']);
        return $stmt->execute();
    }    
    
}
