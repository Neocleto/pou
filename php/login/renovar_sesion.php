<?php
require_once __DIR__ . '/permisos_proyecto.php';
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
// Conservar la renovación existente, comprobando antes el permiso actual del convenio.
$resultado = validarSesionProyecto(false);
if (!$resultado['success']) {
    http_response_code($resultado['http']);
    echo json_encode($resultado, JSON_UNESCAPED_UNICODE);
    exit;
}
$_SESSION['expira_en'] = time() + 3 * 60 * 60;
echo json_encode(['status' => 'renewed']);
