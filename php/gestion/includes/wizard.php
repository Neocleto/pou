<?php
// Acceso de gestión: convenio vigente y proyecto correcto.
require_once __DIR__ . '/../../login/permisos_proyecto.php';
exigirAccesoProyecto(false, false);
?>
<!-- MODAL WIZARD -->
<div class="modal fade" id="modalWizard" tabindex="-1" data-bs-backdrop="static" data-bs-keyboard="false" aria-hidden="true">
  <div class="modal-dialog modal-dialog-centered modal-fullscreen-sm-down modal-xl">
    <div class="modal-content border-0 wizard-modal-content">

      <!-- CABECERA WIZARD -->
      <div class="modal-header border-bottom wizard-modal-header">
                <!-- Bloque título -->
        <div class="d-flex align-items-center gap-2">
          <i class="bi bi-gear-fill"></i>
          <h5 class="modal-title mb-0">Gestión del Municipio</h5>
        </div>

                <!-- Bloque botones derecha: Previsualizar + Ayuda -->
        <div class="wizard-header-actions d-flex align-items-center gap-2 flex-wrap">
                    <!-- Botón PREVISUALIZAR -->
                    <button id="btnPreviewMunicipio"
                            type="button"
                            class="btn-preview d-inline-flex align-items-center">
                        <i class="bi bi-eye me-1"></i>
                        <span>Previsualizar</span>
          </button>

                    <!-- Botón AYUDA (tour) -->
                    <button class="btn-tour d-inline-flex align-items-center"
                            type="button"
                            onclick="iniciarAsistenteWizard()">
                        <i class="bi bi-question-circle me-1"></i>
                        <span>Ayuda</span>
          </button>
        </div>
      </div>
      <!-- FIN CABECERA -->

      <div class="modal-body bg-light position-relative">

        <!-- OVERLAY BLOQUEO PARA CUANDO SALGA EL PANEL LATERAL EN PARTICIPACION -->
        <div class="wizard-lock"></div>

        <!-- SPINNER DE CARGA DEL MODAL WIZARD -->
        <div id="modalWizardLoader" class="modal-spinner-overlay hidden">
          <div class="spinner-border text-primary" role="status">
            <span class="visually-hidden">Cargando...</span>
          </div>
        </div>

        <!-- Wizard Steps -->
        <div class="wizard" id="wizard-steps">
          <div class="wizard-step active" data-step="1">
            <div class="circle"><i class="bi bi-file-earmark-text"></i></div>
            <div class="label">Datos Generales</div>
          </div>

          <div class="wizard-step" data-step="2">
            <div class="circle"><i class="bi bi-info-circle"></i></div>
            <div class="label">Información</div>
          </div>

          <div class="wizard-step" data-step="3">
            <div class="circle"><i class="bi bi-geo-alt-fill"></i></div>
            <div class="label">Fases</div>
          </div>

          <div class="wizard-step" data-step="4">
            <div class="circle"><i class="bi bi-folder-fill"></i></div>
            <div class="label">Documentos</div>
          </div>
          <div class="wizard-step" data-step="5">
            <div class="circle"><i class="bi bi-people-fill"></i></div>
            <div class="label">Participación</div>
          </div>
          <div class="wizard-step" data-step="6">
            <div class="circle"><i class="bi bi-newspaper"></i></div>
            <div class="label">Noticias</div>
          </div>
          <div class="wizard-step" data-step="7">
            <div class="circle"><i class="bi bi-question-circle"></i></div>
            <div class="label">FAQs</div>
          </div>
        </div>

        <!-- Contenido de los formularios -->
        <div class="contenido mt-4 position-relative loading" id="wizard-content">
          <div class="text-muted">Cargando formularios...</div>
        </div>
      </div>

      <div class="modal-footer d-flex justify-content-between flex-wrap align-items-center" id="wizardButtons">
        <!-- IZQUIERDA: navegación -->
        <div class="d-flex gap-2 align-items-center flex-wrap">
          <button id="prevBtn" class="btn btn-outline-secondary">Atrás</button>
          <button id="nextBtn" class="btn btn-primary">Siguiente</button>
        </div>

        <!-- DERECHA: acciones principales -->
        <div class="d-flex gap-2">
          <button id="btnCargarPlantilla" class="btn btn-outline-primary">Cargar plantilla</button>
          <button id="btnGuardar" class="btn btn-success">Guardar</button>
          <button id="btnCancelar" class="btn btn-outline-primary">Cancelar</button>
        </div>
      </div>

      <!-- OVERLAY BLOQUEO PARA CUANDO SALGA EL PANEL LATERAL EN PARTICIPACION -->
      <div class="wizard-lock-footer"></div>

    </div>
  </div>
</div>
<!-- FIN MODAL WIZARD -->
