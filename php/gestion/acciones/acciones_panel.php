<?php
// Acceso de gestión: convenio vigente y proyecto correcto.
require_once __DIR__ . '/../../login/permisos_proyecto.php';
$accionAcceso = $_POST['action'] ?? $_GET['action'] ?? '';
$soloLectura = in_array($accionAcceso, ['listarMunicipiosINE', 'buscarPoliticaPrivacidad', 'listarMunicipios', 'obtenerMunicipio', 'obtenerInformacion', 'obtenerFaseActual', 'listarFases', 'listarSubfases', 'obtenerParticipacion'], true);
exigirAccesoProyecto(!$soloLectura);

// ===========================================================
// ACCIONES GENERALES DEL PANEL DE GESTIÓN DE MUNICIPIOS (POU)
// Archivo: acciones_panel.php
// Descripción: gestiona las acciones centrales (listar, crear,
// editar y eliminar municipios, obtener fases e info adicional)
// ===========================================================

// 1. SESIÓN Y PARÁMETROS
// -----------------------------------------------------------

header('Content-Type: application/json; charset=utf-8');

$usuario_id = $_SESSION['usuario_id'] ?? null;
$usuario_correo = $_SESSION['usuario_correo'] ?? '';

$modo = $_POST['modo'] ?? $_GET['modo'] ?? null;
$accion = $_POST['action'] ?? $_GET['action'] ?? null;

// 2. BUSCAR POLÍTICA: EL ACCESO YA SE HA COMPROBADO ANTES
// -----------------------------------------------------------
if ($accion === 'buscarPoliticaPrivacidad') {
    $nombreMunicipio = $_POST['municipio'] ?? $_GET['municipio'] ?? '';
    if (!is_string($nombreMunicipio) || trim($nombreMunicipio) === '' || mb_strlen($nombreMunicipio) > 150) {
        echo json_encode(['success' => false, 'message' => 'Selecciona un municipio válido.']);
        exit;
    }

    // Liberar la sesión permite seguir usando el panel durante la búsqueda.
    session_write_close();
    require_once __DIR__ . '/helpers_politica.php';
    try {
        $resultado = buscarPoliticaPrivacidad(trim($nombreMunicipio));
        echo json_encode($resultado);
    } catch (Throwable $error) {
        error_log('Error al buscar política de privacidad: ' . $error->getMessage());
        echo json_encode(['success' => false, 'message' => 'No se pudo completar la búsqueda. Puedes escribir la URL manualmente.']);
    }
    exit;
}

// 3. RESTO DE ACCIONES: MODELOS Y CONEXIÓN A POSTGRESQL
// -----------------------------------------------------------
require_once __DIR__ . '/permisos_municipio.php';
require_once __DIR__ . '/../../db/conexion.php';
require_once __DIR__ . '/../../controlador/PanelGestionController.php';
require_once __DIR__ . '/../../modelo/MunicipioModel.php';
require_once __DIR__ . '/../../modelo/ConfiguracionVisualModel.php';
$controller = new PanelGestionController($conn);
$municipioModel = new MunicipioModel($conn);

/**
 * Genera el diseño general y el índice común cuando el usuario aplica la plantilla.
 * No crea botones, documentos ni noticias porque son propios de cada municipio.
 */
function aplicarPlantillaPortalInicial($conn, $codMun, $modo = 'sobrescribir')
{
    $modelo = new ConfiguracionVisualModel($conn);
    $soloVacios = $modo === 'soloVacios';

    // 1. En modo "rellenar vacíos" conservamos un diseño ya guardado.
    $stmtConfig = $conn->prepare(
        "SELECT COUNT(*) FROM pou.configuracion_visual WHERE cod_mun = :cod_mun"
    );
    $stmtConfig->execute([':cod_mun' => $codMun]);
    $tieneConfiguracion = (int)$stmtConfig->fetchColumn() > 0;

    if (!$soloVacios || !$tieneConfiguracion) {
        $modelo->guardar(obtenerConfiguracionInicialPortal($codMun));
    }

    // 2. Los accesos se crean si faltan o se sustituyen al sobrescribir.
    $stmtAccesos = $conn->prepare(
        "SELECT COUNT(*) FROM pou.accesos_publicos WHERE cod_mun = :cod_mun"
    );
    $stmtAccesos->execute([':cod_mun' => $codMun]);
    $tieneAccesos = (int)$stmtAccesos->fetchColumn() > 0;

    if (!$soloVacios || !$tieneAccesos) {
        $modelo->guardarAccesos($codMun, obtenerAccesosInicialesPortal());
    }
}

try {
    // ==============================================
    // LISTAR MUNICIPIOS BASE (div_adm.municipios_new)
    // ==============================================
    if ($accion === 'listarMunicipiosINE') {
        $stmt = $conn->prepare("SELECT codigo, nombre FROM div_adm.municipios_new ORDER BY nombre ASC");
        $stmt->execute();
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
        echo json_encode(['success' => true, 'data' => $rows]);
        exit;
    }

    // ==============================================
    // LISTAR MUNICIPIOS CREADOS POR EL USUARIO
    // ==============================================
    if ($accion === 'listarMunicipios') {
        $municipios = $controller->obtenerMunicipiosUsuario($usuario_id, $usuario_correo);
        echo json_encode(["success" => true, "data" => $municipios]);
        exit;
    }

    // ==============================================
    // OBTENER UN MUNICIPIO CONCRETO
    // ==============================================
    if ($accion === 'obtenerMunicipio') {
        $cod_mun = $_GET['cod_mun'] ?? null;
        if (!$cod_mun) throw new Exception("Falta el código de municipio.");

        comprobarPermisoMunicipio(
            $municipioModel,
            $cod_mun,
            $usuario_id,
            $usuario_correo
        );

        $municipio = $controller->obtenerMunicipioPorCodigo($cod_mun);
        if (!$municipio) throw new Exception("Municipio no encontrado.");

        echo json_encode(['success' => true, 'data' => $municipio]);
        exit;
    }

    // ==============================================
    // OBTENER INFORMACIÓN ADICIONAL DEL MUNICIPIO
    // ==============================================
    if ($accion === 'obtenerInformacion') {
        $cod_mun = $_GET['cod_mun'] ?? null;
        if (!$cod_mun) throw new Exception("Falta el código de municipio.");

        comprobarPermisoMunicipio(
            $municipioModel,
            $cod_mun,
            $usuario_id,
            $usuario_correo
        );

        $info = $controller->obtenerInformacionPorMunicipio($cod_mun);
        echo json_encode(['success' => true, 'data' => $info]);
        exit;
    }

    // ==============================================
    // OBTENER FASE ACTUAL DEL MUNICIPIO
    // ==============================================
    if ($accion === 'obtenerFaseActual') {
        $cod_mun = $_GET['cod_mun'] ?? null;
        if (!$cod_mun) throw new Exception("Falta el código de municipio.");

        comprobarPermisoMunicipio(
            $municipioModel,
            $cod_mun,
            $usuario_id,
            $usuario_correo
        );

        $fase = $controller->obtenerFaseActualPorMunicipio($cod_mun);
        echo json_encode(['success' => true, 'data' => $fase]);
        exit;
    }

    // ==============================================
    // LISTAR FASES PADRE (pou.fases) -- para selector principal
    // ==============================================
    if ($accion === 'listarFases') {
        require_once(__DIR__ . '/../../modelo/FasesModel.php');
        $model = new FasesModel($conn);
        $fases = $model->listarFases();

        echo json_encode(['success' => true, 'data' => $fases]);
        exit;
    }

    // ==============================================
    // LISTAR SUBFASES --Esto permite que el selector hijo se rellene dinámicamente al cambiar el padre
    // ==============================================
    if ($accion === 'listarSubfases') {
        // ACEPTAMOS num_fase o num_fase_padre para evitar líos en frontend
        $num = $_GET['num_fase'] ?? $_POST['num_fase'] ?? $_GET['num_fase_padre'] ?? $_POST['num_fase_padre'] ?? null;
        if (!$num) throw new Exception("Falta num_fase.");

        require_once(__DIR__ . '/../../modelo/FasesModel.php');
        $model = new FasesModel($conn);
        $subfases = $model->listarSubfasesPorFase((int)$num);

        echo json_encode(['success' => true, 'data' => $subfases]);
        exit;
    }

    // ==============================================
    // OBTENER PARTICIPACION DEL MUNICIPIO
    // ==============================================
    if ($accion === 'obtenerParticipacion') {
        $cod_mun = $_GET['cod_mun'] ?? null;
        if (!$cod_mun) {
            echo json_encode(['success' => false, 'message' => 'Falta el código de municipio']);
            exit;
        }

        comprobarPermisoMunicipio(
            $municipioModel,
            $cod_mun,
            $usuario_id,
            $usuario_correo
        );

        $participacion = $controller->obtenerParticipacionPorMunicipio($cod_mun);
        echo json_encode(['success' => true, 'data' => $participacion]);
        exit;
    }

    // ==============================================
    // CREAR MUNICIPIO COMPLETO (TODOS LOS PASOS)
    // ==============================================
    if ($modo === 'crear') {
        $datos = [];
        for ($i = 1; $i <= 7; $i++) {
            $key = "paso$i";
            $datos[$key] = isset($_POST[$key]) ? json_decode($_POST[$key], true) : [];
        }

        if (!isset($datos['paso1']) || !is_array($datos['paso1'])) {
            throw new Exception("Error: paso1 no es un array válido.");
        }

        $datos['paso1']['usuario_id'] = $usuario_id;
        $resultado = $controller->crearMunicipioCompleto($datos);

        if ($resultado === true) {
            if (!empty($_POST['aplicar_plantilla_portal'])) {
                aplicarPlantillaPortalInicial($conn, $datos['paso1']['cod_mun'], $_POST['plantilla_portal_modo'] ?? 'sobrescribir');
            }
            echo json_encode(['success' => true, 'message' => 'Municipio creado con éxito']);
        } else {
            echo json_encode(['success' => false, 'message' => $resultado]);
        }
        exit;
    }

    // ==============================================
    // EDITAR MUNICIPIO (SOLO LOS PASOS MODIFICADOS)
    // ==============================================
    if ($modo === 'editar') {
        $cod_mun = $_POST['cod_mun'] ?? null;
        if (!$cod_mun) throw new Exception("Falta el código de municipio.");

        comprobarPermisoMunicipio(
            $municipioModel,
            $cod_mun,
            $usuario_id,
            $usuario_correo
        );

        $pasosModificados = [];
        $datos = [];

        for ($i = 1; $i <= 7; $i++) {
            $key = "paso$i";
            if (isset($_POST[$key])) {
                $pasosModificados[] = $i;
                $decoded = json_decode($_POST[$key], true);
                if (!is_array($decoded)) throw new Exception("Error al decodificar datos de paso $i.");
                $datos[$key] = $decoded;
            }
        }

        if (empty($pasosModificados)) {
            echo json_encode(['success' => false, 'message' => 'No hay pasos modificados.']);
            exit;
        }

        $exito = $controller->editarMunicipio($pasosModificados, $datos, $cod_mun);

        if ($exito && !empty($_POST['aplicar_plantilla_portal'])) {
            aplicarPlantillaPortalInicial($conn, $cod_mun, $_POST['plantilla_portal_modo'] ?? 'sobrescribir');
        }

        echo json_encode([
            'success' => $exito,
            'message' => $exito ? 'Municipio actualizado correctamente' : 'Error al actualizar municipio'
        ]);
        exit;
    }

    // ==============================================
    // ELIMINAR MUNICIPIO (BAJA LÓGICA)
    // ==============================================
    if ($modo === 'eliminar') {
        $cod_mun = $_POST['cod_mun'] ?? null;
        if (!$cod_mun) throw new Exception("Falta el código de municipio.");

        comprobarPermisoMunicipio(
            $municipioModel,
            $cod_mun,
            $usuario_id,
            $usuario_correo
        );

        $exito = $controller->eliminarMunicipio($cod_mun);

        echo json_encode(['success' => $exito]);
        exit;
    }

    // ==============================================
    // DESACTIVAR MUNICIPIO (ACTIVO = FALSE)
    // ==============================================
    if ($modo === 'desactivar') {
        $cod_mun = $_POST['cod_mun'] ?? null;
        if (!$cod_mun) throw new Exception("Falta el código de municipio.");

        comprobarPermisoMunicipio(
            $municipioModel,
            $cod_mun,
            $usuario_id,
            $usuario_correo
        );

        $exito = $controller->desactivarMunicipio($cod_mun);

        echo json_encode([
            'success' => $exito,
            'message' => $exito ? 'Municipio desactivado correctamente' : 'Error al desactivar municipio'
        ]);
        exit;
    }

    // ==============================================
    // VALIDAR QUE EL MUNICIPIO ESTÁ COMPLETO (para publicar)
    // ==============================================
    if ($modo === 'validar_publicacion') {
        $cod_mun = $_POST['cod_mun'] ?? null;
        if (!$cod_mun) throw new Exception("Falta el código de municipio.");

        comprobarPermisoMunicipio(
            $municipioModel,
            $cod_mun,
            $usuario_id,
            $usuario_correo
        );

        $resultado = $controller->validarMunicipioCompleto($cod_mun);

        echo json_encode([
            'success'         => true,
            'completo'        => $resultado['completo'],
            'pasosIncompletos'=> $resultado['pasosIncompletos'],
        ]);
        exit;
    }

    // ==============================================
    // PUBLICAR MUNICIPIO (ACTIVO = TRUE) CON VALIDACIÓN
    // ==============================================
    if ($modo === 'publicar') {
        $cod_mun = $_POST['cod_mun'] ?? null;
        if (!$cod_mun) throw new Exception("Falta el código de municipio.");

        comprobarPermisoMunicipio(
            $municipioModel,
            $cod_mun,
            $usuario_id,
            $usuario_correo
        );

        // 1) Validar que todos los pasos del wizard estén completos
        $validacion = $controller->validarMunicipioCompleto($cod_mun);

        if (!$validacion['completo']) {
            echo json_encode([
                'success' => false,
                'code'    => 'VALIDACION_INCOMPLETA',
                'message' => 'No se puede publicar el municipio porque hay pasos del wizard incompletos.',
                'pasosIncompletos' => $validacion['pasosIncompletos']
            ]);
            exit;
        }

        // 2) Si está todo OK, publicamos
        $exito = $controller->publicarMunicipio($cod_mun);

        echo json_encode([
            'success' => $exito,
            'message' => $exito
                ? 'Municipio publicado correctamente'
                : 'Error al publicar municipio'
        ]);
        exit;
    }

    // ==============================================
    // ACCIÓN/MODO NO RECONOCIDO
    // ==============================================
    echo json_encode(['success' => false, 'message' => 'Acción o modo no válido.']);
} catch (Exception $e) {
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}
