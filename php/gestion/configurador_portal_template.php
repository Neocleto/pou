<?php
// Acceso de gestión: convenio vigente y proyecto correcto.
require_once __DIR__ . '/../login/permisos_proyecto.php';
exigirAccesoProyecto(false, false);

require_once __DIR__ . '/../includes/valores_portal.php';
require_once __DIR__ . '/../includes/imagenes_municipio.php';
$municipio['escudo_automatico'] = obtenerEscudoAutomaticoMunicipio($codMun);
$municipio['escudo'] = obtenerEscudoMunicipio($codMun, $municipio['escudo'] ?? '');
?>
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Configurar portal POU - <?= htmlspecialchars($municipio['nombre'] ?? '') ?></title>

    <base href="/pou/">

    <link rel="stylesheet" href="lib/bootstrap/css/bootstrap@5.3.0.min.css">
    <link rel="stylesheet" href="lib/bootstrap/css/bootstrap-icons.css">
    <link rel="stylesheet" href="css/configurador-portal.css?v=<?= (int)@filemtime(dirname(__DIR__, 2) . '/css/configurador-portal.css') ?>">
    <link rel="stylesheet" href="css/tema-pou.css">
</head>
<body class="portal-builder-page">
    <!-- Capa de carga inicial. Evita que se vea la interfaz sin datos. -->
    <div id="portalBuilderLoader" class="portal-builder-loader">
        <div class="portal-builder-loader__box">
            <div class="spinner-border text-primary" role="status"></div>
            <span>Cargando configurador...</span>
        </div>
    </div>

    <!-- Cabecera fija del configurador. -->
    <header class="portal-builder-header">
        <div class="portal-builder-header__left">
            <a href="php/gestion/panel_gestion.php" class="portal-builder-back" title="Volver al panel">
                <i class="bi bi-chevron-left"></i>
            </a>

            <div>
                <h1>
                    Configurador de la web POU ·
                    <span><?= htmlspecialchars($municipio['nombre'] ?? '') ?></span>
                </h1>
                <p>Configura el portal y comprueba el resultado mientras trabajas.</p>
            </div>
        </div>

        <div class="portal-builder-header__actions">
            <span id="estadoGuardadoPortal" class="portal-builder-save-state">
                <i class="bi bi-circle-fill"></i>
                <span data-save-state-text>Sin cambios</span>
            </span>

            <button type="button" class="btn btn-outline-light" id="btnRecargarConfigurador">
                <i class="bi bi-arrow-counterclockwise me-1"></i>
                Descartar cambios
            </button>

            <a
                class="btn btn-outline-light"
                href="php/municipio/municipio.php?cod_mun=<?= urlencode($codMun) ?>&preview=1"
                target="_blank"
                rel="noopener noreferrer">
                <i class="bi bi-eye me-1"></i>
                Abrir portal
            </a>

            <button type="button" class="btn btn-success" id="btnGuardarPortalCompleto">
                <i class="bi bi-floppy me-1"></i>
                Guardar
            </button>
        </div>
    </header>

    <!--
        La zona de trabajo se divide en tres columnas:
        1. Navegación de bloques.
        2. Propiedades del bloque seleccionado.
        3. Vista previa real del portal público.
    -->
    <main class="portal-builder-layout">
        <aside class="portal-builder-sidebar" aria-label="Estructura de la página">
            <div class="portal-builder-sidebar__title">Estructura de la página</div>

            <nav id="menuConfiguradorPortal" class="portal-builder-menu">
                <!-- El menú se genera mediante JavaScript. -->
            </nav>
        </aside>

        <section class="portal-builder-properties">
            <div class="portal-builder-properties__heading">
                <div>
                    <h2 id="tituloPanelConfigurador">Diseño general</h2>
                    <p id="descripcionPanelConfigurador">Colores, ancho y legibilidad del portal.</p>
                </div>
            </div>

            <div id="contenidoPanelConfigurador" class="portal-builder-properties__body">
                <!-- El formulario de propiedades se genera mediante JavaScript. -->
            </div>
        </section>

        <section class="portal-builder-preview">
            <div class="portal-builder-preview__heading">
                <div>
                    <h2>Vista previa</h2>
                    <p>Los cambios visuales se aplican aquí antes de guardar.</p>
                </div>

                <div class="portal-builder-preview__tools">
                    <div class="portal-builder-preview-tabs" role="tablist" aria-label="Contenido de la vista previa">
                        <button type="button" class="is-active" data-preview-mode="portal">
                            <i class="bi bi-window"></i> Portal
                        </button>
                        <button type="button" data-preview-mode="formulario">
                            <i class="bi bi-ui-checks-grid"></i> Formulario
                        </button>
                    </div>

                    <div class="portal-builder-devices" role="group" aria-label="Tamaño de la vista previa">
                        <button type="button" class="is-active" data-preview-size="desktop">Escritorio</button>
                        <button type="button" data-preview-size="tablet">Tableta</button>
                        <button type="button" data-preview-size="mobile">Móvil</button>
                    </div>
                </div>
            </div>

            <div id="marcoVistaPreviaPortal" class="portal-builder-preview__frame is-desktop">
                <div id="lienzoVistaPreviaPortal" class="portal-builder-preview__canvas">
                    <iframe
                        id="iframeVistaPreviaPortal"
                        title="Vista previa del portal público"
                        src="php/municipio/municipio.php?cod_mun=<?= urlencode($codMun) ?>&preview=1&editor=1">
                    </iframe>
                </div>

                <div id="vistaPreviaFormulario" class="portal-form-live-preview d-none" aria-live="polite">
                    <!-- La vista previa del formulario se genera mediante JavaScript. -->
                </div>
            </div>
        </section>
    </main>

    <!-- Datos mínimos que necesita el JavaScript. -->
    <script>
        window.POU_CONFIGURADOR = <?= json_encode([
            'cod_mun' => $codMun,
            'nombre' => $municipio['nombre'] ?? '',
            'imagen_cabecera' => $municipio['imagen_cabecera'] ?? '',
            'escudo' => $municipio['escudo'] ?? '',
            'escudo_automatico' => $municipio['escudo_automatico'],
            'valores_iniciales' => obtenerConfiguracionInicialPortal($codMun),
            'accesos_iniciales' => obtenerAccesosInicialesPortal(),
            'iconos' => obtenerIconosPortal(),
            'panel_inicial' => $panelInicial
        ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_HEX_TAG | JSON_HEX_AMP | JSON_HEX_APOS | JSON_HEX_QUOT) ?>;
    </script>

    <script src="lib/bootstrap.bundle.min.js"></script>
    <script src="lib/ckeditor.js"></script>
    <script src="lib/sweetalert2@11.js"></script>
    <script src="js/gestion/editorEnriquecido.js?v=<?= (int)@filemtime(dirname(__DIR__, 2) . '/js/gestion/editorEnriquecido.js') ?>"></script>
    <script src="js/gestion/configuradorColores.js?v=<?= (int)@filemtime(dirname(__DIR__, 2) . '/js/gestion/configuradorColores.js') ?>"></script>
    <script src="js/gestion/configuradorPortal.js?v=<?= (int)@filemtime(dirname(__DIR__, 2) . '/js/gestion/configuradorPortal.js') ?>"></script>
    <script src="js/gestion/configuradorIconos.js?v=<?= (int)@filemtime(dirname(__DIR__, 2) . '/js/gestion/configuradorIconos.js') ?>"></script>
    <script src="js/gestion/configuradorContenidoPortal.js?v=<?= (int)@filemtime(dirname(__DIR__, 2) . '/js/gestion/configuradorContenidoPortal.js') ?>"></script>
    <script src="js/gestion/configuradorDatosPortal.js?v=<?= (int)@filemtime(dirname(__DIR__, 2) . '/js/gestion/configuradorDatosPortal.js') ?>"></script>
    <script src="js/gestion/configuradorFormularios.js?v=<?= (int)@filemtime(dirname(__DIR__, 2) . '/js/gestion/configuradorFormularios.js') ?>"></script>
    <script src="js/gestion/configuradorVistaPortal.js?v=<?= (int)@filemtime(dirname(__DIR__, 2) . '/js/gestion/configuradorVistaPortal.js') ?>"></script>
    <script src="js/gestion/configuradorVistaFormulario.js?v=<?= (int)@filemtime(dirname(__DIR__, 2) . '/js/gestion/configuradorVistaFormulario.js') ?>"></script>
    <script src="js/gestion/configuradorBloquesPortal.js?v=<?= (int)@filemtime(dirname(__DIR__, 2) . '/js/gestion/configuradorBloquesPortal.js') ?>"></script>
</body>
</html>
