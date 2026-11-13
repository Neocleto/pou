<?php
// ================================================
// PANEL DE GESTIÓN - CARGA DE MUNICIPIOS DEL USUARIO
// ================================================

// 1. CONEXIÓN BBDD
require_once(__DIR__ . '/../db/conexion.php');

// 2. CONTROLADOR
require_once(__DIR__ . '/../controlador/PanelGestionController.php');

// 3. SUPONEMOS QUE HAY UN USUARIO LOGUEADO
session_start();
$usuario_id = $_SESSION['usuario_id'] ?? null;
$usuario_correo = $_SESSION['usuario_correo'] ?? '';

if (!$usuario_id) {
    die("Usuario no autenticado.");
}

// 4. INICIAMOS EL CONTROLADOR
$controlador = new PanelGestionController($conn);

// 5. OBTENEMOS MUNICIPIOS CREADOS POR ESTE USUARIO
$municipios = $controlador->obtenerMunicipiosUsuario($usuario_id, $usuario_correo);

// 6. MOSTRAMOS LA VISTA
include(__DIR__ . '/panel_gestion_template.php');
