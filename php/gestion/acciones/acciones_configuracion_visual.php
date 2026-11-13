<?php
// ============================================================================
// CONFIGURADOR COMPLETO DEL PORTAL PUBLICO
//
// Esta accion carga y guarda en una sola pantalla:
// - Diseno general, textos, iconos, colores y orden.
// - Informacion general y fase actual.
// - Recursos, documentos, noticias, preguntas y formularios.
// - Imagen de cabecera, escudo, buzon y privacidad.
// ============================================================================

require_once(__DIR__ . '/../../db/conexion.php');
require_once(__DIR__ . '/../../modelo/ConfiguracionVisualModel.php');
require_once(__DIR__ . '/../../modelo/MunicipioModel.php');
require_once(__DIR__ . '/../../modelo/ParticipacionBotonesModel.php');
require_once(__DIR__ . '/../../modelo/InformacionModel.php');
require_once(__DIR__ . '/../../modelo/FasesModel.php');
require_once(__DIR__ . '/../../modelo/DocumentosModel.php');
require_once(__DIR__ . '/../../modelo/CategoriasModel.php');
require_once(__DIR__ . '/../../modelo/FasesDocumentosModel.php');
require_once(__DIR__ . '/../../modelo/NoticiasModel.php');
require_once(__DIR__ . '/../../modelo/FaqModel.php');

if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Pragma: no-cache');

// 1. Comprobamos la sesion antes de consultar datos.
if (empty($_SESSION['usuario_id'])) {
    responderConfigurador(false, 'La sesion ha caducado.', [], 401);
}

$configuracionModel = new ConfiguracionVisualModel($conn);
$municipioModel = new MunicipioModel($conn);
$participacionBotonesModel = new ParticipacionBotonesModel($conn);
$informacionModel = new InformacionModel($conn);
$fasesModel = new FasesModel($conn);
$documentosModel = new DocumentosModel($conn);
$categoriasModel = new CategoriasModel($conn);
$fasesDocumentosModel = new FasesDocumentosModel($conn);
$noticiasModel = new NoticiasModel($conn);
$faqModel = new FaqModel($conn);

$accion = $_REQUEST['accion'] ?? 'obtener';
$codMun = trim((string)($_REQUEST['cod_mun'] ?? ''));
$usuarioId = $_SESSION['usuario_id'];
$correoUsuario = $_SESSION['usuario_correo'] ?? '';

try {
    // 2. Comprobamos el municipio y los permisos del usuario.
    if ($codMun === '') {
        throw new Exception('Guarda primero los datos generales del municipio.');
    }

    if (!$municipioModel->usuarioPuedeGestionarMunicipio($codMun, $usuarioId, $correoUsuario)) {
        throw new Exception('No tienes permiso para modificar este municipio.');
    }

    // 3. Cargamos todo lo que necesita el configurador.
    if ($accion === 'obtener') {
        $municipio = $municipioModel->obtenerMunicipioPorCodigo($codMun);
        $buzonActivo = normalizarBooleanoConfigurador(
            $municipio['buzon_participacion_activo'] ?? false
        );
        $configuracion = $configuracionModel->obtenerPorMunicipio($codMun);

        // El Wizard y el configurador representan la misma decisión:
        // mostrar o no el bloque público del Buzón.
        $configuracion['secciones_portal'] = sincronizarBuzonConfigurador(
            $configuracion['secciones_portal'] ?? [],
            $buzonActivo
        );

        responderConfigurador(true, '', [
            'cod_mun' => $codMun,
            'configuracion' => $configuracion,
            'accesos' => $configuracionModel->obtenerAccesos($codMun),
            'botones_participacion' => $participacionBotonesModel->listarBotonesPorMunicipio($codMun),
            'imagenes' => [
                'imagen_cabecera' => $municipio['imagen_cabecera'] ?? '',
                'escudo' => $municipio['escudo'] ?? '',
                'escudo_automatico' => $municipio['escudo_automatico'] ?? ''
            ],
            'datos_contenido' => [
                'informacion' => $informacionModel->obtenerInformacionPorMunicipio($codMun) ?: [
                    'titulo' => '',
                    'descripcion' => ''
                ],
                'fase_actual' => $fasesModel->obtenerFaseActualPorMunicipio($codMun) ?: [],
                'fases' => $fasesModel->listarFases(),
                'subfases' => $fasesModel->listarTodasSubfases(),
                'documentos' => $documentosModel->getDocumentosPorMunicipio($codMun),
                'categorias' => $categoriasModel->listarCategorias(),
                'fases_documentos' => $fasesDocumentosModel->obtenerTodas(),
                'noticias' => $noticiasModel->obtenerNoticiasPorMunicipio($codMun),
                'faqs' => $faqModel->obtenerFaqsPorMunicipio($codMun),
                'faqs_disponibles' => $faqModel->obtenerTodasLasPreguntas(),
                'buzon_activo' => $buzonActivo,
                'politica_privacidad_url' => $municipio['politica_privacidad_url'] ?? ''
            ]
        ]);
    }

    // 4. Guardamos el diseno y los datos basicos en una transaccion.
    if ($accion === 'guardar') {
        $datos = json_decode(file_get_contents('php://input'), true);

        if (!is_array($datos)) {
            throw new Exception('Los datos recibidos no son validos.');
        }

        $codMunRecibido = trim((string)($datos['cod_mun'] ?? ''));

        if ($codMunRecibido !== '' && $codMunRecibido !== $codMun) {
            throw new Exception('Los datos recibidos pertenecen a otro municipio. Recarga el configurador.');
        }

        $datos['cod_mun'] = $codMun;
        $datosContenido = is_array($datos['datos_contenido'] ?? null)
            ? $datos['datos_contenido']
            : [];
        $buzonActivo = normalizarBooleanoConfigurador(
            $datosContenido['buzon_activo'] ?? false
        );

        // Antes de iniciar la transacción dejamos un único valor para el Buzón.
        // De esta forma no pueden guardarse dos estados contradictorios.
        $datos['secciones_portal'] = sincronizarBuzonConfigurador(
            $datos['secciones_portal'] ?? [],
            $buzonActivo
        );
        $datosContenido['buzon_activo'] = $buzonActivo;

        // El encabezado de Información y el título del paso 2 son el mismo dato.
        if (isset($datosContenido['informacion']) && is_array($datosContenido['informacion'])) {
            $tituloInformacion = trim((string)($datosContenido['informacion']['titulo'] ?? ''));
            foreach ($datos['secciones_portal'] as &$seccion) {
                if (($seccion['id'] ?? '') !== 'informacion') continue;
                if ($tituloInformacion === '') $tituloInformacion = $seccion['titulo'] ?? 'Para qué sirve el POU';
                $seccion['titulo'] = $tituloInformacion;
            }
            unset($seccion);
            $datosContenido['informacion']['titulo'] = $tituloInformacion;
        }

        $conn->beginTransaction();

        // 4.1. Guardamos aspecto, textos, orden y accesos.
        $configuracionModel->guardar($datos);
        $configuracionModel->guardarAccesos($codMun, $datos['accesos'] ?? []);

        // 4.2. Guardamos la informacion general del bloque.
        if (isset($datosContenido['informacion']) && is_array($datosContenido['informacion'])) {
            $informacionModel->actualizarInformacion($codMun, [
                'titulo' => trim((string)($datosContenido['informacion']['titulo'] ?? '')),
                'descripcion' => trim((string)($datosContenido['informacion']['descripcion'] ?? ''))
            ]);
        }

        // 4.3. Guardamos la fase actual cuando se han indicado sus datos minimos.
        $faseActual = $datosContenido['fase_actual'] ?? [];
        $numeroFase = (int)($faseActual['num_fase'] ?? 0);
        $fechaInicio = trim((string)($faseActual['fecha_inicio'] ?? ''));
        $subfaseId = !empty($faseActual['subfase_id']) ? (int)$faseActual['subfase_id'] : null;

        if ($numeroFase > 0 && $fechaInicio !== '') {
            if ($subfaseId && !$fasesModel->validarSubfasePerteneceAFase($subfaseId, $numeroFase)) {
                throw new Exception('La subfase elegida no pertenece a la fase seleccionada.');
            }

            $fasesModel->crearOActualizarFaseActual(
                $codMun,
                $numeroFase,
                $subfaseId,
                $fechaInicio,
                trim((string)($faseActual['estado_tramitacion'] ?? ''))
            );
        }

        // 4.4. Guardamos buzon, privacidad e imagenes municipales.
        $municipioModel->actualizarDatosPublicosPortal(
            $codMun,
            $datosContenido['politica_privacidad_url'] ?? '',
            $buzonActivo
        );

        $municipioModel->actualizarImagenesPortal(
            $codMun,
            $datos['imagen_cabecera'] ?? '',
            $datos['escudo'] ?? ''
        );

        // 4.5. Los documentos de participacion mantienen el archivo y cambian
        //      aqui su texto, icono y color.
        $participacionBotonesModel->actualizarDisenoBotones(
            $codMun,
            $datos['botones_participacion'] ?? []
        );

        $conn->commit();

        // 4.6. Devolvemos los valores leídos otra vez de la base de datos.
        //      El configurador usa esta respuesta para comprobar que la
        //      visibilidad de cada acceso se ha guardado realmente.
        $accesosGuardados = $configuracionModel->obtenerAccesos($codMun);
        $municipioGuardado = $municipioModel->obtenerMunicipioPorCodigo($codMun);
        $buzonActivoGuardado = normalizarBooleanoConfigurador(
            $municipioGuardado['buzon_participacion_activo'] ?? false
        );
        $configuracionGuardada = $configuracionModel->obtenerPorMunicipio($codMun);
        $configuracionGuardada['secciones_portal'] = sincronizarBuzonConfigurador(
            $configuracionGuardada['secciones_portal'] ?? [],
            $buzonActivoGuardado
        );

        responderConfigurador(true, 'El portal se ha guardado correctamente.', [
            'total_accesos_guardados' => count($accesosGuardados),
            'accesos_guardados' => $accesosGuardados,
            'configuracion_guardada' => $configuracionGuardada,
            'buzon_activo_guardado' => $buzonActivoGuardado
        ]);
    }

    throw new Exception('La accion solicitada no es valida.');
} catch (Throwable $error) {
    if ($conn->inTransaction()) {
        $conn->rollBack();
    }

    responderConfigurador(false, $error->getMessage(), [], 400);
}

/**
 * Devuelve siempre el mismo formato JSON y detiene la ejecucion.
 */
function responderConfigurador($ok, $mensaje = '', array $datos = [], $codigoHttp = 200)
{
    http_response_code($codigoHttp);

    echo json_encode(
        array_merge([
            'ok' => (bool)$ok,
            'mensaje' => $mensaje
        ], $datos),
        JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES
    );

    exit;
}

/**
 * Convierte booleanos de PostgreSQL, JSON y formularios sin confundir "f"
 * con un valor verdadero.
 */
function normalizarBooleanoConfigurador($valor)
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
 * Iguala la visibilidad del bloque Buzón con el valor compartido con el Wizard.
 */
function sincronizarBuzonConfigurador($secciones, $buzonActivo)
{
    if (is_string($secciones)) {
        $secciones = json_decode($secciones, true);
    }

    if (!is_array($secciones)) {
        $secciones = [];
    }

    $buzonEncontrado = false;

    foreach ($secciones as &$seccion) {
        if (!is_array($seccion) || ($seccion['id'] ?? '') !== 'buzon') {
            continue;
        }

        $seccion['visible'] = (bool)$buzonActivo;
        $buzonEncontrado = true;
        break;
    }
    unset($seccion);

    // Una configuración antigua puede no tener todavía el bloque Buzón.
    if (!$buzonEncontrado) {
        $secciones[] = [
            'id' => 'buzon',
            'titulo' => 'Buzón de participación',
            'icono' => 'envelope',
            'color' => '#540000',
            'visible' => (bool)$buzonActivo
        ];
    }

    return $secciones;
}
