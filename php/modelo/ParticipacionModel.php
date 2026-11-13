<?php
// Textos de participación de cada municipio. Los botones tienen su propio modelo.

class ParticipacionModel
{
    private $conn;

    public function __construct($db)
    {
        $this->conn = $db;
    }

    // Recupera los textos guardados para el municipio solicitado.
    public function obtenerParticipacionPorMunicipio($cod_mun) {
        $stmt = $this->conn->prepare("SELECT * FROM pou.participacion WHERE cod_mun = :cod_mun");
        $stmt->bindParam(':cod_mun', $cod_mun);
        $stmt->execute();
        return $stmt->fetch(PDO::FETCH_ASSOC);
    }

    public function guardarParticipacion($data) {
        $sql = "INSERT INTO pou.participacion (cod_mun, titulo1, descripcion1, titulo2, descripcion2)
                VALUES (:cod_mun, :titulo1, :descripcion1, :titulo2, :descripcion2)
                ON CONFLICT (cod_mun) DO UPDATE SET 
                    titulo1 = EXCLUDED.titulo1,
                    descripcion1 = EXCLUDED.descripcion1,
                    titulo2 = EXCLUDED.titulo2,
                    descripcion2 = EXCLUDED.descripcion2";
        $stmt = $this->conn->prepare($sql);
        return $stmt->execute([
            ':cod_mun' => $data['cod_mun'],
            ':titulo1' => $data['titulo1'],
            ':descripcion1' => $data['descripcion1'],
            ':titulo2' => $data['titulo2'],
            ':descripcion2' => $data['descripcion2']
        ]);
    }
}
