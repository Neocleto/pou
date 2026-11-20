<?php
require_once __DIR__ . '/../includes/archivos_municipio.php';
class DocumentosModel {
    private $db;

    public function __construct($conexion) {
        $this->db = $conexion;
    }

    // Obtener documentos de un municipio
    public function getDocumentosPorMunicipio($cod_mun) {
        $sql = "
            SELECT 
                d.id,
                d.cod_mun,
                -- Usamos 'AS num_fase' para compatibilidad con el controlador,
                -- ya que 'fase_id' representa realmente el número de fase (num_fase)
                d.fase_id AS num_fase,                
                f.codigo AS codigo_fase,               -- '1', '2', '2.1', '3', ...
                f.titulo AS descripcion_fase,          -- opcional, para el title/tooltip
                d.titulo,
                d.archivo_url,
                d.categoria_id,
                d.fase_id,
                d.fecha_creacion,
                COALESCE(c.nombre, 'Sin categoría') AS categoria
            FROM pou.documentos d
            LEFT JOIN pou.fases_documentos f 
                ON d.fase_id = f.num_fase
            LEFT JOIN pou.categorias_documentos c 
                ON d.categoria_id = c.id
            WHERE d.cod_mun = ?
            ORDER BY f.codigo, categoria, d.titulo
        ";

        $stmt = $this->db->prepare($sql);
        $stmt->execute([$cod_mun]);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    // Recupera el registro para comprobar su municipio y su archivo guardado.
    public function obtenerDocumentoPorId($id) {
        $stmt = $this->db->prepare('SELECT * FROM pou.documentos WHERE id = :id');
        $stmt->execute([':id' => $id]);
        return $stmt->fetch(PDO::FETCH_ASSOC);
    }

    // Crear un nuevo documento
    public function crearDocumento($cod_mun, $fase_id, $titulo, $archivo_url, $categoria_id) {
        $sql = "INSERT INTO pou.documentos (cod_mun, fase_id, titulo, archivo_url, categoria_id)
                VALUES (:cod_mun, :fase_id, :titulo, :archivo_url, :categoria_id)";

        $stmt = $this->db->prepare($sql);
        return $stmt->execute([
            ':cod_mun' => $cod_mun,
            ':fase_id' => $fase_id,
            ':titulo' => $titulo,
            ':archivo_url' => $archivo_url,
            ':categoria_id' => $categoria_id
        ]);
    }

    // Eliminar documento (archivo + BBDD) completo
    public function eliminarDocumento($id) {
        $this->db->beginTransaction();
        try {
            $documento = $this->obtenerDocumentoPorId($id);
            if (!$documento) throw new Exception('El documento no existe.');

            // Luego borrar el registro de la base de datos
            $stmt = $this->db->prepare("DELETE FROM pou.documentos WHERE id = ?");
            $stmt->execute([$id]);

            $this->db->commit();
            eliminarArchivoMunicipalPOU($documento['archivo_url'], $documento['cod_mun'], $this->db);
            return true;
        } catch (Exception $e) {
            $this->db->rollBack();
            throw new Exception("Error eliminando documento: " . $e->getMessage());
        }
    }

    

    // Función para comprobar duplicados
    public function existeDocumentoDuplicado($cod_mun, $fase_id, $titulo) {
        $stmt = $this->db->prepare("SELECT COUNT(*) FROM pou.documentos WHERE cod_mun = ? AND fase_id = ? AND titulo = ?");
        $stmt->execute([$cod_mun, $fase_id, $titulo]);
        return $stmt->fetchColumn() > 0;
    }
}
