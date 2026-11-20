<?php
// ============================================================================
// GUARDADO DE RESPUESTAS DE FORMULARIOS PÚBLICOS
// Valida el formulario publicado y registra una respuesta anónima.
// ============================================================================

require_once(__DIR__ . '/../db/conexion.php');
require_once(__DIR__ . '/../modelo/FormularioDinamicoModel.php');
require_once(__DIR__ . '/../modelo/MunicipioModel.php');
require_once(__DIR__ . '/CorreoParticipacion.php');
require_once(__DIR__ . '/JustificanteEncuesta.php');

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');

try {
    // 1. Identificamos el formulario.
    $formularioId = filter_var($_POST['formulario_id'] ?? null, FILTER_VALIDATE_INT);
    $codMun = $_POST['cod_mun'] ?? '';
    if (!is_string($codMun)) {
        throw new InvalidArgumentException('El municipio recibido no es válido.');
    }
    $codMun = trim($codMun);

    if ($formularioId <= 0 || $codMun === '') {
        throw new InvalidArgumentException('El formulario recibido no es válido.');
    }

    // La página pública y el envío directo exigen un municipio publicado.
    $municipioModel = new MunicipioModel($conn);
    $municipio = $municipioModel->obtenerMunicipioActivosPorCodigo($codMun);
    if (!$municipio) {
        throw new InvalidArgumentException('El municipio ya no está disponible para participar.');
    }

    $formularioModel = new FormularioDinamicoModel($conn);
    $formulario = $formularioModel->obtenerCompleto($formularioId, $codMun);

    if (!$formulario || empty($formulario['activo'])) {
        throw new InvalidArgumentException('El formulario ya no está disponible.');
    }

    if (!in_array($formulario['modalidad'], ['online', 'ambos'], true)) {
        throw new InvalidArgumentException('Este formulario no admite respuestas online.');
    }

    // Si se editó la encuesta, conservamos lo escrito en la página original.
    $version = $_POST['version_formulario'] ?? null;
    if ($version !== null && $version !== ($formulario['actualizado_en'] ?? '')) {
        throw new InvalidArgumentException('La encuesta se ha actualizado. Abre la versión nueva para contestar.');
    }

    // 2. Validamos todas las preguntas configuradas.
    $respuestas = [];

    foreach ($formulario['secciones'] as $seccion) {
        foreach ($seccion['preguntas'] as $pregunta) {
            $nombreCampo = 'p_' . $pregunta['id'];
            $valor = $_POST[$nombreCampo] ?? null;

            $valorNormalizado = normalizarRespuesta($pregunta, $valor);
            if (!empty($pregunta['obligatorio']) && respuestaVacia($valorNormalizado)) {
                throw new InvalidArgumentException(
                    'Debes completar la pregunta: ' . $pregunta['enunciado']
                );
            }

            $respuestas[] = [
                'apartado_id' => (int)$seccion['id'],
                'apartado' => $seccion['titulo'],
                'pregunta_id' => (int)$pregunta['id'],
                'pregunta' => $pregunta['enunciado'],
                'respuesta' => $valorNormalizado
            ];
        }
    }

    // 3. Preparamos el justificante antes de confirmar el registro. Si falla
    // el PDF, deshacemos el guardado y el navegador conserva lo introducido.
    $conn->beginTransaction();
    $referencia = $formularioModel->guardarRespuesta(
        $formulario, $respuestas, $_SERVER['REMOTE_ADDR'] ?? ''
    );
    $pdf = crearJustificanteEncuesta($formulario, $municipio, $respuestas, $referencia);
    $conn->commit();

    // 4. El correo usa la configuración del municipio. Si SMTP falla, la
    // respuesta y su justificante siguen disponibles: no pedimos repetirla.
    $correoEnviado = false;
    $avisoCorreo = '';
    try {
        $resultadoCorreo = enviarCorreoRespuestaFormulario($municipio, $formulario, $referencia, $pdf);
        $correoEnviado = $resultadoCorreo['gestor'];
        $avisoCorreo = $resultadoCorreo['advertencia'];
    } catch (Throwable $error) {
        $avisoCorreo = 'La respuesta está registrada. No se ha podido enviar el aviso por correo.';
        error_log('Encuesta ' . $referencia . ': ' . $error->getMessage());
    }

    // La pantalla ya muestra el título de agradecimiento por encima del mensaje.
    $mensaje = trim($formulario['mensaje_confirmacion'] ?? '');
    $mensaje = preg_replace('/^Gracias por participar[.!]\s*/iu', '', $mensaje);

    echo json_encode([
        'ok' => true,
        'mensaje' => $mensaje ?: 'Tu respuesta se ha registrado correctamente.',
        'referencia' => $referencia,
        'pdf_base64' => base64_encode($pdf),
        'correo_enviado' => $correoEnviado,
        'advertencia_correo' => $avisoCorreo
    ], JSON_INVALID_UTF8_SUBSTITUTE);
} catch (Throwable $error) {
    if ($conn->inTransaction()) {
        $conn->rollBack();
    }

    $errorDeValidacion = $error instanceof InvalidArgumentException;
    if (!$errorDeValidacion) {
        error_log('No se pudo registrar la encuesta: ' . $error->getMessage());
    }
    http_response_code($errorDeValidacion ? 400 : 500);
    echo json_encode([
        'ok' => false,
        'mensaje' => $errorDeValidacion
            ? $error->getMessage()
            : 'No se ha podido registrar la respuesta. Inténtalo de nuevo en unos instantes.'
    ], JSON_INVALID_UTF8_SUBSTITUTE);
}

/**
 * Comprueba si una respuesta está vacía.
 */
function respuestaVacia($valor)
{
    if (is_array($valor)) {
        return count($valor) === 0;
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
            throw new InvalidArgumentException('La pregunta de selección múltiple debe contener una lista de opciones.');
        }
        // No descartamos opciones incorrectas: el usuario debe corregir el envío.
        foreach ($valor as $opcion) {
            if (!is_string($opcion) || !in_array($opcion, $opcionesValidas, true)) {
                throw new InvalidArgumentException('Se ha recibido una opción de respuesta no válida.');
            }
        }
        return array_values(array_unique($valor));
    }

    if ($valor !== null && !is_scalar($valor)) {
        throw new InvalidArgumentException('La pregunta debe contener una sola respuesta.');
    }

    if (in_array($tipo, ['opcion_unica', 'desplegable'], true)) {
        if ($valor === null || $valor === '') {
            return '';
        }

        if (!in_array($valor, $opcionesValidas, true)) {
            throw new InvalidArgumentException('Se ha recibido una opción de respuesta no válida.');
        }

        return $valor;
    }

    if ($tipo === 'si_no') {
        if ($valor !== null && $valor !== '' && !in_array($valor, ['Sí', 'No'], true)) {
            throw new InvalidArgumentException('Se ha recibido una respuesta Sí/No no válida.');
        }

        return $valor;
    }

    if ($tipo === 'numero') {
        if ($valor === null || $valor === '') {
            return '';
        }

        if (!is_numeric($valor)) {
            throw new InvalidArgumentException('Se ha recibido un valor numérico no válido.');
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
            throw new InvalidArgumentException('Se ha recibido una fecha no válida.');
        }

        return $valor;
    }

    return trim((string)($valor ?? ''));
}
