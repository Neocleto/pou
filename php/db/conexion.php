<?php
$config = parse_ini_file(__DIR__ . '/../../config.ini', true);


try {
    $conn = new PDO(
        "pgsql:host={$config['database']['host']};port={$config['database']['port']};dbname={$config['database']['dbname']}",
        $config['database']['user'],
        $config['database']['password']
    );
    $conn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

    // Esquema propio de esta aplicación; no depende del valor antiguo de config.ini.
    $conn->exec("SET search_path TO pou");
} catch (PDOException $e) {
    die("Error de conexión: " . $e->getMessage());
}
?>
