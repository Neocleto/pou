<?php
// ============================================================================
// ACCIONES DE FORMULARIOS DINÁMICOS
//
// Gestiona:
// - Listado y carga de formularios.
// - Guardado del diseñador.
// - Orden y eliminación segura.
// - Consulta de respuestas.
// ============================================================================

require_once(__DIR__ . '/../../db/conexion.php');
require_once(__DIR__ . '/../../modelo/FormularioDinamicoModel.php');
require_once(__DIR__ . '/../../modelo/MunicipioModel.php');

if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Pragma: no-cache');

// 1. Comprobamos la sesión.
if (empty($_SESSION['usuario_id'])) {
    responderFormularioError('La sesión ha caducado.', 401);
}

$formularioModel = new FormularioDinamicoModel($conn);
$municipioModel = new MunicipioModel($conn);

$accion = $_REQUEST['accion'] ?? 'listar';
$codMun = trim($_REQUEST['cod_mun'] ?? '');
$usuarioId = $_SESSION['usuario_id'];
$correoUsuario = $_SESSION['usuario_correo'] ?? '';

try {
    // 2. Validamos el municipio y sus permisos.
    if ($codMun === '') {
        throw new Exception('No se ha indicado el municipio.');
    }

    $puedeGestionar = $municipioModel->usuarioPuedeGestionarMunicipio(
        $codMun,
        $usuarioId,
        $correoUsuario
    );

    if (!$puedeGestionar) {
        throw new Exception(
            'No tienes permiso para gestionar los formularios de este municipio.'
        );
    }

    // 3. Devolvemos el listado del municipio.
    if ($accion === 'listar') {
        responderFormularioOk([
            'cod_mun' => $codMun,
            'formularios' => $formularioModel->listarPorMunicipio($codMun)
        ]);
    }

    // 4. Cargamos un formulario completo.
    if ($accion === 'obtener') {
        $formularioId = (int)($_GET['id'] ?? 0);
        $formulario = $formularioModel->obtenerCompleto($formularioId, $codMun);

        if (!$formulario) {
            throw new Exception('El formulario solicitado no existe.');
        }

        responderFormularioOk([
            'formulario' => $formulario
        ]);
    }

    // 5. Guardamos el formulario dentro de una transacción.
    if ($accion === 'guardar') {
        $datos = json_decode(file_get_contents('php://input'), true);

        if (!is_array($datos)) {
            throw new Exception('Los datos recibidos no son válidos.');
        }

        $conn->beginTransaction();

        $formularioId = $formularioModel->guardarCompleto(
            $codMun,
            $datos
        );

        $conn->commit();

        responderFormularioOk([
            'id' => $formularioId,
            'mensaje' => 'Formulario guardado correctamente.'
        ]);
    }

    // 6. Guardamos el orden elegido en el listado.
    if ($accion === 'ordenar') {
        $datos = json_decode(file_get_contents('php://input'), true);
        $formularios = $datos['formularios'] ?? [];

        if (!is_array($formularios)) {
            throw new Exception('El orden recibido no es válido.');
        }

        $conn->beginTransaction();
        $formularioModel->guardarOrden($codMun, $formularios);
        $conn->commit();

        responderFormularioOk([
            'mensaje' => 'Orden actualizado correctamente.'
        ]);
    }

    // 7. Eliminamos o archivamos para conservar respuestas existentes.
    if ($accion === 'eliminar') {
        $formularioId = (int)($_POST['id'] ?? 0);

        $conn->beginTransaction();
        $resultado = $formularioModel->eliminarOArchivar($formularioId, $codMun);
        $conn->commit();

        $mensaje = $resultado['accion'] === 'archivado'
            ? 'El formulario tenía respuestas y se ha archivado para conservarlas.'
            : 'Formulario eliminado correctamente.';

        responderFormularioOk([
            'accion' => $resultado['accion'],
            'total_respuestas' => $resultado['total_respuestas'],
            'mensaje' => $mensaje
        ]);
    }

    // 8. Consultamos las respuestas recibidas.
    if ($accion === 'respuestas') {
        $formularioId = (int)($_GET['id'] ?? 0);
        $formulario = $formularioModel->obtenerCompleto($formularioId, $codMun);

        if (!$formulario) {
            throw new Exception('El formulario solicitado no existe.');
        }

        $respuestas = $formularioModel->listarRespuestas(
            $formularioId,
            $codMun
        );

        foreach ($respuestas as &$respuesta) {
            $respuesta['respuestas'] = json_decode(
                $respuesta['respuestas'] ?? '[]',
                true
            ) ?: [];

            $respuesta['enviado_en_formateado'] = !empty($respuesta['enviado_en'])
                ? date('d/m/Y H:i', strtotime($respuesta['enviado_en']))
                : '';
        }
        unset($respuesta);

        responderFormularioOk([
            'titulo' => $formulario['titulo'],
            'respuestas' => $respuestas
        ]);
    }

    throw new Exception('La acción solicitada no está disponible.');
} catch (Throwable $error) {
    if ($conn->inTransaction()) {
        $conn->rollBack();
    }

    responderFormularioError($error->getMessage());
}

/**
 * Devuelve una respuesta JSON correcta y detiene la ejecución.
 */
function responderFormularioOk(array $datos = [])
{
    echo json_encode(
        array_merge(['ok' => true], $datos),
        JSON_UNESCAPED_UNICODE
    );

    exit;
}

/**
 * Devuelve un error JSON y detiene la ejecución.
 */
function responderFormularioError($mensaje, $codigoHttp = 400)
{
    http_response_code($codigoHttp);

    echo json_encode([
        'ok' => false,
        'mensaje' => $mensaje
    ], JSON_UNESCAPED_UNICODE);

    exit;
}
