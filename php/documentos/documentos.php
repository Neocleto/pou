<?php
// municipio_documentos.php

require_once(__DIR__ . "/../db/conexion.php");
require_once(__DIR__ . '/../controlador/DocumentosControlador.php');

session_start();

$cod_mun   = $_GET['cod_mun'] ?? null;
$esPreview = isset($_GET['preview']) && $_GET['preview'] === '1';

if ($esPreview) {
    // La documentación en borrador exige el convenio, igual que el portal municipal.
    require_once __DIR__ . '/../login/permisos_proyecto.php';
    exigirAccesoProyecto(false, false);
}

if (!$cod_mun) {
    header('Location: /pou/index.php');
    exit;
}

$usuarioId = $_SESSION['usuario_id'] ?? null;
$correoUsuario = $_SESSION['usuario_correo'] ?? '';

$controlador = new DocumentosController($conn);

// El controlador comprueba que el usuario pueda previsualizar este municipio.
$datos = $controlador->mostrarDocumentos($cod_mun, $esPreview, $usuarioId, $correoUsuario);

$municipio         = $datos['municipio'];
$fasesMenu         = $datos['fasesMenu'];
$documentosPorFase = $datos['documentosPorFase'];
$estadosFases      = $datos['estadosFases'];
$faseActualNum     = $datos['faseActualNum'] ?? 0;
$configuracionVisual = $datos['configuracionVisual'] ?? [];

// Esto es lo que usa el template para pintar la barra amarilla
$modoPreview = !empty($datos['modoPreview']);

include __DIR__ . '/documentos_template.php';
