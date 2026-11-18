<?php
require_once(__DIR__ . "/../db/conexion.php");
require_once __DIR__ . '/../controlador/MunicipioControlador.php';

session_start();

// 1) Parámetros de la URL
$cod_mun   = $_GET['cod_mun'] ?? null;
$esPreview = isset($_GET['preview']) && $_GET['preview'] === '1';

if ($esPreview) {
    require_once __DIR__ . '/../login/permisos_proyecto.php';
    exigirAccesoProyecto(false, false);
}

// La vista previa siempre debe mostrar los datos actuales del municipio.
if ($esPreview) {
    header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
    header('Pragma: no-cache');
    header('Expires: 0');
}

if (!$cod_mun) {
    // Si no llega municipio, volvemos a la home del POU
    header("Location: /pou/index.php");
    exit;
}

// 2) Datos de sesión para el controlador (permiso de preview)
$usuarioId = $_SESSION['usuario_id'] ?? null;
$rol = $_SESSION['rol'] ?? null;
$correoUsuario = $_SESSION['usuario_correo'] ?? '';

$controller = new MunicipioController($conn);

try {
    // IMPORTANTE: ahora le pasamos el flag de preview y los datos de usuario
    $datos = $controller->mostrarMunicipio(
        $cod_mun,
        $esPreview,
        $usuarioId,
        $rol,
        $correoUsuario
    );

    $documentosPublicos   = $datos['documentosPublicos'];
    $municipio            = $datos['municipio'];
    $informacion          = $datos['informacion'];
    $faseActual           = $datos['faseActual'];
    $participacion        = $datos['participacion'];
    $botonesParticipacion = $datos['botonesParticipacion'];
    $noticias             = $datos['noticias'];
    $faqs                 = $datos['faqs'];
    $configuracionVisual   = $datos['configuracionVisual'] ?? [];
    $accesosPublicos       = $datos['accesosPublicos'] ?? [];
    $formulariosPublicos   = $datos['formulariosPublicos'] ?? [];
    $modoPreview          = $datos['modoPreview'] ?? false;

    include __DIR__ . '/municipio_template.php';

} catch (Exception $e) {
    echo "Error al cargar los datos del municipio: " . htmlspecialchars($e->getMessage());
    exit;
}
