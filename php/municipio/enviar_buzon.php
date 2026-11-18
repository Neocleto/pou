<?php
// ============================================================================
// ENVIO DEL BUZON DE PARTICIPACION
// ============================================================================

require_once(__DIR__ . '/../db/conexion.php');
require_once(__DIR__ . '/CorreoParticipacion.php');

header('Content-Type: application/json; charset=utf-8');

$asunto = trim($_POST['asunto'] ?? '');
$mensaje = trim($_POST['mensaje'] ?? '');
$codMun = trim($_POST['cod_mun'] ?? '');

if ($asunto === '' || $mensaje === '' || $codMun === '') {
    echo json_encode([
        'status' => 'error',
        'message' => 'Campos obligatorios vacíos'
    ]);
    exit;
}

try {
    // 1. Recuperamos los mismos destinatarios que usan las encuestas.
    $municipio = obtenerDatosCorreoParticipacion($conn, $codMun);

    if (!booleanoCorreoParticipacion($municipio['buzon_participacion_activo'] ?? false)) {
        echo json_encode([
            'status' => 'error',
            'message' => 'Buzón de participación desactivado'
        ]);
        exit;
    }

    // 2. Validamos el archivo opcional.
    $adjunto = null;
    $nombreAdjunto = '';

    if (isset($_FILES['archivo']) && (int)$_FILES['archivo']['error'] !== UPLOAD_ERR_NO_FILE) {
        $archivo = $_FILES['archivo'];
        if ((int)$archivo['error'] !== UPLOAD_ERR_OK) {
            throw new Exception('No se ha podido recibir el archivo. Elige uno de hasta 5 MB.');
        }
        $tamanoArchivo = (int)($archivo['size'] ?? 0);
        $rutaTemporal = (string)($archivo['tmp_name'] ?? '');
        $nombreAdjunto = basename((string)($archivo['name'] ?? ''));
        if ($tamanoArchivo <= 0 || $tamanoArchivo > 5 * 1024 * 1024 || !is_uploaded_file($rutaTemporal)) {
            throw new Exception('El archivo debe tener contenido y no superar los 5 MB.');
        }
        // Se comprueba el contenido real; el MIME enviado por el navegador no es suficiente.
        $extension = strtolower(pathinfo($nombreAdjunto, PATHINFO_EXTENSION));
        $tiposPermitidos = ['pdf' => 'application/pdf', 'jpg' => 'image/jpeg', 'jpeg' => 'image/jpeg', 'png' => 'image/png'];
        $detector = new finfo(FILEINFO_MIME_TYPE);
        $tipoReal = $detector->file($rutaTemporal);
        if (!isset($tiposPermitidos[$extension]) || $tiposPermitidos[$extension] !== $tipoReal) {
            throw new Exception('Solo se permiten documentos PDF e imágenes JPG o PNG válidos.');
        }
        $adjunto = $rutaTemporal;
    }

    // 3. Preparamos y enviamos el correo.
    $mail = crearCorreoParticipacionPOU();

    if ($adjunto) {
        $mail->addAttachment($adjunto, $nombreAdjunto);
    }

    $asuntoSeguro = htmlspecialchars($asunto, ENT_QUOTES, 'UTF-8');
    $mensajeSeguro = nl2br(htmlspecialchars($mensaje, ENT_QUOTES, 'UTF-8'));

    $mail->isHTML(true);
    $mail->Subject = 'Nuevo mensaje desde el Buzón de Participación: ' . $asunto;
    $mail->Body = '<div style="font-family:Arial,sans-serif;color:#26364a;line-height:1.5;">'
        . '<h2 style="color:#540000;">Nuevo mensaje de participación</h2>'
        . '<p><strong>Asunto:</strong> ' . $asuntoSeguro . '</p>'
        . '<p><strong>Mensaje:</strong><br>' . $mensajeSeguro . '</p>'
        . '</div>';
    $mail->AltBody = 'Asunto: ' . $asunto . "\n\nMensaje: " . $mensaje;
    $resultadoCorreo = enviarCorreoParticipacion($mail, $municipio);

    echo json_encode([
        'status' => 'ok',
        'message' => 'El mensaje se ha enviado correctamente al gestor.',
        'correo_enviado' => $resultadoCorreo['gestor'],
        'copia_arquitecto_enviada' => $resultadoCorreo['arquitecto'],
        'advertencia' => $resultadoCorreo['advertencia']
    ]);
} catch (Throwable $error) {
    echo json_encode([
        'status' => 'error',
        'message' => $error->getMessage()
    ]);
}
