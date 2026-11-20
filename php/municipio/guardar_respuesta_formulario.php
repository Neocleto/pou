<?php
// ============================================================================
// GUARDADO DE RESPUESTAS DE FORMULARIOS PÚBLICOS
// Valida el formulario publicado y registra una respuesta anónima.
// ============================================================================

require_once(__DIR__ . '/../db/conexion.php');
require_once(__DIR__ . '/../modelo/FormularioDinamicoModel.php');
require_once(__DIR__ . '/../modelo/MunicipioModel.php');
require_once(__DIR__ . '/CorreoParticipacion.php');

header('Content-Type: application/json; charset=utf-8');

try {
    // 1. Identificamos el formulario.
    $formularioId = filter_var($_POST['formulario_id'] ?? null, FILTER_VALIDATE_INT);
    $codMun = $_POST['cod_mun'] ?? '';
    if (!is_string($codMun)) {
        throw new Exception('El municipio recibido no es válido.');
    }
    $codMun = trim($codMun);

    if ($formularioId <= 0 || $codMun === '') {
        throw new Exception('El formulario recibido no es válido.');
    }

    // La página pública y el envío directo exigen un municipio publicado.
    $municipioModel = new MunicipioModel($conn);
    if (!$municipioModel->obtenerMunicipioActivosPorCodigo($codMun)) {
        throw new Exception('El municipio ya no está disponible para participar.');
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

            $valorNormalizado = normalizarRespuesta($pregunta, $valor);
            if (!empty($pregunta['obligatorio']) && respuestaVacia($valorNormalizado)) {
                throw new Exception(
                    'Debes completar la pregunta: ' . $pregunta['enunciado']
                );
            }

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
    $correoEnviado = false;
    $resultadoCorreo = ['gestor' => false, 'arquitecto' => null, 'advertencia' => ''];

    try {
        $resultadoCorreo = enviarCorreoRespuestaFormulario(
            $conn,
            $formulario,
            $respuestas,
            $referencia
        );
        $correoEnviado = $resultadoCorreo['gestor'];
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

    if ($resultadoCorreo['advertencia'] !== '') {
        $mensaje .= ' ' . $resultadoCorreo['advertencia'];
    }

    echo json_encode([
        'ok' => true,
        'mensaje' => $mensaje . ' Referencia: ' . $referencia,
        'correo_enviado' => $correoEnviado,
        'copia_arquitecto_enviada' => $resultadoCorreo['arquitecto'],
        'advertencia_correo' => $resultadoCorreo['advertencia']
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
        $hayRespuesta = false;
        foreach ($valor as $elemento) {
            if (!is_scalar($elemento) && $elemento !== null) {
                throw new Exception('La respuesta contiene valores no válidos.');
            }
            if (trim((string)$elemento) !== '') $hayRespuesta = true;
        }
        return !$hayRespuesta;
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
        if ($valor === null || $valor === '') return [];
        if (!is_array($valor)) {
            throw new Exception('La pregunta de selección múltiple debe contener una lista de opciones.');
        }
        // No descartamos opciones incorrectas: el usuario debe corregir el envío.
        foreach ($valor as $opcion) {
            if (!is_string($opcion) || !in_array($opcion, $opcionesValidas, true)) {
                throw new Exception('Se ha recibido una opción de respuesta no válida.');
            }
        }
        return array_values(array_unique($valor));
    }

    if ($valor !== null && !is_scalar($valor)) {
        throw new Exception('La pregunta debe contener una sola respuesta.');
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
