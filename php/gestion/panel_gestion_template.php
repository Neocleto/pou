<?php
// Acceso de gestión: convenio vigente y proyecto correcto.
require_once __DIR__ . '/../login/permisos_proyecto.php';
exigirAccesoProyecto(false, false);
?>
<!DOCTYPE html>
<html lang="es">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Panel de Gestión de Municipio</title>

    <base href="/pou/">

    <!-- Intro -->
    <link rel="stylesheet" href="lib/intro/introjs.min.css">

    <!-- Boostrap -->
    <link rel="stylesheet" href="lib/bootstrap/css/bootstrap@5.3.0.min.css">
    <link rel="stylesheet" href="lib/bootstrap/css/bootstrap-icons.css">

    <!-- bootstrap-select para Bootstrap 5 -->
    <link rel="stylesheet" href="lib/bootstrap/css/bootstrap-select.min.css">

    <link rel="stylesheet" href="css/acceso-moderno.css?v=pou-v6-20261113">
    <link rel="stylesheet" href="css/panel.css?v=pou-burdeos-20261113">
    <link rel="stylesheet" href="css/tabla-municipio.css?v=pou-20261112-2">
    <link rel="stylesheet" href="css/iconos-portal.css?v=encuestas-contorno">
    <link rel="stylesheet" href="css/selector-color.css?v=<?= (int)@filemtime(dirname(__DIR__, 2) . '/css/selector-color.css') ?>">
    <link rel="stylesheet" href="css/wizard.css?v=<?= (int)@filemtime(dirname(__DIR__, 2) . '/css/wizard.css') ?>">
    <link rel="stylesheet" href="css/tour.css?v=pou-burdeos-20261113">
    <link rel="stylesheet" href="css/tema-pou.css">
</head>

<body class="pou-panel-page page-panel-gestion panel-loading">
    <!-- SPINNER DE CARGA GLOBAL -->
    <div id="loaderOverlayPanel">
        <div class="spinner-border text-primary" role="status">
            <span class="visually-hidden">Cargando...</span>
        </div>
    </div>

    <?php include __DIR__ . '/../includes/access_header.php'; ?>

    <main>
        <div class="panel-contenido">

            <!-- CABECERA MODERNA DEL PANEL -->
            <div class="panel-header card shadow-sm border-0 mb-3">
                <div class="card-body d-flex flex-column flex-lg-row align-items-lg-center justify-content-between gap-3">
                    <div>
                        <h2 class="mb-1">Panel de Gestión de Municipios</h2>
                        <?php if (esSuperusuarioProyecto($conn, $_SESSION['usuario_id'])): ?>
                            <div class="small fw-semibold text-primary mb-1">Superusuario · Acceso a todos los municipios</div>
                        <?php endif; ?>
                        <div class="text-muted small">
                            Administra, configura y publica los POU de tus municipios mediante el asistente de 7 pasos.
                        </div>
                    </div>

                    <div class="d-flex gap-2">
                        <button class="btn btn-outline-secondary" id="btnAyudaTour" type="button">
                            <i class="bi bi-question-circle me-2"></i>Ayuda
                        </button>

                        <button class="btn btn-success btn-panel-create" id="btnCrearMunicipio" type="button">
                            <i class="bi bi-plus-circle me-2"></i>Crear nuevo municipio
                        </button>
                    </div>
                </div>
            </div>

            <!-- RESUMEN DEL ASISTENTE -->
            <section class="panel-wizard-guide" aria-label="Pasos del asistente POU">
                <div class="panel-wizard-guide__intro">
                    <div class="panel-wizard-guide__icon">
                        <i class="bi bi-bezier2"></i>
                    </div>
                    <div>
                        <h3>Todos los POU se configuran mediante un asistente de 7 pasos</h3>
                        <p>Completa cada apartado para construir y publicar la página del municipio.</p>
                    </div>
                </div>

                <div class="panel-wizard-guide__steps">
                    <div class="panel-wizard-guide__step">
                        <span><i class="bi bi-file-earmark-text"></i></span>
                        <small>Datos generales</small>
                    </div>
                    <div class="panel-wizard-guide__step">
                        <span><i class="bi bi-info-circle"></i></span>
                        <small>Información</small>
                    </div>
                    <div class="panel-wizard-guide__step">
                        <span><i class="bi bi-geo-alt"></i></span>
                        <small>Fases</small>
                    </div>
                    <div class="panel-wizard-guide__step">
                        <span><i class="bi bi-folder"></i></span>
                        <small>Documentos</small>
                    </div>
                    <div class="panel-wizard-guide__step">
                        <span><i class="bi bi-people"></i></span>
                        <small>Participación</small>
                    </div>
                    <div class="panel-wizard-guide__step">
                        <span><i class="bi bi-newspaper"></i></span>
                        <small>Noticias</small>
                    </div>
                    <div class="panel-wizard-guide__step">
                        <span><i class="bi bi-question-circle"></i></span>
                        <small>FAQs</small>
                    </div>
                </div>
            </section>

            <!-- TABLA MUNICIPIOS -->
            <?php include(__DIR__ . '/includes/tabla_municipios.php'); ?>

            <!-- MODAL WIZARD  -->
            <?php include(__DIR__ . '/includes/wizard.php'); ?>

        </div>
    </main>

    <?php include __DIR__ . '/../includes/access_footer.php'; ?>


    <!-- ======================================================
         MODAL AYUDA PREMIUM (SVG + ACCORDION)
    ======================================================= -->
    <div class="modal fade modal-ayuda" id="modalAyudaPanel" tabindex="-1" aria-labelledby="modalAyudaPanelLabel" aria-hidden="true">
        <div class="modal-dialog modal-lg modal-dialog-centered">
            <div class="modal-content">

                <div class="modal-header">
                    <div class="w-100">
                        <div class="d-flex align-items-center justify-content-between gap-2">
                            <div class="d-flex align-items-center gap-2">
                                <span class="ayuda-pill-header">
                                    <i class="bi bi-stars"></i> Guía rápida
                                </span>
                                <h5 class="modal-title mb-0" id="modalAyudaPanelLabel">Panel de Municipios</h5>
                            </div>
                            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Cerrar"></button>
                        </div>

                        <!-- Mini ilustración SVG -->
                        <div class="ayuda-illustration mt-2">
                            <svg width="100%" height="70" viewBox="0 0 900 140" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Ilustración guía">
                                <defs>
                                    <linearGradient id="g1" x1="0" y1="0" x2="1" y2="1">
                                        <stop offset="0" stop-color="rgba(255,255,255,0.35)"/>
                                        <stop offset="1" stop-color="rgba(255,255,255,0.12)"/>
                                    </linearGradient>
                                </defs>

                                <!-- tarjetas -->
                                <rect x="16" y="18" rx="18" ry="18" width="220" height="104" fill="url(#g1)" opacity="0.9"/>
                                <rect x="254" y="18" rx="18" ry="18" width="220" height="104" fill="url(#g1)" opacity="0.75"/>
                                <rect x="492" y="18" rx="18" ry="18" width="392" height="104" fill="url(#g1)" opacity="0.6"/>

                                <!-- líneas simulando filas -->
                                <rect x="44" y="44" rx="10" width="160" height="14" fill="rgba(255,255,255,0.45)"/>
                                <rect x="44" y="70" rx="10" width="120" height="14" fill="rgba(255,255,255,0.35)"/>
                                <rect x="44" y="96" rx="10" width="140" height="14" fill="rgba(255,255,255,0.25)"/>

                                <rect x="282" y="44" rx="10" width="160" height="14" fill="rgba(255,255,255,0.45)"/>
                                <rect x="282" y="70" rx="10" width="120" height="14" fill="rgba(255,255,255,0.35)"/>
                                <rect x="282" y="96" rx="10" width="140" height="14" fill="rgba(255,255,255,0.25)"/>

                                <!-- botones simulados -->
                                <rect x="520" y="46" rx="14" width="120" height="36" fill="rgba(255,255,255,0.55)"/>
                                <rect x="650" y="46" rx="14" width="160" height="36" fill="rgba(255,255,255,0.35)"/>
                                <rect x="520" y="88" rx="14" width="160" height="36" fill="rgba(255,255,255,0.25)"/>

                                <!-- puntitos decorativos -->
                                <circle cx="845" cy="32" r="6" fill="rgba(255,255,255,0.55)"/>
                                <circle cx="870" cy="56" r="5" fill="rgba(255,255,255,0.35)"/>
                                <circle cx="830" cy="102" r="7" fill="rgba(255,255,255,0.25)"/>
                            </svg>
                        </div>
                    </div>
                </div>

                <div class="modal-body">

                    <div class="accordion" id="ayudaAccordion">

                        <!-- 1) Visión general -->
                        <div class="accordion-item">
                            <h2 class="accordion-header" id="ayudaHeading1">
                                <button class="accordion-button" type="button" data-bs-toggle="collapse" data-bs-target="#ayudaCollapse1" aria-expanded="true" aria-controls="ayudaCollapse1">
                                    <i class="bi bi-compass me-2 text-primary"></i> Visión general
                                </button>
                            </h2>
                            <div id="ayudaCollapse1" class="accordion-collapse collapse show" aria-labelledby="ayudaHeading1" data-bs-parent="#ayudaAccordion">
                                <div class="accordion-body">
                                    <div class="ayuda-hero">
                                        <div class="icon">
                                            <i class="bi bi-list-check fs-4"></i>
                                        </div>
                                        <div>
                                            <h5>Gestiona tus municipios en un vistazo</h5>
                                            <p>
                                                En esta pantalla puedes <strong>buscar</strong>, <strong>editar</strong>, <strong>previsualizar</strong> y <strong>publicar</strong>.
                                                Si no debe mostrarse, puedes <strong>desactivarlo</strong>.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- 2) Buscar y estados -->
                        <div class="accordion-item">
                            <h2 class="accordion-header" id="ayudaHeading2">
                                <button class="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#ayudaCollapse2" aria-expanded="false" aria-controls="ayudaCollapse2">
                                    <i class="bi bi-search me-2 text-primary"></i> Buscar, paginar y estados
                                </button>
                            </h2>
                            <div id="ayudaCollapse2" class="accordion-collapse collapse" aria-labelledby="ayudaHeading2" data-bs-parent="#ayudaAccordion">
                                <div class="accordion-body">
                                    <h6 class="fw-bold mb-2"><i class="bi bi-search me-2 text-primary"></i>Buscar y paginar</h6>
                                    <ul class="ayuda-list mb-3">
                                        <li><strong>Buscar</strong> filtra por nombre o datos.</li>
                                        <li>La <strong>paginación</strong> está abajo para moverte entre resultados.</li>
                                        <li>“Mostrar” controla cuántos registros ves por página.</li>
                                    </ul>

                                    <h6 class="fw-bold mb-2"><i class="bi bi-ui-checks me-2 text-primary"></i>Estados</h6>
                                    <div class="d-flex flex-wrap gap-2 mb-2">
                                        <span class="ayuda-chip ayuda-chip-success"><i class="bi bi-check-circle"></i>Activo</span>
                                        <span class="ayuda-chip ayuda-chip-info"><i class="bi bi-info-circle"></i>Inactivo</span>
                                        <span class="ayuda-chip ayuda-chip-muted"><i class="bi bi-calendar3"></i>Modificación</span>
                                    </div>
                                    <div class="text-muted" style="font-size:0.95rem;">
                                        Si está <strong>Inactivo</strong>, aún no es visible públicamente. Al <strong>Publicar</strong>, pasa a estar disponible.
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- 3) Botones de acción -->
                        <div class="accordion-item">
                            <h2 class="accordion-header" id="ayudaHeading3">
                                <button class="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#ayudaCollapse3" aria-expanded="false" aria-controls="ayudaCollapse3">
                                    <i class="bi bi-mouse me-2 text-primary"></i> Botones de acción
                                </button>
                            </h2>
                            <div id="ayudaCollapse3" class="accordion-collapse collapse" aria-labelledby="ayudaHeading3" data-bs-parent="#ayudaAccordion">
                                <div class="accordion-body">

                                    <div class="ayuda-actions-grid">

                                        <div class="ayuda-action-card">
                                            <span class="ayuda-action-btn ayuda-btn-editar">
                                                <i class="bi bi-pencil-square"></i> Editar
                                            </span>
                                            <div class="ayuda-action-title">Editar el municipio</div>
                                            <p class="ayuda-action-desc">
                                                Abre el asistente (wizard) para completar o modificar datos.
                                            </p>
                                        </div>

                                        <div class="ayuda-action-card">
                                            <span class="ayuda-action-btn ayuda-btn-previsualizar">
                                                <i class="bi bi-eye"></i> Previsualizar
                                            </span>
                                            <div class="ayuda-action-title">Ver como quedará</div>
                                            <p class="ayuda-action-desc">
                                                Abre una vista previa en otra pestaña sin hacerlo público.
                                            </p>
                                        </div>

                                        <div class="ayuda-action-card">
                                            <span class="ayuda-action-btn ayuda-btn-publicar">
                                                <i class="bi bi-upload"></i> Publicar
                                            </span>
                                            <div class="ayuda-action-title">Hacerlo visible</div>
                                            <p class="ayuda-action-desc">
                                                Publica el municipio si tiene todos los pasos obligatorios completos.
                                            </p>
                                        </div>

                                        <div class="ayuda-action-card">
                                            <span class="ayuda-action-btn ayuda-btn-eliminar">
                                                <i class="bi bi-trash"></i> Eliminar
                                            </span>
                                            <div class="ayuda-action-title">Desactivar municipio</div>
                                            <p class="ayuda-action-desc">
                                                Lo marca como inactivo (no visible públicamente).
                                            </p>
                                        </div>

                                    </div>

                                    <div class="alert alert-light border mt-3 mb-0" style="border-radius:14px;">
                                        <div class="fw-semibold mb-1">
                                            <i class="bi bi-lightbulb-fill text-warning me-1"></i> Consejo
                                        </div>
                                        Si al publicar te avisa de pasos incompletos, entra en <strong>Editar</strong> y completa los pasos obligatorios del asistente.
                                    </div>

                                </div>
                            </div>
                        </div>

                    </div>

                </div>

                <div class="modal-footer">
                    <button type="button" class="btn btn-outline-secondary" data-bs-dismiss="modal">
                        Cerrar
                    </button>
                    <button type="button" class="btn btn-primary" id="btnIrATabla">
                        <i class="bi bi-arrow-down-circle me-2"></i>Ir a la tabla
                    </button>
                </div>

            </div>
        </div>
    </div>


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

    <!-- Script proyecto -->
    <script src="js/login/verificacion_sesion.js?v=<?= (int)@filemtime(dirname(__DIR__, 2) . '/js/login/verificacion_sesion.js') ?>"></script>
    <script src="js/gestion/utilidadesGestion.js?v=<?= (int)@filemtime(dirname(__DIR__, 2) . '/js/gestion/utilidadesGestion.js') ?>"></script>
    <script src="js/gestion/editorEnriquecido.js?v=<?= (int)@filemtime(dirname(__DIR__, 2) . '/js/gestion/editorEnriquecido.js') ?>"></script>
    <script src="js/gestion/wizard.js?v=<?= (int)@filemtime(dirname(__DIR__, 2) . '/js/gestion/wizard.js') ?>"></script>
    <script src="js/gestion/configuracionVisualWizard.js?v=<?= (int)@filemtime(dirname(__DIR__, 2) . '/js/gestion/configuracionVisualWizard.js') ?>"></script>
    <script src="js/gestion/plantillaWizard.js?v=<?= (int)@filemtime(dirname(__DIR__, 2) . '/js/gestion/plantillaWizard.js') ?>"></script>
    <script src="js/gestion/tablaMunicipios.js?v=<?= (int)@filemtime(dirname(__DIR__, 2) . '/js/gestion/tablaMunicipios.js') ?>"></script>
    <script src="js/gestion/fasesWizard.js?v=<?= (int)@filemtime(dirname(__DIR__, 2) . '/js/gestion/fasesWizard.js') ?>"></script>
    <script src="js/gestion/documentosWizard.js?v=<?= (int)@filemtime(dirname(__DIR__, 2) . '/js/gestion/documentosWizard.js') ?>"></script>
    <script src="js/gestion/configuradorColores.js?v=<?= (int)@filemtime(dirname(__DIR__, 2) . '/js/gestion/configuradorColores.js') ?>"></script>
    <script src="js/gestion/participacionWizard.js?v=<?= (int)@filemtime(dirname(__DIR__, 2) . '/js/gestion/participacionWizard.js') ?>"></script>
    <script src="js/gestion/noticiasWizard.js?v=<?= (int)@filemtime(dirname(__DIR__, 2) . '/js/gestion/noticiasWizard.js') ?>"></script>
    <script src="js/gestion/faqsWizard.js?v=<?= (int)@filemtime(dirname(__DIR__, 2) . '/js/gestion/faqsWizard.js') ?>"></script>
    <script src="js/gestion/tour.js"></script>

    <script>
        // Eventos pequeños de ayuda que pertenecen únicamente a esta vista.
        document.addEventListener('DOMContentLoaded', function () {
            const botonAyuda = document.getElementById('btnAyudaTour');
            const botonIrTabla = document.getElementById('btnIrATabla');

            if (botonAyuda) {
                botonAyuda.addEventListener('click', function () {
                    if (typeof iniciarTourPanel === 'function') {
                        iniciarTourPanel();
                    }
                });
            }

            if (botonIrTabla) {
                botonIrTabla.addEventListener('click', function () {
                    const tabla = document.getElementById('contenedorTablaMunicipios')
                        || document.getElementById('tablaMunicipios');

                    if (tabla) {
                        tabla.scrollIntoView({
                            behavior: 'smooth',
                            block: 'start'
                        });
                    }

                    const modalElemento = document.getElementById('modalAyudaPanel');
                    const modal = bootstrap.Modal.getInstance(modalElemento);

                    if (modal) {
                        modal.hide();
                    }
                });
            }
        });
    </script>

</body>

</html>
