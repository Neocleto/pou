<?php
class CategoriasModel {
    private $conn;

    public function __construct($conexion) {
        $this->conn = $conexion;
    }

    public function listarCategorias() {
        $sql = "SELECT id, nombre FROM pou.categorias_documentos ORDER BY nombre";
        return $this->conn->query($sql)->fetchAll(PDO::FETCH_ASSOC);
    }

    public function crearCategoria($nombre) {
        $sql = "INSERT INTO pou.categorias_documentos (nombre) VALUES (?)";
        $stmt = $this->conn->prepare($sql);
        $stmt->execute([$nombre]);
        return true;
    }
}
