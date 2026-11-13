<?php
// ============================================================================
// CONFIGURADOR DEL PORTAL PÚBLICO
//
// Esta pantalla reúne en un único espacio:
// - Diseño general del portal.
// - Cabecera e imágenes del municipio.
// - Accesos rápidos y orden de los bloques públicos.
// - Formularios y encuestas de participación.
//
// La pantalla solo se abre cuando el usuario conectado puede gestionar
// el municipio indicado. La lógica de guardado continúa en los endpoints
// existentes para mantener la estructura actual del proyecto POU.
// ============================================================================

require_once(__DIR__ . '/../db/conexion.php');
require_once(__DIR__ . '/../modelo/MunicipioModel.php');

// Evitamos que el navegador recupere desde caché el configurador de otro municipio.
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Pragma: no-cache');
header('Expires: 0');

if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

// 1. Comprobamos que existe una sesión activa.
$usuarioId = $_SESSION['usuario_id'] ?? null;
$correoUsuario = $_SESSION['usuario_correo'] ?? '';

if (!$usuarioId) {
    header('Location: /pou/index.php');
    exit;
}

// 2. Recogemos y validamos el código del municipio.
$codMun = trim($_GET['cod_mun'] ?? '');

if (!preg_match('/^\d{5}$/', $codMun)) {
    http_response_code(400);
    die('El código del municipio no es válido.');
}

// 3. Verificamos que el usuario puede editar este municipio.
$municipioModel = new MunicipioModel($conn);

if (!$municipioModel->usuarioPuedeGestionarMunicipio($codMun, $usuarioId, $correoUsuario)) {
    http_response_code(403);
    die('No tienes permiso para configurar este municipio.');
}

$municipio = $municipioModel->obtenerMunicipioPorCodigo($codMun);

if (!$municipio) {
    http_response_code(404);
    die('El municipio solicitado no existe.');
}

// 4. Permitimos abrir directamente un bloque concreto del configurador.
//    Por ejemplo, el paso de Participación abre el panel de formularios.
$panelesPermitidos = [
    'general',
    'cabecera',
    'pie',
    'accesos',
    'formularios',
    'seccion:informacion',
    'seccion:fases',
    'seccion:participacion',
    'seccion:documentos',
    'seccion:actualidad',
    'seccion:buzon'
];

$panelInicial = trim($_GET['panel'] ?? 'general');

if (!in_array($panelInicial, $panelesPermitidos, true)) {
    $panelInicial = 'general';
}

// 5. Mostramos la vista del configurador.
include(__DIR__ . '/configurador_portal_template.php');
