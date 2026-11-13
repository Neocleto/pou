<?php
require_once(__DIR__ . '/../../db/conexion.php');
require_once(__DIR__ . '/../../modelo/NoticiasModel.php');
require_once __DIR__ . '/permisos_municipio.php';

session_start();
header('Content-Type: application/json; charset=utf-8');

if (!isset($_SESSION["usuario_id"])) {
  http_response_code(401);
  echo json_encode(["success" => false, "message" => "Sesión no válida"]);
  exit;
}

$usuario_id = $_SESSION['usuario_id'] ?? null;
if (!$usuario_id) {
  echo json_encode(['success' => false, 'message' => 'No autenticado']);
  exit;
}

$action = $_POST['action'] ?? $_GET['action'] ?? null;
$noticiasModel = new NoticiasModel($conn);

function json_error($msg, $code = 200){
  if ($code !== 200) http_response_code($code);
  echo json_encode(['success'=>false,'message'=>$msg]);
  exit;
}

function guardarImagenNoticia($cod_mun, $titulo){
  if (!isset($_FILES['archivo_imagen']) || $_FILES['archivo_imagen']['error'] !== UPLOAD_ERR_OK) {
    return ''; // no hay nueva imagen
  }

  if ($_FILES['archivo_imagen']['size'] > 8 * 1024 * 1024) json_error('La imagen supera el límite de 8 MB.');
  $mime = (new finfo(FILEINFO_MIME_TYPE))->file($_FILES['archivo_imagen']['tmp_name']);
  if (!in_array($mime, ['image/jpeg', 'image/png'], true)) json_error('Solo se permiten imágenes JPG o PNG.');

  $baseNombre = $titulo ?: 'noticia';
  $slug = iconv('UTF-8', 'ASCII//TRANSLIT', $baseNombre);
  $slug = preg_replace('/[^a-zA-Z0-9_-]+/', '-', $slug);
  $slug = trim($slug, '-_');
  if ($slug === '') $slug = 'noticia';

  $ext = strtolower(pathinfo($_FILES['archivo_imagen']['name'], PATHINFO_EXTENSION));
  if (!in_array($ext, ['jpg','jpeg','png'])) {
    json_error('Formato de imagen no válido');
  }

  $ext = $mime === 'image/png' ? 'png' : 'jpg';
  $nombreFinal = strtolower($slug) . '-' . bin2hex(random_bytes(8)) . '.' . $ext;

  $basePath    = realpath(__DIR__ . '/../../../');
  $rutaCarpeta = $basePath . '/images/municipios/' . $cod_mun . '/noticias/';
  $rutaFinal   = $rutaCarpeta . $nombreFinal;

  if (!is_dir($rutaCarpeta) && !mkdir($rutaCarpeta, 0775, true)) {
    json_error('No se pudo crear la carpeta de noticias.');
  }

  if (!move_uploaded_file($_FILES['archivo_imagen']['tmp_name'], $rutaFinal)) {
    json_error("No se pudo guardar la imagen");
  }

  return 'images/municipios/' . $cod_mun . '/noticias/' . $nombreFinal;
}

try {
  $codPermiso = trim((string)($_POST['cod_mun'] ?? $_GET['cod_mun'] ?? ''));
  if (in_array($action, ['actualizarNoticia', 'eliminarNoticia', 'cambiarEstadoNoticia'], true)) {
    $registro = $noticiasModel->obtenerNoticiaPorId($_POST['id'] ?? 0);
    if (!$registro) json_error('La noticia no existe.');
    if ($codPermiso !== '' && $codPermiso !== $registro['cod_mun']) {
      json_error('La noticia no pertenece al municipio indicado.');
    }
    $codPermiso = $registro['cod_mun'];
  }
  comprobarPermisoMunicipio(new MunicipioModel($conn), $codPermiso, $usuario_id, $_SESSION['usuario_correo'] ?? '');

  if (!$action) json_error("Action requerido");

  // -------------------------
  // LISTAR
  // -------------------------
  if ($action === 'listarNoticias') {
    $cod_mun = $_POST['cod_mun'] ?? $_GET['cod_mun'] ?? null;
    if (!$cod_mun) json_error("cod_mun requerido");

    $noticias = $noticiasModel->obtenerNoticiasPorMunicipio($cod_mun);
    echo json_encode(['success' => true, 'data' => $noticias]);
    exit;
  }

  // -------------------------
  // CREAR
  // -------------------------
  if ($action === 'crearNoticia') {
    $cod_mun = $_POST['cod_mun'] ?? null;
    $titulo  = trim($_POST['titulo'] ?? '');
    $fecha   = $_POST['fecha_publicacion'] ?? '';
    $resumen = trim($_POST['resumen'] ?? '');
    $enlace  = $_POST['enlace_detalle'] ?? '';
    $activa  = ($_POST['activa'] ?? '0') === '1' ? 1 : 0;

    if (!$cod_mun) json_error("cod_mun requerido");

    // Imagen obligatoria al crear
    if (!isset($_FILES['archivo_imagen']) || $_FILES['archivo_imagen']['error'] !== UPLOAD_ERR_OK) {
      json_error("La imagen es obligatoria al crear una noticia");
    }

    $imagen_url = guardarImagenNoticia($cod_mun, $titulo);

    $id = $noticiasModel->crearNoticia([
      'cod_mun' => $cod_mun,
      'titulo' => $titulo,
      'fecha_publicacion' => $fecha,
      'resumen' => $resumen,
      'imagen_url' => $imagen_url,
      'enlace_detalle' => $enlace,
      'activa' => $activa
    ]);

    echo json_encode([
      'success' => (bool)$id,
      'message' => $id ? 'Noticia creada' : 'No se pudo crear',
      'data' => ['id' => $id, 'imagen_url' => $imagen_url]
    ]);
    exit;
  }

  // -------------------------
  // ACTUALIZAR
  // -------------------------
  if ($action === 'actualizarNoticia') {
    $id      = $_POST['id'] ?? null;
    $cod_mun = $_POST['cod_mun'] ?? null;
    $titulo  = trim($_POST['titulo'] ?? '');
    $fecha   = $_POST['fecha_publicacion'] ?? '';
    $resumen = trim($_POST['resumen'] ?? '');
    $enlace  = $_POST['enlace_detalle'] ?? '';
    $activa  = ($_POST['activa'] ?? '0') === '1' ? 1 : 0;

    if (!$id || !$cod_mun) json_error("ID y cod_mun requeridos");

    $nueva_imagen = '';
    if (isset($_FILES['archivo_imagen']) && $_FILES['archivo_imagen']['error'] === UPLOAD_ERR_OK) {
      $nueva_imagen = guardarImagenNoticia($cod_mun, $titulo);
    }

    $ok = $noticiasModel->actualizarNoticia([
      'id' => $id,
      'cod_mun' => $cod_mun,
      'titulo' => $titulo,
      'fecha_publicacion' => $fecha,
      'resumen' => $resumen,
      'enlace_detalle' => $enlace,
      'activa' => $activa,
      'imagen_url' => $nueva_imagen // '' = mantener
    ]);

    echo json_encode([
      'success' => (bool)$ok,
      'message' => $ok ? 'Noticia actualizada' : 'No se pudo actualizar',
      'data' => ['imagen_url' => $nueva_imagen]
    ]);
    exit;
  }

  // -------------------------
  // ELIMINAR
  // -------------------------
  if ($action === 'eliminarNoticia') {
    $id = $_POST['id'] ?? null;
    if (!$id) json_error("ID requerido");

    $noticiasModel->eliminarNoticia($id);
    echo json_encode(['success' => true, 'message' => 'Noticia eliminada']);
    exit;
  }

  // -------------------------
  // CAMBIAR ESTADO
  // -------------------------
  if ($action === 'cambiarEstadoNoticia') {
    $id = $_POST['id'] ?? null;
    $cod_mun = $_POST['cod_mun'] ?? null;
    $activa = ($_POST['activa'] ?? '0') === '1' ? 1 : 0;

    if (!$id || !$cod_mun) json_error("ID y cod_mun requeridos");

    $ok = $noticiasModel->cambiarEstadoNoticia($id, $activa, $cod_mun);
    echo json_encode(['success' => (bool)$ok, 'message' => $ok ? 'Estado actualizado' : 'No se pudo cambiar el estado']);
    exit;
  }

  json_error('Acción no válida.');

} catch (Exception $e) {
  echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}
