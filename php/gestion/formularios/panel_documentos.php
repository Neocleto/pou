<?php
// Acceso de gestión: convenio vigente y proyecto correcto.
require_once __DIR__ . '/../../login/permisos_proyecto.php';
exigirAccesoProyecto(false, false);

// php/gestion/formularios/panel_documentos.php

require_once __DIR__ . '/../../db/conexion.php';
require_once __DIR__ . '/../../modelo/MunicipioModel.php';


$cod_mun = trim((string)($_GET['cod_mun'] ?? ''));
$municipioModel = new MunicipioModel($conn);
if (!preg_match('/^\d{5}$/', $cod_mun)
    || !$municipioModel->usuarioPuedeGestionarMunicipio($cod_mun, $_SESSION['usuario_id'], $_SESSION['usuario_correo'] ?? '')) {
    http_response_code(403);
    die('No tienes permiso para gestionar los documentos de este municipio.');
}

$nombreMunicipio = '';
if ($cod_mun !== '') {
    $municipio = $municipioModel->obtenerMunicipioPorCodigo($cod_mun);
    if ($municipio) {
        $nombreMunicipio = $municipio['nombre'] ?? '';
    }
}
?>
<!DOCTYPE html>
<html lang="es">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Gestión de documentos</title>

    <base href="/pou/">

    <!-- Intro -->
    <link rel="stylesheet" href="lib/intro/introjs.min.css">

    <!-- Boostrap -->
    <link rel="stylesheet" href="lib/bootstrap/css/bootstrap@5.3.0.min.css">
    <link rel="stylesheet" href="lib/bootstrap/css/bootstrap-icons.css">

    <!-- bootstrap-select para Bootstrap 5 -->
    <link rel="stylesheet" href="lib/bootstrap/css/bootstrap-select.min.css">

    <link rel="stylesheet" href="css/index.css?v=pou-v6-20261113">
    <link rel="stylesheet" href="css/panel.css">
    <link rel="stylesheet" href="css/tabla-municipio.css">
    <link rel="stylesheet" href="css/wizard.css">
    <link rel="stylesheet" href="css/tour.css">
    <link rel="stylesheet" href="css/tema-pou.css">
</head>

<body class="page-panel-documentos">
    <!-- SPINNER DE CARGA GLOBAL -->
    <div id="loaderOverlayPanel">
        <div class="spinner-border text-primary" role="status">
            <span class="visually-hidden">Cargando...</span>
        </div>
    </div>

    <?php
    // usamos el MISMO header y footer que en panel_gestion.php
    $isHomePage = false;
    $ocultarHeaderTop  = true;
    include(__DIR__ . '/../../includes/header.php');
    ?>

    <main>
        <div class="panel-contenido">

            <div class="documentos-panel-header d-flex justify-content-between align-items-center mb-3">
                <div>
                    <h2 class="mb-1">Gestión de documentos</h2>
                    <?php if ($cod_mun !== ''): ?>
                        <p class="text-muted mb-0">
                            Municipio: <strong><?= htmlspecialchars($nombreMunicipio) ?></strong>
                            (cód. INE <?= htmlspecialchars($cod_mun) ?>)
                        </p>
                    <?php endif; ?>
                </div>

                <button type="button" id="btnVolverPanel" class="btn btn-outline-secondary">
                    <i class="bi bi-arrow-left me-1"></i> Volver
                </button>
            </div>

            <div class="documentos-panel-grid row g-3">
                <!-- Tabla principal de documentos -->
                <div class="documentos-panel-main-col col-lg-9">
                    <div class="documentos-panel-card card border-0 shadow-sm mb-3">
                        <div class="card-body">
                            <div class="d-flex justify-content-between align-items-center mb-2">
                                <div>
                                    <h5 class="fw-bold text-primary mb-1">Documentos del municipio</h5>
                                    <p class="text-muted small mb-0">
                                        Usa los filtros por fase y categoría, o escribe en el buscador para localizar
                                        documentos.
                                    </p>
                                </div>

                                <span id="badgeTotalDocsPanel"
                                    class="badge bg-light text-muted border small">
                                    0 documentos
                                </span>
                            </div>

                            <!-- Aquí inyecta documentosWizard.js la tabla completa -->
                            <div id="tablaDocumentosWrapper"></div>
                        </div>
                    </div>
                </div>

                <!-- Resumen lateral por fase + botón Nuevo -->
                <div class="documentos-panel-side-col col-lg-3">
                    <div class="documentos-panel-side-card card border-0 shadow-sm h-100">
                        <div class="card-body">
                            <h6 class="fw-bold text-primary mb-2">
                                Resumen por fase
                            </h6>
                            <p class="text-muted small mb-2">
                                Número total de documentos asociados a cada fase.
                            </p>

                            <ul class="list-unstyled small mb-3" id="resumenDocumentosPanel">
                                <li class="text-muted">Cargando documentos...</li>
                            </ul>

                            <!-- Botón justo después del resumen -->
                            <button type="button"
                                id="btnNuevoDocumentoPanel"
                                class="btn btn-primary w-100">
                                <i class="bi bi-plus-circle me-1"></i>
                                Nuevo documento
                            </button>
                        </div>
                    </div>
                </div>

            </div>

        </div>

        <input type="hidden" id="cod_mun" value="<?= htmlspecialchars($cod_mun) ?>">

        <!-- MODAL CREAR / EDITAR DOCUMENTO -->
        <div class="modal fade" id="modalDocumentoPanel" tabindex="-1" aria-hidden="true">
            <div class="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable">
                <div class="modal-content shadow-lg border-0">
                    <div class="modal-header border-0 pb-0">
                        <h5 class="modal-title" id="modalDocumentoPanelLabel">
                            Crear o editar documento
                        </h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Cerrar"></button>
                    </div>
                    <div class="modal-body pt-2">
                        <div class="card border-0">
                            <div class="card-body">
                                <h6 class="fw-bold text-primary mb-1">Crear o editar documento</h6>
                                <p class="text-muted small mb-3">
                                    Usa este formulario para subir nuevos documentos o editar los existentes.
                                    Selecciona un documento en la tabla para cargar sus datos aquí.
                                </p>

                                <form id="formSubirDocumento" method="post" enctype="multipart/form-data" novalidate>
                                    <input type="hidden" id="documento_editando_id" name="documento_editando_id" value="">

                                    <div class="mb-3">
                                        <label for="titulo_documento" class="form-label fw-semibold">
                                            Título del documento <span class="text-danger">*</span>
                                        </label>
                                        <input type="text"
                                            id="titulo_documento"
                                            name="titulo_documento"
                                            class="form-control"
                                            placeholder="Ej: Memoria justificativa aprobada"
                                            required>
                                    </div>

                                    <div class="row g-3">
                                        <div class="col-md-6">
                                            <label for="fase_documento" class="form-label fw-semibold">
                                                Fase <span class="text-danger">*</span>
                                            </label>
                                            <select id="fase_documento"
                                                name="fase_documento"
                                                class="form-select"
                                                required>
                                                <option value="">Selecciona una fase...</option>
                                                <!-- opciones vía JS -->
                                            </select>
                                        </div>

                                        <div class="col-md-6">
                                            <label for="categoria_documento" class="form-label fw-semibold">
                                                Categoría <span class="text-danger">*</span>
                                            </label>
                                            <div class="d-flex gap-2">
                                                <select id="categoria_documento"
                                                    name="categoria_documento"
                                                    class="form-select"
                                                    required>
                                                    <option value="">-- Selecciona una categoría --</option>
                                                    <!-- opciones vía JS -->
                                                </select>
                                                <button type="button"
                                                    id="btnCrearCategoria"
                                                    class="btn btn-outline-secondary"
                                                    title="Crear nueva categoría">
                                                    <i class="bi bi-plus-lg"></i>
                                                </button>
                                            </div>
                                        </div>
                                    </div>

                                    <div class="mt-3">
                                        <label for="archivo_documento" class="form-label fw-semibold">
                                            Archivo <span class="text-danger">*</span>
                                        </label>
                                        <input type="file"
                                            id="archivo_documento"
                                            name="archivo_documento"
                                            class="form-control"
                                            accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.jpg,.jpeg,.png">
                                        <div class="form-text">
                                            Tamaño máximo y tipos permitidos según configuración del sistema.
                                        </div>
                                        <div id="infoArchivoActual" class="small mt-2 text-muted"></div>
                                    </div>

                                    <div class="d-flex justify-content-end align-items-center gap-2 mt-4">
                                        <button type="button"
                                            class="btn btn-secondary"
                                            id="btnCancelarEdicionDocumento">
                                            Cancelar
                                        </button>
                                        <button type="submit"
                                            class="btn btn-primary btn-documento-primario"
                                            id="btnSubirDocumento">
                                            <span id="spinnerSubirDocumento"
                                                class="spinner-border spinner-border-sm me-2 d-none"
                                                role="status"
                                                aria-hidden="true"></span>
                                            <span class="btn-text">Subir documento</span>
                                        </button>
                                    </div>

                                    <p class="text-muted small mt-3 mb-0">
                                        Los campos marcados con <span class="text-danger">*</span> son obligatorios.
                                    </p>
                                </form>
                            </div>
                        </div>
                    </div>

                    <!-- OVERLAY "TRABAJANDO..." -->
                    <div id="overlayDocumento"
                        class="position-absolute top-0 start-0 w-100 h-100 d-none"
                        style="z-index: 1060;">
                        <div class="w-100 h-100 d-flex flex-column justify-content-center align-items-center bg-white bg-opacity-75">
                            <div class="spinner-border text-primary mb-3" role="status" aria-hidden="true"></div>
                            <div class="fw-semibold text-primary" data-overlay-text>Procesando…</div>
                        </div>
                    </div>

                </div>
            </div>
        </div>

    </main>

    <?php include(__DIR__ . '/../../includes/footer.php'); ?>

    <!-- Bibliotecas externas -->
    <script src="lib/jquery-3.7.1.min.js"></script>
    <script src="lib/jquery.dataTables.min.js"></script>
    <script src="lib/dataTables.bootstrap5.min.js"></script>
    <script src="lib/bootstrap.bundle.min.js"></script>
    <script src="lib/sweetalert2@11.js"></script>
    <script src="lib/ckeditor.js"></script>
    <script src="lib/intro/intro.min.js"></script>
    <script src="lib/bootstrap/js/bootstrap-select.min.js"></script>
    <script src="lib/Sortable.min.js"></script>

    <!-- Scripts del proyecto -->
    <script src="js/login/verificacion_sesion.js?v=<?= (int)@filemtime(dirname(__DIR__, 3) . '/js/login/verificacion_sesion.js') ?>"></script>
    <script src="js/gestion/utilidadesGestion.js?v=<?= (int)@filemtime(dirname(__DIR__, 3) . '/js/gestion/utilidadesGestion.js') ?>"></script>
    <script src="js/gestion/documentosWizard.js?v=<?= (int)@filemtime(dirname(__DIR__, 3) . '/js/gestion/documentosWizard.js') ?>"></script>

    <script>
        document.addEventListener('DOMContentLoaded', function() {
            const loader = document.getElementById('loaderOverlayPanel');
            const codMun = <?= json_encode($cod_mun) ?>;
            const codInput = document.getElementById('cod_mun');

            // Instanciar modal de documento y exponerla globalmente
            const modalEl = document.getElementById('modalDocumentoPanel');
            let modalDocumentoPanel = null;
            if (modalEl && typeof bootstrap !== 'undefined') {
                modalDocumentoPanel = new bootstrap.Modal(modalEl);
                window.modalDocumentoPanel = modalDocumentoPanel;
            }

            // 1) Cargar documentos
            if (codMun && typeof cargarDocumentos === 'function') {
                cargarDocumentos(codMun);
            } else {
                loader?.classList.add('hidden');
            }

            // 2) Ocultar spinner cuando documentosWizard.js avise
            document.addEventListener('documentosCargados', function() {
                loader?.classList.add('hidden');
            });

            // 3) Cargar categorías y fases para el formulario de la modal
            if (typeof cargarCategoriasDocumento === 'function') {
                cargarCategoriasDocumento();
            }
            if (typeof cargarFasesDocumento === 'function') {
                cargarFasesDocumento();
            }

            // 4) Botón Volver -> abrir panel_gestion con wizard paso 4
            const btnVolver = document.getElementById('btnVolverPanel');
            if (btnVolver) {
                btnVolver.addEventListener('click', function() {
                    const cod = codInput ? codInput.value.trim() : '';

                    if (cod) {
                        const url = `php/gestion/panel_gestion.php?cod_mun=${encodeURIComponent(cod)}&abrirPaso=4`;
                        window.location.href = url;
                    } else {
                        window.location.href = 'php/gestion/panel_gestion.php';
                    }
                });
            }

            // 5) Botón NUEVO DOCUMENTO -> abrir modal en modo creación
            const btnNuevoDocumentoPanel = document.getElementById('btnNuevoDocumentoPanel');
            if (btnNuevoDocumentoPanel && modalDocumentoPanel) {
                btnNuevoDocumentoPanel.addEventListener('click', function() {
                    if (typeof resetFormularioDocumento === 'function') {
                        resetFormularioDocumento();
                    }
                    const titleEl = document.getElementById('modalDocumentoPanelLabel');
                    if (titleEl) titleEl.textContent = 'Nuevo documento';

                    modalDocumentoPanel.show();
                });
            }
        });
    </script>

</body>

</html>