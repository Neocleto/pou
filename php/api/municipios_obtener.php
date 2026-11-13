<?php
// ============================================================================
// API PÚBLICA: MUNICIPIOS PUBLICADOS
// Devuelve municipios activos aplicando búsqueda, filtro y paginación.
// ============================================================================

require_once("../db/conexion.php");

header("Content-Type: application/json; charset=utf-8");

// 1. Parámetros recibidos.
$busqueda = trim($_GET["search"] ?? "");
$filtrosPermitidos = ["todos", "a_m", "n_z", "z_a"];
$filtro = $_GET["filter"] ?? "todos";

if (!in_array($filtro, $filtrosPermitidos, true)) {
    $filtro = "todos";
}

$pagina = max(1, (int)($_GET["page"] ?? 1));
$limite = 15;

// 2. Condiciones comunes para el total y para el listado.
$condiciones = [
    "activo = TRUE",
    "baja = FALSE",
    "LOWER(nombre) LIKE :busqueda"
];

$parametros = [
    ":busqueda" => "%" . convertirMinusculas($busqueda) . "%"
];

// 3. Filtro alfabético seleccionado por el usuario.
if ($filtro === "a_m") {
    $condiciones[] = "UPPER(LEFT(nombre, 1)) BETWEEN 'A' AND 'M'";
}

if ($filtro === "n_z") {
    $condiciones[] = "UPPER(LEFT(nombre, 1)) BETWEEN 'N' AND 'Z'";
}

$orden = $filtro === "z_a" ? "nombre DESC" : "nombre ASC";
$clausulaWhere = implode(" AND ", $condiciones);

try {
    // 4. Número total de resultados.
    $sqlTotal = "SELECT COUNT(*)
                 FROM pou.municipios
                 WHERE {$clausulaWhere}";

    $stmtTotal = $conn->prepare($sqlTotal);
    $stmtTotal->execute($parametros);
    $total = (int)$stmtTotal->fetchColumn();

    // Si el filtro reduce los resultados, corregimos una página que ya no exista.
    $totalPaginas = max(1, (int)ceil($total / $limite));
    $pagina = min($pagina, $totalPaginas);
    $desplazamiento = ($pagina - 1) * $limite;

    // 5. Resultados de la página actual.
    $sqlListado = "SELECT cod_mun, nombre, escudo
                   FROM pou.municipios
                   WHERE {$clausulaWhere}
                   ORDER BY {$orden}
                   LIMIT :limite OFFSET :desplazamiento";

    $stmtListado = $conn->prepare($sqlListado);

    foreach ($parametros as $nombre => $valor) {
        $stmtListado->bindValue($nombre, $valor);
    }

    $stmtListado->bindValue(":limite", $limite, PDO::PARAM_INT);
    $stmtListado->bindValue(":desplazamiento", $desplazamiento, PDO::PARAM_INT);
    $stmtListado->execute();

    $municipios = $stmtListado->fetchAll(PDO::FETCH_ASSOC);

    echo json_encode([
        "success" => true,
        "total" => $total,
        "page" => $pagina,
        "limit" => $limite,
        "municipios" => $municipios
    ], JSON_UNESCAPED_UNICODE);
} catch (Throwable $error) {
    http_response_code(500);

    echo json_encode([
        "success" => false,
        "message" => "No ha sido posible cargar los municipios."
    ], JSON_UNESCAPED_UNICODE);
}


/**
 * Convierte un texto a minúsculas aunque mbstring no esté disponible.
 */
function convertirMinusculas($texto)
{
    if (function_exists('mb_strtolower')) {
        return mb_strtolower((string)$texto, 'UTF-8');
    }

    return strtolower((string)$texto);
}
