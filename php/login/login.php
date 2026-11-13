<?php
session_start();
require_once __DIR__ . '/../db/conexion.php';

header('Content-Type: application/json');

if ($_SERVER["REQUEST_METHOD"] === "POST") {
    $correo = $_POST["correo"] ?? '';
    $clave = $_POST["clave"] ?? '';

    if (empty($correo) || empty($clave)) {
        echo json_encode(["success" => false, "message" => "Por favor, rellena todos los campos."]);
        exit;
    }

    $stmt = $conn->prepare("
        SELECT idusuario, identificador, clave_cifrada, nombre, apellido1, apellido2
        FROM dbo.web_usuarios 
        WHERE LOWER(identificador) = LOWER(:correo)
          AND (baja IS NULL OR baja = 0)
        LIMIT 1
    ");
    $stmt->bindParam(":correo", $correo);
    $stmt->execute();

    if ($stmt->rowCount() === 1) {
        $usuario = $stmt->fetch(PDO::FETCH_ASSOC);

        if (password_verify($clave, $usuario["clave_cifrada"])) {
            $stmt2 = $conn->prepare("
                SELECT 1
                FROM dbo.web_usuarios_convenios 
                WHERE cod_usuario = :idusuario
                  AND es_baja = false
                LIMIT 1
            ");
            $stmt2->bindParam(":idusuario", $usuario["idusuario"]);
            $stmt2->execute();

            if ($stmt2->rowCount() === 1) {
                $_SESSION["usuario_id"] = $usuario["idusuario"];
                $_SESSION["usuario_correo"] = $usuario["identificador"];
                $_SESSION["usuario_nombre"] = trim($usuario["nombre"] . ' ' . $usuario["apellido1"] . ' ' . $usuario["apellido2"]);
                $_SESSION["expira_en"] = time() + 3 * 60 * 60; // Expira en 3 horas
              //  $_SESSION["expira_en"] = time() + 60; // Expira en 1 minuto

                echo json_encode([
                    "success" => true,
                    "redirect" => "php/gestion/panel_gestion.php"
                ]);
                exit;
            } else {
                // Usuario sin convenio válido
                echo json_encode([
                    "success" => false,
                    "message" => "No tienes acceso porque no estás asociado a ningún convenio activo. Solicite el convenio al departamento GIS."
                ]);
                exit;
            }
        } else {
            // Contraseña incorrecta
            echo json_encode(["success" => false, "message" => "La contraseña es incorrecta."]);
            exit;
        }
    } else {
        // Usuario no encontrado
        echo json_encode(["success" => false, "message" => "No existe ninguna cuenta con ese correo."]);
        exit;
    }
}
?>
