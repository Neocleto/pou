<?php
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}
$usuario_id = $_SESSION['usuario_id'] ?? '';
?>

<div class="wizard-section">
    <div class="wizard-section-title mb-4 d-flex align-items-center">
        <i class="bi bi-file-earmark-text-fill text-primary me-2 fs-4"></i>
        <h5 class="mb-0 text-primary fw-bold">Paso 1: Datos Generales del Municipio</h5>
    </div>

    <form id="formMunicipio" method="POST" action="php/gestion/acciones/acciones_panel.php">
        <!-- Campo oculto para indicar el modo (crear/editar) -->
        <input type="hidden" name="modo" id="modoOperacion" value="crear">
        <!-- Este campo se rellena con "crear" o "editar" en función del botón pulsado -->

        <div class="row g-4">
            <!-- Fila 1 -->
            <div class="col-12 col-md-2">
                <label for="cod_mun" class="form-label">Código Municipio</label>
                <input type="text" class="form-control" id="cod_mun" name="cod_mun"
                       required pattern="^\d{5}$"
                       title="Debe tener exactamente 5 dígitos"
                       disabled>
            </div>

            <div class="col-12 col-md-4">
                <label for="nombre" class="form-label">Nombre del Municipio</label>
                <select class="selectpicker" id="nombre" name="nombre"
                        data-live-search="true"
                        data-live-search-placeholder="Buscar municipio…" 
                        data-size="8"
                        data-style="form-select w-100"
                        data-width="100%"
                        title="Selecciona un municipio…"
                        required>
                </select>
            </div>

            <div class="col-12 col-md-3">
                <label for="correo_contacto" class="form-label">Correo del Arquitecto</label>
                <input type="email"
                       class="form-control"
                       id="correo_contacto"
                       name="correo_contacto"
                       required
                       pattern="^[^@\s]+@[^@\s]+\.[a-zA-Z]{2,}$"
                       title="Introduce un correo válido con dominio (ej. usuario@dominio.com)">
            </div>

            <div class="col-12 col-md-3">
                <label for="correo_contacto_gestor" class="form-label">Correo del Gestor</label>
                <input type="email"
                       class="form-control"
                       id="correo_contacto_gestor"
                       name="correo_contacto_gestor"
                       required
                       pattern="^[^@\s]+@[^@\s]+\.[a-zA-Z]{2,}$"
                       title="Introduce un correo válido con dominio (ej. usuario@dominio.com)">
            </div>

            <!-- Fila 2: URL política ocupando toda la fila -->
            <div class="col-12">
                <label for="politica_privacidad_url" class="form-label">
                    URL Política de Privacidad del Ayuntamiento
                </label>

                <div class="input-group">
                    <input type="url"
                           class="form-control"
                           id="politica_privacidad_url"
                           name="politica_privacidad_url"
                           required
                           placeholder="https://www.ayuntamiento.es/politica-de-privacidad">

                    <button type="button"
                            class="btn btn-outline-primary"
                            id="btnBuscarPolitica"
                            title="Buscar automáticamente la URL">
                        <i class="bi bi-magic"></i>
                        <span class="d-none d-md-inline">Buscar</span>
                    </button>
                </div>

                <small class="form-text text-muted">
                    Puedes escribirla manualmente o pulsar <strong>Buscar</strong> para intentar localizarla
                    automáticamente en la web del ayuntamiento.
                </small>
            </div>

            <!-- Fila 3: Fechas ocultas pero enviables -->
            <div class="col-12 col-md-3 d-none">
                <label for="fecha_creacion" class="form-label">Fecha de Alta</label>
                <input type="text"
                       class="form-control"
                       id="fecha_creacion"
                       name="fecha_creacion"
                       value="<?= date('Y-m-d H:i:s') ?>"
                       readonly>
            </div>

            <div class="col-12 col-md-3 d-none">
                <label for="fecha_modificacion" class="form-label">Fecha de Modificación</label>
                <input type="text"
                       class="form-control"
                       id="fecha_modificacion"
                       name="fecha_modificacion"
                       readonly>
            </div>

            <!-- Fila 4: Check 1 -->
            <div class="col-12">
                <div class="form-check mt-3">
                    <input class="form-check-input" type="checkbox" value="1" id="enviar_docs_a_arquitecto" name="enviar_docs_a_arquitecto">
                    <label class="form-check-label" for="enviar_docs_a_arquitecto">
                        Los documentos referentes a la participación serán enviados al gestor del ayuntamiento.
                        ¿Desea que los documentos lleguen también al correo del arquitecto responsable?
                    </label>
                </div>
            </div>

            <!-- Fila 5: Check 2 -->
            <div class="col-12">
                <div class="form-check form-switch mt-3">
                    <input class="form-check-input" type="checkbox" role="switch" id="buzon_participacion_activo" name="buzon_participacion_activo" value="1">
                    <label class="form-check-label" for="buzon_participacion_activo">
                        Activar/Desactivar Buzón de participación
                    </label>
                </div>
            </div>
        </div>

        <!-- Campos ocultos -->
        <input type="hidden" id="usuario_id" name="usuario_id" value="<?= htmlspecialchars($usuario_id) ?>">
        <input type="hidden" id="imagen_cabecera" name="imagen_cabecera">
        <input type="hidden" id="url_escudo" name="url_escudo">
    </form>
</div>

<!-- PERSONALIZACIÓN VISUAL DEL PORTAL -->
<section class="portal-design-launcher mt-4" id="panelConfiguracionVisual">
    <div class="portal-design-launcher__icon">
        <i class="bi bi-layout-wtf"></i>
    </div>

    <div class="portal-design-launcher__copy">
        <span>Diseño de la página pública</span>
        <h6>Abre el configurador visual completo</h6>
        <p>
            Edita colores, imágenes, accesos, orden de bloques y formularios
            en una pantalla con vista previa del portal.
        </p>
    </div>

    <button type="button" class="btn btn-primary" id="btnAbrirConfiguradorPortal">
        <i class="bi bi-window-sidebar me-1"></i>
        Abrir configurador
    </button>
</section>
