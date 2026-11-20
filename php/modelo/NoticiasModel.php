<?php
require_once __DIR__ . '/../includes/archivos_municipio.php';
class NoticiasModel {
  private $conn;

  public function __construct($db) {
    $this->conn = $db;
  }

  public function crearNoticia($data) {
    $sql = "INSERT INTO pou.noticias
              (cod_mun, titulo, fecha_publicacion, resumen, imagen_url, enlace_detalle, activa)
            VALUES
              (:cod_mun, :titulo, :fecha, :resumen, :imagen, :enlace, CAST(:activa AS integer)::boolean)";

    $stmt = $this->conn->prepare($sql);
    $ok = $stmt->execute([
      ':cod_mun' => $data['cod_mun'],
      ':titulo'  => $data['titulo'],
      ':fecha'   => $data['fecha_publicacion'],
      ':resumen' => $data['resumen'],
      ':imagen'  => $data['imagen_url'],
      ':enlace'  => $data['enlace_detalle'],
      ':activa'  => (int)$data['activa']
    ]);

    if ($ok) return $this->conn->lastInsertId();
    return false;
  }

  public function obtenerNoticiasPorMunicipio($cod_mun) {
    $stmt = $this->conn->prepare("
      SELECT * FROM pou.noticias
      WHERE cod_mun = :cod_mun
      ORDER BY fecha_publicacion DESC
    ");
    $stmt->bindParam(':cod_mun', $cod_mun);
    $stmt->execute();
    return $stmt->fetchAll(PDO::FETCH_ASSOC);
  }

  // Lee el registro para comprobar el municipio y recuperar la imagen guardada.
  public function obtenerNoticiaPorId($id) {
    $stmt = $this->conn->prepare('SELECT * FROM pou.noticias WHERE id = :id');
    $stmt->execute([':id' => $id]);
    return $stmt->fetch(PDO::FETCH_ASSOC);
  }

  public function actualizarNoticia($data) {
    $anterior = $this->obtenerNoticiaPorId($data['id']);
    if (!$anterior || $anterior['cod_mun'] !== $data['cod_mun']) {
      throw new Exception('La noticia no pertenece al municipio.');
    }

    // Update: si imagen_url viene vacío => mantener la existente
    $sql = "UPDATE pou.noticias
            SET
              titulo = :titulo,
              fecha_publicacion = :fecha,
              resumen = :resumen,
              enlace_detalle = :enlace,
              activa = CAST(:activa AS integer)::boolean" .
            (!empty($data['imagen_url']) ? ", imagen_url = :imagen" : "") .
            " WHERE id = :id AND cod_mun = :cod_mun";

    $params = [
      ':titulo' => $data['titulo'],
      ':fecha'  => $data['fecha_publicacion'],
      ':resumen'=> $data['resumen'],
      ':enlace' => $data['enlace_detalle'],
      ':activa' => (int)$data['activa'],
      ':id'     => $data['id'],
      ':cod_mun'=> $data['cod_mun']
    ];

    if (!empty($data['imagen_url'])) $params[':imagen'] = $data['imagen_url'];

    $stmt = $this->conn->prepare($sql);
    $ok = $stmt->execute($params);
    if ($ok && !empty($data['imagen_url']) && $data['imagen_url'] !== $anterior['imagen_url']) {
      eliminarArchivoMunicipalPOU($anterior['imagen_url'], $anterior['cod_mun'], $this->conn);
    }
    return $ok;
  }

  public function eliminarNoticia($id) {
    $this->conn->beginTransaction();
    try {
      $noticia = $this->obtenerNoticiaPorId($id);
      if (!$noticia) throw new Exception('La noticia no existe.');

      $stmt = $this->conn->prepare("DELETE FROM pou.noticias WHERE id = :id");
      $stmt->execute([':id' => $id]);

      $this->conn->commit();
      eliminarArchivoMunicipalPOU($noticia['imagen_url'], $noticia['cod_mun'], $this->conn);
      return true;
    } catch (Exception $e) {
      $this->conn->rollBack();
      throw new Exception("Error eliminando noticia: " . $e->getMessage());
    }
  }

  public function cambiarEstadoNoticia($id, $activa, $cod_mun) {
    $stmt = $this->conn->prepare("UPDATE pou.noticias SET activa = CAST(:activa AS integer)::boolean WHERE id = :id AND cod_mun = :cod_mun");
    return $stmt->execute([
      ':id' => $id,
      ':cod_mun' => $cod_mun,
      ':activa' => (int)$activa
    ]);
  }
}
