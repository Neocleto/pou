<?php
session_start();
header("Content-Type: application/json");

if (!isset($_SESSION["usuario_id"])) {
    echo json_encode(["status" => "no_session"]);
    exit;
}

// Renovamos por otras 3 horas
$_SESSION["expira_en"] = time() + 3 * 60 * 60;
echo json_encode(["status" => "renewed"]);

?>