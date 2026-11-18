<?php
// Acceso de gestión: convenio vigente y proyecto correcto.
require_once __DIR__ . '/../../login/permisos_proyecto.php';
$accionAcceso = $_POST['action'] ?? $_GET['action'] ?? '';
$soloLectura = in_array($accionAcceso, ['listarDocumentos', 'listarCategorias', 'listarFasesDocumentos'], true);
exigirAccesoProyecto(!$soloLectura);

// ===========================================================
// ACCIONES PARA DOCUMENTOS (POU)
// -----------------------------------------------------------
// Este archivo gestiona las acciones AJAX para:
// - Guardar, listar, actualizar y eliminar documentos
// - Listar y crear categorías de documentos
// ===========================================================

require_once(__DIR__ . '/../../db/conexion.php');
require_once(__DIR__ . '/../../modelo/DocumentosModel.php');
require_once(__DIR__ . '/../../modelo/CategoriasModel.php');
require_once(__DIR__ . '/../../modelo/FasesDocumentosModel.php');
require_once __DIR__ . '/permisos_municipio.php';

header('Content-Type: application/json');


$usuario_id = $_SESSION['usuario_id'] ?? null;


$accion = $_POST['action'] ?? $_GET['action'] ?? null;

try {
    // El ID se resuelve en BBDD: no confiamos en el municipio o la ruta del navegador.
    $codPermiso = trim((string)($_POST['cod_mun'] ?? $_GET['cod_mun'] ?? ''));
    if (in_array($accion, ['actualizarDocumento', 'eliminarDocumento'], true)) {
        $registro = (new DocumentosModel($conn))->obtenerDocumentoPorId($_POST['id'] ?? 0);
        if (!$registro) throw new Exception('El documento no existe.');
        if ($codPermiso !== '' && $codPermiso !== $registro['cod_mun']) {
            throw new Exception('El documento no pertenece al municipio indicado.');
        }
        $codPermiso = $registro['cod_mun'];
    }
    if (!in_array($accion, ['listarCategorias', 'crearCategoria', 'listarFasesDocumentos'], true)) {
        comprobarPermisoMunicipio(new MunicipioModel($conn), $codPermiso, $usuario_id, $_SESSION['usuario_correo'] ?? '');
    }

    // =======================================================
    // GUARDAR DOCUMENTO (ALTA)
    // =======================================================
    if ($accion === 'guardarDocumento') {
        $documentosModel = new DocumentosModel($conn);

        $cod_mun      = $_POST['cod_mun']      ?? null;
        $fase_id      = $_POST['fase_id']      ?? null;
        $titulo       = $_POST['titulo']       ?? null;
        $archivo_url  = $_POST['archivo_url']  ?? null;
        $categoria_id = $_POST['categoria_id'] ?? null;

        if ($cod_mun && $fase_id && $titulo && $archivo_url) {
            try {
                // Validar duplicados antes de insertar
                if ($documentosModel->existeDocumentoDuplicado($cod_mun, $fase_id, $titulo)) {
                    echo json_encode([
                        "success" => false,
                        "message" => "Ya existe un documento con ese título en esa fase."
                    ]);
                    exit;
                }

                // Crear el documento
                $exito = $documentosModel->crearDocumento($cod_mun, $fase_id, $titulo, $archivo_url, $categoria_id);
                echo json_encode(["success" => $exito]);
            } catch (PDOException $e) {
                // FK de fase
                if (strpos($e->getMessage(), 'documentos_fase_id_fkey') !== false) {
                    echo json_encode([
                        "success" => false,
                        "message" => "La fase indicada no existe para este municipio. Verifica el número de fase."
                    ]);
                } else {
                    echo json_encode([
                        "success" => false,
                        "message" => "Error en la base de datos: " . $e->getMessage()
                    ]);
                }
            }
        } else {
            echo json_encode([
                "success" => false,
                "message" => "Faltan datos para guardar el documento."
            ]);
        }
        exit;
    }

    // =======================================================
    // LISTAR DOCUMENTOS POR MUNICIPIO
    // =======================================================
    if ($accion === 'listarDocumentos') {
        $model   = new DocumentosModel($conn);
        $cod_mun = $_GET['cod_mun'] ?? null;

        if ($cod_mun) {
            $documentos = $model->getDocumentosPorMunicipio($cod_mun);

            // IMPORTANTE: el JS espera campos:
            // id, titulo, num_fase / codigo_fase, fase_id,
            // categoria, categoria_id, archivo_url, fecha_creacion
            echo json_encode(["success" => true, "data" => $documentos]);
        } else {
            echo json_encode([
                "success" => false,
                "message" => "Código de municipio no recibido."
            ]);
        }
        exit;
    }

    // =======================================================
    // ELIMINAR DOCUMENTO
    // =======================================================
    if ($accion === 'eliminarDocumento') {
        $id          = $_POST['id']          ?? null;

        if ($id) {
            $model = new DocumentosModel($conn);
            $model->eliminarDocumento($id);
            echo json_encode(['success' => true]);
        } else {
            echo json_encode([
                'success' => false,
                'message' => 'Datos incompletos para eliminar'
            ]);
        }
        exit;
    }

        // =======================================================
    // ACTUALIZAR DOCUMENTO (EDICIÓN)
    // =======================================================
    if ($accion === 'actualizarDocumento') {

        $id               = $_POST['id']               ?? null;
        $cod_mun          = $_POST['cod_mun']          ?? null;
        $fase_id          = $_POST['fase_id']          ?? null;
        $titulo           = $_POST['titulo']           ?? null;
        $archivo_url      = $_POST['archivo_url']      ?? null;
        $categoria_id     = $_POST['categoria_id']     ?? null;

        if (!$id || !$cod_mun || !$fase_id || !$titulo || !$archivo_url) {
            echo json_encode([
                'success' => false,
                'message' => 'Faltan datos para actualizar el documento.'
            ]);
            exit;
        }

        try {
            // Comprobar duplicados (mismo título+fase+municipio en otro id)
            $sqlDup = "
                SELECT id
                FROM pou.documentos
                WHERE cod_mun = :cod_mun
                  AND fase_id = :fase_id
                  AND titulo  = :titulo
                  AND id <> :id
                LIMIT 1
            ";
            $stmtDup = $conn->prepare($sqlDup);
            $stmtDup->execute([
                ':cod_mun' => $cod_mun,
                ':fase_id' => $fase_id,
                ':titulo'  => $titulo,
                ':id'      => $id
            ]);

            if ($stmtDup->fetch(PDO::FETCH_ASSOC)) {
                echo json_encode([
                    'success' => false,
                    'message' => 'Ya existe otro documento con ese título en esa fase.'
                ]);
                exit;
            }

            // Actualizar documento (SIN fecha_modificacion porque no existe en la tabla)
            $sql = "
                UPDATE pou.documentos
                SET
                    fase_id      = :fase_id,
                    titulo       = :titulo,
                    archivo_url  = :archivo_url,
                    categoria_id = :categoria_id
                WHERE id = :id
                  AND cod_mun = :cod_mun
            ";

            $stmt = $conn->prepare($sql);
            $stmt->execute([
                ':fase_id'      => $fase_id,
                ':titulo'       => $titulo,
                ':archivo_url'  => $archivo_url,
                ':categoria_id' => $categoria_id ?: null,
                ':id'           => $id,
                ':cod_mun'      => $cod_mun
            ]);

            if ($archivo_url !== $registro['archivo_url']) {
                eliminarArchivoMunicipalPOU($registro['archivo_url'], $registro['cod_mun']);
            }
            echo json_encode(['success' => true]);
        } catch (PDOException $e) {
            if (strpos($e->getMessage(), 'documentos_fase_id_fkey') !== false) {
                echo json_encode([
                    "success" => false,
                    "message" => "La fase indicada no existe para este municipio. Verifica el número de fase."
                ]);
            } else {
                echo json_encode([
                    "success" => false,
                    "message" => "Error al actualizar el documento: " . $e->getMessage()
                ]);
            }
        }

        exit;
    }

    // =======================================================
    // LISTAR CATEGORÍAS
    // =======================================================
    if ($accion === 'listarCategorias') {
        $categoriasModel = new CategoriasModel($conn);
        $res = $categoriasModel->listarCategorias();
        echo json_encode(['success' => true, 'data' => $res]);
        exit;
    }

    // =======================================================
    // CREAR CATEGORÍA
    // =======================================================
    if ($accion === 'crearCategoria') {
        $nombre = trim($_POST['nombre'] ?? '');
        if ($nombre) {
            try {
                $categoriasModel = new CategoriasModel($conn);
                $categoriasModel->crearCategoria($nombre);
                echo json_encode(["success" => true]);
            } catch (PDOException $e) {
                if ($e->getCode() == '23505') { // clave única duplicada en PostgreSQL
                    echo json_encode([
                        "success" => false,
                        "message" => "Ya existe una categoría con ese nombre."
                    ]);
                } else {
                    echo json_encode([
                        "success" => false,
                        "message" => "Error al crear la categoría."
                    ]);
                }
            }
        } else {
            echo json_encode([
                'success' => false,
                'message' => 'Nombre requerido.'
            ]);
        }
        exit;
    }

    // =======================================================
    // LISTAR FASES DE DOCUMENTOS 
    // =======================================================
    if ($accion === 'listarFasesDocumentos') {

        $fasesModel = new FasesDocumentosModel($conn);
        $fases = $fasesModel->obtenerTodas(); // ya ordenadas (1,2,2.1,...)

        // devolvemos exactamente lo que necesita el select:
        // value = num_fase (FK), label = "codigo - titulo"
        $out = [];
        foreach ($fases as $f) {
            $out[] = [
                'num_fase' => $f['num_fase'],
                'codigo'   => $f['codigo'],
                'titulo'   => $f['titulo'],
                'label'    => trim($f['codigo'] . ' - ' . $f['titulo'])
            ];
        }

        echo json_encode(['success' => true, 'data' => $out]);
        exit;
    }


    // =======================================================
    // ACCIÓN NO RECONOCIDA
    // =======================================================
    echo json_encode(['success' => false, 'message' => 'Acción no reconocida.']);

} catch (Exception $e) {
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage()
    ]);
}
