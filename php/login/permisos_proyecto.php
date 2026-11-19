<?php
// ===========================================================
// ACCESO AL PROYECTO MEDIANTE LOS CONVENIOS DE ADMINSIT
// Este código es del servidor: nunca se toma el proyecto del POST.
// ===========================================================
const PROYECTO_ACCESO = 'pou';

/** Devuelve E/L si existe un convenio válido para este usuario y proyecto. */
function obtenerPermisoProyecto($conexion, $usuarioId)
{
    $sql = "SELECT cp.modo_acceso
            FROM dbo.web_usuarios u
            JOIN dbo.web_usuarios_convenios uc ON uc.cod_usuario = u.idusuario
            JOIN dbo.web_convenios c ON CAST(c.idconvenio AS TEXT) = CAST(uc.cod_convenio AS TEXT)
            JOIN dbo.web_convenios_proyectos cp ON cp.idconvenio = c.idconvenio
            JOIN dbo.web_proyectos_maestro p ON p.proyecto = cp.proyecto
            WHERE u.idusuario = :usuario_id
              AND (u.baja IS NULL OR u.baja = 0)
              AND uc.es_baja = false
              AND c.estado = 'A'
              AND (c.fechainicio IS NULL OR c.fechainicio <= CURRENT_DATE)
              AND (c.fechafin IS NULL OR c.fechafin >= CURRENT_DATE)
              AND cp.proyecto = :proyecto
              AND p.eliminado = false
              AND cp.modo_acceso IN ('E', 'L')
            ORDER BY CASE WHEN cp.modo_acceso = 'E' THEN 0 ELSE 1 END
            LIMIT 1";
    $stmt = $conexion->prepare($sql);
    $stmt->execute([':usuario_id' => $usuarioId, ':proyecto' => PROYECTO_ACCESO]);
    $permiso = $stmt->fetchColumn();
    if ($permiso === 'E' || $permiso === 'L') {
        return $permiso;
    }
    return null;
}

/**
 * El perfil se asigna en el esquema de cada aplicación.
 * Se consulta en el servidor para que darlo o retirarlo tenga efecto en la siguiente petición.
 */
function esSuperusuarioProyecto($conexion, $usuarioId)
{
    if (!is_scalar($usuarioId) || !preg_match('/^[1-9][0-9]*$/D', (string)$usuarioId)) {
        return false;
    }

    $tabla = strtolower(PROYECTO_ACCESO) . '.superusuarios';
    $stmt = $conexion->prepare('SELECT to_regclass(:tabla)');
    $stmt->execute([':tabla' => $tabla]);
    if (!$stmt->fetchColumn()) {
        // Hasta ejecutar el SQL, los usuarios mantienen su acceso habitual.
        return false;
    }

    $stmt = $conexion->prepare("SELECT 1 FROM {$tabla} WHERE usuario_id = :usuario_id");
    $stmt->execute([':usuario_id' => $usuarioId]);
    if (!$stmt->fetchColumn()) {
        return false;
    }

    // El perfil amplía los permisos únicamente mientras haya un convenio vigente.
    return obtenerPermisoProyecto($conexion, $usuarioId) !== null;
}

/** Comprueba la sesión y vuelve a consultar el permiso en cada petición. */
function validarSesionProyecto($comprobarExpiracion = true)
{
    global $conn;
    if (session_status() === PHP_SESSION_NONE) {
        session_start();
    }
    $usuarioId = $_SESSION['usuario_id'] ?? null;
    if (!is_scalar($usuarioId) || !preg_match('/^[1-9][0-9]*$/D', (string)$usuarioId)) {
        return ['success' => false, 'status' => 'no_session', 'http' => 401,
            'message' => 'Debes iniciar sesión para acceder a la gestión.'];
    }
    if ($comprobarExpiracion && time() > (int)($_SESSION['expira_en'] ?? 0)) {
        return ['success' => false, 'status' => 'expired', 'http' => 401,
            'message' => 'La sesión ha caducado.'];
    }

    try {
        require_once __DIR__ . '/../db/conexion.php';
        // Los formularios incluidos por el panel comparten la consulta de ESTA petición.
        // Una petición nueva siempre vuelve a comprobar la base de datos.
        static $permisosConsultados = [];
        if (!array_key_exists((string)$usuarioId, $permisosConsultados)) {
            $permisosConsultados[(string)$usuarioId] = obtenerPermisoProyecto($conn, $usuarioId);
        }
        $permiso = $permisosConsultados[(string)$usuarioId];
        if ($permiso !== null && esSuperusuarioProyecto($conn, $usuarioId)) {
            $permiso = 'E';
        }
    } catch (Throwable $error) {
        error_log('Acceso ' . PROYECTO_ACCESO . ': ' . $error->getMessage());
        return ['success' => false, 'status' => 'error', 'http' => 503,
            'message' => 'No se ha podido comprobar el acceso. Inténtalo de nuevo.'];
    }
    if ($permiso === null) {
        return ['success' => false, 'status' => 'forbidden', 'http' => 403,
            'message' => 'No tienes un convenio activo y vigente que autorice el acceso a ' . PROYECTO_ACCESO . '.'];
    }
    return ['success' => true, 'status' => 'active', 'http' => 200, 'permiso' => $permiso];
}

/** Protege una página o acción. Las modificaciones requieren permiso E. */
function exigirAccesoProyecto($escritura = false, $respuestaJson = true)
{
    if (!headers_sent()) {
        header('Cache-Control: no-store');
    }
    $resultado = validarSesionProyecto();
    if ($resultado['success'] && $escritura && $resultado['permiso'] !== 'E') {
        $resultado = ['success' => false, 'status' => 'forbidden', 'http' => 403,
            'message' => 'Tu convenio permite lectura. Esta operación requiere permiso de escritura.'];
    }
    if ($resultado['success']) {
        return $resultado['permiso'];
    }
    http_response_code($resultado['http']);
    header('Cache-Control: no-store');
    if ($respuestaJson) {
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode($resultado, JSON_UNESCAPED_UNICODE);
    } else {
        header('Content-Type: text/html; charset=utf-8');
        echo '<p>' . htmlspecialchars($resultado['message'], ENT_QUOTES, 'UTF-8') . '</p>';
        echo '<p><a href="/' . strtolower(PROYECTO_ACCESO) . '/index.php">Volver al portal</a></p>';
    }
    exit;
}
