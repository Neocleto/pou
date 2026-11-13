<?php

require_once(__DIR__ . '/../../db/conexion.php');
require_once(__DIR__ . '/../../modelo/FaqModel.php');
require_once __DIR__ . '/permisos_municipio.php';

session_start();
header('Content-Type: application/json; charset=utf-8');

// 1. Comprobamos que el usuario sigue conectado.
if (!isset($_SESSION['usuario_id'])) {
    http_response_code(401);
    echo json_encode(['success' => false, 'message' => 'Sesión no válida.']);
    exit;
}

try {
    $faqModel = new FaqModel($conn);
    $accion = $_POST['action'] ?? $_GET['action'] ?? '';
    if ($accion !== 'listarPreguntasDisponibles') {
        comprobarPermisoMunicipio(new MunicipioModel($conn), $_POST['cod_mun'] ?? $_GET['cod_mun'] ?? '', $_SESSION['usuario_id'], $_SESSION['usuario_correo'] ?? '');
    }

    switch ($accion) {
        // 2. Guardamos la lista completa del paso 7.
        case 'guardarPreguntasAsignadas':
            $codMun = trim((string)($_POST['cod_mun'] ?? ''));
            $items = json_decode($_POST['items'] ?? '[]', true);

            if ($codMun === '' || !is_array($items)) {
                throw new Exception('Los datos de las preguntas no son válidos.');
            }

            $conn->beginTransaction();
            $faqModel->guardarPreguntasDelWizard($codMun, $items);
            $conn->commit();

            echo json_encode(['success' => true]);
            break;

        // 3. Biblioteca común de preguntas reutilizables.
        case 'listarPreguntasDisponibles':
            echo json_encode([
                'success' => true,
                'data' => $faqModel->obtenerTodasLasPreguntas()
            ]);
            break;

        // 4. Preguntas asignadas al municipio, incluidas las adaptadas.
        case 'listarPreguntasMunicipio':
            $codMun = trim((string)($_GET['cod_mun'] ?? ''));

            if ($codMun === '') {
                throw new Exception('Código de municipio requerido.');
            }

            echo json_encode([
                'success' => true,
                'data' => $faqModel->obtenerFaqsPorMunicipio($codMun)
            ]);
            break;

        // 5. Crea una pregunta exclusiva y la asigna al municipio.
        case 'crearYAsignarFaq':
        case 'crearExclusiva':
            $codMun = trim((string)($_POST['cod_mun'] ?? ''));
            $pregunta = trim((string)($_POST['pregunta'] ?? ''));
            $respuesta = trim((string)($_POST['respuesta'] ?? ''));

            if ($codMun === '' || $pregunta === '' || $respuesta === '') {
                throw new Exception('Todos los campos son obligatorios.');
            }

            $id = $faqModel->crearPreguntaExclusiva($codMun, $pregunta, $respuesta);
            echo json_encode(['success' => true, 'asignacion_id' => $id]);
            break;

        // 6. Asigna una pregunta de la biblioteca común.
        case 'asignarExistente':
            $codMun = trim((string)($_POST['cod_mun'] ?? ''));
            $preguntaId = (int)($_POST['pregunta_id'] ?? 0);

            if ($codMun === '' || $preguntaId <= 0) {
                throw new Exception('Parámetros requeridos.');
            }

            $id = $faqModel->asignarPreguntaAMunicipio($codMun, $preguntaId);
            echo json_encode(['success' => true, 'asignacion_id' => $id]);
            break;

        // 7. Adapta el texto sin modificar la biblioteca común.
        case 'personalizarMunicipio':
            $codMun = trim((string)($_POST['cod_mun'] ?? ''));
            $asignacionId = (int)($_POST['asignacion_id'] ?? 0);
            $pregunta = trim((string)($_POST['pregunta'] ?? ''));
            $respuesta = trim((string)($_POST['respuesta'] ?? ''));

            if ($codMun === '' || $asignacionId <= 0 || $pregunta === '' || $respuesta === '') {
                throw new Exception('Completa la pregunta y la respuesta.');
            }

            $faqModel->personalizarPreguntaMunicipio($codMun, $asignacionId, $pregunta, $respuesta);
            echo json_encode(['success' => true]);
            break;

        // 8. Recupera el texto original de la biblioteca.
        case 'restaurarBase':
            $codMun = trim((string)($_POST['cod_mun'] ?? ''));
            $asignacionId = (int)($_POST['asignacion_id'] ?? 0);

            if ($codMun === '' || $asignacionId <= 0) {
                throw new Exception('Parámetros requeridos.');
            }

            $faqModel->restaurarPreguntaBase($codMun, $asignacionId);
            echo json_encode(['success' => true]);
            break;

        // 9. Retira una asignación concreta del municipio.
        case 'eliminarAsignacion':
            $codMun = trim((string)($_POST['cod_mun'] ?? ''));
            $asignacionId = (int)($_POST['asignacion_id'] ?? 0);
            $preguntaId = (int)($_POST['pregunta_id'] ?? 0);

            if ($codMun === '') {
                throw new Exception('Código de municipio requerido.');
            }

            if ($asignacionId > 0) {
                $faqModel->eliminarAsignacion($codMun, $asignacionId);
            } elseif ($preguntaId > 0) {
                // Compatibilidad con versiones anteriores del configurador.
                $faqModel->eliminarPreguntaDeMunicipio($codMun, $preguntaId);
            } else {
                throw new Exception('No se ha indicado la pregunta que se debe retirar.');
            }

            echo json_encode(['success' => true]);
            break;

        // 10. Guarda el orden mediante ids de asignación.
        case 'reordenarPreguntas':
        case 'reordenar':
            $codMun = trim((string)($_POST['cod_mun'] ?? ''));
            $ids = json_decode($_POST['ids'] ?? '[]', true);

            if ($codMun === '' || !is_array($ids)) {
                throw new Exception('Parámetros inválidos.');
            }

            $conn->beginTransaction();
            $faqModel->reordenarPreguntas($codMun, $ids);
            $conn->commit();

            echo json_encode(['success' => true]);
            break;

        default:
            throw new Exception('Acción no válida.');
    }
} catch (Throwable $error) {
    if (isset($conn) && $conn->inTransaction()) {
        $conn->rollBack();
    }

    if (http_response_code() !== 403) http_response_code(400);
    echo json_encode([
        'success' => false,
        'message' => $error->getMessage()
    ]);
}
