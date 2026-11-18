<?php
// Acceso de gestión: convenio vigente y proyecto correcto.
require_once __DIR__ . '/../../login/permisos_proyecto.php';
exigirAccesoProyecto(false, false);
?>

<!-- FORMULARIO PASO 4 - DOCUMENTOS -->
 
<div class="wizard-section">
    <div class="wizard-section-title mb-4 d-flex align-items-center">
        <i class="bi bi-folder-fill text-primary me-2 fs-4"></i>
        <h5 class="mb-0 text-primary fw-bold">Paso 4: Documentos</h5>
    </div>

    <div id="documentos-contenido">

        <!-- Formulario de subida / edición de documentos -->
        <form id="formSubirDocumento" class="mb-4">

            <!-- FILA SUPERIOR: Categoría + Fase del documento -->
            <div class="row g-3 mb-3">
                <!-- Categoría -->
                <div class="col-md-5">
                    <label for="categoria_documento" class="form-label">Categoría</label>
                    <div class="d-flex align-items-end gap-2 position-relative">
                        <select id="categoria_documento" name="categoria_documento" class="form-select">
                            <option value="">-- Selecciona una categoría --</option>
                            <!-- Se cargarán vía JS -->
                        </select>

                        <button type="button"
                                class="btn btn-outline-success"
                                id="btnCrearCategoria"
                                title="Crear nueva categoría">
                            <i class="bi bi-plus-circle"></i>
                        </button>

                        <!-- Panel flotante para crear categoría -->
                        <div id="panelCrearCategoria"
                             class="card shadow position-absolute p-3 bg-white rounded border d-none animate__animated animate__fadeIn"
                             style="z-index: 10; min-width: 280px;">
                            <div class="d-flex justify-content-between align-items-center mb-2">
                                <div class="titulo-categoria-custom mb-2">Nueva categoría</div>
                            </div>
                            <label for="nuevaCategoriaNombre" class="form-label">Nombre de la categoría</label>
                            <input type="text" id="nuevaCategoriaNombre" class="form-control mb-3">
                            <div class="d-flex justify-content-end gap-2">
                                <button type="button" class="btn btn-success btn-sm" id="guardarCategoria">
                                    Guardar
                                </button>
                                <button type="button" class="btn btn-danger btn-sm" id="cancelarPanelCategoria">
                                    Cancelar
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Fase del documento -->
                <div class="col-md-7">
                    <label for="fase_documento" class="form-label">Fase del Documento</label>
                    <select id="fase_documento" name="fase_documento" class="form-select">
                        <option value="">-- Selecciona la fase --</option>
                        <!-- Se cargarán vía JS -->
                    </select>
                </div>
            </div>

            <!-- FILA INFERIOR: Archivo + Título + Botones -->
            <div class="row g-3 mb-3">
                <!-- Archivo -->
                <div class="col-md-5">
                    <label for="archivo_documento" class="form-label">Seleccionar Documento</label>
                    <input type="file"
                           class="form-control"
                           id="archivo_documento"
                           name="archivo_documento"
                           accept=".pdf,.doc,.docx,.jpg,.png">

                    <!-- Aquí mostramos el archivo actual al editar -->
                    <div id="infoArchivoActual" class="form-text text-muted mt-1"></div>
                </div>

                <!-- Título del documento -->
                <div class="col-md-4">
                    <label for="titulo_documento" class="form-label">Título del documento</label>
                    <input type="text"
                           class="form-control"
                           id="titulo_documento"
                           name="titulo_documento"
                           placeholder="Ej: Memoria justificativa">
                </div>

                <!-- Botones -->
                <div class="col-md-3">
                    <!-- Etiqueta invisible en escritorio para que el botón
                         quede alineado con los inputs de la fila -->
                    <label class="form-label d-none d-md-block">&nbsp;</label>

                    <div class="d-flex flex-column gap-2">
                        <button type="submit"
                                id="btnSubirDocumento"
                                class="btn btn-primary btn-documento-primario w-100">
                            Subir documento
                        </button>

                        <button type="button"
                                id="btnCancelarEdicionDocumento"
                                class="btn btn-outline-secondary btn-documento-primario d-none w-100">
                            Cancelar edición
                        </button>
                    </div>
                </div>
            </div>

            <!-- Hidden para saber si estamos editando -->
            <input type="hidden" id="documento_editando_id" name="documento_editando_id" value="">
        </form>

        <!-- Spinner subida -->
        <div id="spinnerSubirDocumento" class="text-center my-3 d-none">
            <div class="spinner-border text-primary" role="status">
                <span class="visually-hidden">Subiendo...</span>
            </div>
        </div>

        <!-- RESUMEN + CTA GESTIONAR -->
        <div class="row g-3 mt-3 resumen-documentos-row">
            <!-- Resumen compacto -->
            <div class="col-lg-8">
                <div class="card border-0 shadow-sm h-100">
                    <div class="card-body">
                        <div class="d-flex justify-content-between align-items-center mb-2">
                            <h6 class="fw-bold text-primary mb-0">
                                Resumen de documentos
                            </h6>
                            <span id="badgeTotalDocs"
                                  class="badge bg-light text-muted border small">
                                0 documentos
                            </span>
                        </div>

                        <!-- Chips por fase -->
                        <div id="chipsFasesDocs"
                             class="d-flex flex-wrap gap-2 mb-3 small">
                            <!-- Los chips de fases los rellena el JS -->
                        </div>

                        <!-- Lista de últimos documentos -->
                        <div id="listaUltimosDocs" class="list-group list-group-flush small">
                            <p class="text-muted small mb-0">
                                Todavía no hay documentos subidos para este municipio.
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            <!-- CTA Gestión avanzada -->
            <div class="col-lg-4">
                <div class="card border-0 shadow-sm h-100">
                    <div class="card-body d-flex flex-column justify-content-between">
                        <div>
                            <h6 class="fw-bold text-primary mb-2">
                                <i class="bi bi-columns-gap me-1"></i>
                                Gestión avanzada
                            </h6>
                            <p class="small text-muted mb-3">
                                Abre la vista de gestión en pantalla completa para ordenar,
                                filtrar y editar todos los documentos del municipio con mayor comodidad.
                            </p>
                        </div>
                        <button type="button"
                                id="btnGestionarDocumentos"
                                class="btn btn-outline-primary rounded-pill w-100">
                            <i class="bi bi-arrow-up-right-square me-1"></i>
                            Gestionar documentos
                        </button>
                    </div>
                </div>
            </div>
        </div>

    </div>
</div>
