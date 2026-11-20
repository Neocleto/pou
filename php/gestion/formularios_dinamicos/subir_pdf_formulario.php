<?php
// Acceso de gestión: convenio vigente y proyecto correcto.
require_once __DIR__ . '/../../login/permisos_proyecto.php';
exigirAccesoProyecto(true);

// ============================================================================
// SUBIDA DE PDF PARA FORMULARIOS DINÁMICOS
// Guarda el documento en docs/{cod_mun}/formularios/.
// No realiza ningún cambio en la estructura de la base de datos.
// ============================================================================

require_once(__DIR__ . '/../../db/conexion.php');
require_once(__DIR__ . '/../../modelo/MunicipioModel.php');


header('Content-Type: application/json; charset=utf-8');

// 1. Comprobamos la sesión.


$codMun = $_POST['cod_mun'] ?? '';
$archivo = $_FILES['archivo'] ?? null;
$municipioModel = new MunicipioModel($conn);

try {
    // 2. Validamos el municipio y los permisos.
    if (!is_string($codMun) || !preg_match('/^\d{5}$/D', $codMun)) {
        throw new Exception('El código del municipio no es válido.');
    }

    if (!$municipioModel->usuarioPuedeGestionarMunicipio(
        $codMun,
        $_SESSION['usuario_id'],
        $_SESSION['usuario_correo'] ?? ''
    )) {
        throw new Exception('No tienes permiso para subir archivos a este municipio.');
    }

    // 3. Validamos la subida.
    if (!$archivo || $archivo['error'] !== UPLOAD_ERR_OK) {
        throw new Exception('No se ha recibido ningún archivo válido.');
    }

    if ($archivo['size'] > 8 * 1024 * 1024) {
        throw new Exception('El archivo supera el límite de 8 MB.');
    }

    $finfo = new finfo(FILEINFO_MIME_TYPE);
    $tipoMime = $finfo->file($archivo['tmp_name']);

    if ($tipoMime !== 'application/pdf') {
        throw new Exception('Solo se permiten documentos PDF.');
    }

    // 4. Preparamos una carpeta y un nombre seguros.
    $carpetaRelativa = "docs/{$codMun}/formularios";
    $carpetaFisica = dirname(__DIR__, 3) . '/' . $carpetaRelativa;

    if (!is_dir($carpetaFisica) && !mkdir($carpetaFisica, 0775, true)) {
        throw new Exception('No se ha podido crear la carpeta de formularios.');
    }

    $nombreOriginal = pathinfo($archivo['name'], PATHINFO_FILENAME);
    $nombreLimpio = preg_replace('/[^a-zA-Z0-9_-]+/', '_', $nombreOriginal);
    $nombreLimpio = trim($nombreLimpio, '_') ?: 'formulario';
    // El sufijo evita sobrescribir otra subida con el mismo nombre y segundo.
    $nombreFinal = $nombreLimpio . '_' . bin2hex(random_bytes(8)) . '.pdf';
    $rutaFisica = $carpetaFisica . '/' . $nombreFinal;

    if (!move_uploaded_file($archivo['tmp_name'], $rutaFisica)) {
        throw new Exception('No se ha podido guardar el documento.');
    }

    echo json_encode([
        'ok' => true,
        'url' => $carpetaRelativa . '/' . $nombreFinal,
        'mensaje' => 'PDF subido correctamente.'
    ]);
} catch (Throwable $error) {
    http_response_code(400);
    echo json_encode([
        'ok' => false,
        'mensaje' => $error->getMessage()
    ]);
}
