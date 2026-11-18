<?php
require_once __DIR__ . '/permisos_proyecto.php';
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
$resultado = validarSesionProyecto(false);
if ($resultado['success'] && time() > (int)($_SESSION['expira_en'] ?? 0)) {
    $resultado = ['success' => false, 'status' => 'expired', 'message' => 'La sesión ha caducado.'];
}
echo json_encode($resultado, JSON_UNESCAPED_UNICODE);
