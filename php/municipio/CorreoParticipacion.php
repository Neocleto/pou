<?php
// ============================================================================
// CORREO DE PARTICIPACION POU
//
// Reutiliza la misma configuracion de correo para:
// - Mensajes enviados desde el buzon.
// - Respuestas recibidas desde formularios y encuestas.
// ============================================================================

use PHPMailer\PHPMailer\PHPMailer;

require_once(__DIR__ . '/../../lib/PHPMailer/src/Exception.php');
require_once(__DIR__ . '/../../lib/PHPMailer/src/PHPMailer.php');
require_once(__DIR__ . '/../../lib/PHPMailer/src/SMTP.php');

/**
 * Convierte los booleanos devueltos por PostgreSQL.
 */
function booleanoCorreoParticipacion($valor)
{
    if (is_bool($valor)) {
        return $valor;
    }

    return in_array(
        strtolower(trim((string)$valor)),
        ['1', 't', 'true', 'yes', 'si', 'sí'],
        true
    );
}

/**
 * Recupera el municipio y los destinatarios de participacion.
 */
function obtenerDatosCorreoParticipacion($conn, $codMun)
{
    $sql = "SELECT
                cod_mun,
                nombre,
                correo_contacto_gestor,
                correo_contacto,
                COALESCE(enviar_docs_a_arquitecto, FALSE) AS enviar_docs_a_arquitecto,
                COALESCE(buzon_participacion_activo, TRUE) AS buzon_participacion_activo
            FROM pou.municipios
            WHERE cod_mun = :cod_mun
              AND activo = TRUE AND baja = FALSE";

    $stmt = $conn->prepare($sql);
    $stmt->execute([
        ':cod_mun' => $codMun
    ]);

    $municipio = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$municipio) {
        throw new Exception('Municipio no encontrado.');
    }

    $correoGestor = trim((string)($municipio['correo_contacto_gestor'] ?? ''));

    if (!filter_var($correoGestor, FILTER_VALIDATE_EMAIL)) {
        throw new Exception('El municipio no tiene un correo de gestor válido.');
    }

    return $municipio;
}

/**
 * Prepara PHPMailer para los correos de participación.
 *
 * Conserva el servidor SMTP de la instalación.
 */
function crearCorreoParticipacionPOU()
{
    $mail = new PHPMailer(true);
    $mail->CharSet = 'UTF-8';
    $mail->ContentType = 'text/html; charset=UTF-8';

    // Server settings
    $mail->SMTPDebug = 0;
    $mail->isSMTP();

    $mail->Host       = 'goterayotilio.malaga.es';
    $mail->SMTPAuth = false;
    $mail->SMTPSecure = '';
    $mail->SMTPAutoTLS = false;
    $mail->Port = 25;
    $mail->setFrom('idemap@malaga.es', 'POU');

    return $mail;
}

/**
 * Envía primero al gestor y después una copia independiente al arquitecto.
 * Si el gestor falla no se envía la copia. Una copia fallida no invalida el
 * envío ya aceptado del gestor ni obliga a repetir el mensaje completo.
 */
function enviarCorreoParticipacion($mail, array $municipio)
{
    $correoGestor = trim((string)($municipio['correo_contacto_gestor'] ?? ''));
    $correoArquitecto = trim((string)($municipio['correo_contacto'] ?? ''));
    $contexto = $mail->FromName . ' - Correo de participación ' . ($municipio['cod_mun'] ?? '');

    // 1. El gestor es obligatorio y se comprueba en su propio envío SMTP.
    if (!filter_var($correoGestor, FILTER_VALIDATE_EMAIL)) {
        throw new Exception('El municipio no tiene un correo de gestor válido.');
    }
    try {
        $mail->clearAllRecipients();
        $mail->addAddress($correoGestor);
        if (!$mail->send()) {
            throw new Exception($mail->ErrorInfo);
        }
        error_log($contexto . ' - SMTP aceptó gestor ' . $correoGestor . ' - ' . $mail->getLastMessageID());
    } catch (Throwable $error) {
        error_log($contexto . ' - Falló gestor ' . $correoGestor . ': ' . $error->getMessage());
        throw new Exception('No se ha podido enviar el mensaje al gestor. Inténtalo de nuevo más tarde.');
    }

    $resultado = ['gestor' => true, 'arquitecto' => null, 'advertencia' => ''];
    if (!booleanoCorreoParticipacion($municipio['enviar_docs_a_arquitecto'] ?? false)) {
        return $resultado;
    }
    if (strcasecmp($correoArquitecto, $correoGestor) === 0) {
        // Una misma dirección cumple ambos papeles sin recibir dos mensajes.
        $resultado['arquitecto'] = true;
        return $resultado;
    }

    // 2. Conservamos el contenido y los adjuntos; cambiamos solo el destinatario.
    try {
        if (!filter_var($correoArquitecto, FILTER_VALIDATE_EMAIL)) {
            throw new Exception('Correo de arquitecto no válido.');
        }
        $mail->clearAllRecipients();
        $mail->addAddress($correoArquitecto);
        if (!$mail->send()) {
            throw new Exception($mail->ErrorInfo);
        }
        $resultado['arquitecto'] = true;
        error_log($contexto . ' - SMTP aceptó arquitecto ' . $correoArquitecto . ' - ' . $mail->getLastMessageID());
    } catch (Throwable $error) {
        $resultado['arquitecto'] = false;
        $resultado['advertencia'] = 'El mensaje se ha enviado al gestor, pero no se ha podido enviar la copia al arquitecto.';
        error_log($contexto . ' - Falló copia al arquitecto ' . $correoArquitecto . ': ' . $error->getMessage());
    }
    return $resultado;
}

/**
 * Envia el aviso de una nueva respuesta de formulario.
 */
function enviarCorreoRespuestaFormulario(
    $conn,
    array $formulario,
    array $respuestas,
    $referencia
) {
    $municipio = obtenerDatosCorreoParticipacion(
        $conn,
        $formulario['cod_mun']
    );

    $mail = crearCorreoParticipacionPOU();

    $filas = '';

    foreach ($respuestas as $respuesta) {
        $valor = $respuesta['respuesta'] ?? '';

        if (is_array($valor)) {
            $valor = implode(', ', $valor);
        }

        if (trim((string)$valor) === '') {
            $valor = 'Sin respuesta';
        }

        $filas .= '<tr>'
            . '<th style="padding:10px;border:1px solid #dce3ec;text-align:left;vertical-align:top;background:#f5f8fc;">'
            . htmlspecialchars((string)($respuesta['pregunta'] ?? ''), ENT_QUOTES, 'UTF-8')
            . '</th>'
            . '<td style="padding:10px;border:1px solid #dce3ec;vertical-align:top;">'
            . nl2br(htmlspecialchars((string)$valor, ENT_QUOTES, 'UTF-8'))
            . '</td>'
            . '</tr>';
    }

    $nombreMunicipio = htmlspecialchars(
        (string)($municipio['nombre'] ?? $formulario['cod_mun']),
        ENT_QUOTES,
        'UTF-8'
    );
    $tituloFormulario = htmlspecialchars(
        (string)($formulario['titulo'] ?? 'Formulario POU'),
        ENT_QUOTES,
        'UTF-8'
    );
    $referenciaSegura = htmlspecialchars(
        (string)$referencia,
        ENT_QUOTES,
        'UTF-8'
    );

    $mail->isHTML(true);
    $mail->Subject = 'Nueva respuesta POU: ' . ($formulario['titulo'] ?? 'Formulario');
    $mail->Body = '
        <div style="font-family:Arial,sans-serif;color:#26364a;line-height:1.5;">
            <h2 style="margin:0 0 12px;color:#540000;">Nueva respuesta de participación</h2>
            <p style="margin:0 0 5px;"><strong>Municipio:</strong> ' . $nombreMunicipio . '</p>
            <p style="margin:0 0 5px;"><strong>Formulario:</strong> ' . $tituloFormulario . '</p>
            <p style="margin:0 0 18px;"><strong>Referencia:</strong> ' . $referenciaSegura . '</p>
            <table style="width:100%;border-collapse:collapse;font-size:14px;">' . $filas . '</table>
        </div>';
    $mail->AltBody = 'Nueva respuesta POU. Municipio: '
        . ($municipio['nombre'] ?? $formulario['cod_mun'])
        . '. Formulario: '
        . ($formulario['titulo'] ?? 'Formulario')
        . '. Referencia: '
        . $referencia;

    return enviarCorreoParticipacion($mail, $municipio);
}
