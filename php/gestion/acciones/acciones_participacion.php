<?php
// ===========================================================
// ACCIONES PARA PARTICIPACIÓN (POU)
// -----------------------------------------------------------
// Este archivo gestiona las acciones AJAX para:
// - Guardar y obtener datos de participación
// - Crear, listar y eliminar botones de participación
// ===========================================================

require_once(__DIR__ . '/../../db/conexion.php');
require_once(__DIR__ . '/../../modelo/ParticipacionModel.php');
require_once(__DIR__ . '/../../modelo/ParticipacionBotonesModel.php');
require_once __DIR__ . '/permisos_municipio.php';

session_start();
header('Content-Type: application/json');

// Verificar si existe sesion
if (!isset($_SESSION["usuario_id"])) {
    http_response_code(401);
    echo json_encode(["success" => false, "message" => "Sesión no válida"]);
    exit;
}

$usuario_id = $_SESSION['usuario_id'] ?? null;
if (!$usuario_id) {
    echo json_encode(['success' => false, 'message' => 'Usuario no autenticado.']);
    exit;
}

$accion = $_POST['action'] ?? $_GET['action'] ?? null;

/** Convierte los interruptores recibidos en booleanos seguros. */
function booleanoParticipacion($valor, $porDefecto = true)
{
    if ($valor === null) {
        return $porDefecto;
    }

    if (is_bool($valor)) {
        return $valor;
    }

    return in_array(strtolower(trim((string)$valor)), ['1', 't', 'true', 'yes', 'si', 'sí'], true);
}

try {
    $codPermiso = trim((string)($_POST['cod_mun'] ?? $_GET['cod_mun'] ?? ''));
    if (in_array($accion, ['actualizarBotonParticipacion', 'eliminarBotonParticipacion'], true)) {
        $registro = (new ParticipacionBotonesModel($conn))->obtenerBotonPorId($_POST['id'] ?? 0);
        if (!$registro) throw new Exception('El recurso de participación no existe.');
        if ($codPermiso !== '' && $codPermiso !== $registro['cod_mun']) {
            throw new Exception('El recurso no pertenece al municipio indicado.');
        }
        $codPermiso = $registro['cod_mun'];
    }
    comprobarPermisoMunicipio(new MunicipioModel($conn), $codPermiso, $usuario_id, $_SESSION['usuario_correo'] ?? '');

    if ($accion === 'guardarParticipacion') {
        $model = new ParticipacionModel($conn);
        $data = $_POST;
        $cod_mun = $data['cod_mun'] ?? null;

        if (!$cod_mun) {
            echo json_encode(['success' => false, 'message' => 'Falta el código de municipio']);
            exit;
        }

        $exito = $model->guardarParticipacion($data);
        echo json_encode(['success' => (bool)$exito]);
        exit;
    }

    if ($accion === 'obtenerParticipacion') {
        $model = new ParticipacionModel($conn);
        $cod_mun = $_GET['cod_mun'] ?? null;

        if (!$cod_mun) {
            echo json_encode(['success' => false, 'message' => 'Falta el código de municipio']);
            exit;
        }

        $participacion = $model->obtenerParticipacionPorMunicipio($cod_mun);
        echo json_encode(['success' => true, 'data' => $participacion]);
        exit;
    }

    if ($accion === 'guardarBotonParticipacion') {
        $model = new ParticipacionBotonesModel($conn);

        $cod_mun = $_POST['cod_mun'] ?? null;
        $texto_boton = $_POST['texto_boton'] ?? null;
        $archivo_url = $_POST['archivo_url'] ?? null;
        $icono = $_POST['icono'] ?? 'file-earmark-arrow-down';
        $color = $_POST['color'] ?? '#540000';
        $tipo_contenido = $_POST['tipo_contenido'] ?? 'pdf';
        $formulario_id = $_POST['formulario_id'] ?? null;
        $visible = booleanoParticipacion($_POST['visible'] ?? null, true);

        if (!$cod_mun || !$texto_boton) {
            echo json_encode(['success' => false, 'message' => 'Faltan datos.']);
            exit;
        }

        $exito = $model->crearBoton(
            $cod_mun,
            $texto_boton,
            $archivo_url,
            $icono,
            $color,
            $tipo_contenido,
            $formulario_id,
            $visible
        );
        echo json_encode(['success' => (bool)$exito]);
        exit;
    }

    if ($accion === 'actualizarBotonParticipacion') {
        $model = new ParticipacionBotonesModel($conn);

        $id = $_POST['id'] ?? null;
        $texto_boton = $_POST['texto_boton'] ?? null;
        $archivo_url = $_POST['archivo_url'] ?? null;
        $icono = $_POST['icono'] ?? 'file-earmark-arrow-down';
        $color = $_POST['color'] ?? '#540000';
        $tipo_contenido = $_POST['tipo_contenido'] ?? 'pdf';
        $formulario_id = $_POST['formulario_id'] ?? null;
        $cod_mun = $_POST['cod_mun'] ?? null;
        $visible = booleanoParticipacion($_POST['visible'] ?? null, true);

        if (!$id || !$texto_boton) {
            echo json_encode(['success' => false, 'message' => 'Faltan datos.']);
            exit;
        }

        $exito = $model->actualizarBoton(
            $id,
            $texto_boton,
            $archivo_url,
            $icono,
            $color,
            $tipo_contenido,
            $formulario_id,
            $cod_mun,
            $visible
        );
        echo json_encode(['success' => (bool)$exito]);
        exit;
    }

    if ($accion === 'listarBotonesParticipacion') {
        $model = new ParticipacionBotonesModel($conn);
        $cod_mun = $_GET['cod_mun'] ?? null;

        if (!$cod_mun) {
            echo json_encode(['success' => false, 'message' => 'Falta el código de municipio']);
            exit;
        }

        $botones = $model->listarBotonesPorMunicipio($cod_mun);
        echo json_encode(['success' => true, 'data' => $botones]);
        exit;
    }

    if ($accion === 'eliminarBotonParticipacion') {
        $id = $_POST['id'] ?? null;

        if ($id) {
            $model = new ParticipacionBotonesModel($conn);
            $model->eliminarBoton($id);
            echo json_encode(['success' => true]);
        } else {
            echo json_encode(['success' => false, 'message' => 'Datos incompletos para eliminar']);
        }
        exit;
    }

    echo json_encode(['success' => false, 'message' => 'Acción no reconocida.']);
} catch (Exception $e) {
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}
