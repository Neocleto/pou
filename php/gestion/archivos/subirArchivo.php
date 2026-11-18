<?php
// Acceso de gestión: convenio vigente y proyecto correcto.
require_once __DIR__ . '/../../login/permisos_proyecto.php';
exigirAccesoProyecto(true);

// ===============================================
// Script: subirArchivo.php (GENÉRICO)
// Descripción: Gestiona la subida de documentos al servidor (documentos y botones)
// Parámetros requeridos:
// - archivo (file)
// - cod_mun (string)
// - tipo (string): 'documento' o 'participacion'
// ===============================================

header('Content-Type: application/json; charset=utf-8');

const MAX_UPLOAD_BYTES = 8388608; // 8 MB
const MAX_UPLOAD_MB = 8;

function responderSubida(bool $success, string $message = '', array $extra = []): void
{
    echo json_encode(array_merge([
        'success' => $success,
        'message' => $message,
    ], $extra));
    exit;
}

function iniBytes(string $value): int
{
    $value = trim($value);
    if ($value === '') return 0;

    $unit = strtolower(substr($value, -1));
    $num = (float) $value;

    switch ($unit) {
        case 'g': $num *= 1024;
        case 'm': $num *= 1024;
        case 'k': $num *= 1024;
    }

    return (int) $num;
}

function mensajeErrorUpload(int $error): string
{
    $uploadMax = ini_get('upload_max_filesize') ?: 'desconocido';
    $postMax = ini_get('post_max_size') ?: 'desconocido';

    switch ($error) {
        case UPLOAD_ERR_INI_SIZE:
            return "El archivo supera el límite configurado en PHP (upload_max_filesize: {$uploadMax}).";
        case UPLOAD_ERR_FORM_SIZE:
            return 'El archivo supera el tamaño máximo permitido por el formulario.';
        case UPLOAD_ERR_PARTIAL:
            return 'El archivo se subió solo parcialmente. Inténtalo de nuevo.';
        case UPLOAD_ERR_NO_FILE:
            return 'No se recibió ningún archivo. Selecciona un documento antes de subirlo.';
        case UPLOAD_ERR_NO_TMP_DIR:
            return 'Falta la carpeta temporal de subida en el servidor.';
        case UPLOAD_ERR_CANT_WRITE:
            return 'El servidor no pudo escribir el archivo en disco. Revisa permisos.';
        case UPLOAD_ERR_EXTENSION:
            return 'Una extensión de PHP bloqueó la subida del archivo.';
        default:
            return "No se recibió el archivo correctamente. Límites actuales: upload_max_filesize={$uploadMax}, post_max_size={$postMax}.";
    }
}

$contentLength = (int)($_SERVER['CONTENT_LENGTH'] ?? 0);
$postMaxBytes = iniBytes(ini_get('post_max_size') ?: '0');

// Cuando se supera post_max_size, PHP vacía $_POST y $_FILES.
if ($contentLength > 0 && $postMaxBytes > 0 && $contentLength > $postMaxBytes && empty($_POST) && empty($_FILES)) {
    responderSubida(false, 'El archivo o la petición completa supera el límite del servidor (post_max_size: ' . ini_get('post_max_size') . '). Tamaño máximo recomendado: ' . MAX_UPLOAD_MB . ' MB.');
}

// 1. Exigimos sesión antes de aceptar documentos.


// 2. Validar archivo recibido
if (!isset($_FILES['archivo'])) {
    responderSubida(false, 'No se recibió el archivo. Puede que supere el tamaño máximo permitido o que el formulario no esté enviando multipart/form-data. Tamaño máximo: ' . MAX_UPLOAD_MB . ' MB.');
}

$archivo = $_FILES['archivo'];

if (($archivo['error'] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_OK) {
    responderSubida(false, mensajeErrorUpload((int)$archivo['error']));
}

if (($archivo['size'] ?? 0) > MAX_UPLOAD_BYTES) {
    responderSubida(false, 'El archivo pesa ' . round($archivo['size'] / 1024 / 1024, 2) . ' MB y supera el máximo permitido de ' . MAX_UPLOAD_MB . ' MB.');
}

// 2. Validar cod_mun y tipo
$cod_mun = $_POST['cod_mun'] ?? null;
$tipo = $_POST['tipo'] ?? null;
if (!preg_match('/^\d{5}$/', (string)$cod_mun) || !in_array($tipo, ['documento', 'participacion'], true)) {
    responderSubida(false, 'Faltan datos obligatorios (cod_mun o tipo).');
}

// Comprobamos los permisos igual que en el guardado del documento.
require_once __DIR__ . '/../acciones/permisos_municipio.php';
try {
    comprobarPermisoMunicipio(new MunicipioModel($conn), $cod_mun, $_SESSION['usuario_id'], $_SESSION['usuario_correo'] ?? '');
} catch (Exception $error) {
    responderSubida(false, $error->getMessage());
}

// 3. Definir rutas
$raizProyecto = realpath(__DIR__ . '/../../../');
if (!$raizProyecto) {
    responderSubida(false, 'No se pudo localizar la raíz del proyecto.');
}

$base = $raizProyecto . '/docs/';
$rutaSubcarpeta = $tipo === 'participacion' ? "{$cod_mun}/participacion/" : "{$cod_mun}/";
$directorioDestino = $base . $rutaSubcarpeta;

// 4. Validar extensión
$nombreOriginal = basename($archivo['name']);
$extension = strtolower(pathinfo($nombreOriginal, PATHINFO_EXTENSION));
$permitidas = ['pdf', 'doc', 'docx', 'jpg', 'jpeg', 'png'];
if (!in_array($extension, $permitidas, true)) {
    responderSubida(false, 'Tipo de archivo no permitido. Formatos permitidos: PDF, DOC, DOCX, JPG, JPEG y PNG.');
}

// El contenido real debe corresponder al tipo de documento anunciado.
$tiposPermitidos = [
    'pdf' => ['application/pdf'],
    'doc' => ['application/msword', 'application/x-ole-storage', 'application/CDFV2'],
    'docx' => ['application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/zip'],
    'jpg' => ['image/jpeg'], 'jpeg' => ['image/jpeg'], 'png' => ['image/png']
];
$tipoReal = (new finfo(FILEINFO_MIME_TYPE))->file($archivo['tmp_name']);
if (!in_array($tipoReal, $tiposPermitidos[$extension], true)) {
    responderSubida(false, 'El contenido del archivo no corresponde a su extensión.');
}

if (!is_dir($directorioDestino)) {
    if (!mkdir($directorioDestino, 0775, true)) {
        responderSubida(false, 'No se pudo crear la carpeta destino. Revisa permisos de la carpeta docs/.');
    }
}

// 5. Generar nombre seguro y mover
$nombreSeguro = uniqid('archivo_', true) . '.' . $extension;
$rutaCompleta = $directorioDestino . $nombreSeguro;
$rutaPublica = "docs/{$rutaSubcarpeta}{$nombreSeguro}";

if (move_uploaded_file($archivo['tmp_name'], $rutaCompleta)) {
    responderSubida(true, 'Archivo subido correctamente.', ['url' => $rutaPublica]);
}

responderSubida(false, 'Error al mover el archivo al servidor. Revisa permisos de escritura en docs/.');
