<?php
// ===========================================================
// LOGIN: CONTRASEÑA Y CONVENIO DEL PROYECTO ACTUAL
// ===========================================================
session_start();
require_once __DIR__ . '/../db/conexion.php';
require_once __DIR__ . '/permisos_proyecto.php';
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Método no permitido.']);
    exit;
}
$correo = $_POST['correo'] ?? '';
$clave = $_POST['clave'] ?? '';
if (!is_string($correo) || !is_string($clave) || trim($correo) === '' || $clave === '') {
    echo json_encode(['success' => false, 'message' => 'Por favor, rellena todos los campos.']);
    exit;
}
try {
    // 1. Comprobar la cuenta y su contraseña.
    $stmt = $conn->prepare("SELECT idusuario, identificador, clave_cifrada, nombre, apellido1, apellido2
                           FROM dbo.web_usuarios
                           WHERE LOWER(identificador) = LOWER(:correo)
                             AND (baja IS NULL OR baja = 0)
                           LIMIT 1");
    $stmt->execute([':correo' => trim($correo)]);
    $usuario = $stmt->fetch(PDO::FETCH_ASSOC);
    if (!$usuario || !password_verify($clave, $usuario['clave_cifrada'])) {
        echo json_encode(['success' => false, 'message' => 'El usuario o la contraseña no son válidos.']);
        exit;
    }

    // 2. Exigir un convenio vigente asociado al proyecto, no cualquier convenio.
    $permiso = obtenerPermisoProyecto($conn, $usuario['idusuario']);
    if ($permiso === null) {
        http_response_code(403);
        echo json_encode(['success' => false, 'message' =>
            'No tienes un convenio activo y vigente que autorice el acceso a ' . PROYECTO_ACCESO . '.']);
        exit;
    }

    // 3. Abrir la sesión. El permiso se volverá a consultar en las acciones privadas.
    session_regenerate_id(true);
    $_SESSION['usuario_id'] = $usuario['idusuario'];
    $_SESSION['usuario_correo'] = $usuario['identificador'];
    $_SESSION['usuario_nombre'] = trim($usuario['nombre'] . ' ' . $usuario['apellido1'] . ' ' . $usuario['apellido2']);
    $_SESSION['expira_en'] = time() + 3 * 60 * 60;
    echo json_encode(['success' => true, 'redirect' => 'php/gestion/panel_gestion.php']);
} catch (Throwable $error) {
    error_log('Login ' . PROYECTO_ACCESO . ': ' . $error->getMessage());
    http_response_code(503);
    echo json_encode(['success' => false, 'message' => 'No se ha podido comprobar el acceso. Inténtalo de nuevo.']);
}
