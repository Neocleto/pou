<?php
// ============================================================================
// GUARDADO DE RESPUESTAS DE FORMULARIOS PÚBLICOS
// Valida el formulario publicado y registra una respuesta anónima.
// ============================================================================

require_once(__DIR__ . '/../db/conexion.php');
require_once(__DIR__ . '/../modelo/FormularioDinamicoModel.php');
require_once(__DIR__ . '/CorreoParticipacion.php');

header('Content-Type: application/json; charset=utf-8');

try {
    // 1. Identificamos el formulario.
    $formularioId = (int)($_POST['formulario_id'] ?? 0);
    $codMun = trim($_POST['cod_mun'] ?? '');

    if ($formularioId <= 0 || $codMun === '') {
        throw new Exception('El formulario recibido no es válido.');
    }

    $formularioModel = new FormularioDinamicoModel($conn);
    $formulario = $formularioModel->obtenerCompleto($formularioId, $codMun);

    if (!$formulario || empty($formulario['activo'])) {
        throw new Exception('El formulario ya no está disponible.');
    }

    if (!in_array($formulario['modalidad'], ['online', 'ambos'], true)) {
        throw new Exception('Este formulario no admite respuestas online.');
    }

    // 2. Validamos todas las preguntas configuradas.
    $respuestas = [];

    foreach ($formulario['secciones'] as $seccion) {
        foreach ($seccion['preguntas'] as $pregunta) {
            $nombreCampo = 'p_' . $pregunta['id'];
            $valor = $_POST[$nombreCampo] ?? null;

            if (!empty($pregunta['obligatorio']) && respuestaVacia($valor)) {
                throw new Exception(
                    'Debes completar la pregunta: ' . $pregunta['enunciado']
                );
            }

            $valorNormalizado = normalizarRespuesta($pregunta, $valor);

            $respuestas[] = [
                'pregunta_id' => (int)$pregunta['id'],
                'pregunta' => $pregunta['enunciado'],
                'respuesta' => $valorNormalizado
            ];
        }
    }

    // 3. Guardamos la respuesta y devolvemos su referencia.
    $referencia = $formularioModel->guardarRespuesta(
        $formulario,
        $respuestas,
        $_SERVER['REMOTE_ADDR'] ?? ''
    );

    // 4. Avisamos al gestor y, si está configurado, también al arquitecto.
    //    La respuesta ya está guardada. Si el correo falla, no se pierde.
    $correoEnviado = true;

    try {
        enviarCorreoRespuestaFormulario(
            $conn,
            $formulario,
            $respuestas,
            $referencia
        );
    } catch (Throwable $errorCorreo) {
        $correoEnviado = false;
        error_log(
            'POU - No se pudo enviar la respuesta ' . $referencia
            . ': ' . $errorCorreo->getMessage()
        );
    }

    $mensaje = trim($formulario['mensaje_confirmacion'] ?? '');

    if ($mensaje === '') {
        $mensaje = 'Gracias por participar. Tu respuesta se ha registrado correctamente.';
    }

    if (!$correoEnviado) {
        $mensaje .= ' La respuesta se ha guardado, aunque el aviso por correo no se ha podido enviar.';
    }

    echo json_encode([
        'ok' => true,
        'mensaje' => $mensaje . ' Referencia: ' . $referencia,
        'correo_enviado' => $correoEnviado
    ]);
} catch (Throwable $error) {
    http_response_code(400);
    echo json_encode([
        'ok' => false,
        'mensaje' => $error->getMessage()
    ]);
}

/**
 * Comprueba si una respuesta está vacía.
 */
function respuestaVacia($valor)
{
    if (is_array($valor)) {
        return count(array_filter($valor, 'strlen')) === 0;
    }

    return $valor === null || trim((string)$valor) === '';
}

/**
 * Normaliza el valor según el tipo de pregunta.
 */
function normalizarRespuesta(array $pregunta, $valor)
{
    $tipo = $pregunta['tipo'] ?? 'texto';
    $opcionesValidas = $pregunta['opciones'] ?? [];

    if ($tipo === 'opcion_multiple') {
        $valores = is_array($valor) ? $valor : [];

        return array_values(array_filter($valores, function ($opcion) use ($opcionesValidas) {
            return in_array($opcion, $opcionesValidas, true);
        }));
    }

    if (in_array($tipo, ['opcion_unica', 'desplegable'], true)) {
        if ($valor === null || $valor === '') {
            return '';
        }

        if (!in_array($valor, $opcionesValidas, true)) {
            throw new Exception('Se ha recibido una opción de respuesta no válida.');
        }

        return $valor;
    }

    if ($tipo === 'si_no') {
        if ($valor !== null && $valor !== '' && !in_array($valor, ['Sí', 'No'], true)) {
            throw new Exception('Se ha recibido una respuesta Sí/No no válida.');
        }

        return $valor;
    }

    if ($tipo === 'numero') {
        if ($valor === null || $valor === '') {
            return '';
        }

        if (!is_numeric($valor)) {
            throw new Exception('Se ha recibido un valor numérico no válido.');
        }

        return $valor;
    }

    if ($tipo === 'fecha') {
        if ($valor === null || $valor === '') {
            return '';
        }

        $fecha = DateTime::createFromFormat('Y-m-d', (string)$valor);
        $esFechaValida = $fecha && $fecha->format('Y-m-d') === $valor;

        if (!$esFechaValida) {
            throw new Exception('Se ha recibido una fecha no válida.');
        }

        return $valor;
    }

    return trim((string)($valor ?? ''));
}
