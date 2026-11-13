<?php
session_start();
header("Content-Type: application/json");

if (!isset($_SESSION["usuario_id"])) {
    echo json_encode(["status" => "no_session"]);
    exit;
}

if (isset($_SESSION["expira_en"]) && time() > $_SESSION["expira_en"]) {
    echo json_encode(["status" => "expired"]);
    exit;
}

// Si sigue activa
echo json_encode(["status" => "active"]);
?>