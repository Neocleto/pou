<?php
// ============================================================================
// MODELO: MUNICIPIOS POU
//
// Centraliza las consultas de la tabla pou.municipios.
// Las funciones se mantienen pequeñas y con parámetros sencillos.
// ============================================================================

require_once(__DIR__ . '/../db/conexion.php');
require_once(__DIR__ . '/../includes/imagenes_municipio.php');

class MunicipioModel
{
    private $conn;

    public function __construct($dbConn)
    {
        $this->conn = $dbConn;
    }

    /**
     * Obtiene un municipio activo en el panel de gestión.
     */
    public function obtenerMunicipioPorCodigo($codMun)
    {
        $sql = "SELECT *
                FROM pou.municipios
                WHERE cod_mun = :cod_mun
                  AND baja = FALSE";

        $stmt = $this->conn->prepare($sql);
        $stmt->execute([':cod_mun' => $codMun]);

        $municipio = $stmt->fetch(PDO::FETCH_ASSOC);
        if ($municipio) {
            $municipio['imagen_cabecera'] = obtenerBannerMunicipio($codMun, $municipio['imagen_cabecera'] ?? '');
            $municipio['escudo_automatico'] = obtenerEscudoAutomaticoMunicipio($codMun);
            $municipio['escudo'] = obtenerEscudoMunicipio($codMun, $municipio['escudo'] ?? '');
        }
        return $municipio;
    }

    /**
     * Obtiene un municipio publicado para la página pública.
     */
    public function obtenerMunicipioActivosPorCodigo($codMun)
    {
        $sql = "SELECT *
                FROM pou.municipios
                WHERE cod_mun = :cod_mun
                  AND baja = FALSE
                  AND activo = TRUE";

        $stmt = $this->conn->prepare($sql);
        $stmt->execute([':cod_mun' => $codMun]);

        $municipio = $stmt->fetch(PDO::FETCH_ASSOC);
        if ($municipio) {
            $municipio['imagen_cabecera'] = obtenerBannerMunicipio($codMun, $municipio['imagen_cabecera'] ?? '');
            $municipio['escudo_automatico'] = obtenerEscudoAutomaticoMunicipio($codMun);
            $municipio['escudo'] = obtenerEscudoMunicipio($codMun, $municipio['escudo'] ?? '');
        }
        return $municipio;
    }

    /**
     * Obtiene los municipios que puede gestionar el usuario conectado.
     */
    public function obtenerMunicipiosPorUsuario($usuarioId, $correoUsuario = '')
    {
        $correoUsuario = trim((string)$correoUsuario);

        $condiciones = [
            'usuario_id = :usuario_id'
        ];

        $parametros = [
            ':usuario_id' => $usuarioId
        ];

        // Solo comparamos por correo cuando la sesión contiene uno válido.
        // Así evitamos que un correo vacío coincida con municipios sin contacto.
        if ($correoUsuario !== '') {
            $condiciones[] = "LOWER(COALESCE(correo_contacto, '')) = LOWER(:correo_usuario)";
            $condiciones[] = "LOWER(COALESCE(correo_contacto_gestor, '')) = LOWER(:correo_usuario)";
            $parametros[':correo_usuario'] = $correoUsuario;
        }

        $sql = "SELECT *
                FROM pou.municipios
                WHERE baja = FALSE
                  AND (" . implode(' OR ', $condiciones) . ")
                ORDER BY fecha_creacion DESC";

        $stmt = $this->conn->prepare($sql);
        $stmt->execute($parametros);

        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    /**
     * Comprueba si el usuario puede gestionar un municipio concreto.
     */
    public function usuarioPuedeGestionarMunicipio($codMun, $usuarioId, $correoUsuario = '')
    {
        $correoUsuario = trim((string)$correoUsuario);

        $condiciones = [
            'usuario_id = :usuario_id'
        ];

        $parametros = [
            ':cod_mun' => $codMun,
            ':usuario_id' => $usuarioId
        ];

        if ($correoUsuario !== '') {
            $condiciones[] = "LOWER(COALESCE(correo_contacto, '')) = LOWER(:correo_usuario)";
            $condiciones[] = "LOWER(COALESCE(correo_contacto_gestor, '')) = LOWER(:correo_usuario)";
            $parametros[':correo_usuario'] = $correoUsuario;
        }

        $sql = "SELECT 1
                FROM pou.municipios
                WHERE cod_mun = :cod_mun
                  AND baja = FALSE
                  AND (" . implode(' OR ', $condiciones) . ")
                LIMIT 1";

        $stmt = $this->conn->prepare($sql);
        $stmt->execute($parametros);

        return (bool)$stmt->fetchColumn();
    }

    /**
     * Crea el registro principal del municipio.
     */
    public function crearMunicipio($datos)
    {
        $sql = "INSERT INTO pou.municipios (
                    cod_mun,
                    nombre,
                    correo_contacto,
                    correo_contacto_gestor,
                    politica_privacidad_url,
                    usuario_id,
                    imagen_cabecera,
                    escudo,
                    enviar_docs_a_arquitecto,
                    buzon_participacion_activo
                ) VALUES (
                    :cod_mun,
                    :nombre,
                    :correo_contacto,
                    :correo_contacto_gestor,
                    :politica_privacidad_url,
                    :usuario_id,
                    :imagen_cabecera,
                    :url_escudo,
                    :enviar_docs_a_arquitecto,
                    :buzon_participacion_activo
                )";

        $stmt = $this->conn->prepare($sql);

        return $stmt->execute([
            ':cod_mun' => $datos['cod_mun'] ?? null,
            ':nombre' => $datos['nombre'] ?? null,
            ':correo_contacto' => $datos['correo_contacto'] ?? null,
            ':correo_contacto_gestor' => $datos['correo_contacto_gestor'] ?? null,
            ':politica_privacidad_url' => $datos['politica_privacidad_url'] ?? null,
            ':usuario_id' => $datos['usuario_id'] ?? null,
            ':imagen_cabecera' => $datos['imagen_cabecera'] ?? null,
            ':url_escudo' => $datos['url_escudo'] ?? null,
            ':enviar_docs_a_arquitecto' => !empty($datos['enviar_docs_a_arquitecto']) ? 1 : 0,
            ':buzon_participacion_activo' => !empty($datos['buzon_participacion_activo']) ? 1 : 0
        ]);
    }

    /**
     * Actualiza los datos generales del municipio.
     */
    public function actualizarMunicipio($codMun, $datos)
    {
        if (!is_array($datos)) {
            $datos = json_decode($datos, true);
        }

        if (!is_array($datos)) {
            throw new Exception('Se esperaba un array asociativo en actualizarMunicipio.');
        }

        $sql = "UPDATE pou.municipios
                SET nombre = :nombre,
                    imagen_cabecera = COALESCE(NULLIF(:imagen_cabecera, ''), imagen_cabecera),
                    escudo = COALESCE(NULLIF(:url_escudo, ''), escudo),
                    correo_contacto = :correo_contacto,
                    correo_contacto_gestor = :correo_contacto_gestor,
                    politica_privacidad_url = :politica_privacidad_url,
                    enviar_docs_a_arquitecto = :enviar_docs_a_arquitecto,
                    buzon_participacion_activo = :buzon_participacion_activo,
                    fecha_modificacion = NOW()
                WHERE cod_mun = :cod_mun";

        $stmt = $this->conn->prepare($sql);

        return $stmt->execute([
            ':nombre' => $datos['nombre'] ?? '',
            ':imagen_cabecera' => $datos['imagen_cabecera'] ?? '',
            ':url_escudo' => $datos['url_escudo'] ?? '',
            ':correo_contacto' => $datos['correo_contacto'] ?? '',
            ':correo_contacto_gestor' => $datos['correo_contacto_gestor'] ?? '',
            ':politica_privacidad_url' => $datos['politica_privacidad_url'] ?? '',
            ':enviar_docs_a_arquitecto' => !empty($datos['enviar_docs_a_arquitecto']) ? 1 : 0,
            ':buzon_participacion_activo' => !empty($datos['buzon_participacion_activo']) ? 1 : 0,
            ':cod_mun' => $codMun
        ]);
    }

    /**
     * Actualiza solamente las imágenes usadas por el portal público.
     */
    public function actualizarImagenesPortal($codMun, $imagenCabecera, $escudo)
    {
        $sql = "UPDATE pou.municipios
                SET imagen_cabecera = :imagen_cabecera,
                    escudo = :escudo,
                    fecha_modificacion = NOW()
                WHERE cod_mun = :cod_mun
                  AND baja = FALSE";

        $stmt = $this->conn->prepare($sql);

        return $stmt->execute([
            ':imagen_cabecera' => trim((string)$imagenCabecera),
            ':escudo' => trim((string)$escudo),
            ':cod_mun' => $codMun
        ]);
    }

    /**
     * Actualiza los datos publicos que se editan desde el configurador.
     */
    public function actualizarDatosPublicosPortal($codMun, $politicaPrivacidadUrl, $buzonActivo)
    {
        $sql = "UPDATE pou.municipios
                SET politica_privacidad_url = :politica_privacidad_url,
                    buzon_participacion_activo = CAST(:buzon_activo AS integer)::boolean,
                    fecha_modificacion = NOW()
                WHERE cod_mun = :cod_mun
                  AND baja = FALSE";

        $stmt = $this->conn->prepare($sql);

        return $stmt->execute([
            ':politica_privacidad_url' => trim((string)$politicaPrivacidadUrl),
            ':buzon_activo' => !empty($buzonActivo) ? 1 : 0,
            ':cod_mun' => $codMun
        ]);
    }

    /**
     * Marca un municipio como eliminado.
     */
    public function eliminarMunicipio($codMun)
    {
        $sql = "UPDATE pou.municipios
                SET baja = TRUE,
                    fecha_baja = NOW()
                WHERE cod_mun = :cod_mun";

        $stmt = $this->conn->prepare($sql);

        return $stmt->execute([':cod_mun' => $codMun]);
    }

    /**
     * Oculta el municipio de la parte pública.
     */
    public function desactivarMunicipio($codMun)
    {
        $sql = "UPDATE pou.municipios
                SET activo = FALSE,
                    fecha_modificacion = NOW()
                WHERE cod_mun = :cod_mun
                  AND baja = FALSE";

        $stmt = $this->conn->prepare($sql);

        return $stmt->execute([':cod_mun' => $codMun]);
    }

    /**
     * Comprueba si ya existe un código municipal.
     */
    public function existeMunicipio($codMun)
    {
        $sql = "SELECT COUNT(*)
                FROM pou.municipios
                WHERE cod_mun = :cod_mun";

        $stmt = $this->conn->prepare($sql);
        $stmt->execute([':cod_mun' => $codMun]);

        return $stmt->fetchColumn() > 0;
    }

    /**
     * Publica un municipio.
     */
    public function publicarMunicipio($codMun)
    {
        $sql = "UPDATE pou.municipios
                SET activo = TRUE,
                    fecha_modificacion = NOW()
                WHERE cod_mun = :cod_mun
                  AND baja = FALSE";

        $stmt = $this->conn->prepare($sql);

        return $stmt->execute([':cod_mun' => $codMun]);
    }
}
