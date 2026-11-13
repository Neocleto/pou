<?php
// municipio_documentos.php

require_once(__DIR__ . "/../db/conexion.php");
require_once(__DIR__ . '/../controlador/DocumentosControlador.php');

session_start();

$cod_mun   = $_GET['cod_mun'] ?? null;
$esPreview = isset($_GET['preview']) && $_GET['preview'] === '1';

if (!$cod_mun) {
    header('Location: /pou/index.php');
    exit;
}

$usuarioId = $_SESSION['usuario_id'] ?? null;
$rol       = $_SESSION['rol'] ?? null;
$correoUsuario = $_SESSION['usuario_correo'] ?? '';

$controlador = new DocumentosController($conn);

// OJO: si no quieres control de permisos aquí, puedes quitar usuarioId/rol
$datos = $controlador->mostrarDocumentos($cod_mun, $esPreview, $usuarioId, $rol, $correoUsuario);

$municipio         = $datos['municipio'];
$fasesMenu         = $datos['fasesMenu'];
$documentosPorFase = $datos['documentosPorFase'];
$faseActualNum     = $datos['faseActualNum'] ?? 0;
$configuracionVisual = $datos['configuracionVisual'] ?? [];

// Esto es lo que usa el template para pintar la barra amarilla
$modoPreview = !empty($datos['modoPreview']);

include __DIR__ . '/documentos_template.php';
