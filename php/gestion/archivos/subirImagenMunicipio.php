<?php
// ============================================================================
// SUBIDA DE IMÁGENES DEL PORTAL PÚBLICO
//
// Guarda el banner o el escudo dentro de la carpeta del municipio.
// No crea tablas ni modifica la estructura de la base de datos.
// ============================================================================

require_once(__DIR__ . '/../../db/conexion.php');
require_once(__DIR__ . '/../../modelo/MunicipioModel.php');

if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

header('Content-Type: application/json; charset=utf-8');

// 1. Comprobamos que existe una sesión activa.
if (empty($_SESSION['usuario_id'])) {
    responderError('La sesión ha caducado.', 401);
}

$codigoMunicipio = trim($_POST['cod_mun'] ?? '');
$tipoImagen = trim($_POST['tipo'] ?? '');
$archivo = $_FILES['archivo'] ?? null;

// 2. Validamos los datos básicos.
if (!preg_match('/^\d{5}$/', $codigoMunicipio)) {
    responderError('El código del municipio no es válido.');
}

if (!in_array($tipoImagen, ['banner', 'escudo'], true)) {
    responderError('El tipo de imagen no es válido.');
}

if (!$archivo || $archivo['error'] !== UPLOAD_ERR_OK) {
    responderError('No se ha recibido correctamente el archivo.');
}

$municipioModel = new MunicipioModel($conn);
$usuarioId = $_SESSION['usuario_id'];
$correoUsuario = $_SESSION['usuario_correo'] ?? '';

if (!$municipioModel->usuarioPuedeGestionarMunicipio($codigoMunicipio, $usuarioId, $correoUsuario)) {
    responderError('No tienes permiso para modificar este municipio.', 403);
}

// 3. Aplicamos el límite según el tipo de imagen.
$limiteBytes = $tipoImagen === 'banner'
    ? 8 * 1024 * 1024
    : 4 * 1024 * 1024;

if ((int)$archivo['size'] > $limiteBytes) {
    $limiteMegas = $tipoImagen === 'banner' ? 8 : 4;
    responderError("La imagen no puede superar {$limiteMegas} MB.");
}

// 4. Comprobamos el tipo real del archivo.
$finfo = new finfo(FILEINFO_MIME_TYPE);
$mimeReal = $finfo->file($archivo['tmp_name']);

$extensionesPermitidas = [
    'image/jpeg' => 'jpg',
    'image/png' => 'png',
    'image/webp' => 'webp'
];

if (!isset($extensionesPermitidas[$mimeReal])) {
    responderError('Solo se permiten imágenes JPG, PNG o WEBP.');
}

$extension = $extensionesPermitidas[$mimeReal];
$nombreBase = $tipoImagen === 'banner'
    ? "{$codigoMunicipio}_banner"
    : "{$codigoMunicipio}_escudo";

// 5. Creamos la carpeta del municipio cuando todavía no existe.
$raizProyecto = dirname(__DIR__, 3);
$carpetaRelativa = "images/municipios/{$codigoMunicipio}";
$carpetaDestino = $raizProyecto . '/' . $carpetaRelativa;

if (!is_dir($carpetaDestino) && !mkdir($carpetaDestino, 0775, true)) {
    responderError('No se ha podido crear la carpeta de imágenes.');
}

// 6. Cada subida tiene nombre propio. Así se conservan el escudo automático
// y la imagen vigente hasta que el gestor guarde la nueva selección.
$nombreArchivo = $nombreBase . '_personalizado_' . bin2hex(random_bytes(8)) . '.' . $extension;
$rutaDestino = "{$carpetaDestino}/{$nombreArchivo}";

if (!move_uploaded_file($archivo['tmp_name'], $rutaDestino)) {
    responderError('No se ha podido guardar la imagen en el servidor.');
}

// 7. Devolvemos una ruta relativa compatible con el resto del proyecto.
$urlRelativa = "{$carpetaRelativa}/{$nombreArchivo}";

echo json_encode([
    'ok' => true,
    'url' => $urlRelativa,
    'mensaje' => 'Imagen subida correctamente.'
]);

/**
 * Devuelve un error JSON y detiene la ejecución.
 */
function responderError($mensaje, $codigoHttp = 400)
{
    http_response_code($codigoHttp);

    echo json_encode([
        'ok' => false,
        'mensaje' => $mensaje
    ]);

    exit;
}
